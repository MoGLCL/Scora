import { TrustEventType } from '@scora/trust-core';
import { extractFeatures } from '@scora/trust-features';
import { TEST_CONTEXT, buildSession, hexHash, payloads, type EventSpec } from '@scora/trust-features/testing';

/**
 * Session archetypes shared by the scoring tests.
 *
 * Defined once so that a change in what "an honest solo session" looks like
 * cannot be quietly made in one test while another keeps asserting the old
 * shape.
 */

export const sessionStart: EventSpec = {
  type: TrustEventType.SESSION_STARTED,
  at: 0,
  payload: payloads.sessionStart(),
};

/** A developer working alone: typing, correcting, debugging, testing. */
export const HONEST_SOLO: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.FILE_OPENED, at: 2_000, payload: { path: 'src/app.ts', language: 'typescript', lineCount: 40 } },
  { type: TrustEventType.NAVIGATION_JUMP, at: 4_000, payload: { kind: 'definition', fromPath: 'src/app.ts', toPath: 'src/lib.ts' } },
  { type: TrustEventType.TYPING_BURST, at: 8_000, payload: payloads.typingBurst(420, 60_000, 140) },
  { type: TrustEventType.TEXT_INSERTED, at: 68_000, payload: payloads.insert(420, 18) },
  { type: TrustEventType.BACKSPACE_BURST, at: 72_000, payload: { path: 'src/app.ts', backspaceCount: 55, durationMs: 5_000 } },
  { type: TrustEventType.TYPING_BURST, at: 80_000, payload: payloads.typingBurst(300, 42_000, 160) },
  { type: TrustEventType.TEXT_INSERTED, at: 124_000, payload: payloads.insert(300, 12) },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 126_000, payload: payloads.diff(18, 5) },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 140_000, payload: payloads.diff(9, 4) },
  { type: TrustEventType.REFACTOR_DETECTED, at: 150_000, payload: { path: 'src/app.ts', kind: 'extract_function', affectedLines: 14, behaviourPreserved: true } },
  { type: TrustEventType.CODE_EXECUTION_STARTED, at: 160_000, payload: { executionId: 'x1', trigger: 'manual', entryPoint: 'src/app.ts' } },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 162_000, payload: payloads.error('boom') },
  { type: TrustEventType.BREAKPOINT_SET, at: 168_000, payload: { path: 'src/app.ts', line: 41, proximityToErrorLines: 1 } },
  { type: TrustEventType.FIX_ATTEMPTED, at: 175_000, payload: { errorSignatureHash: hexHash('boom'), attemptNumber: 1, path: 'src/app.ts', charactersChanged: 60, timeSinceErrorMs: 13_000 } },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 178_000, payload: payloads.diff(3, 3) },
  { type: TrustEventType.ERROR_RESOLVED, at: 190_000, payload: payloads.errorResolved('boom', 2, 28_000) },
  { type: TrustEventType.TEST_RUN_STARTED, at: 195_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 200_000, payload: payloads.testFinished('r1', 12, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 205_000, payload: { taskId: 'task_test', durationMs: 205_000, finalDigest: 'a'.repeat(64), testsPassing: 12, testsTotal: 12 } },
];

/** The same developer, additionally reading documentation. */
export const HONEST_WITH_DOCS: readonly EventSpec[] = [
  ...HONEST_SOLO.slice(0, 4),
  { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 5_000, payload: payloads.externalVisit('v1', 'official_documentation') },
  { type: TrustEventType.EXTERNAL_RESOURCE_DWELL, at: 6_000, payload: { visitId: 'v1', category: 'official_documentation', dwellMs: 75_000, returnVisitNumber: 1 } },
  { type: TrustEventType.EXTERNAL_RESOURCE_LEFT, at: 7_000, payload: { visitId: 'v1', totalDwellMs: 75_000 } },
  { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 100_000, payload: payloads.externalVisit('v2', 'official_documentation') },
  { type: TrustEventType.EXTERNAL_RESOURCE_DWELL, at: 101_000, payload: { visitId: 'v2', category: 'official_documentation', dwellMs: 30_000, returnVisitNumber: 2 } },
  ...HONEST_SOLO.slice(4),
];

/** Heavy but well-controlled use of editor completions. */
export const HEAVY_ASSISTANCE_ENGAGED: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 5_000, payload: payloads.suggestionShown('s1', 1, 14) },
  { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 5_200, payload: payloads.suggestionAccepted('s1', 1, 14, 200) },
  { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 12_000, payload: payloads.suggestionShown('s2', 6, 280) },
  { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 17_000, payload: payloads.suggestionAccepted('s2', 6, 280, 5_000) },
  { type: TrustEventType.AI_SUGGESTION_MODIFIED, at: 40_000, payload: payloads.suggestionModified('s2', 0.55) },
  { type: TrustEventType.AI_SUGGESTION_TESTED, at: 70_000, payload: payloads.suggestionTested('s2') },
  { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 80_000, payload: payloads.suggestionShown('s3', 8, 320) },
  { type: TrustEventType.AI_SUGGESTION_REJECTED, at: 84_000, payload: { suggestionId: 's3', deliberationMs: 4_000, reason: 'replaced_with_own' } },
  { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 90_000, payload: payloads.suggestionShown('s4', 4, 160) },
  { type: TrustEventType.AI_SUGGESTION_PARTIALLY_ACCEPTED, at: 94_000, payload: { suggestionId: 's4', path: 'src/app.ts', charactersOffered: 160, charactersAccepted: 70, acceptedRatio: 0.44, deliberationMs: 4_000 } },
  { type: TrustEventType.TYPING_BURST, at: 100_000, payload: payloads.typingBurst(380, 30_000, 79) },
  { type: TrustEventType.TEXT_INSERTED, at: 132_000, payload: payloads.insert(380, 15) },
  { type: TrustEventType.BACKSPACE_BURST, at: 136_000, payload: { path: 'src/app.ts', backspaceCount: 30, durationMs: 3_000 } },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 140_000, payload: payloads.diff(20, 7) },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 150_000, payload: payloads.error('nre') },
  { type: TrustEventType.ERROR_RESOLVED, at: 180_000, payload: payloads.errorResolved('nre', 1, 30_000) },
  { type: TrustEventType.TEST_RUN_STARTED, at: 185_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 190_000, payload: payloads.testFinished('r1', 9, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 195_000, payload: { taskId: 'task_test', durationMs: 195_000, finalDigest: 'a'.repeat(64), testsPassing: 9, testsTotal: 9 } },
];

/** The pattern the platform is genuinely concerned with. */
export const DEPENDENT: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 5_000, payload: payloads.externalVisit('v1', 'ai_tool') },
  { type: TrustEventType.EXTERNAL_RESOURCE_LEFT, at: 30_000, payload: { visitId: 'v1', totalDwellMs: 25_000 } },
  { type: TrustEventType.EXTERNAL_ORIGIN_IMPORT, at: 38_000, payload: payloads.externalImport('v1', 'ai_tool', 2_400, 0.01) },
  { type: TrustEventType.LARGE_INSERTION, at: 38_500, payload: payloads.largeInsertion(2_400, 82, 'paste') },
  { type: TrustEventType.CODE_PASTE, at: 38_600, payload: payloads.paste(2_400, 82, 'external') },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 39_000, payload: payloads.diff(82, 0) },
  { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 50_000, payload: payloads.suggestionShown('s1', 14, 620) },
  { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 50_100, payload: payloads.suggestionAccepted('s1', 14, 620, 100) },
  { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 55_000, payload: payloads.suggestionShown('s2', 10, 400) },
  { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 55_080, payload: payloads.suggestionAccepted('s2', 10, 400, 80) },
  { type: TrustEventType.TASK_SUBMITTED, at: 60_000, payload: { taskId: 'task_test', durationMs: 60_000, finalDigest: 'a'.repeat(64), testsPassing: null, testsTotal: null } },
];

/**
 * A genuinely fast, experienced developer: ~60ms per keystroke, accepting
 * completions almost instantly because they recognise correct output on sight.
 *
 * The single most important false-positive guard in the suite. Every behaviour
 * here is one a naive detector would flag, and none of it is evidence of
 * anything. If this session ever draws an adverse recommendation, the engine is
 * punishing competence.
 */
export const FAST_DEVELOPER: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.TYPING_BURST, at: 3_000, payload: payloads.typingBurst(900, 54_000, 60) },
  { type: TrustEventType.TEXT_INSERTED, at: 58_000, payload: payloads.insert(900, 34) },
  { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 60_000, payload: payloads.suggestionShown('s1', 1, 12) },
  { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 60_090, payload: payloads.suggestionAccepted('s1', 1, 12, 90) },
  { type: TrustEventType.AI_SUGGESTION_SHOWN, at: 62_000, payload: payloads.suggestionShown('s2', 1, 18) },
  { type: TrustEventType.AI_SUGGESTION_ACCEPTED, at: 62_070, payload: payloads.suggestionAccepted('s2', 1, 18, 70) },
  { type: TrustEventType.TYPING_BURST, at: 70_000, payload: payloads.typingBurst(700, 40_000, 57) },
  { type: TrustEventType.TEXT_INSERTED, at: 112_000, payload: payloads.insert(700, 26) },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 114_000, payload: payloads.diff(34, 6) },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 120_000, payload: payloads.diff(12, 8) },
  { type: TrustEventType.REFACTOR_DETECTED, at: 126_000, payload: { path: 'src/app.ts', kind: 'rename_symbol', affectedLines: 9, behaviourPreserved: true } },
  { type: TrustEventType.TEST_RUN_STARTED, at: 130_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 134_000, payload: payloads.testFinished('r1', 14, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 140_000, payload: { taskId: 'task_test', durationMs: 140_000, finalDigest: 'a'.repeat(64), testsPassing: 14, testsTotal: 14 } },
];

/**
 * Slow, error-prone, lots of retries — and honest throughout.
 *
 * Struggling is not a trust problem. Low capability must surface as low skill
 * confidence, never as risk, and never as a recommendation against the person.
 */
export const STRUGGLING_BEGINNER: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.TYPING_BURST, at: 5_000, payload: payloads.typingBurst(140, 120_000, 860) },
  { type: TrustEventType.TEXT_INSERTED, at: 128_000, payload: payloads.insert(140, 9) },
  { type: TrustEventType.BACKSPACE_BURST, at: 135_000, payload: { path: 'src/app.ts', backspaceCount: 95, durationMs: 14_000 } },
  { type: TrustEventType.IDLE_PERIOD_DETECTED, at: 150_000, payload: { idleMs: 180_000, precededBy: 'typing' } },
  { type: TrustEventType.TYPING_BURST, at: 340_000, payload: payloads.typingBurst(110, 95_000, 790) },
  { type: TrustEventType.TEXT_INSERTED, at: 440_000, payload: payloads.insert(110, 7) },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 450_000, payload: payloads.error('type_err') },
  { type: TrustEventType.FIX_ATTEMPTED, at: 470_000, payload: { errorSignatureHash: hexHash('type_err'), attemptNumber: 1, path: 'src/app.ts', charactersChanged: 25, timeSinceErrorMs: 20_000 } },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 490_000, payload: payloads.error('type_err') },
  { type: TrustEventType.FIX_ATTEMPTED, at: 520_000, payload: { errorSignatureHash: hexHash('type_err'), attemptNumber: 2, path: 'src/app.ts', charactersChanged: 40, timeSinceErrorMs: 30_000 } },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 540_000, payload: payloads.error('type_err') },
  { type: TrustEventType.FIX_ATTEMPTED, at: 580_000, payload: { errorSignatureHash: hexHash('type_err'), attemptNumber: 3, path: 'src/app.ts', charactersChanged: 55, timeSinceErrorMs: 40_000 } },
  { type: TrustEventType.ERROR_RESOLVED, at: 610_000, payload: payloads.errorResolved('type_err', 3, 160_000) },
  { type: TrustEventType.TEST_RUN_STARTED, at: 620_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 626_000, payload: payloads.testFinished('r1', 4, 3) },
  { type: TrustEventType.TASK_SUBMITTED, at: 640_000, payload: { taskId: 'task_test', durationMs: 640_000, finalDigest: 'a'.repeat(64), testsPassing: 4, testsTotal: 7 } },
];

/** Almost nothing arrived — the engine must decline to judge. */
export const SPARSE: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.SANDBOX_DISCONNECTED, at: 5_000, payload: { reason: 'network', lastAcknowledgedSequence: 1 } },
];

export function scoreOf(specs: readonly EventSpec[]) {
  return extractFeatures(buildSession(specs), TEST_CONTEXT);
}
