import { type EpochMs, type Unit } from '@scora/trust-core';
import { Difficulty, type AnswerGrade, type Examiner, type InterviewQuestion, type InterviewResult, type RawGrade } from './contract.ts';
/**
 * Conducting the interview and reading the result.
 *
 * The grading rules are the whole of this file, and they are written as floors
 * rather than as a score:
 *
 *   1. **A grader that is unsure is discarded.** Below `MINIMUM_GRADER_CONFIDENCE`
 *      the grade becomes `UNGRADED` and contributes nothing. A model's guess about
 *      someone's understanding is not evidence.
 *   2. **A short or absent answer is `NOT_ANSWERED`,** which carries no penalty.
 *      Silence is not a confession, and a one-word reply is more often a broken
 *      microphone than a developer who cannot explain their work.
 *   3. **`EXPLANATION_INCONSISTENT` needs a pattern.** One inconsistent answer out
 *      of six is a person misremembering. The verdict requires a majority of
 *      graded answers to be inconsistent, and at least two of them.
 *
 * Correctness and depth are recorded but do not drive the verdict. A shallow,
 * correct explanation of your own code still demonstrates ownership; a fluent,
 * confident explanation of code you did not write does not.
 */
export declare const INTERVIEW_POLICY_VERSION = "interview-1.0.0";
/** Below this, the grader's own uncertainty makes its grade unusable. */
export declare const MINIMUM_GRADER_CONFIDENCE = 0.5;
/** Shorter than this and there is nothing to grade. */
export declare const MINIMUM_ANSWER_WORDS = 5;
/** Consistency at or above this reads as an explanation matching the artefact. */
export declare const CONSISTENT_THRESHOLD = 0.65;
/** Below this the explanation describes something other than what they wrote. */
export declare const INCONSISTENT_THRESHOLD = 0.35;
/** Fewer graded answers than this and the interview concludes nothing. */
export declare const MINIMUM_GRADED_ANSWERS = 2;
export interface ConductOptions {
    readonly interviewId: string;
    readonly assessedAt: EpochMs;
    /** Configured by the tenant administrator. Absent means no interview is graded. */
    readonly examiner?: Examiner;
    /** Supplies the developer's answer for a question. Absent answers are permitted. */
    readonly collect: (question: InterviewQuestion, text: string) => Promise<AnsweredText | null>;
    readonly startingDifficulty?: Difficulty;
}
export interface AnsweredText {
    readonly text: string;
    readonly responseMs: number;
    readonly transcriptRef?: string | null;
}
/**
 * Runs the plan, adapting difficulty as it goes.
 *
 * Sequential rather than parallel, because the difficulty of question N+1
 * depends on the answer to question N — that adaptation is what makes the
 * interview evidence rather than a quiz.
 */
export declare function conductInterview(plan: readonly InterviewQuestion[], options: ConductOptions): Promise<InterviewResult>;
/**
 * Applies the floors a grader cannot override.
 *
 * The examiner is configured by the tenant, which means the engine must assume
 * it may be badly calibrated, badly prompted, or simply wrong. These bounds are
 * the engine's own — a grader claiming certainty it has not earned is clamped,
 * and one below the confidence floor is discarded outright.
 *
 * This is the only function that produces an `AnswerGrade`. A provider returns
 * a `RawGrade` of plain numbers with no outcome; the verdict on an answer is the
 * engine's to make, from its own thresholds.
 */
export declare function normaliseGrade(grade: RawGrade): AnswerGrade;
/**
 * Layer 09's contribution to the Trust score.
 *
 * `null` when no interview was conducted or nothing could be graded — the same
 * rule Layer 08 follows. A layer with no evidence lowers Confidence, never Trust.
 */
export declare function interviewStanding(result: InterviewResult): Unit | null;
//# sourceMappingURL=conduct.d.ts.map