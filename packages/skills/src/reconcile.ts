import { clampUnit, type EventId, type TrustLayer, type Unit } from '@scora/trust-core';
import {
  SKILL_LEVEL_ORDER,
  SkillLevel,
  SkillObservationKind,
  SkillVerdict,
  levelOrdinal,
  type SkillClaim,
  type SkillFinding,
  type SkillObservation,
} from './contract.ts';

/**
 * Reconciling one claim against the evidence for it.
 *
 * The whole layer turns on the order of the checks below, so it is written as a
 * sequence of refusals rather than a score:
 *
 *   1. **Nothing exercised it** → `NOT_EXERCISED`. Stop. No level, no gap, no
 *      penalty. The output is a next step.
 *   2. **Exercised but the evidence is thin** → `INDETERMINATE`. Stop. Also not a
 *      finding.
 *   3. **Counter-evidence from a single layer** → cannot be `CONTRADICTED`. One
 *      layer disagreeing is one signal, and this layer does not conclude from one
 *      signal any more than the cluster catalogue does.
 *   4. Only then is the claimed level compared with the evidenced level.
 *
 * A developer who claims `expert` and demonstrates `advanced` is
 * `PARTIALLY_CORROBORATED`: people round their own skills up, and a one-step gap
 * is noise. The gap has to be wide *and* corroborated *and* confidently measured
 * before this layer will say `CONTRADICTED`.
 */

/**
 * Counter-evidence must come from at least this many layers before a claim can be
 * called contradicted. Same rule as cluster corroboration, same reason.
 */
export const MINIMUM_LAYERS_TO_CONTRADICT = 2;

/** Below this confidence the verdict is `INDETERMINATE`, whatever the evidence points at. */
export const MINIMUM_CONFIDENCE_TO_JUDGE = 0.35;

/**
 * A shortfall of this many level steps or fewer is ordinary self-assessment noise.
 *
 * Two steps — `expert` claimed, `intermediate` evidenced — is where it stops being
 * noise and becomes a question worth putting to the developer.
 */
export const TOLERATED_LEVEL_GAP = 1;

export interface ReconcileOptions {
  /** Overrides for tenants that want a stricter or looser reading. Bounds still apply. */
  readonly minimumConfidenceToJudge?: Unit;
  readonly toleratedLevelGap?: number;
}

export function reconcileClaim(
  claim: SkillClaim,
  observations: readonly SkillObservation[],
  options: ReconcileOptions = {},
): SkillFinding {
  const minimumConfidence = options.minimumConfidenceToJudge ?? clampUnit(MINIMUM_CONFIDENCE_TO_JUDGE);
  const toleratedGap = options.toleratedLevelGap ?? TOLERATED_LEVEL_GAP;

  const evidence = dedupe(observations.flatMap((observation) => observation.evidence));
  const layers = distinctLayers(observations);

  if (observations.length === 0) {
    return {
      claim,
      verdict: SkillVerdict.NOT_EXERCISED,
      evidencedLevel: SkillLevel.NONE,
      // No gap is reported: subtracting from a level nothing measured would
      // manufacture a shortfall out of an assessment that never asked.
      levelGap: 0,
      confidence: clampUnit(0),
      layersCorroborating: [],
      observations: [],
      evidence: [],
      summary: `The session did not exercise ${claim.skillName}. This is not evidence against the claim.`,
      nextStep: `Issue a verification challenge targeting ${claim.skillName}, or include a task that requires it.`,
    };
  }

  const confidence = aggregateConfidence(observations);
  const evidencedLevel = inferLevel(observations);
  const levelGap = levelOrdinal(claim.claimedLevel) - levelOrdinal(evidencedLevel);
  const counterLayers = distinctLayers(
    observations.filter((observation) => isCounter(observation.kind)),
  );

  if (confidence < minimumConfidence) {
    return {
      claim,
      verdict: SkillVerdict.INDETERMINATE,
      evidencedLevel,
      levelGap,
      confidence,
      layersCorroborating: layers,
      observations,
      evidence,
      summary: `${claim.skillName} was exercised, but the telemetry is too thin to read the result either way.`,
      nextStep: `Ask the developer to walk through the ${claim.skillName} work, or issue a targeted challenge.`,
    };
  }

  const contradicted =
    levelGap > toleratedGap &&
    counterLayers.length >= MINIMUM_LAYERS_TO_CONTRADICT &&
    hasDirectFailure(observations);

  if (contradicted) {
    return {
      claim,
      verdict: SkillVerdict.CONTRADICTED,
      evidencedLevel,
      levelGap,
      confidence,
      layersCorroborating: counterLayers,
      observations,
      evidence,
      summary:
        `${claim.skillName} was claimed at ${claim.claimedLevel} and the session evidences ${evidencedLevel}, ` +
        `with counter-evidence from ${counterLayers.length} independent layers including a failed challenge.`,
      nextStep: null,
    };
  }

  if (levelGap > toleratedGap) {
    return {
      claim,
      verdict: SkillVerdict.PARTIALLY_CORROBORATED,
      evidencedLevel,
      levelGap,
      confidence,
      layersCorroborating: layers,
      observations,
      evidence,
      summary:
        `${claim.skillName} is evidenced at ${evidencedLevel} against a claim of ${claim.claimedLevel}. ` +
        `A shortfall this size is a question for the developer, not a conclusion about them.`,
      nextStep: `Put the ${claim.skillName} gap to the developer at interview.`,
    };
  }

  return {
    claim,
    verdict: levelGap > 0 ? SkillVerdict.PARTIALLY_CORROBORATED : SkillVerdict.CORROBORATED,
    evidencedLevel,
    levelGap,
    confidence,
    layersCorroborating: layers,
    observations,
    evidence,
    summary:
      levelGap > 0
        ? `${claim.skillName} is evidenced at ${evidencedLevel}, one step below the claim — within ordinary self-assessment range.`
        : `${claim.skillName} is evidenced at ${evidencedLevel}, at or above the claimed ${claim.claimedLevel}.`,
    nextStep: null,
  };
}

/**
 * The level the observations support.
 *
 * A passed challenge is worth more than behavioural consistency, because it was
 * designed to test the skill rather than merely happening alongside it. Counter
 * observations pull the inferred level down but cannot push it below `BEGINNER`
 * while any supporting evidence exists: the session did *something*.
 */
export function inferLevel(observations: readonly SkillObservation[]): SkillLevel {
  const direct = weightOf(observations, SkillObservationKind.DEMONSTRATED);
  const supporting = weightOf(observations, SkillObservationKind.SUPPORTING);
  const counter =
    weightOf(observations, SkillObservationKind.COUNTER) +
    weightOf(observations, SkillObservationKind.CHALLENGE_FAILED);

  const net = direct * 1.5 + supporting - counter;
  if (net <= 0) {
    return direct + supporting > 0 ? SkillLevel.BEGINNER : SkillLevel.NONE;
  }

  // Thresholds are deliberately coarse. A finer scale would imply a precision
  // this evidence does not have, and would invite reading a level as a measurement.
  const index = net >= 2.5 ? 4 : net >= 1.5 ? 3 : net >= 0.75 ? 2 : 1;
  return SKILL_LEVEL_ORDER[index] ?? SkillLevel.BEGINNER;
}

/**
 * Confidence in a verdict, from the evidence behind it.
 *
 * Weighted by observation confidence, then damped by how few observations there
 * are: three consistent observations justify more belief than one, and the
 * damping keeps a single high-confidence observation from reading as certainty.
 */
export function aggregateConfidence(observations: readonly SkillObservation[]): Unit {
  if (observations.length === 0) return clampUnit(0);

  const total = observations.reduce((sum, observation) => sum + observation.confidence, 0);
  const mean = total / observations.length;
  const breadth = Math.min(1, observations.length / 3);
  return clampUnit(mean * (0.6 + 0.4 * breadth));
}

function isCounter(kind: SkillObservationKind): boolean {
  return kind === SkillObservationKind.COUNTER || kind === SkillObservationKind.CHALLENGE_FAILED;
}

/**
 * Whether the evidence includes a challenge the developer actually failed.
 *
 * Required before `CONTRADICTED`. Behavioural counter-evidence alone — slow
 * progress, heavy revision, an unresolved error — describes a hard afternoon at
 * least as well as it describes an overstated skill, and this layer must not
 * confuse the two.
 */
function hasDirectFailure(observations: readonly SkillObservation[]): boolean {
  return observations.some(
    (observation) => observation.kind === SkillObservationKind.CHALLENGE_FAILED,
  );
}

function weightOf(
  observations: readonly SkillObservation[],
  kind: SkillObservationKind,
): number {
  return observations
    .filter((observation) => observation.kind === kind)
    .reduce((sum, observation) => sum + observation.weight * observation.confidence, 0);
}

function distinctLayers(observations: readonly SkillObservation[]): readonly TrustLayer[] {
  return [...new Set(observations.map((observation) => observation.layer))];
}

function dedupe(ids: readonly EventId[]): readonly EventId[] {
  return [...new Set(ids)];
}
