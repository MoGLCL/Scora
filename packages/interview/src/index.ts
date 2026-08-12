/**
 * @scora/trust-interview — Layer 09: the AI interview.
 *
 *   session events → grounded questions → graded answers → ownership verdict
 *
 * The strongest available evidence of ownership is a developer explaining their
 * own work. Every question is derived from something the session recorded, and
 * the grade that matters is whether the explanation matches the artefact — not
 * whether it was fluent.
 *
 * The examiner is a **port**. The model that phrases questions and grades
 * answers is configured by the tenant administrator; this package supplies the
 * grounding, enforces the floors, and never reaches for a network.
 */

export {
  AnswerOutcome,
  DIFFICULTY_ORDER,
  Difficulty,
  InterviewVerdict,
  NO_EXAMINER,
  QuestionTopic,
  difficultyOrdinal,
  type AnswerGrade,
  type Examiner,
  type GradingRequest,
  type InterviewAnswer,
  type InterviewExchange,
  type InterviewQuestion,
  type InterviewResult,
  type RawGrade,
} from './contract.ts';

export {
  MAX_QUESTIONS,
  adjustDifficulty,
  planInterview,
  type DifficultyReason,
  type PlanOptions,
} from './plan.ts';

export {
  CONSISTENT_THRESHOLD,
  INCONSISTENT_THRESHOLD,
  INTERVIEW_POLICY_VERSION,
  MINIMUM_ANSWER_WORDS,
  MINIMUM_GRADED_ANSWERS,
  MINIMUM_GRADER_CONFIDENCE,
  conductInterview,
  interviewStanding,
  normaliseGrade,
  type AnsweredText,
  type ConductOptions,
} from './conduct.ts';
