import { type Unit } from '@scora/trust-core';
import { SkillLevel, type SkillClaim, type SkillFinding, type SkillObservation } from './contract.ts';
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
export declare const MINIMUM_LAYERS_TO_CONTRADICT = 2;
/** Below this confidence the verdict is `INDETERMINATE`, whatever the evidence points at. */
export declare const MINIMUM_CONFIDENCE_TO_JUDGE = 0.35;
/**
 * A shortfall of this many level steps or fewer is ordinary self-assessment noise.
 *
 * Two steps — `expert` claimed, `intermediate` evidenced — is where it stops being
 * noise and becomes a question worth putting to the developer.
 */
export declare const TOLERATED_LEVEL_GAP = 1;
export interface ReconcileOptions {
    /** Overrides for tenants that want a stricter or looser reading. Bounds still apply. */
    readonly minimumConfidenceToJudge?: Unit;
    readonly toleratedLevelGap?: number;
}
export declare function reconcileClaim(claim: SkillClaim, observations: readonly SkillObservation[], options?: ReconcileOptions): SkillFinding;
/**
 * The level the observations support.
 *
 * A passed challenge is worth more than behavioural consistency, because it was
 * designed to test the skill rather than merely happening alongside it. Counter
 * observations pull the inferred level down but cannot push it below `BEGINNER`
 * while any supporting evidence exists: the session did *something*.
 */
export declare function inferLevel(observations: readonly SkillObservation[]): SkillLevel;
/**
 * Confidence in a verdict, from the evidence behind it.
 *
 * Weighted by observation confidence, then damped by how few observations there
 * are: three consistent observations justify more belief than one, and the
 * damping keeps a single high-confidence observation from reading as certainty.
 */
export declare function aggregateConfidence(observations: readonly SkillObservation[]): Unit;
//# sourceMappingURL=reconcile.d.ts.map