import { type TrustEvent } from '@scora/trust-core';
import type { SkillAssessment } from '@scora/trust-skills';
import { Difficulty, type InterviewQuestion } from './contract.ts';
/**
 * Building the question bank from the session.
 *
 * Every question here is derived from something that happened: an error the
 * developer fixed, a dependency they added, a completion they accepted and then
 * rewrote. A question with no such grounding cannot be produced by this module,
 * which is what stops the interview from degenerating into trivia that measures
 * interview practice rather than ownership.
 *
 * The ordering is deliberate. The highest-value question is about a region the
 * developer accepted from a completion and never modified or tested — not
 * because accepting a completion is suspicious (it is not), but because that is
 * the region where a five-minute conversation resolves the most uncertainty in
 * either direction. The developer who explains it has settled the question;
 * the engine that never asked has merely guessed.
 */
/** No interview is worth more than this many questions. Beyond it, fatigue is being measured. */
export declare const MAX_QUESTIONS = 8;
export interface PlanOptions {
    readonly maxQuestions?: number;
    /** Where the interview starts. It adapts from here. */
    readonly startingDifficulty?: Difficulty;
    /** Layer 08 output, so unresolved claims become questions. */
    readonly skills?: SkillAssessment;
}
/**
 * The questions this session earns, most informative first.
 *
 * Returns an empty plan when the session offers no grounding. An interview with
 * nothing to ask about is not conducted, rather than padded with generic
 * questions that would produce a score meaning nothing.
 */
export declare function planInterview(events: readonly TrustEvent[], options?: PlanOptions): readonly InterviewQuestion[];
/**
 * The next difficulty, given how the last answer went.
 *
 * Adaptive in both directions and asymmetric on purpose: difficulty rises on
 * sustained strength and falls on a single sign of struggle. An interview that
 * ratchets upward until the developer fails has measured only where their
 * ceiling is, which is not what this layer is for.
 */
export declare function adjustDifficulty(current: Difficulty, consistency: number, graderConfidence: number): {
    readonly next: Difficulty;
    readonly reason: DifficultyReason;
};
export type DifficultyReason = 'strong_understanding' | 'uncertainty_detected' | 'inconsistency' | 'time';
//# sourceMappingURL=plan.d.ts.map