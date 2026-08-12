import { clampUnit, type EpochMs, type Unit } from '@scora/trust-core';
import {
  AnswerOutcome,
  Difficulty,
  InterviewVerdict,
  NO_EXAMINER,
  QuestionTopic,
  type AnswerGrade,
  type Examiner,
  type InterviewAnswer,
  type InterviewExchange,
  type InterviewQuestion,
  type InterviewResult,
  type RawGrade,
} from './contract.ts';
import { adjustDifficulty, type DifficultyReason } from './plan.ts';

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

export const INTERVIEW_POLICY_VERSION = 'interview-1.0.0';

/** Below this, the grader's own uncertainty makes its grade unusable. */
export const MINIMUM_GRADER_CONFIDENCE = 0.5;

/** Shorter than this and there is nothing to grade. */
export const MINIMUM_ANSWER_WORDS = 5;

/** Consistency at or above this reads as an explanation matching the artefact. */
export const CONSISTENT_THRESHOLD = 0.65;

/** Below this the explanation describes something other than what they wrote. */
export const INCONSISTENT_THRESHOLD = 0.35;

/** Fewer graded answers than this and the interview concludes nothing. */
export const MINIMUM_GRADED_ANSWERS = 2;

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
export async function conductInterview(
  plan: readonly InterviewQuestion[],
  options: ConductOptions,
): Promise<InterviewResult> {
  const examiner = options.examiner ?? NO_EXAMINER;
  const exchanges: InterviewExchange[] = [];
  const adjustments: DifficultyReason[] = [];
  let difficulty = options.startingDifficulty ?? Difficulty.MEDIUM;

  for (const planned of plan) {
    const question: InterviewQuestion = { ...planned, difficulty };
    const text = await examiner.phrase(question);
    const answered = await options.collect(question, text);

    if (answered === null) {
      exchanges.push({ question, answer: null, grade: null });
      continue;
    }

    const answer: InterviewAnswer = {
      questionId: question.questionId,
      responseMs: answered.responseMs,
      wordCount: countWords(answered.text),
      transcriptRef: answered.transcriptRef ?? null,
    };

    if (answer.wordCount < MINIMUM_ANSWER_WORDS) {
      exchanges.push({ question, answer, grade: notAnswered(question.questionId) });
      continue;
    }

    const raw = await examiner.grade({
      question,
      answerText: answered.text,
      responseMs: answered.responseMs,
    });
    const grade = normaliseGrade(raw);
    exchanges.push({ question, answer, grade });

    const adjusted = adjustDifficulty(difficulty, grade.consistencyWithCode, grade.graderConfidence);
    if (adjusted.next !== difficulty) adjustments.push(adjusted.reason);
    difficulty = adjusted.next;
  }

  return summarise(exchanges, options);
}

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
export function normaliseGrade(grade: RawGrade): AnswerGrade {
  const graderConfidence = clampUnit(grade.graderConfidence);

  if (graderConfidence < MINIMUM_GRADER_CONFIDENCE) {
    return {
      questionId: grade.questionId,
      outcome: AnswerOutcome.UNGRADED,
      correctness: clampUnit(grade.correctness),
      depth: clampUnit(grade.depth),
      specificity: clampUnit(grade.specificity),
      consistencyWithCode: clampUnit(grade.consistencyWithCode),
      graderConfidence,
      graderModel: grade.graderModel,
      rationale:
        `The grader reported ${graderConfidence.toFixed(2)} confidence, below the ` +
        `${String(MINIMUM_GRADER_CONFIDENCE)} floor, so this answer was not scored. ` +
        `Original note: ${grade.rationale}`,
    };
  }

  const consistency = clampUnit(grade.consistencyWithCode);
  return {
    questionId: grade.questionId,
    correctness: clampUnit(grade.correctness),
    depth: clampUnit(grade.depth),
    specificity: clampUnit(grade.specificity),
    consistencyWithCode: consistency,
    graderConfidence,
    graderModel: grade.graderModel,
    rationale: grade.rationale,
    outcome:
      consistency >= CONSISTENT_THRESHOLD
        ? AnswerOutcome.CONSISTENT
        : consistency <= INCONSISTENT_THRESHOLD
          ? AnswerOutcome.INCONSISTENT
          : AnswerOutcome.PARTIAL,
  };
}

function summarise(
  exchanges: readonly InterviewExchange[],
  options: ConductOptions,
): InterviewResult {
  const graded = exchanges
    .map((exchange) => exchange.grade)
    .filter((grade): grade is AnswerGrade => grade !== null && isGraded(grade));

  const base = {
    interviewId: options.interviewId,
    assessedAt: options.assessedAt,
    exchanges,
    notCovered: uncoveredTopics(exchanges),
    policyVersion: INTERVIEW_POLICY_VERSION,
  };

  if (exchanges.length === 0) {
    return {
      ...base,
      verdict: InterviewVerdict.NOT_CONDUCTED,
      ownership: null,
      confidence: clampUnit(0),
      limitations: [
        'No interview was conducted. This layer contributes nothing, in either direction.',
      ],
      summary: 'No interview took place.',
    };
  }

  if (graded.length < MINIMUM_GRADED_ANSWERS) {
    return {
      ...base,
      verdict: InterviewVerdict.INCONCLUSIVE,
      ownership: null,
      confidence: clampUnit(0),
      limitations: [
        `Only ${String(graded.length)} answer(s) could be graded, below the ${String(MINIMUM_GRADED_ANSWERS)} needed to conclude anything. ` +
          'An interview that could not be graded is not a failed interview.',
      ],
      summary: 'The interview did not produce enough gradeable answers to reach a conclusion.',
    };
  }

  const ownership = clampUnit(
    graded.reduce((sum, grade) => sum + grade.consistencyWithCode, 0) / graded.length,
  );
  const inconsistent = graded.filter(
    (grade) => grade.outcome === AnswerOutcome.INCONSISTENT,
  ).length;

  // A pattern, not an incident. One inconsistent answer out of six is a person
  // misremembering what they wrote an hour ago.
  const patternOfInconsistency = inconsistent >= 2 && inconsistent > graded.length / 2;

  const verdict = patternOfInconsistency
    ? InterviewVerdict.EXPLANATION_INCONSISTENT
    : ownership >= CONSISTENT_THRESHOLD
      ? InterviewVerdict.DEMONSTRATES_OWNERSHIP
      : InterviewVerdict.PARTIAL_OWNERSHIP;

  return {
    ...base,
    verdict,
    ownership,
    confidence: confidenceOf(graded, exchanges.length),
    limitations: limitationsOf(exchanges, graded),
    summary: summaryOf(verdict, graded.length, exchanges.length, inconsistent),
  };
}

function summaryOf(
  verdict: InterviewVerdict,
  graded: number,
  asked: number,
  inconsistent: number,
): string {
  switch (verdict) {
    case InterviewVerdict.DEMONSTRATES_OWNERSHIP:
      return `Explained their own work consistently across ${String(graded)} of ${String(asked)} questions.`;
    case InterviewVerdict.EXPLANATION_INCONSISTENT:
      return (
        `${String(inconsistent)} of ${String(graded)} graded answers described something other than what the session shows. ` +
        'This is a question for a human reviewer, not a conclusion.'
      );
    default:
      return `Explained parts of their work; ${String(graded)} of ${String(asked)} questions produced a gradeable answer.`;
  }
}

/**
 * Confidence in the interview as a whole.
 *
 * Scales with the graders' own confidence, how many questions were gradeable,
 * and how many were asked at all. A two-question interview is not a confident
 * assessment however well it went.
 */
function confidenceOf(graded: readonly AnswerGrade[], asked: number): Unit {
  if (graded.length === 0) return clampUnit(0);

  const meanGrader = graded.reduce((sum, grade) => sum + grade.graderConfidence, 0) / graded.length;
  const answerRate = graded.length / Math.max(1, asked);
  // Four questions is where an interview starts to be worth believing.
  const breadth = Math.min(1, graded.length / 4);
  return clampUnit(meanGrader * answerRate * (0.5 + 0.5 * breadth));
}

function limitationsOf(
  exchanges: readonly InterviewExchange[],
  graded: readonly AnswerGrade[],
): readonly string[] {
  const limitations: string[] = [];
  const unanswered = exchanges.filter((exchange) => exchange.answer === null).length;
  const ungraded = exchanges.filter(
    (exchange) => exchange.grade !== null && exchange.grade.outcome === AnswerOutcome.UNGRADED,
  ).length;

  if (graded.length < 4) {
    limitations.push(
      `Only ${String(graded.length)} answers were graded. Read the individual exchanges rather than the aggregate.`,
    );
  }
  if (unanswered > 0) {
    limitations.push(
      `${String(unanswered)} question(s) went unanswered. An unanswered question carries no penalty and no information.`,
    );
  }
  if (ungraded > 0) {
    limitations.push(
      `${String(ungraded)} answer(s) were discarded because the grader was not confident enough to score them.`,
    );
  }

  limitations.push(
    'Interview performance reflects the ability to explain under time pressure, which is not the same as the ability to write code. ' +
      'Treat a weak interview as a prompt for human review, never as a finding on its own.',
  );

  return limitations;
}

function uncoveredTopics(exchanges: readonly InterviewExchange[]): readonly QuestionTopic[] {
  const covered = new Set(exchanges.map((exchange) => exchange.question.topic));
  return Object.values(QuestionTopic).filter((topic) => !covered.has(topic));
}

function isGraded(grade: AnswerGrade): boolean {
  return grade.outcome !== AnswerOutcome.UNGRADED && grade.outcome !== AnswerOutcome.NOT_ANSWERED;
}

function notAnswered(questionId: string): AnswerGrade {
  return {
    questionId,
    outcome: AnswerOutcome.NOT_ANSWERED,
    correctness: clampUnit(0),
    depth: clampUnit(0),
    specificity: clampUnit(0),
    consistencyWithCode: clampUnit(0),
    graderConfidence: clampUnit(0),
    graderModel: 'none',
    rationale: 'The answer was too short to grade. This carries no penalty.',
  };
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Layer 09's contribution to the Trust score.
 *
 * `null` when no interview was conducted or nothing could be graded — the same
 * rule Layer 08 follows. A layer with no evidence lowers Confidence, never Trust.
 */
export function interviewStanding(result: InterviewResult): Unit | null {
  if (result.ownership === null) return null;
  return result.ownership;
}
