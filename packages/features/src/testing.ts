import {
  AssessmentId,
  DeveloperId,
  EventId,
  SessionId,
  TaskId,
  TenantId,
  describeEvent,
  sealEvent,
  unsafeEpochMs,
  validateSubmission,
  EVENT_SCHEMA_VERSION,
  EventSource,
  type TrustEvent,
  type TrustEventType,
} from '@scora/trust-core';
import { nodeCrypto } from '@scora/trust-core/node';
import type { ExtractionContext } from './window.ts';

/**
 * Synthetic session construction for tests and calibration.
 *
 * Every event is put through the real `validateSubmission` before being sealed,
 * so a test cannot accidentally assert on a payload shape the engine would
 * reject in production. If a scenario compiles and runs here, the sandbox can
 * actually send it.
 */

export const TEST_TENANT = TenantId.unsafe('tnt_test');
export const TEST_SESSION = SessionId.unsafe('sess_test');
export const TEST_DEVELOPER = DeveloperId.unsafe('dev_test');
export const TEST_ASSESSMENT = AssessmentId.unsafe('asm_test');
export const TEST_TASK = TaskId.unsafe('task_test');

/** 2024-01-15T10:00:00Z — a fixed origin so timings in tests are readable. */
export const T0 = 1_705_312_800_000;

export const HASH = 'a'.repeat(64);

/** Deterministic 64-char hex digest for a label, so test signatures are valid hashes. */
export function hexHash(label: string): string {
  let out = '';
  for (const char of label) out += char.charCodeAt(0).toString(16).padStart(2, '0');
  return out.slice(0, 64).padEnd(64, '0');
}

export interface EventSpec {
  readonly type: TrustEventType;
  /** Milliseconds after T0. */
  readonly at: number;
  readonly payload: Record<string, unknown>;
  readonly source?: EventSource;
}

export function buildSession(specs: readonly EventSpec[]): readonly TrustEvent[] {
  const events: TrustEvent[] = [];
  let previousHash: string | null = null;
  let sequence = 0;

  for (const spec of specs) {
    sequence += 1;
    const occurredAt = T0 + spec.at;
    const submission = {
      eventId: EventId.unsafe(`evt_${String(sequence).padStart(6, '0')}`),
      tenantId: TEST_TENANT,
      sessionId: TEST_SESSION,
      developerId: TEST_DEVELOPER,
      assessmentId: TEST_ASSESSMENT,
      taskId: TEST_TASK,
      type: spec.type,
      occurredAt,
      sequence,
      source: spec.source ?? sourceFor(spec.type),
      schemaVersion: EVENT_SCHEMA_VERSION,
      payload: spec.payload,
    };

    const validated = validateSubmission(submission);
    if (!validated.ok) {
      throw new Error(
        `Test built an event the engine would reject (${spec.type}): ${JSON.stringify(validated.error.issues)}`,
      );
    }

    const event = sealEvent(
      {
        ...validated.value,
        layer: describeEvent(validated.value.type).layer,
        // Synthetic sessions have a single producer, so chain position and
        // sequence coincide here. They do not in general.
        chainPosition: sequence,
        receivedAt: unsafeEpochMs(occurredAt),
        clockOffsetMs: 0,
        occurredAtNormalized: unsafeEpochMs(occurredAt),
        redactedFields: [],
      },
      previousHash,
      nodeCrypto.sha256,
    );

    previousHash = event.integrity.hash;
    events.push(event);
  }

  return events;
}

/** Picks a producer permitted to assert the given event type. */
function sourceFor(type: TrustEventType): EventSource {
  const layer = describeEvent(type).layer;
  switch (layer) {
    case 'L06_EXTERNAL_ACTIVITY':
      return EventSource.BROWSER_AGENT;
    case 'L08_SKILL_UNDERSTANDING':
    case 'L09_AI_INTERVIEW':
      return EventSource.AI_SERVICE;
    case 'L10_HUMAN_REVIEW':
      return EventSource.HUMAN;
    case 'L00_SYSTEM':
      return EventSource.SERVER;
    default:
      return EventSource.SANDBOX;
  }
}

export const TEST_CONTEXT: ExtractionContext = {
  tenantId: TEST_TENANT,
  sessionId: TEST_SESSION,
  developerId: TEST_DEVELOPER,
  taskId: TEST_TASK,
};

/** Common payload builders, so scenarios stay readable. */
export const payloads = {
  sessionStart: () => ({
    assessmentMode: 'unproctored' as const,
    consentScopes: ['assessment' as const],
    viewportClass: 'large' as const,
    userAgentFamily: 'Chrome',
    timezoneOffsetMinutes: 0,
  }),
  typingBurst: (chars: number, durationMs: number, meanInterval = 90) => ({
    path: 'src/app.ts',
    durationMs,
    charactersTyped: chars,
    keystrokeCount: chars,
    intervalVarianceMs: meanInterval * 0.6,
    meanIntervalMs: meanInterval,
  }),
  insert: (chars: number, lines: number, atLine = 1) => ({
    path: 'src/app.ts',
    charactersAdded: chars,
    linesAdded: lines,
    atLine,
  }),
  diff: (added: number, removed: number, path = 'src/app.ts') => ({
    path,
    fromDigest: HASH,
    toDigest: HASH,
    linesAdded: added,
    linesRemoved: removed,
    hunkCount: 1,
    largestHunkLines: added,
  }),
  largeInsertion: (chars: number, lines: number, method: string, path = 'src/app.ts') => ({
    path,
    charactersAdded: chars,
    linesAdded: lines,
    language: 'typescript',
    insertionMethod: method,
    baselineMultiple: null,
    contentHash: HASH,
  }),
  paste: (chars: number, lines: number, origin: string, path = 'src/app.ts') => ({
    path,
    charactersAdded: chars,
    linesAdded: lines,
    language: 'typescript',
    origin,
    contentHash: HASH,
  }),
  suggestionShown: (id: string, lines: number, chars: number) => ({
    suggestionId: id,
    path: 'src/app.ts',
    kind: 'member_completion' as const,
    candidateCount: 4,
    charactersOffered: chars,
    linesOffered: lines,
    triggerKind: 'member_access' as const,
  }),
  suggestionAccepted: (id: string, lines: number, chars: number, deliberationMs: number) => ({
    suggestionId: id,
    path: 'src/app.ts',
    charactersAccepted: chars,
    linesAccepted: lines,
    candidateIndex: 0,
    deliberationMs,
  }),
  suggestionModified: (id: string, ratio: number) => ({
    suggestionId: id,
    path: 'src/app.ts',
    charactersChanged: 40,
    linesChanged: 2,
    modificationRatio: ratio,
    msAfterAcceptance: 20_000,
  }),
  suggestionTested: (id: string) => ({
    suggestionId: id,
    verificationKind: 'test_run' as const,
    msAfterAcceptance: 45_000,
    outcome: 'success' as const,
  }),
  error: (signature: string, isRepeat = false) => ({
    errorId: `err_${signature}`,
    errorClass: 'TypeError',
    path: 'src/app.ts',
    line: 42,
    signatureHash: hexHash(signature),
    isRepeat,
  }),
  errorResolved: (signature: string, attempts: number, timeMs: number) => ({
    errorSignatureHash: hexHash(signature),
    attemptsRequired: attempts,
    timeToResolveMs: timeMs,
    verifiedBy: 'test_pass' as const,
  }),
  testFinished: (runId: string, passed: number, failed: number) => ({
    runId,
    outcome: failed > 0 ? ('failure' as const) : ('success' as const),
    durationMs: 3_000,
    passed,
    failed,
    skipped: 0,
  }),
  externalVisit: (visitId: string, category: string) => ({
    category,
    domain: null,
    visitId,
  }),
  externalImport: (visitId: string, category: string, chars: number, adaptation: number | null) => ({
    visitId,
    category,
    path: 'src/app.ts',
    charactersAdded: chars,
    msSinceResourceLeft: 8_000,
    adaptationRatio: adaptation,
  }),
};
