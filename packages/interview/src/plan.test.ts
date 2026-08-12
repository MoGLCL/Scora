import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  AiAssistanceEventType,
  CodeEvolutionEventType,
  RuntimeEventType,
  SkillEventType,
  TrustLayer,
  unsafeEpochMs,
} from '@scora/trust-core';
import { T0, buildSession, payloads, type EventSpec } from '@scora/trust-features/testing';
import { assessSkills } from '@scora/trust-skills';
import {
  AnswerOutcome,
  Difficulty,
  InterviewVerdict,
  QuestionTopic,
  type AnswerGrade,
  type Examiner,
  type InterviewQuestion,
} from './contract.ts';
import {
  MAX_QUESTIONS,
  adjustDifficulty,
  planInterview,
} from './plan.ts';
import {
  CONSISTENT_THRESHOLD,
  conductInterview,
  interviewStanding,
  normaliseGrade,
} from './conduct.ts';

/**
 * Layer 09 against real sessions.
 *
 * The tests are named for the people they protect: the developer who never
 * touched a completion, the one who accepted one and can explain it, the one
 * who answers in monosyllables, the one who answers fluently about code that is
 * not theirs.
 */

const TS = 'skill_ts';

const accepted = (lines: number, at: number): EventSpec => ({
  type: AiAssistanceEventType.AI_SUGGESTION_ACCEPTED,
  at,
  payload: {
    suggestionId: 'sugg_1',
    path: 'src/app.ts',
    charactersAccepted: lines * 40,
    linesAccepted: lines,
    candidateIndex: 0,
    deliberationMs: 12_000,
  },
});

const modified = (at: number): EventSpec => ({
  type: AiAssistanceEventType.AI_SUGGESTION_MODIFIED,
  at,
  payload: { suggestionId: 'sugg_1', path: 'src/app.ts', charactersChanged: 40, linesChanged: 2, modificationRatio: 0.5, msAfterAcceptance: 60_000 },
});

const tested = (at: number): EventSpec => ({
  type: AiAssistanceEventType.AI_SUGGESTION_TESTED,
  at,
  payload: { suggestionId: 'sugg_1', verificationKind: 'test_run', msAfterAcceptance: 45_000, outcome: 'success' },
});

const errorObserved = (signature: string, at: number): EventSpec => ({
  type: RuntimeEventType.RUNTIME_ERROR_OBSERVED,
  at,
  payload: payloads.error(signature),
});

const errorResolvedEvent = (signature: string, at: number): EventSpec => ({
  type: RuntimeEventType.ERROR_RESOLVED,
  at,
  payload: payloads.errorResolved(signature, 2, 90_000),
});

const refactor = (at: number): EventSpec => ({
  type: CodeEvolutionEventType.REFACTOR_DETECTED,
  at,
  payload: { path: 'src/app.ts', kind: 'extract_function', affectedLines: 24, behaviourPreserved: true },
});

const dependency = (at: number): EventSpec => ({
  type: CodeEvolutionEventType.DEPENDENCY_ADDED,
  at,
  payload: { ecosystem: 'npm', packageName: 'zod', versionSpec: '^3.23' },
});

function claimed(skillId: string, name: string, level: string, at: number): EventSpec {
  return {
    type: SkillEventType.SKILL_CLAIMED,
    at,
    payload: { skillId, skillName: name, claimedLevel: level, claimedYears: 4 },
  };
}

function taskStarted(targetSkills: readonly string[], at: number): EventSpec {
  return { type: SkillEventType.TASK_STARTED, at, payload: { taskId: 'task_a', difficulty: 'medium', targetSkills, language: 'typescript' } };
}

function taskSubmitted(at: number): EventSpec {
  return { type: SkillEventType.TASK_SUBMITTED, at, payload: { taskId: 'task_a', durationMs: 600_000, finalDigest: 'a'.repeat(64), testsPassing: 8, testsTotal: 8 } };
}

function plan(specs: readonly EventSpec[], skills?: ReturnType<typeof assessSkills>) {
  return planInterview(buildSession(specs), skills === undefined ? {} : { skills });
}

/** An examiner that grades honestly: it agrees or disagrees, at fixed confidence. */
function honestExaminer(
  consistency: number,
  confidence = 0.9,
  specificity = 0.8,
  depth = 0.7,
): Examiner {
  return {
    async phrase(question) {
      return question.subject;
    },
    async grade(request) {
      return {
        questionId: request.question.questionId,
        correctness: consistency,
        depth,
        specificity,
        consistencyWithCode: consistency,
        graderConfidence: confidence,
        graderModel: 'test-examiner',
        rationale: 'test examiner',
      };
    },
  };
}

async function interview(
  planQuestions: readonly InterviewQuestion[],
  examiner: Examiner,
  answers: (question: InterviewQuestion) => Promise<string | null>,
) {
  return conductInterview(planQuestions, {
    interviewId: 'interview_1',
    assessedAt: unsafeEpochMs(T0 + 3_600_000),
    examiner,
    collect: async (question, _text) => {
      const answer = await answers(question);
      if (answer === null) return null;
      return { text: answer, responseMs: 60_000 };
    },
  });
}

const WORDY_ANSWER = 'I wrote this to parse the input and normalize the shape before the handler runs, so the downstream code stays simple and the tests stay deterministic. It throws when the payload is malformed instead of letting invalid data propagate.';

describe('the plan', () => {
  it('asks about an accepted completion that was never modified or tested', () => {
    const questions = plan([
      taskStarted([TS], 0),
      accepted(12, 60_000),
      testsPassed(),
      taskSubmitted(300_000),
    ]);

    const assisted = questions.find((q) => q.topic === QuestionTopic.AI_ASSISTED_REGION);
    assert.ok(assisted !== undefined, 'expected an AI-assisted-region question');
    assert.equal(assisted.sourceLayer, TrustLayer.AI_ASSISTANCE);
    assert.equal(assisted.groundedIn.length, 1);
    assert.equal(assisted.skillId, null);
  });

  it('has no questions when the session offered nothing to ground on', () => {
    const questions = plan([taskStarted([], 0), taskSubmitted(60_000)]);
    assert.deepEqual(questions, []);
  });

  it('does not ask about a completion the developer subsequently tested', () => {
    const questions = plan([
      taskStarted([TS], 0),
      accepted(12, 60_000),
      tested(120_000),
      testsPassed(),
      taskSubmitted(300_000),
    ]);

    assert.ok(!questions.some((q) => q.topic === QuestionTopic.AI_ASSISTED_REGION));
  });

  it('does not ask about a completion the developer rewrote', () => {
    const questions = plan([
      taskStarted([TS], 0),
      accepted(12, 60_000),
      modified(90_000),
      testsPassed(),
      taskSubmitted(300_000),
    ]);

    assert.ok(!questions.some((q) => q.topic === QuestionTopic.AI_ASSISTED_REGION));
  });

  it('does not ask about a two-line completion, which is member access', () => {
    const questions = plan([taskStarted([TS], 0), accepted(2, 60_000), taskSubmitted(300_000)]);

    assert.ok(!questions.some((q) => q.topic === QuestionTopic.AI_ASSISTED_REGION));
  });

  it('asks about the bug the developer fixed', () => {
    const questions = plan([
      taskStarted([TS], 0),
      errorObserved('boom', 60_000),
      errorResolvedEvent('boom', 120_000),
      taskSubmitted(300_000),
    ]);

    const bug = questions.find((q) => q.topic === QuestionTopic.BUG_CAUSE);
    assert.ok(bug !== undefined);
    assert.equal(bug.groundedIn.length, 2);
    assert.match(bug.subject, /describe the error/i);
  });

  it('asks about the dependency the developer added', () => {
    const questions = plan([taskStarted([TS], 0), dependency(120_000), taskSubmitted(300_000)]);

    const lib = questions.find((q) => q.topic === QuestionTopic.LIBRARY_CHOICE);
    assert.ok(lib !== undefined);
    assert.match(lib.subject, /zod/);
  });

  it('asks about the refactor the developer performed', () => {
    const questions = plan([taskStarted([TS], 0), refactor(120_000), taskSubmitted(300_000)]);

    const impl = questions.find((q) => q.topic === QuestionTopic.IMPLEMENTATION_CHOICE);
    assert.ok(impl !== undefined);
    assert.match(impl.subject, /restructured working code/);
  });

  it('turns an unexercised skill claim into a question, grounded in the claim event', () => {
    const events = buildSession([
      claimed(TS, 'TypeScript', 'advanced', 0),
      taskStarted([], 60_000),
      taskSubmitted(300_000),
    ]);
    const skills = assessSkills(events, { assessedAt: unsafeEpochMs(T0 + 3_600_000) });

    const questions = planInterview(events, { skills });

    const skill = questions.find((q) => q.skillId === TS);
    assert.ok(skill !== undefined);
    assert.match(skill.subject, /TypeScript/);
    assert.equal(skill.groundedIn.length, 1);
    assert.equal(skill.groundedIn[0], events[0]?.eventId);
  });

  it('stays silent about a skill the session corroborated', () => {
    const events = buildSession([
      claimed(TS, 'TypeScript', 'advanced', 0),
      taskStarted([TS], 1_000),
      testsPassed(),
      taskSubmitted(300_000),
      {
        type: SkillEventType.VERIFICATION_CHALLENGE_RESULT,
        at: 400_000,
        payload: { challengeId: 'chal_1', skillId: TS, passed: true, score: 0.95, durationMs: 120_000, usedAssistance: false },
      },
    ]);
    const skills = assessSkills(events, { assessedAt: unsafeEpochMs(T0 + 3_600_000) });

    const questions = planInterview(events, { skills });

    assert.ok(!questions.some((q) => q.skillId === TS));
  });

  it('caps the plan at a sane size, however rich the session', () => {
    const questions = plan([
      taskStarted([TS], 0),
      accepted(12, 10_000),
      accepted(20, 20_000),
      accepted(30, 30_000),
      accepted(40, 40_000),
      accepted(50, 50_000),
      accepted(60, 60_000),
      accepted(70, 70_000),
      accepted(80, 80_000),
      accepted(90, 90_000),
      errorObserved('a', 100_000),
      errorResolvedEvent('a', 110_000),
      errorObserved('b', 120_000),
      errorResolvedEvent('b', 130_000),
      dependency(140_000),
      taskSubmitted(300_000),
    ]);

    assert.ok(questions.length <= MAX_QUESTIONS);
    assert.ok(questions.length >= 4);
  });
});

describe('adaptation', () => {
  it('rises on sustained strength and falls on a single sign of struggle', () => {
    const up = adjustDifficulty(Difficulty.MEDIUM, 0.9, 0.9);
    assert.equal(up.next, Difficulty.HARD);
    assert.equal(up.reason, 'strong_understanding');

    const down = adjustDifficulty(Difficulty.HARD, 0.2, 0.9);
    assert.equal(down.next, Difficulty.MEDIUM);
    assert.equal(down.reason, 'uncertainty_detected');
  });

  it('does not move above expert or below easy', () => {
    assert.equal(adjustDifficulty(Difficulty.EXPERT, 0.99, 0.9).next, Difficulty.EXPERT);
    assert.equal(adjustDifficulty(Difficulty.EASY, 0.0, 0.9).next, Difficulty.EASY);
  });

  it('refuses to adapt on a grader that is not confident', () => {
    const result = adjustDifficulty(Difficulty.MEDIUM, 0.9, 0.3);
    assert.equal(result.next, Difficulty.MEDIUM);
    assert.equal(result.reason, 'time');
  });
});

describe('grading', () => {
  it('discards a grade below the grader-confidence floor', () => {
    const normalised = normaliseGrade({
      questionId: 'q_01',
      correctness: 0.9,
      depth: 0.9,
      specificity: 0.9,
      consistencyWithCode: 0.9,
      graderConfidence: 0.3,
      graderModel: 'test',
      rationale: 'maybe?',
    });

    assert.equal(normalised.outcome, AnswerOutcome.UNGRADED);
    assert.match(normalised.rationale, /not scored/);
  });

  it('clamps a grader that claims certainty it has not earned', () => {
    const normalised = normaliseGrade({
      questionId: 'q_01',
      correctness: 2,
      depth: -1,
      specificity: 1.5,
      consistencyWithCode: 0.9,
      graderConfidence: 1.7,
      graderModel: 'test',
      rationale: 'certain',
    });

    assert.ok(normalised.correctness <= 1);
    assert.ok(normalised.depth >= 0);
    assert.ok(normalised.specificity <= 1);
    assert.ok(normalised.graderConfidence <= 1);
  });

  it('decides the outcome itself, whatever the provider would have called it', () => {
    // The port has no `outcome` field, so a provider cannot declare an answer
    // consistent. The engine reads it from the score and its own threshold.
    const consistent = normaliseGrade({
      questionId: 'q_01',
      correctness: 0.2,
      depth: 0.2,
      specificity: 0.2,
      consistencyWithCode: 0.9,
      graderConfidence: 0.9,
      graderModel: 'test',
      rationale: 'shallow but theirs',
    });
    assert.equal(consistent.outcome, AnswerOutcome.CONSISTENT);

    const inconsistent = normaliseGrade({
      questionId: 'q_02',
      correctness: 0.95,
      depth: 0.95,
      specificity: 0.95,
      consistencyWithCode: 0.1,
      graderConfidence: 0.9,
      graderModel: 'test',
      rationale: 'fluent about other code',
    });
    assert.equal(inconsistent.outcome, AnswerOutcome.INCONSISTENT);
  });
});

describe('the interview', () => {
  it('is NOT_CONDUCTED with no questions at all, not a failed interview', async () => {
    const result = await interview([], honestExaminer(0.9), async () => WORDY_ANSWER);

    assert.equal(result.verdict, InterviewVerdict.NOT_CONDUCTED);
    assert.equal(result.ownership, null);
    assert.equal(interviewStanding(result), null);
  });

  it('is INCONCLUSIVE when too few answers could be graded', async () => {
    const result = await interview(
      plan([
        taskStarted([TS], 0),
        accepted(12, 60_000),
        errorObserved('boom', 120_000),
        errorResolvedEvent('boom', 180_000),
        taskSubmitted(300_000),
      ]),
      honestExaminer(0.9),
      async () => null,
    );

    assert.equal(result.verdict, InterviewVerdict.INCONCLUSIVE);
    assert.equal(result.ownership, null);
    assert.match(result.limitations.join(' '), /not a failed interview/);
  });

  it('is INCONCLUSIVE when every answer is too short to grade', async () => {
    const result = await interview(
      plan([
        taskStarted([TS], 0),
        accepted(12, 60_000),
        errorObserved('boom', 120_000),
        errorResolvedEvent('boom', 180_000),
        taskSubmitted(300_000),
      ]),
      honestExaminer(0.9),
      async () => 'yes',
    );

    assert.equal(result.verdict, InterviewVerdict.INCONCLUSIVE);
    assert.ok(result.exchanges.every((e) => e.grade?.outcome === AnswerOutcome.NOT_ANSWERED));
  });

  it('demonstrates ownership when explanations match the artefact', async () => {
    const result = await interview(
      plan([
        taskStarted([TS], 0),
        accepted(12, 60_000),
        errorObserved('boom', 120_000),
        errorResolvedEvent('boom', 180_000),
        dependency(200_000),
        taskSubmitted(300_000),
      ]),
      honestExaminer(0.9),
      async () => WORDY_ANSWER,
    );

    assert.equal(result.verdict, InterviewVerdict.DEMONSTRATES_OWNERSHIP);
    assert.ok((result.ownership ?? 0) >= CONSISTENT_THRESHOLD);
    assert.ok(result.confidence > 0);
  });

  it('flags a fluent explanation of code that is not theirs', async () => {
    const result = await interview(
      plan([
        taskStarted([TS], 0),
        accepted(12, 60_000),
        errorObserved('boom', 120_000),
        errorResolvedEvent('boom', 180_000),
        dependency(200_000),
        taskSubmitted(300_000),
      ]),
      honestExaminer(0.1, 0.95),
      async () => WORDY_ANSWER,
    );

    assert.equal(result.verdict, InterviewVerdict.EXPLANATION_INCONSISTENT);
    assert.match(result.summary, /described something other than what the session shows/);
  });

  it('reads a single inconsistent answer as a person misremembering', async () => {
    // One low answer out of several high ones is not a pattern. It is the
    // difference between a dishonest developer and a tired one.
    const examiner: Examiner = {
      async phrase(question) {
        return question.subject;
      },
      async grade(request) {
        const low = request.question.topic === QuestionTopic.BUG_CAUSE;
        const grade = low ? 0.1 : 0.9;
        return {
          questionId: request.question.questionId,
          correctness: grade,
          depth: 0.7,
          specificity: 0.7,
          consistencyWithCode: grade,
          graderConfidence: 0.9,
          graderModel: 'test-examiner',
          rationale: 'test',
        };
      },
    };

    const result = await interview(
      plan([
        taskStarted([TS], 0),
        accepted(12, 60_000),
        errorObserved('boom', 120_000),
        errorResolvedEvent('boom', 180_000),
        dependency(200_000),
        taskSubmitted(300_000),
      ]),
      examiner,
      async () => WORDY_ANSWER,
    );

    // Not an accusation. The mean lands at 0.63 — a little under the threshold
    // for DEMONSTRATES_OWNERSHIP — so this reads as PARTIAL_OWNERSHIP, which the
    // contract calls common and not adverse. What must never happen is
    // EXPLANATION_INCONSISTENT, the verdict that sends a human to look for fraud.
    assert.notEqual(result.verdict, InterviewVerdict.EXPLANATION_INCONSISTENT);
    assert.equal(result.verdict, InterviewVerdict.PARTIAL_OWNERSHIP);
    assert.ok((result.ownership ?? 0) > 0.5, 'two strong answers should still carry the aggregate');
    assert.doesNotMatch(result.summary, /described something other than/);
  });

  it('applies the requested starting difficulty and adapts forward', async () => {
    const questions = plan([
      taskStarted([TS], 0),
      accepted(12, 60_000),
      errorObserved('boom', 120_000),
      errorResolvedEvent('boom', 180_000),
      dependency(200_000),
      taskSubmitted(300_000),
    ]);
    assert.ok(questions.length > 1, 'adaptation needs more than one question to be visible');

    const result = await conductInterview(questions, {
      interviewId: 'interview_1',
      assessedAt: unsafeEpochMs(T0 + 3_600_000),
      examiner: honestExaminer(0.9),
      startingDifficulty: Difficulty.EASY,
      collect: async () => ({ text: WORDY_ANSWER, responseMs: 60_000 }),
    });

    assert.equal(result.exchanges[0]?.question.difficulty, Difficulty.EASY);
    assert.ok(
      result.exchanges.some((exchange) => exchange.question.difficulty !== Difficulty.EASY),
      'expected the difficulty to adapt upward',
    );
  });

  it('reports topics the interview never reached', async () => {
    const result = await interview(
      plan([taskStarted([TS], 0), accepted(12, 60_000), taskSubmitted(300_000)]),
      honestExaminer(0.9),
      async () => WORDY_ANSWER,
    );

    assert.ok(result.notCovered.includes(QuestionTopic.BUG_CAUSE));
    assert.ok(!result.notCovered.includes(QuestionTopic.AI_ASSISTED_REGION));
  });

  it('never claims certainty, however well it went', async () => {
    const result = await interview(
      plan([
        taskStarted([TS], 0),
        accepted(12, 60_000),
        errorObserved('boom', 120_000),
        errorResolvedEvent('boom', 180_000),
        dependency(200_000),
        taskSubmitted(300_000),
      ]),
      honestExaminer(1, 1),
      async () => WORDY_ANSWER,
    );

    assert.ok(result.confidence < 1);
    assert.equal(result.policyVersion, 'interview-1.0.0');
  });
});

function testsPassed(): EventSpec {
  return { type: RuntimeEventType.TEST_RUN_FINISHED, at: 200_000, payload: payloads.testFinished('run_1', 8, 0) };
}
