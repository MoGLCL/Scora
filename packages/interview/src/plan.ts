import {
  AiAssistanceEventType,
  CodeEvolutionEventType,
  RuntimeEventType,
  SkillEventType,
  TrustLayer,
  type EventId,
  type TrustEvent,
} from '@scora/trust-core';
import type { SkillAssessment } from '@scora/trust-skills';
import { SkillVerdict } from '@scora/trust-skills';
import {
  Difficulty,
  QuestionTopic,
  difficultyOrdinal,
  type InterviewQuestion,
} from './contract.ts';

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
export const MAX_QUESTIONS = 8;

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
export function planInterview(
  events: readonly TrustEvent[],
  options: PlanOptions = {},
): readonly InterviewQuestion[] {
  const limit = options.maxQuestions ?? MAX_QUESTIONS;
  const candidates = [
    ...unverifiedAssistedRegions(events),
    ...resolvedErrors(events),
    ...refactors(events),
    ...dependencies(events),
    ...unresolvedSkillClaims(options.skills),
  ];

  return candidates
    .filter((question) => question.groundedIn.length > 0)
    .sort((a, b) => b.groundedIn.length - a.groundedIn.length)
    .slice(0, limit)
    .map((question, index) => ({ ...question, questionId: `q_${String(index + 1).padStart(2, '0')}` }));
}

/**
 * Completions accepted, then neither modified nor tested nor executed.
 *
 * The single most useful thing to ask about, and the reason needs saying: this
 * is **not** an accusation. Accepting a completion whole is what completions are
 * for. But it is the one region where the session itself contains no evidence
 * either way about understanding, so it is where a question adds the most. A
 * developer who explains it converts an open question into positive evidence.
 */
function unverifiedAssistedRegions(events: readonly TrustEvent[]): readonly Draft[] {
  const accepted = new Map<string, { eventId: EventId; lines: number; path: string }>();
  const verified = new Set<string>();

  for (const event of events) {
    const payload = event.payload as {
      suggestionId?: unknown;
      linesAccepted?: unknown;
      path?: unknown;
    };
    const suggestionId = typeof payload.suggestionId === 'string' ? payload.suggestionId : null;
    if (suggestionId === null) continue;

    if (event.type === AiAssistanceEventType.AI_SUGGESTION_ACCEPTED) {
      accepted.set(suggestionId, {
        eventId: event.eventId,
        lines: typeof payload.linesAccepted === 'number' ? payload.linesAccepted : 0,
        path: typeof payload.path === 'string' ? payload.path : 'the file',
      });
      continue;
    }

    if (
      event.type === AiAssistanceEventType.AI_SUGGESTION_MODIFIED ||
      event.type === AiAssistanceEventType.AI_SUGGESTION_TESTED ||
      event.type === AiAssistanceEventType.AI_SUGGESTION_DELETED
    ) {
      verified.add(suggestionId);
    }
  }

  return [...accepted.entries()]
    .filter(([suggestionId]) => !verified.has(suggestionId))
    // Small completions are member accesses and imports. Asking someone to
    // explain a two-line completion is noise, and it reads as harassment.
    .filter(([, region]) => region.lines >= 4)
    .map(([, region]) => ({
      topic: QuestionTopic.AI_ASSISTED_REGION,
      difficulty: Difficulty.MEDIUM,
      groundedIn: [region.eventId],
      subject: `Walk through the block you added to ${region.path} — what it does and why it is written that way.`,
      sourceLayer: TrustLayer.AI_ASSISTANCE,
      expectedPoints: [
        'What the code does, in their own words',
        'Why this approach rather than an alternative',
        'What would break if it were removed',
      ],
      skillId: null,
    }));
}

/**
 * Errors the developer diagnosed and fixed.
 *
 * The best positive-evidence question in the set: someone who fixed a bug can
 * almost always say what caused it, and the answer is hard to fake because it
 * refers to a specific failure that actually occurred.
 */
function resolvedErrors(events: readonly TrustEvent[]): readonly Draft[] {
  const observed = events.filter((event) => event.type === RuntimeEventType.RUNTIME_ERROR_OBSERVED);
  const resolved = events.filter((event) => event.type === RuntimeEventType.ERROR_RESOLVED);

  return resolved.map((event) => {
    const payload = event.payload as { errorSignatureHash?: unknown; attemptsRequired?: unknown };
    const signature =
      typeof payload.errorSignatureHash === 'string' ? payload.errorSignatureHash : '';
    const origin = observed.find((candidate) => {
      const observedPayload = candidate.payload as { signatureHash?: unknown };
      return observedPayload.signatureHash === signature;
    });
    const attempts = typeof payload.attemptsRequired === 'number' ? payload.attemptsRequired : 1;

    return {
      topic: QuestionTopic.BUG_CAUSE,
      difficulty: attempts > 3 ? Difficulty.HARD : Difficulty.MEDIUM,
      groundedIn: origin === undefined ? [event.eventId] : [origin.eventId, event.eventId],
      subject: 'Describe the error you hit during this task: what caused it, and how you confirmed the fix.',
      sourceLayer: TrustLayer.RUNTIME,
      expectedPoints: [
        'The root cause, not just the symptom',
        'What was changed to fix it',
        'How the fix was verified',
      ],
      skillId: null,
    };
  });
}

function refactors(events: readonly TrustEvent[]): readonly Draft[] {
  return events
    .filter((event) => event.type === CodeEvolutionEventType.REFACTOR_DETECTED)
    .map((event) => {
      const payload = event.payload as { kind?: unknown; path?: unknown };
      const kind = typeof payload.kind === 'string' ? payload.kind.replace(/_/g, ' ') : 'restructure';
      return {
        topic: QuestionTopic.IMPLEMENTATION_CHOICE,
        difficulty: Difficulty.MEDIUM,
        groundedIn: [event.eventId],
        subject: `You restructured working code (${kind}). What was wrong with the earlier shape?`,
        sourceLayer: TrustLayer.CODE_EVOLUTION,
        expectedPoints: [
          'What problem the earlier structure had',
          'What the new structure buys',
          'Why it was worth doing mid-task',
        ],
        skillId: null,
      };
    });
}

function dependencies(events: readonly TrustEvent[]): readonly Draft[] {
  return events
    .filter((event) => event.type === CodeEvolutionEventType.DEPENDENCY_ADDED)
    .map((event) => {
      const payload = event.payload as { packageName?: unknown };
      const name = typeof payload.packageName === 'string' ? payload.packageName : 'a dependency';
      return {
        topic: QuestionTopic.LIBRARY_CHOICE,
        difficulty: Difficulty.EASY,
        groundedIn: [event.eventId],
        subject: `You added ${name}. What does it give you that the standard library does not?`,
        sourceLayer: TrustLayer.CODE_EVOLUTION,
        expectedPoints: [
          'What the dependency is for',
          'What the alternative would have been',
          'Awareness of its cost',
        ],
        skillId: null,
      };
    });
}

/**
 * Claims Layer 08 could not settle.
 *
 * The handoff that makes `NOT_EXERCISED` useful rather than merely honest: a
 * skill the session never touched becomes a question here, which is how an
 * unverified claim gets resolved instead of sitting unresolved on a report.
 */
function unresolvedSkillClaims(assessment: SkillAssessment | undefined): readonly Draft[] {
  if (assessment === undefined) return [];

  return assessment.findings
    .filter(
      (finding) =>
        finding.verdict === SkillVerdict.NOT_EXERCISED ||
        finding.verdict === SkillVerdict.INDETERMINATE ||
        finding.levelGap > 1,
    )
    .map((finding) => ({
      topic: QuestionTopic.FUNCTION_EXPLANATION,
      difficulty: Difficulty.MEDIUM,
      // A NOT_EXERCISED finding has no evidence by definition, so the claim
      // event itself is the grounding — the developer's own assertion is a fact
      // about the session, and asking about it is fair.
      groundedIn: finding.claim.claimedIn === null ? [] : [finding.claim.claimedIn],
      subject: `You listed ${finding.claim.skillName} at ${finding.claim.claimedLevel}. Describe a problem you have solved with it.`,
      sourceLayer: TrustLayer.SKILL,
      expectedPoints: [
        'A specific problem rather than a general description',
        'Technical detail proportionate to the claimed level',
        'Awareness of the limits of the approach',
      ],
      skillId: finding.claim.skillId,
    }));
}

interface Draft extends Omit<InterviewQuestion, 'questionId'> {}

/**
 * The next difficulty, given how the last answer went.
 *
 * Adaptive in both directions and asymmetric on purpose: difficulty rises on
 * sustained strength and falls on a single sign of struggle. An interview that
 * ratchets upward until the developer fails has measured only where their
 * ceiling is, which is not what this layer is for.
 */
export function adjustDifficulty(
  current: Difficulty,
  consistency: number,
  graderConfidence: number,
): { readonly next: Difficulty; readonly reason: DifficultyReason } {
  // A grader that is unsure is not evidence about the developer.
  if (graderConfidence < 0.5) {
    return { next: current, reason: 'time' };
  }

  const ordinal = difficultyOrdinal(current);
  if (consistency >= 0.75 && ordinal < DIFFICULTY_MAX) {
    return { next: DIFFICULTY_AT(ordinal + 1), reason: 'strong_understanding' };
  }
  if (consistency < 0.4 && ordinal > 0) {
    return { next: DIFFICULTY_AT(ordinal - 1), reason: 'uncertainty_detected' };
  }
  return { next: current, reason: consistency < 0.4 ? 'uncertainty_detected' : 'time' };
}

export type DifficultyReason =
  | 'strong_understanding'
  | 'uncertainty_detected'
  | 'inconsistency'
  | 'time';

const DIFFICULTY_MAX = 3;

function DIFFICULTY_AT(ordinal: number): Difficulty {
  return (
    [Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD, Difficulty.EXPERT][ordinal] ??
    Difficulty.MEDIUM
  );
}
