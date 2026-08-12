import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CodeEvolutionEventType,
  RuntimeEventType,
  SkillEventType,
  TrustLayer,
  unsafeEpochMs,
  type TrustEvent,
} from '@scora/trust-core';
import { buildSession, T0, HASH, hexHash, payloads, type EventSpec } from '@scora/trust-features/testing';
import { SkillLevel, SkillObservationKind, SkillVerdict } from './contract.ts';
import { collectClaims, observeSkills, taskWindows } from './observe.ts';
import { assessSkills, skillConfidence, skillStanding, suggestedQuestions } from './assess.ts';

/**
 * Layer 08 against real sessions.
 *
 * Every event here goes through the same `validateSubmission` and `sealEvent` the
 * ingestion path uses, so a scenario that runs in this file is one the sandbox can
 * actually produce. The tests are named for the developer they protect.
 */

const SQL = 'skill_sql';
const TS = 'skill_ts';

function claimed(skillId: string, name: string, level: string, at: number): EventSpec {
  return {
    type: SkillEventType.SKILL_CLAIMED,
    at,
    payload: { skillId, skillName: name, claimedLevel: level, claimedYears: 4 },
  };
}

function taskStarted(taskId: string, targetSkills: readonly string[], at: number): EventSpec {
  return {
    type: SkillEventType.TASK_STARTED,
    at,
    payload: { taskId, difficulty: 'medium', targetSkills, language: 'typescript' },
  };
}

function taskSubmitted(taskId: string, at: number): EventSpec {
  return {
    type: SkillEventType.TASK_SUBMITTED,
    at,
    payload: { taskId, durationMs: 600_000, finalDigest: HASH, testsPassing: 8, testsTotal: 8 },
  };
}

function challengeResult(skillId: string, passed: boolean, score: number, at: number): EventSpec {
  return {
    type: SkillEventType.VERIFICATION_CHALLENGE_RESULT,
    at,
    payload: {
      challengeId: 'chal_1',
      skillId,
      passed,
      score,
      durationMs: 120_000,
      usedAssistance: false,
    },
  };
}

const testsPassed = (at: number): EventSpec => ({
  type: RuntimeEventType.TEST_RUN_FINISHED,
  at,
  payload: payloads.testFinished('run_1', 8, 0),
});

const errorSeen = (signature: string, at: number): EventSpec => ({
  type: RuntimeEventType.RUNTIME_ERROR_OBSERVED,
  at,
  payload: payloads.error(signature),
});

const errorResolved = (signature: string, at: number): EventSpec => ({
  type: RuntimeEventType.ERROR_RESOLVED,
  at,
  payload: payloads.errorResolved(signature, 2, 90_000),
});

const regression = (at: number): EventSpec => ({
  type: RuntimeEventType.REGRESSION_DETECTED,
  at,
  payload: { previouslyPassingHash: hexHash('previously-passing'), detectedBy: 'test_failure' },
});

const refactor = (at: number): EventSpec => ({
  type: CodeEvolutionEventType.REFACTOR_DETECTED,
  at,
  payload: { path: 'src/app.ts', kind: 'extract_function', affectedLines: 24, behaviourPreserved: true },
});

const OPTIONS = { assessedAt: unsafeEpochMs(T0 + 3_600_000) };

function assess(specs: readonly EventSpec[]) {
  return assessSkills(buildSession(specs), OPTIONS);
}

function findingFor(events: readonly TrustEvent[], skillId: string) {
  const assessment = assessSkills(events, OPTIONS);
  const finding = assessment.findings.find((candidate) => candidate.claim.skillId === skillId);
  assert.ok(finding !== undefined, `no finding for ${skillId}`);
  return finding;
}

describe('a claim the session never touched', () => {
  it('is not held against the developer', () => {
    // The scenario this whole layer exists to get right: two skills claimed, one
    // task, and the task exercised only one of them.
    const assessment = assess([
      claimed(TS, 'TypeScript', 'advanced', 0),
      claimed(SQL, 'PostgreSQL', 'expert', 100),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      taskSubmitted('task_a', 300_000),
    ]);

    const sql = assessment.findings.find((finding) => finding.claim.skillId === SQL);
    assert.equal(sql?.verdict, SkillVerdict.NOT_EXERCISED);
    assert.equal(sql?.levelGap, 0);
    assert.equal(sql?.evidence.length, 0);
  });

  it('is excluded from the layer standing rather than counted as a failure', () => {
    // A developer who lists ten skills and demonstrates the two that were tested
    // must not score below one who listed two and demonstrated both.
    const honest = assess([
      claimed(TS, 'TypeScript', 'intermediate', 0),
      claimed(SQL, 'PostgreSQL', 'expert', 10),
      claimed('skill_go', 'Go', 'advanced', 20),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      errorResolved('boom', 150_000),
      taskSubmitted('task_a', 300_000),
    ]);
    const terse = assess([
      claimed(TS, 'TypeScript', 'intermediate', 0),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      errorResolved('boom', 150_000),
      taskSubmitted('task_a', 300_000),
    ]);

    assert.equal(skillStanding(honest), skillStanding(terse));
  });

  it('turns into an interview question rather than a penalty', () => {
    const assessment = assess([
      claimed(SQL, 'PostgreSQL', 'expert', 0),
      taskStarted('task_a', [TS], 1_000),
      taskSubmitted('task_a', 300_000),
    ]);

    assert.match(suggestedQuestions(assessment).join(' '), /PostgreSQL/);
  });

  it('leaves the layer with no standing at all when nothing was exercised', () => {
    // Not zero. Zero is a judgement; null is an absence, and the caller must be
    // made to handle it.
    const assessment = assess([claimed(SQL, 'PostgreSQL', 'expert', 0)]);

    assert.equal(skillStanding(assessment), null);
    assert.equal(skillConfidence(assessment), 0);
  });
});

describe('attribution', () => {
  it('attributes work only through the links the producer declared', () => {
    // No task declares SQL, so the passing tests say nothing about SQL — even
    // though a human might guess otherwise from the session as a whole.
    const events = buildSession([
      claimed(SQL, 'PostgreSQL', 'advanced', 0),
      claimed(TS, 'TypeScript', 'advanced', 10),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      refactor(150_000),
      taskSubmitted('task_a', 300_000),
    ]);

    const observations = observeSkills(events, collectClaims(events));
    assert.equal(observations.get(SQL), undefined);
    assert.ok((observations.get(TS) ?? []).length > 0);
  });

  it('ignores a link to a skill that was never claimed', () => {
    const events = buildSession([
      claimed(TS, 'TypeScript', 'advanced', 0),
      challengeResult('skill_never_claimed', true, 0.9, 1_000),
    ]);

    const observations = observeSkills(events, collectClaims(events));
    assert.equal(observations.get('skill_never_claimed'), undefined);
  });

  it('does not attribute work that happened outside any task window', () => {
    const events = buildSession([
      claimed(TS, 'TypeScript', 'advanced', 0),
      testsPassed(60_000),
      taskStarted('task_a', [TS], 120_000),
      taskSubmitted('task_a', 180_000),
      refactor(240_000),
    ]);

    const observations = observeSkills(events, collectClaims(events));
    assert.equal(observations.get(TS), undefined);
  });

  it('bounds task windows by chain position, not by wall-clock time', () => {
    // Timestamps come from the client. A window an attacker can stretch is a
    // window they can fill with someone else's good work.
    const events = buildSession([
      taskStarted('task_a', [TS], 5_000),
      testsPassed(1_000),
      taskSubmitted('task_a', 2_000),
    ]);

    const [window] = taskWindows(events);
    assert.ok(window !== undefined);
    assert.equal(window.startedAt, 1);
    assert.equal(window.endedAt, 3);
  });

  it('keeps an unsubmitted task open to the end of the log', () => {
    // Truncated telemetry is not an unfinished task, and dropping the window
    // would silently discard the developer's work.
    const events = buildSession([
      claimed(TS, 'TypeScript', 'intermediate', 0),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
    ]);

    const [window] = taskWindows(events);
    assert.equal(window?.endedAt, null);
    assert.ok((observeSkills(events, collectClaims(events)).get(TS) ?? []).length > 0);
  });
});

describe('claims', () => {
  it('takes the developer at their most recent word', () => {
    // Correcting your own self-assessment mid-session is what the form invites.
    const events = buildSession([
      claimed(TS, 'TypeScript', 'expert', 0),
      claimed(TS, 'TypeScript', 'intermediate', 60_000),
    ]);

    const claims = collectClaims(events);
    assert.equal(claims.length, 1);
    assert.equal(claims[0]?.claimedLevel, SkillLevel.INTERMEDIATE);
  });

  it('traces every claim back to the event that recorded it', () => {
    const events = buildSession([claimed(TS, 'TypeScript', 'advanced', 0)]);

    assert.equal(collectClaims(events)[0]?.claimedIn, events[0]?.eventId);
  });
});

describe('a session that evidences the claim', () => {
  it('corroborates from a passed targeted challenge', () => {
    const finding = findingFor(
      buildSession([
        claimed(TS, 'TypeScript', 'intermediate', 0),
        taskStarted('task_a', [TS], 1_000),
        testsPassed(120_000),
        errorResolved('boom', 150_000),
        taskSubmitted('task_a', 300_000),
        challengeResult(TS, true, 0.92, 400_000),
      ]),
      TS,
    );

    assert.equal(finding.verdict, SkillVerdict.CORROBORATED);
    assert.ok(finding.layersCorroborating.includes(TrustLayer.SKILL));
    assert.ok(finding.confidence > 0.5);
  });

  it('reads a struggle as a question, never as a contradiction on its own', () => {
    // Regressions plus unresolved errors, and no failed challenge. A hard
    // afternoon looks exactly like this.
    const finding = findingFor(
      buildSession([
        claimed(TS, 'TypeScript', 'expert', 0),
        taskStarted('task_a', [TS], 1_000),
        errorSeen('one', 60_000),
        errorSeen('two', 90_000),
        regression(120_000),
        taskSubmitted('task_a', 300_000),
      ]),
      TS,
    );

    assert.notEqual(finding.verdict, SkillVerdict.CONTRADICTED);
  });

  it('contradicts only when a designed challenge failed alongside it', () => {
    const finding = findingFor(
      buildSession([
        claimed(TS, 'TypeScript', 'expert', 0),
        taskStarted('task_a', [TS], 1_000),
        errorSeen('one', 60_000),
        errorSeen('two', 90_000),
        regression(120_000),
        taskSubmitted('task_a', 300_000),
        challengeResult(TS, false, 0.1, 400_000),
      ]),
      TS,
    );

    assert.equal(finding.verdict, SkillVerdict.CONTRADICTED);
    assert.ok(finding.layersCorroborating.length >= 2);
  });

  it('does not treat editor assistance during a challenge as a mark against it', () => {
    // Passing with IntelliSense available is a developer using their tools.
    const events = buildSession([
      claimed(TS, 'TypeScript', 'advanced', 0),
      {
        type: SkillEventType.VERIFICATION_CHALLENGE_RESULT,
        at: 100_000,
        payload: {
          challengeId: 'chal_1',
          skillId: TS,
          passed: true,
          score: 0.95,
          durationMs: 90_000,
          usedAssistance: true,
        },
      },
    ]);

    const observations = observeSkills(events, collectClaims(events)).get(TS) ?? [];
    assert.equal(observations[0]?.kind, SkillObservationKind.DEMONSTRATED);
    assert.match(observations[0]?.detail ?? '', /assistance available/);
  });
});

describe('the assessment as a whole', () => {
  it('leads with coverage when most claims went untested', () => {
    const assessment = assess([
      claimed(TS, 'TypeScript', 'advanced', 0),
      claimed(SQL, 'PostgreSQL', 'advanced', 10),
      claimed('skill_go', 'Go', 'advanced', 20),
      claimed('skill_k8s', 'Kubernetes', 'advanced', 30),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      taskSubmitted('task_a', 300_000),
    ]);

    assert.equal(assessment.coverage.claimed, 4);
    assert.equal(assessment.coverage.exercised, 1);
    assert.equal(assessment.coverage.notExercised, 3);
    assert.match(assessment.limitations[0] ?? '', /unverified, not disproved/);
  });

  it('says outright when it has verified nothing', () => {
    const assessment = assess([
      claimed(TS, 'TypeScript', 'advanced', 0),
      claimed(SQL, 'PostgreSQL', 'advanced', 10),
    ]);

    assert.match(assessment.limitations[0] ?? '', /verified nothing, in either direction/);
  });

  it('warns when every finding rests on incidental behaviour', () => {
    const assessment = assess([
      claimed(TS, 'TypeScript', 'intermediate', 0),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      taskSubmitted('task_a', 300_000),
    ]);

    assert.match(assessment.limitations.join(' '), /No verification challenges were issued/);
  });

  it('has nothing to say when nothing was claimed', () => {
    const assessment = assess([taskStarted('task_a', [], 0), taskSubmitted('task_a', 60_000)]);

    assert.equal(assessment.coverage.claimed, 0);
    assert.deepEqual(assessment.findings, []);
    assert.match(assessment.limitations[0] ?? '', /nothing for this layer to verify/);
  });

  it('scales confidence by how much of the inventory was exercised', () => {
    const narrow = assess([
      claimed(TS, 'TypeScript', 'intermediate', 0),
      claimed(SQL, 'PostgreSQL', 'advanced', 10),
      claimed('skill_go', 'Go', 'advanced', 20),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      taskSubmitted('task_a', 300_000),
      challengeResult(TS, true, 0.95, 400_000),
    ]);
    const complete = assess([
      claimed(TS, 'TypeScript', 'intermediate', 0),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      taskSubmitted('task_a', 300_000),
      challengeResult(TS, true, 0.95, 400_000),
    ]);

    assert.ok(skillConfidence(narrow) < skillConfidence(complete));
  });

  it('stamps the policy version, so a stored assessment stays readable', () => {
    const assessment = assess([claimed(TS, 'TypeScript', 'advanced', 0)]);

    assert.equal(assessment.policyVersion, 'skills-1.0.0');
    assert.equal(assessment.assessedAt, T0 + 3_600_000);
  });

  it('never reports certainty', () => {
    const assessment = assess([
      claimed(TS, 'TypeScript', 'beginner', 0),
      taskStarted('task_a', [TS], 1_000),
      testsPassed(120_000),
      errorResolved('boom', 150_000),
      refactor(180_000),
      taskSubmitted('task_a', 300_000),
      challengeResult(TS, true, 1, 400_000),
    ]);

    assert.ok(skillConfidence(assessment) < 1);
    assert.ok((assessment.findings[0]?.confidence ?? 1) < 1);
  });
});
