import { AssessmentId, DeveloperId, EventId, SessionId, TaskId, TenantId, describeEvent, sealEvent, unsafeEpochMs, validateSubmission, EVENT_SCHEMA_VERSION, EventSource, } from '@scora/trust-core';
import { nodeCrypto } from '@scora/trust-core/node';
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
export function hexHash(label) {
    let out = '';
    for (const char of label)
        out += char.charCodeAt(0).toString(16).padStart(2, '0');
    return out.slice(0, 64).padEnd(64, '0');
}
export function buildSession(specs) {
    const events = [];
    let previousHash = null;
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
            throw new Error(`Test built an event the engine would reject (${spec.type}): ${JSON.stringify(validated.error.issues)}`);
        }
        const event = sealEvent({
            ...validated.value,
            layer: describeEvent(validated.value.type).layer,
            // Synthetic sessions have a single producer, so chain position and
            // sequence coincide here. They do not in general.
            chainPosition: sequence,
            receivedAt: unsafeEpochMs(occurredAt),
            clockOffsetMs: 0,
            occurredAtNormalized: unsafeEpochMs(occurredAt),
            redactedFields: [],
        }, previousHash, nodeCrypto.sha256);
        previousHash = event.integrity.hash;
        events.push(event);
    }
    return events;
}
/** Picks a producer permitted to assert the given event type. */
function sourceFor(type) {
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
export const TEST_CONTEXT = {
    tenantId: TEST_TENANT,
    sessionId: TEST_SESSION,
    developerId: TEST_DEVELOPER,
    taskId: TEST_TASK,
};
/** Common payload builders, so scenarios stay readable. */
export const payloads = {
    sessionStart: () => ({
        assessmentMode: 'unproctored',
        consentScopes: ['assessment'],
        viewportClass: 'large',
        userAgentFamily: 'Chrome',
        timezoneOffsetMinutes: 0,
    }),
    typingBurst: (chars, durationMs, meanInterval = 90) => ({
        path: 'src/app.ts',
        durationMs,
        charactersTyped: chars,
        keystrokeCount: chars,
        intervalVarianceMs: meanInterval * 0.6,
        meanIntervalMs: meanInterval,
    }),
    insert: (chars, lines, atLine = 1) => ({
        path: 'src/app.ts',
        charactersAdded: chars,
        linesAdded: lines,
        atLine,
    }),
    diff: (added, removed, path = 'src/app.ts') => ({
        path,
        fromDigest: HASH,
        toDigest: HASH,
        linesAdded: added,
        linesRemoved: removed,
        hunkCount: 1,
        largestHunkLines: added,
    }),
    largeInsertion: (chars, lines, method, path = 'src/app.ts') => ({
        path,
        charactersAdded: chars,
        linesAdded: lines,
        language: 'typescript',
        insertionMethod: method,
        baselineMultiple: null,
        contentHash: HASH,
    }),
    paste: (chars, lines, origin, path = 'src/app.ts') => ({
        path,
        charactersAdded: chars,
        linesAdded: lines,
        language: 'typescript',
        origin,
        contentHash: HASH,
    }),
    suggestionShown: (id, lines, chars) => ({
        suggestionId: id,
        path: 'src/app.ts',
        kind: 'member_completion',
        candidateCount: 4,
        charactersOffered: chars,
        linesOffered: lines,
        triggerKind: 'member_access',
    }),
    suggestionAccepted: (id, lines, chars, deliberationMs) => ({
        suggestionId: id,
        path: 'src/app.ts',
        charactersAccepted: chars,
        linesAccepted: lines,
        candidateIndex: 0,
        deliberationMs,
    }),
    suggestionModified: (id, ratio) => ({
        suggestionId: id,
        path: 'src/app.ts',
        charactersChanged: 40,
        linesChanged: 2,
        modificationRatio: ratio,
        msAfterAcceptance: 20_000,
    }),
    suggestionTested: (id) => ({
        suggestionId: id,
        verificationKind: 'test_run',
        msAfterAcceptance: 45_000,
        outcome: 'success',
    }),
    error: (signature, isRepeat = false) => ({
        errorId: `err_${signature}`,
        errorClass: 'TypeError',
        path: 'src/app.ts',
        line: 42,
        signatureHash: hexHash(signature),
        isRepeat,
    }),
    errorResolved: (signature, attempts, timeMs) => ({
        errorSignatureHash: hexHash(signature),
        attemptsRequired: attempts,
        timeToResolveMs: timeMs,
        verifiedBy: 'test_pass',
    }),
    testFinished: (runId, passed, failed) => ({
        runId,
        outcome: failed > 0 ? 'failure' : 'success',
        durationMs: 3_000,
        passed,
        failed,
        skipped: 0,
    }),
    externalVisit: (visitId, category) => ({
        category,
        domain: null,
        visitId,
    }),
    externalImport: (visitId, category, chars, adaptation) => ({
        visitId,
        category,
        path: 'src/app.ts',
        charactersAdded: chars,
        msSinceResourceLeft: 8_000,
        adaptationRatio: adaptation,
    }),
};
//# sourceMappingURL=testing.js.map