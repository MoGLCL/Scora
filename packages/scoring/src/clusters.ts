import { TrustLayer, clampUnit, type EventId, type Unit } from '@scora/trust-core';
import type {
  ClusterCondition,
  ClusterDefinition,
  ClusterFinding,
  ConditionOutcome,
  FeatureLookup,
  FeatureNote,
} from './contract.ts';

/**
 * The evidence cluster catalogue.
 *
 * A cluster is the only route by which Risk can rise. Each one names a pattern,
 * lists the independent conditions that must hold, and states what would
 * exonerate. Two structural rules are enforced by tests:
 *
 *   - every cluster draws conditions from at least TWO layers, so no single
 *     layer can generate risk by itself;
 *   - every cluster requires at least TWO conditions to fire.
 *
 * That is the difference between "this developer pasted code" and the pattern
 * the spec actually describes:
 *
 *     large paste + external activity + no modification
 *       + no verification + failed explanation
 *
 * Severity is graded by how emphatically the conditions held, and is damped by
 * mitigating evidence, so a cluster that technically fires against an otherwise
 * strong session does not dominate the outcome.
 */

function outcome(
  met: boolean,
  degree: number,
  reason: string,
  evidence: readonly EventId[],
  indeterminate = false,
): ConditionOutcome {
  return {
    met: met && !indeterminate,
    degree: clampUnit(met && !indeterminate ? degree : 0),
    reason,
    evidence,
    indeterminate,
  };
}

/** A condition that cannot be evaluated is unmet — absence of evidence is not evidence. */
function unknown(reason: string): ConditionOutcome {
  return { met: false, degree: clampUnit(0), reason, evidence: [], indeterminate: true };
}

/** Maps a value's distance past a threshold onto [0,1], so severity is graded. */
function ramp(value: number, start: number, full: number): number {
  if (full === start) return value >= full ? 1 : 0;
  return clampUnit((value - start) / (full - start));
}

const UNVERIFIED_IMPORT: ClusterDefinition = {
  id: 'unverified_external_import',
  title: 'Externally-sourced code taken without adaptation or verification',
  meaning:
    'Code correlated with an external resource entered the workspace, was not adapted to the surrounding codebase, and was never executed or tested before submission.',
  minimumConditions: 3,
  layers: [TrustLayer.EXTERNAL, TrustLayer.TYPING, TrustLayer.RUNTIME, TrustLayer.CODE_EVOLUTION],
  maximumSeverity: clampUnit(0.8),
  interpretation:
    'This is the pattern the platform is genuinely concerned with, and it still is not proof. A developer may legitimately copy a licensed snippet they already understand. What resolves it is Layer 09: if they can explain what the code does and why it is there, the pattern is discharged. Exonerating evidence: later revision of the imported region, tests covering it, or a correct explanation at interview.',
  conditions: [
    {
      id: 'import_correlated_with_external_visit',
      description: 'Code appeared shortly after an external resource visit',
      layer: TrustLayer.EXTERNAL,
      features: ['external.unadapted_import_count', 'external.import_latency_ms'],
      test: (lookup) => {
        const count = lookup.value('external.unadapted_import_count');
        if (count === null) return unknown('No external-activity telemetry was collected');
        const evidence = lookup.evidence('external.unadapted_import_count');
        return outcome(
          count > 0,
          ramp(count, 1, 3),
          count > 0
            ? `${count} import(s) followed an external visit without adaptation`
            : 'No unadapted imports followed external activity',
          evidence,
        );
      },
    },
    {
      id: 'arrived_in_bulk',
      description: 'The code arrived as a bulk insertion rather than being typed',
      layer: TrustLayer.TYPING,
      features: ['typing.unexplained_insertion_ratio'],
      test: (lookup) => {
        const ratio = lookup.value('typing.unexplained_insertion_ratio');
        if (ratio === null) return unknown('No typing telemetry was collected');
        return outcome(
          ratio > 0.2,
          ramp(ratio, 0.2, 0.7),
          ratio > 0.2
            ? `${(ratio * 100).toFixed(0)}% of inserted characters arrived in bulk from outside the workspace`
            : 'Little or no code arrived in bulk from outside the workspace',
          lookup.evidence('typing.unexplained_insertion_ratio'),
        );
      },
    },
    {
      id: 'never_adapted',
      description: 'The inserted code was not subsequently revised',
      layer: TrustLayer.CODE_EVOLUTION,
      features: ['evolution.post_insertion_revision_ratio', 'external.adaptation_ratio'],
      test: (lookup) => {
        const revision = lookup.value('evolution.post_insertion_revision_ratio');
        const adaptation = lookup.value('external.adaptation_ratio');
        if (revision === null && adaptation === null) {
          return unknown('No code-evolution telemetry to establish whether the code was adapted');
        }
        const best = Math.max(revision ?? 0, adaptation ?? 0);
        return outcome(
          best < 0.2,
          ramp(0.2 - best, 0, 0.2),
          best < 0.2
            ? 'The inserted code was left essentially unchanged'
            : `${(best * 100).toFixed(0)}% of inserted code was subsequently adapted`,
          lookup.evidence('evolution.post_insertion_revision_ratio', 'external.adaptation_ratio'),
        );
      },
    },
    {
      id: 'never_verified',
      description: 'The code was never executed or tested',
      layer: TrustLayer.RUNTIME,
      features: ['runtime.verification_before_submit', 'runtime.test_run_count'],
      test: (lookup) => {
        const verified = lookup.value('runtime.verification_before_submit');
        const testRuns = lookup.value('runtime.test_run_count');
        if (verified === null && testRuns === null) {
          return unknown('No runtime telemetry was collected');
        }
        const didVerify = (verified ?? 0) > 0 || (testRuns ?? 0) > 0;
        return outcome(
          !didVerify,
          1,
          didVerify
            ? 'The developer ran or tested the code before submitting'
            : 'The code was submitted without any recorded execution or test run',
          lookup.evidence('runtime.verification_before_submit', 'runtime.test_run_count'),
        );
      },
    },
  ],
};

const ASSISTANCE_DEPENDENCE: ClusterDefinition = {
  id: 'assistance_dependence',
  title: 'Editor suggestions accepted without engagement',
  meaning:
    'Substantial completions were accepted faster than they could be read, left unmodified, and never verified — the dependent pattern rather than the assisted one.',
  // Three, because two of the four conditions read Layer 07. Requiring three
  // guarantees at least one comes from typing or runtime, so the pattern cannot
  // be established from assistance telemetry alone.
  minimumConditions: 3,
  layers: [TrustLayer.AI_ASSISTANCE, TrustLayer.TYPING, TrustLayer.RUNTIME],
  maximumSeverity: clampUnit(0.55),
  interpretation:
    'Using editor completions is normal and expected; this cluster is about control, not usage. It carries a deliberately lower severity ceiling than external import because accepting IntelliSense output is ordinary professional behaviour. An experienced developer recognising a correct completion instantly looks identical here — which is precisely why the interview, not this cluster, settles it.',
  conditions: [
    {
      id: 'instant_acceptance_of_substantial_suggestions',
      description: 'Multi-line suggestions accepted below reading speed',
      layer: TrustLayer.AI_ASSISTANCE,
      features: ['assist.dependency_index'],
      test: (lookup) => {
        const index = lookup.value('assist.dependency_index');
        if (index === null) return unknown('No editor-assistance telemetry was collected');
        return outcome(
          index > 0.3,
          ramp(index, 0.3, 0.8),
          index > 0.3
            ? `${(index * 100).toFixed(0)}% of accepted suggestions were substantial, instant and unexamined`
            : 'Suggestions were generally read before being accepted',
          lookup.evidence('assist.dependency_index'),
        );
      },
    },
    {
      id: 'no_post_acceptance_engagement',
      description: 'Accepted suggestions were not modified, deleted or tested',
      layer: TrustLayer.AI_ASSISTANCE,
      features: ['assist.post_acceptance_engagement_rate', 'assist.modification_ratio'],
      test: (lookup) => {
        const engagement = lookup.value('assist.post_acceptance_engagement_rate');
        if (engagement === null) return unknown('No suggestions were accepted');
        return outcome(
          engagement < 0.25,
          ramp(0.25 - engagement, 0, 0.25),
          engagement < 0.25
            ? `Only ${(engagement * 100).toFixed(0)}% of accepted suggestions were engaged with afterwards`
            : `${(engagement * 100).toFixed(0)}% of accepted suggestions were modified, deleted or tested`,
          lookup.evidence('assist.post_acceptance_engagement_rate'),
        );
      },
    },
    {
      id: 'assistance_dominates_authorship',
      description: 'Most of the submitted code came from suggestions rather than typing',
      layer: TrustLayer.TYPING,
      features: ['assist.assisted_character_ratio', 'typing.authorship_ratio'],
      test: (lookup) => {
        const assisted = lookup.value('assist.assisted_character_ratio');
        if (assisted === null) return unknown('No assistance telemetry was collected');
        return outcome(
          assisted > 0.7,
          ramp(assisted, 0.7, 0.95),
          assisted > 0.7
            ? `${(assisted * 100).toFixed(0)}% of characters came from completions`
            : `${(assisted * 100).toFixed(0)}% of characters came from completions, within normal range`,
          lookup.evidence('assist.assisted_character_ratio'),
        );
      },
    },
    {
      id: 'no_independent_debugging',
      description: 'No debugging or error resolution was demonstrated',
      layer: TrustLayer.RUNTIME,
      features: ['runtime.error_resolution_rate', 'runtime.debugging_engagement'],
      test: (lookup) => {
        const resolution = lookup.value('runtime.error_resolution_rate');
        const debugging = lookup.value('runtime.debugging_engagement');
        if (resolution === null && debugging === null) {
          return unknown('No runtime telemetry was collected');
        }
        // Encountering no errors at all is not evidence of dependence — it may
        // simply mean the developer wrote correct code the first time.
        if (resolution === null) {
          return outcome(
            false,
            0,
            'No errors were encountered, so debugging capability was not exercised',
            [],
          );
        }
        return outcome(
          resolution < 0.5,
          ramp(0.5 - resolution, 0, 0.5),
          resolution < 0.5
            ? `Only ${(resolution * 100).toFixed(0)}% of encountered errors were resolved`
            : `${(resolution * 100).toFixed(0)}% of encountered errors were resolved`,
          lookup.evidence('runtime.error_resolution_rate', 'runtime.debugging_engagement'),
        );
      },
    },
  ],
};

const INTEGRITY_COMPROMISE: ClusterDefinition = {
  id: 'environment_integrity_compromise',
  title: 'The measurement environment itself was disturbed',
  meaning:
    'The sandbox detected interference with its own instrumentation, alongside a change in the reported device context.',
  // Three, because two conditions read Layer 01. Tampering plus a device change
  // are both environment detectors and can share a single innocent cause — a
  // browser update, an extension, a corporate proxy. Requiring the session-level
  // condition too means the apparatus has to look disturbed from two directions.
  minimumConditions: 3,
  layers: [TrustLayer.ENVIRONMENT, TrustLayer.SYSTEM],
  maximumSeverity: clampUnit(0.6),
  interpretation:
    'Concerns the apparatus rather than the work, so it is reported separately from anything about the developer capability. Browser extensions, accessibility tooling, corporate proxies and ordinary browser updates all trigger these detectors, which is why two independent conditions are required and why this can never stand alone. Exonerating evidence: a plausible technical explanation, or the same pattern appearing across many unrelated sessions.',
  conditions: [
    {
      id: 'instrumentation_tampering',
      description: 'The sandbox detected patched or disabled instrumentation',
      layer: TrustLayer.ENVIRONMENT,
      features: ['env.runtime_integrity_violations'],
      test: (lookup) => {
        const violations = lookup.value('env.runtime_integrity_violations');
        if (violations === null) return unknown('No environment telemetry was collected');
        return outcome(
          violations > 0,
          ramp(violations, 1, 3),
          violations > 0
            ? `${violations} runtime integrity violation(s) detected`
            : 'No instrumentation tampering detected',
          lookup.evidence('env.runtime_integrity_violations'),
        );
      },
    },
    {
      id: 'device_context_shift',
      description: 'The reported device or browser context changed mid-session',
      layer: TrustLayer.ENVIRONMENT,
      features: ['env.device_context_changes'],
      test: (lookup) => {
        const changes = lookup.value('env.device_context_changes');
        if (changes === null) return unknown('No environment telemetry was collected');
        return outcome(
          changes > 0,
          ramp(changes, 1, 3),
          changes > 0
            ? `Device context changed ${changes} time(s) mid-session`
            : 'Device context remained stable',
          lookup.evidence('env.device_context_changes'),
        );
      },
    },
    {
      id: 'evidence_gap',
      description: 'Substantial periods of the session were unobserved',
      layer: TrustLayer.SYSTEM,
      features: ['env.telemetry_coverage'],
      test: (lookup) => {
        const coverage = lookup.value('env.telemetry_coverage');
        if (coverage === null) return unknown('Session too short to assess coverage');
        return outcome(
          coverage < 0.7,
          ramp(0.7 - coverage, 0, 0.4),
          coverage < 0.7
            ? `Only ${(coverage * 100).toFixed(0)}% of the session was observed`
            : `${(coverage * 100).toFixed(0)}% of the session was observed`,
          lookup.evidence('env.telemetry_coverage'),
        );
      },
    },
  ],
};

const ABSENT_DEVELOPMENT_PROCESS: ClusterDefinition = {
  id: 'absent_development_process',
  title: 'Finished code with no visible development',
  meaning:
    'The submitted work shows none of the ordinary traces of being built: no revision, no correction, no iteration, no verification.',
  minimumConditions: 3,
  layers: [TrustLayer.CODE_EVOLUTION, TrustLayer.TYPING, TrustLayer.RUNTIME],
  maximumSeverity: clampUnit(0.5),
  interpretation:
    'The weakest of the clusters by design, and the easiest to explain innocently: a developer transcribing a design they worked out beforehand, or solving a task well within their competence, produces exactly this shape. It carries a low severity ceiling and exists mainly to generate interview questions rather than to influence the score. Exonerating evidence: a correct explanation of the design decisions at interview.',
  conditions: [
    {
      id: 'no_revision',
      description: 'Code was added but almost never changed afterwards',
      layer: TrustLayer.CODE_EVOLUTION,
      features: ['evolution.revision_ratio'],
      test: (lookup) => {
        const revision = lookup.value('evolution.revision_ratio');
        if (revision === null) return unknown('No code-evolution telemetry was collected');
        return outcome(
          revision < 0.15,
          ramp(0.15 - revision, 0, 0.15),
          revision < 0.15
            ? 'Almost no changes modified previously written code'
            : `${(revision * 100).toFixed(0)}% of changes revised existing code`,
          lookup.evidence('evolution.revision_ratio'),
        );
      },
    },
    {
      id: 'no_correction',
      description: 'Essentially no typing corrections were made',
      layer: TrustLayer.TYPING,
      features: ['typing.correction_ratio'],
      test: (lookup) => {
        const correction = lookup.value('typing.correction_ratio');
        if (correction === null) return unknown('No typing telemetry was collected');
        return outcome(
          correction < 0.02,
          ramp(0.02 - correction, 0, 0.02),
          correction < 0.02
            ? 'Code was written with virtually no corrections'
            : `${(correction * 100).toFixed(1)}% of inserted characters were corrected`,
          lookup.evidence('typing.correction_ratio'),
        );
      },
    },
    {
      id: 'concentrated_arrival',
      description: 'Most of the solution appeared in a single change',
      layer: TrustLayer.CODE_EVOLUTION,
      features: ['evolution.largest_increment_share'],
      test: (lookup) => {
        const share = lookup.value('evolution.largest_increment_share');
        if (share === null) return unknown('No code-evolution telemetry was collected');
        return outcome(
          share > 0.75,
          ramp(share, 0.75, 1),
          share > 0.75
            ? `${(share * 100).toFixed(0)}% of all added lines arrived in one change`
            : `Largest single change contributed ${(share * 100).toFixed(0)}% of added lines`,
          lookup.evidence('evolution.largest_increment_share'),
        );
      },
    },
    {
      id: 'no_verification',
      description: 'The code was never executed or tested',
      layer: TrustLayer.RUNTIME,
      features: ['runtime.execution_count', 'runtime.test_run_count'],
      test: (lookup) => {
        const executions = lookup.value('runtime.execution_count');
        const tests = lookup.value('runtime.test_run_count');
        if (executions === null && tests === null) {
          return unknown('No runtime telemetry was collected');
        }
        const total = (executions ?? 0) + (tests ?? 0);
        return outcome(
          total === 0,
          1,
          total === 0
            ? 'The code was never executed or tested'
            : `Code was executed or tested ${total} time(s)`,
          lookup.evidence('runtime.execution_count', 'runtime.test_run_count'),
        );
      },
    },
  ],
};

export const CLUSTER_CATALOGUE: readonly ClusterDefinition[] = [
  UNVERIFIED_IMPORT,
  ASSISTANCE_DEPENDENCE,
  INTEGRITY_COMPROMISE,
  ABSENT_DEVELOPMENT_PROCESS,
];

/**
 * Features that actively argue against a cluster once it has fired.
 *
 * Recorded on the finding itself so a reviewer always sees the other side of the
 * argument in the same place as the accusation, rather than having to go looking
 * for it.
 */
const MITIGATION_FEATURES: Readonly<Record<string, readonly string[]>> = {
  unverified_external_import: [
    'evolution.post_insertion_revision_ratio',
    'external.adaptation_ratio',
    'external.documentation_ratio',
    'runtime.error_resolution_rate',
    'typing.correction_ratio',
  ],
  assistance_dependence: [
    'assist.modification_ratio',
    'assist.rejection_rate',
    'assist.verification_rate',
    'assist.selective_acceptance_rate',
    'runtime.authored_test_ratio',
  ],
  environment_integrity_compromise: ['env.session_continuity', 'env.clock_reliability'],
  absent_development_process: [
    'runtime.error_resolution_rate',
    'evolution.refactor_count',
    'runtime.authored_test_ratio',
    'interaction.navigation_depth',
  ],
};

export function evaluateCluster(
  definition: ClusterDefinition,
  lookup: FeatureLookup,
): ClusterFinding {
  const outcomes = definition.conditions.map((condition: ClusterCondition) => ({
    conditionId: condition.id,
    layer: condition.layer,
    ...condition.test(lookup),
  }));

  const met = outcomes.filter((entry) => entry.met);
  const indeterminate = outcomes.filter((entry) => entry.indeterminate === true);

  // Corroboration is checked against the layers the satisfied conditions
  // actually came from. Two conditions reading the same layer are one signal
  // stated twice — that is exactly the "single signal" this design forbids,
  // and declaring multiple layers on the definition does not make it two.
  const layersCorroborating = [...new Set(met.map((entry) => entry.layer))];
  const fired =
    met.length >= definition.minimumConditions && layersCorroborating.length >= 2;

  // Severity scales with how emphatically the conditions held AND how many of
  // them did, so a cluster scraping past its minimum lands far below its ceiling.
  const meanDegree =
    met.length === 0 ? 0 : met.reduce((sum, entry) => sum + entry.degree, 0) / met.length;
  const breadth = met.length / definition.conditions.length;
  const rawSeverity = fired ? definition.maximumSeverity * meanDegree * breadth : 0;

  const mitigations = collectMitigations(definition.id, lookup);
  // Strong contrary evidence pulls severity down rather than being noted and
  // ignored — mitigation has to actually do something to be honest.
  const mitigationStrength =
    mitigations.length === 0
      ? 0
      : Math.min(0.6, mitigations.reduce((sum, note) => sum + note.weight, 0) / 3);

  const confidence =
    outcomes.length === 0
      ? 0
      : (outcomes.length - indeterminate.length) / outcomes.length;

  return {
    definition,
    fired,
    conditionsMet: met.length,
    conditionsTotal: definition.conditions.length,
    conditionsIndeterminate: indeterminate.length,
    layersCorroborating,
    severity: clampUnit(rawSeverity * (1 - mitigationStrength)),
    confidence: clampUnit(confidence),
    outcomes,
    evidence: dedupe(outcomes.flatMap((entry) => entry.evidence)),
    mitigations,
  };
}

function collectMitigations(clusterId: string, lookup: FeatureLookup): readonly FeatureNote[] {
  const names = MITIGATION_FEATURES[clusterId] ?? [];
  const notes: FeatureNote[] = [];

  for (const name of names) {
    const feature = lookup.get(name);
    if (feature === undefined || feature.value === null || feature.value <= 0) continue;
    // Weight by both magnitude and the confidence of the underlying feature, so
    // a strong-looking mitigation on one observation does not overpower a
    // corroborated concern.
    const magnitude = feature.kind === 'RATIO' ? feature.value : Math.min(1, feature.value / 3);
    notes.push({
      name: feature.name,
      value: feature.value,
      polarity: feature.polarity,
      weight: clampUnit(magnitude * feature.confidence),
      note: feature.note,
      evidence: feature.evidence,
    });
  }

  return notes.sort((a, b) => b.weight - a.weight);
}

function dedupe(ids: readonly EventId[]): readonly EventId[] {
  return [...new Set(ids)];
}

/** Total corroborated concern across all findings, in [0,1]. */
export function aggregateSeverity(findings: readonly ClusterFinding[]): Unit {
  const fired = findings.filter((finding) => finding.fired);
  if (fired.length === 0) return clampUnit(0);

  // Combine probabilistically rather than additively: two moderate concerns
  // compound, but no number of them can saturate the scale on their own.
  let remaining = 1;
  for (const finding of fired) {
    remaining *= 1 - finding.severity * finding.confidence;
  }
  return clampUnit(1 - remaining);
}
