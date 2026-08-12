import {
  clampUnit,
  type DeveloperId,
  type EpochMs,
  type TenantId,
  type Unit,
} from '@scora/trust-core';
import type { FeatureExtractionResult } from '@scora/trust-features';
import {
  ComparisonBasis,
  type BaselineDimension,
  type DeveloperProfile,
  type Deviation,
  type PopulationStatistics,
  type SessionObservation,
} from './contract.ts';
import {
  median,
  medianAbsoluteDeviation,
  percentile,
  recencyWeight,
  robustZScore,
  sampleConfidence,
  weightedMedian,
} from './statistics.ts';

/**
 * Profile construction and comparison.
 *
 * A profile is derived data — rebuildable from the event log at any time — so
 * this module is pure and takes observations as input rather than reaching for
 * storage itself.
 */

/**
 * Sessions required before deviations may be reported at all.
 *
 * Below this the profile accumulates silently. Four is not a lot, but the
 * alternative is worse: a baseline from one or two sessions looks authoritative
 * while describing almost nothing, and would let a developer's first unusual day
 * define them.
 */
export const MINIMUM_SESSIONS_TO_ESTABLISH = 4;

/**
 * Features worth tracking across sessions.
 *
 * Deliberately excludes anything risk-contributing. A baseline exists to
 * interpret behaviour fairly, not to accumulate a record of concerns — building
 * a per-developer history of suspicion would invert the platform's purpose and
 * make one bad session follow someone permanently.
 */
export const TRACKED_FEATURES: readonly string[] = [
  'typing.rate_cpm',
  'typing.median_insertion_chars',
  'typing.correction_ratio',
  'typing.authorship_ratio',
  'typing.rhythm_variability',
  'evolution.revision_ratio',
  'evolution.increment_count',
  'evolution.growth_smoothness',
  'runtime.error_resolution_rate',
  'runtime.median_recovery_ms',
  'runtime.fix_attempts_per_error',
  'runtime.test_run_count',
  'assist.acceptance_rate',
  'assist.modification_ratio',
  'assist.post_acceptance_engagement_rate',
  'interaction.engagement_rate',
  'interaction.reading_ratio',
  'external.documentation_ratio',
];

/** Extracts the trackable metrics from a scored session. */
export function observationFrom(
  extraction: FeatureExtractionResult,
  meta: {
    readonly tenantId: TenantId;
    readonly developerId: DeveloperId;
    readonly sessionId: SessionObservation['sessionId'];
    readonly observedAt: EpochMs;
  },
): SessionObservation {
  const metrics: Record<string, number> = {};

  for (const name of TRACKED_FEATURES) {
    const feature = extraction.featuresByName.get(name);
    if (feature?.value != null) metrics[name] = feature.value;
  }

  // Derived here rather than in extraction: typing rate is a baseline concern,
  // and Layer 03 deliberately refuses to compute an absolute rate feature so
  // that nothing downstream can threshold on it.
  const typed = extraction.featuresByName.get('typing.characters_authored')?.value;
  const span = extraction.featuresByName.get('evolution.development_span_ms')?.value;
  if (typed != null && span != null && span > 0) {
    metrics['typing.rate_cpm'] = (typed / span) * 60_000;
  }

  const coverage =
    extraction.layers.length === 0
      ? 0
      : extraction.layers.reduce((sum, layer) => sum + layer.coverage, 0) /
        extraction.layers.length;

  return {
    tenantId: meta.tenantId,
    developerId: meta.developerId,
    sessionId: meta.sessionId,
    observedAt: meta.observedAt,
    coverage: clampUnit(coverage),
    metrics,
  };
}

export interface ProfileOptions {
  /** Now, for recency weighting. Injected so profiles rebuild deterministically. */
  readonly now: EpochMs;
  /** Days after which an observation carries half weight. */
  readonly halfLifeDays?: number | undefined;
  /** Sessions required before the profile may be compared against. */
  readonly minimumSessions?: number | undefined;
}

export function buildProfile(
  tenantId: TenantId,
  developerId: DeveloperId,
  observations: readonly SessionObservation[],
  options: ProfileOptions,
): DeveloperProfile {
  const minimumSessions = options.minimumSessions ?? MINIMUM_SESSIONS_TO_ESTABLISH;
  const relevant = observations
    .filter((observation) => observation.developerId === developerId)
    .sort((a, b) => a.observedAt - b.observedAt);

  const dimensions = new Map<string, BaselineDimension>();

  for (const feature of TRACKED_FEATURES) {
    const values: number[] = [];
    const weights: number[] = [];

    for (const observation of relevant) {
      const value = observation.metrics[feature];
      if (value === undefined || !Number.isFinite(value)) continue;

      values.push(value);
      // Two independent discounts: how well the session was observed, and how
      // long ago it was. Both describe how much this observation still says
      // about the developer being assessed now.
      weights.push(
        observation.coverage *
          recencyWeight(observation.observedAt, options.now, options.halfLifeDays),
      );
    }

    if (values.length === 0) continue;

    const centre = weightedMedian(values, weights);
    if (centre === null) continue;

    dimensions.set(feature, {
      feature,
      median: centre,
      mad: medianAbsoluteDeviation(values) ?? 0,
      p25: percentile(values, 0.25) ?? centre,
      p75: percentile(values, 0.75) ?? centre,
      samples: values.length,
      confidence: sampleConfidence(values.length),
    });
  }

  const first = relevant.at(0);
  const last = relevant.at(-1);

  return {
    tenantId,
    developerId,
    sessionsObserved: relevant.length,
    firstObservedAt: (first?.observedAt ?? options.now) as EpochMs,
    lastObservedAt: (last?.observedAt ?? options.now) as EpochMs,
    dimensions,
    established: relevant.length >= minimumSessions,
    confidence: sampleConfidence(relevant.length),
  };
}

export interface ComparisonOptions {
  /**
   * Permit falling back to population statistics when the developer has no
   * usable history.
   *
   * Defaults to false, and should stay false for anything affecting a person's
   * outcome. Comparing someone to a population they may legitimately differ
   * from is how systems end up penalising the unusual — the left-handed, the
   * self-taught, the developer using an unfamiliar keyboard layout.
   */
  readonly allowPopulationFallback?: boolean | undefined;
  readonly population?: PopulationStatistics | undefined;
}

/**
 * Compares one session's metric against the best available baseline.
 *
 * Returns a deviation with `basis: NONE` rather than a fabricated number when
 * no fair comparison exists. Downstream consumers must treat that as "unknown",
 * never as "normal" or "abnormal".
 */
export function compare(
  feature: string,
  observed: number,
  profile: DeveloperProfile | null,
  options: ComparisonOptions = {},
): Deviation {
  const own = profile?.established === true ? profile.dimensions.get(feature) : undefined;

  if (own !== undefined) {
    const zScore = robustZScore(observed, own.median, own.mad);
    const multiple = own.median === 0 ? null : observed / own.median;
    return {
      feature,
      observed,
      expected: own.median,
      basis: ComparisonBasis.SELF,
      zScore,
      multiple,
      confidence: own.confidence,
      note: describe(feature, observed, own.median, zScore, ComparisonBasis.SELF, own.samples),
    };
  }

  const population = options.population?.dimensions.get(feature);
  if (options.allowPopulationFallback === true && population !== undefined) {
    return {
      feature,
      observed,
      expected: population.median,
      basis: ComparisonBasis.POPULATION,
      zScore: robustZScore(observed, population.median, population.mad),
      multiple: population.median === 0 ? null : observed / population.median,
      // Halved: a population comparison is a materially weaker claim about an
      // individual than a self-comparison, and must present itself that way.
      confidence: clampUnit(population.confidence * 0.5),
      note:
        `${feature}: ${round(observed)} compared against the population median ` +
        `${round(population.median)}. This developer has no established history, so this ` +
        `comparison describes how they differ from others, not from themselves — weak evidence about an individual.`,
    };
  }

  return {
    feature,
    observed,
    expected: null,
    basis: ComparisonBasis.NONE,
    zScore: null,
    multiple: null,
    confidence: clampUnit(0),
    note:
      `${feature}: ${round(observed)} observed. No established baseline exists for this ` +
      `developer, so no comparison is being made. This is not a finding.`,
  };
}

/** Compares every metric in a session against the profile. */
export function compareSession(
  observation: SessionObservation,
  profile: DeveloperProfile | null,
  options: ComparisonOptions = {},
): readonly Deviation[] {
  return Object.entries(observation.metrics).map(([feature, value]) =>
    compare(feature, value, profile, options),
  );
}

/**
 * Deviations large enough to be worth a reviewer's attention.
 *
 * The threshold is high by design. At |z| ≥ 3 against a robust estimator, an
 * observation is genuinely unusual for that person — and even then it is a
 * question, never a finding: people have good days, bad days, and days when
 * they already knew the answer.
 */
export function notableDeviations(
  deviations: readonly Deviation[],
  threshold = 3,
): readonly Deviation[] {
  return deviations
    .filter(
      (deviation) =>
        deviation.basis === ComparisonBasis.SELF &&
        deviation.zScore !== null &&
        Math.abs(deviation.zScore) >= threshold,
    )
    .sort((a, b) => Math.abs(b.zScore!) - Math.abs(a.zScore!));
}

export function buildPopulation(
  tenantId: TenantId,
  profiles: readonly DeveloperProfile[],
  cohort?: string,
): PopulationStatistics {
  const dimensions = new Map<string, BaselineDimension>();

  for (const feature of TRACKED_FEATURES) {
    // One value per developer, not per session: otherwise a single prolific
    // developer would define the population's idea of normal.
    const values = profiles
      .map((profile) => profile.dimensions.get(feature)?.median)
      .filter((value): value is number => value !== undefined);

    if (values.length === 0) continue;

    // Unweighted median here: every developer counts once, so the interpolating
    // `median` is correct. `weightedMedian` deliberately returns an actual
    // observed value rather than interpolating, which is right for a person's
    // own history but wrong for a population centre.
    const centre = median(values);
    if (centre === null) continue;

    dimensions.set(feature, {
      feature,
      median: centre,
      mad: medianAbsoluteDeviation(values) ?? 0,
      p25: percentile(values, 0.25) ?? centre,
      p75: percentile(values, 0.75) ?? centre,
      samples: values.length,
      confidence: sampleConfidence(values.length, 25),
    });
  }

  return {
    tenantId,
    developersObserved: profiles.length,
    sessionsObserved: profiles.reduce((sum, profile) => sum + profile.sessionsObserved, 0),
    dimensions,
    cohort,
  };
}

function describe(
  feature: string,
  observed: number,
  expected: number,
  zScore: number | null,
  basis: ComparisonBasis,
  samples: number,
): string {
  const head = `${feature}: ${round(observed)} against this developer's usual ${round(expected)} (${samples} session(s))`;

  if (zScore === null) {
    return `${head}. Their history is too consistent to measure dispersion, so no significance can be assigned.`;
  }

  const magnitude = Math.abs(zScore);
  if (magnitude < 1.5) return `${head} — within their normal range.`;
  if (magnitude < 3) {
    return `${head} — somewhat outside their usual range (z=${round(zScore)}), which is ordinary session-to-session variation.`;
  }

  return (
    `${head} — well outside their usual range (z=${round(zScore)}). Worth understanding, ` +
    `but people have unusual days and this is a question rather than a finding. Basis: ${basis}.`
  );
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

export type { Unit };
