import type { DeveloperId, EpochMs, SessionId, TenantId, Unit } from '@scora/trust-core';
import type { DeveloperBaseline } from '@scora/trust-features';

/**
 * Behavioural baselines.
 *
 * The premise of this package is that almost no behavioural measurement means
 * anything in absolute terms. "300 characters per minute" is fast for one
 * developer and slow for another; "accepted a completion in 200ms" is reckless
 * for a beginner and routine for someone who has written that line a thousand
 * times. The only defensible comparison is against the same person.
 *
 * Three comparison targets exist, in strict order of preference:
 *
 *   1. The developer's own history — the only genuinely fair comparison.
 *   2. Task and skill context — matched population, when history is thin.
 *   3. Population statistics — a last resort, reported with low confidence.
 *
 * A developer with no history is NOT compared to the population by default.
 * Doing so would penalise anyone atypical for being atypical, which is the
 * exact failure mode the platform exists to avoid. Instead the comparison is
 * omitted and confidence is lowered.
 */

/** One session's contribution to a developer's history. */
export interface SessionObservation {
  readonly tenantId: TenantId;
  readonly developerId: DeveloperId;
  readonly sessionId: SessionId;
  readonly observedAt: EpochMs;
  /**
   * How much of the session was actually observed.
   *
   * Sessions with poor telemetry contribute proportionally less to the
   * baseline, so a person's history is not distorted by one flaky connection.
   */
  readonly coverage: Unit;
  /** Feature values captured from this session, keyed by feature name. */
  readonly metrics: Readonly<Record<string, number>>;
}

/**
 * A single measured dimension of a developer's behaviour.
 *
 * Carries dispersion alongside the central value: a developer whose typing rate
 * swings wildly between sessions has a median, but deviation from it means much
 * less than for someone highly consistent. Ignoring that would manufacture
 * false signals from ordinary variability.
 */
export interface BaselineDimension {
  readonly feature: string;
  readonly median: number;
  /** Median absolute deviation — robust to the outliers that plague small samples. */
  readonly mad: number;
  readonly p25: number;
  readonly p75: number;
  readonly samples: number;
  readonly confidence: Unit;
}

/** The complete behavioural profile the engine holds for one developer. */
export interface DeveloperProfile {
  readonly tenantId: TenantId;
  readonly developerId: DeveloperId;
  readonly sessionsObserved: number;
  readonly firstObservedAt: EpochMs;
  readonly lastObservedAt: EpochMs;
  readonly dimensions: ReadonlyMap<string, BaselineDimension>;
  /**
   * Whether this profile is established enough to interpret deviations from.
   *
   * Below the threshold the profile still exists and still accumulates, but
   * comparisons against it are suppressed rather than reported weakly — a
   * half-formed baseline is worse than none, because it looks authoritative.
   */
  readonly established: boolean;
  readonly confidence: Unit;
}

/** Aggregate statistics across many developers, for context of last resort. */
export interface PopulationStatistics {
  readonly tenantId: TenantId;
  readonly developersObserved: number;
  readonly sessionsObserved: number;
  readonly dimensions: ReadonlyMap<string, BaselineDimension>;
  /** Optional narrowing, e.g. by task difficulty or language. */
  readonly cohort?: string | undefined;
}

/** Which comparison target produced a deviation, so a reader can judge its worth. */
export const ComparisonBasis = {
  /** The developer's own history. Strongest. */
  SELF: 'SELF',
  /** A matched cohort — same task, same language, similar claimed level. */
  COHORT: 'COHORT',
  /** All developers in the tenant. Weakest; use only with explicit opt-in. */
  POPULATION: 'POPULATION',
  /** No comparison was possible, and none was invented. */
  NONE: 'NONE',
} as const;

export type ComparisonBasis = (typeof ComparisonBasis)[keyof typeof ComparisonBasis];

/**
 * How far a session sits from its comparison target.
 *
 * `zScore` uses a MAD-based robust estimator rather than standard deviation:
 * assessment samples are small and contain genuine outliers (the session where
 * someone was interrupted, the one where everything went right), and a
 * classical z-score would let a single such session dominate.
 */
export interface Deviation {
  readonly feature: string;
  readonly observed: number;
  readonly expected: number | null;
  readonly basis: ComparisonBasis;
  /** Robust z-score. Null when no comparison was possible. */
  readonly zScore: number | null;
  /** Multiple of the expected value. Null when expected is zero or absent. */
  readonly multiple: number | null;
  readonly confidence: Unit;
  /** Plain-language reading, including the caveats that apply. */
  readonly note: string;
}

/**
 * Storage port for profiles.
 *
 * Deliberately narrow: baselines are derived data and can always be rebuilt
 * from the event log, so this is a cache with provenance rather than a system
 * of record.
 */
export interface BaselineStore {
  load(tenantId: TenantId, developerId: DeveloperId): Promise<DeveloperProfile | null>;
  save(profile: DeveloperProfile): Promise<void>;
  loadPopulation(tenantId: TenantId, cohort?: string): Promise<PopulationStatistics | null>;
  savePopulation(statistics: PopulationStatistics): Promise<void>;
}

/** Adapts a full profile to the narrow shape feature extraction consumes. */
export function toExtractionBaseline(profile: DeveloperProfile): DeveloperBaseline {
  const value = (feature: string): number | null =>
    profile.established ? (profile.dimensions.get(feature)?.median ?? null) : null;

  return {
    developerId: profile.developerId,
    sessionsObserved: profile.sessionsObserved,
    medianTypingRateCpm: value('typing.rate_cpm'),
    medianInsertionChars: value('typing.median_insertion_chars'),
    medianCorrectionRatio: value('typing.correction_ratio'),
    medianSuggestionAcceptanceRate: value('assist.acceptance_rate'),
    medianErrorRecoveryMs: value('runtime.median_recovery_ms'),
  };
}
