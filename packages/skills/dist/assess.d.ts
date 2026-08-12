import { type EpochMs, type TrustEvent, type Unit } from '@scora/trust-core';
import { type SkillAssessment } from './contract.ts';
import { type ReconcileOptions } from './reconcile.ts';
/**
 * The Layer 08 assessment.
 *
 * `assessSkills` is the whole public surface: events in, one finding per claimed
 * skill out, plus the coverage figure that says how much of the inventory was
 * tested at all.
 *
 * Coverage is not a footnote. An assessment that exercised two of nine claimed
 * skills has verified two skills, and a reviewer who reads seven `NOT_EXERCISED`
 * verdicts as seven failures has been misled by the report rather than by the
 * developer. That is why `limitations` leads with coverage and why the
 * `NOT_EXERCISED` count is reported as its own number rather than folded into a
 * percentage.
 */
export declare const SKILL_POLICY_VERSION = "skills-1.0.0";
export interface AssessSkillsOptions extends ReconcileOptions {
    readonly assessedAt: EpochMs;
}
export declare function assessSkills(events: readonly TrustEvent[], options: AssessSkillsOptions): SkillAssessment;
/**
 * Layer 08's contribution to the Trust score.
 *
 * Returns `null` — not zero, not a low number — when nothing was exercised. A
 * layer with no evidence must not drag Trust down; it lowers Confidence instead,
 * which is the same rule `LayerAssessment.standing` already encodes for every
 * other layer.
 *
 * `NOT_EXERCISED` findings are excluded from the mean entirely rather than
 * counted as neutral. Averaging them in would mean a developer who claimed ten
 * skills and demonstrated the two that were tested scores lower than one who
 * claimed two and demonstrated both — punishing an honest inventory.
 */
export declare function skillStanding(assessment: SkillAssessment): Unit | null;
/**
 * Confidence in the layer as a whole.
 *
 * Scales with both the confidence of individual findings and how much of the
 * claimed inventory was exercised: high confidence in two findings out of nine
 * claims is not high confidence in the developer's skill profile.
 */
export declare function skillConfidence(assessment: SkillAssessment): Unit;
/**
 * Questions worth putting to the developer at interview.
 *
 * This is Layer 08's real output when a claim does not resolve. An unverified
 * skill is a prompt for Layer 09, not a mark against anyone — and a question
 * generated from the session cannot be prepared for in advance.
 */
export declare function suggestedQuestions(assessment: SkillAssessment): readonly string[];
//# sourceMappingURL=assess.d.ts.map