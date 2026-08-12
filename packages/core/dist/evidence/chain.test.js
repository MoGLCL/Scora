import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import { EventSource } from "../events/envelope.js";
import { TrustLayer } from "../events/layers.js";
import { TrustEventType } from "../events/types.js";
import { AssessmentId, DeveloperId, EventId, SessionId, TaskId, TenantId, unsafeEpochMs, } from "../primitives/index.js";
import { ChainViolationCode, sealEvent, verifyChain, verifyEventHash } from "./chain.js";
const sha256 = (input) => createHash('sha256').update(input, 'utf8').digest('hex');
const BASE_TIME = 1_700_000_000_000;
function makeEvent(chainPosition, previousHash, overrides = {}) {
    const occurredAt = unsafeEpochMs(BASE_TIME + chainPosition * 1000);
    const unsealed = {
        eventId: EventId.unsafe(`evt_${String(chainPosition).padStart(6, '0')}`),
        tenantId: TenantId.unsafe('tnt_acme'),
        sessionId: SessionId.unsafe('sess_alpha'),
        developerId: DeveloperId.unsafe('dev_kata'),
        assessmentId: AssessmentId.unsafe('asm_one'),
        taskId: TaskId.unsafe('task_one'),
        type: TrustEventType.SESSION_HEARTBEAT,
        occurredAt,
        sequence: chainPosition,
        source: EventSource.SANDBOX,
        schemaVersion: 1,
        payload: { intervalMs: 5000, bufferedEventCount: 0 },
        layer: TrustLayer.ENVIRONMENT,
        chainPosition,
        receivedAt: occurredAt,
        clockOffsetMs: 0,
        occurredAtNormalized: occurredAt,
        redactedFields: [],
        ...overrides,
    };
    return sealEvent(unsealed, previousHash, sha256);
}
function makeChain(length) {
    const events = [];
    let previousHash = null;
    for (let chainPosition = 1; chainPosition <= length; chainPosition += 1) {
        const event = makeEvent(chainPosition, previousHash);
        events.push(event);
        previousHash = event.integrity.hash;
    }
    return events;
}
describe('event sealing', () => {
    it('verifies an untouched event', () => {
        assert.equal(verifyEventHash(makeEvent(1, null), sha256), true);
    });
    it('detects a mutated payload', () => {
        const event = makeEvent(1, null);
        const tampered = {
            ...event,
            payload: { intervalMs: 5000, bufferedEventCount: 99 },
        };
        assert.equal(verifyEventHash(tampered, sha256), false);
    });
    it('detects a mutated timestamp, since timing is itself evidence', () => {
        const event = makeEvent(1, null);
        const tampered = {
            ...event,
            occurredAtNormalized: unsafeEpochMs(BASE_TIME + 999_999),
        };
        assert.equal(verifyEventHash(tampered, sha256), false);
    });
    it('detects redaction metadata being altered after the fact', () => {
        const event = makeEvent(1, null);
        const tampered = { ...event, redactedFields: ['payload.secret'] };
        assert.equal(verifyEventHash(tampered, sha256), false);
    });
    it('produces the same hash regardless of payload key order', () => {
        const first = makeEvent(1, null, { payload: { intervalMs: 5000, bufferedEventCount: 0 } });
        const second = makeEvent(1, null, { payload: { bufferedEventCount: 0, intervalMs: 5000 } });
        assert.equal(first.integrity.hash, second.integrity.hash);
    });
});
describe('verifyChain', () => {
    it('accepts an empty log', () => {
        const result = verifyChain([], sha256);
        assert.equal(result.intact, true);
        assert.equal(result.eventsChecked, 0);
        assert.equal(result.headHash, null);
    });
    it('accepts a well-formed chain and reports its head', () => {
        const events = makeChain(5);
        const result = verifyChain(events, sha256);
        assert.equal(result.intact, true);
        assert.deepEqual(result.violations, []);
        assert.equal(result.eventsChecked, 5);
        assert.equal(result.headHash, events[4].integrity.hash);
    });
    it('verifies correctly regardless of the order events are supplied in', () => {
        const events = makeChain(4);
        const shuffled = [events[2], events[0], events[3], events[1]];
        assert.equal(verifyChain(shuffled, sha256).intact, true);
    });
    it('flags an edited event in the middle of the chain', () => {
        const events = makeChain(5);
        events[2] = { ...events[2], payload: { intervalMs: 1, bufferedEventCount: 0 } };
        const result = verifyChain(events, sha256);
        assert.equal(result.intact, false);
        const codes = result.violations.map((violation) => violation.code);
        assert.ok(codes.includes(ChainViolationCode.HASH_MISMATCH));
    });
    it('flags a removed event as a broken link, not merely a gap', () => {
        const events = makeChain(5);
        const withHole = [...events.slice(0, 2), ...events.slice(3)];
        const result = verifyChain(withHole, sha256);
        assert.equal(result.intact, false);
        const codes = result.violations.map((violation) => violation.code);
        assert.ok(codes.includes(ChainViolationCode.BROKEN_LINK));
        assert.ok(codes.includes(ChainViolationCode.CHAIN_POSITION_GAP));
    });
    it('treats lost telemetry as a gap that lowers confidence without breaking integrity', () => {
        // The producer emitted sequence 3 and it never arrived. The chain itself is
        // whole, because the engine assigns chain positions only to what it received.
        const first = makeEvent(1, null);
        const second = makeEvent(2, first.integrity.hash);
        const third = makeEvent(3, second.integrity.hash, { sequence: 4 });
        const result = verifyChain([first, second, third], sha256);
        assert.equal(result.intact, true, 'a delivery gap is not tampering');
        assert.deepEqual(result.missingSequences, [3]);
        assert.deepEqual(result.violations, []);
    });
    it('does not invent a gap when two producers each number from one', () => {
        // The sandbox and the browser agent both emit sequence 1. Pooling their
        // streams would read one producer's numbering as the other's missing events.
        const first = makeEvent(1, null);
        const second = makeEvent(2, first.integrity.hash, {
            source: EventSource.BROWSER_AGENT,
            sequence: 1,
        });
        const third = makeEvent(3, second.integrity.hash, { sequence: 2 });
        const result = verifyChain([first, second, third], sha256);
        assert.equal(result.intact, true);
        assert.deepEqual(result.missingSequences, []);
    });
    it('rejects a first event that does not declare itself genesis', () => {
        const forged = makeEvent(1, 'a'.repeat(64));
        const result = verifyChain([forged], sha256);
        assert.equal(result.intact, false);
        assert.deepEqual(result.violations.map((violation) => violation.code), [ChainViolationCode.INVALID_GENESIS]);
    });
    it('allows verifying a window that starts mid-session', () => {
        const events = makeChain(6);
        const result = verifyChain(events.slice(2), sha256);
        assert.equal(result.intact, true);
    });
    it('flags two events claiming the same chain position', () => {
        const first = makeEvent(1, null);
        const second = makeEvent(2, first.integrity.hash);
        const collision = makeEvent(2, first.integrity.hash, {
            eventId: EventId.unsafe('evt_collision'),
        });
        const result = verifyChain([first, second, collision], sha256);
        assert.equal(result.intact, false);
        assert.ok(result.violations.some((violation) => violation.code === ChainViolationCode.CHAIN_POSITION_DUPLICATE), 'only this engine assigns chain positions, so a collision cannot be an accident');
    });
    it('tolerates a repeated producer sequence within one chain', () => {
        // A sandbox that restarts mid-session may begin counting again. That is
        // lost context, not evidence of tampering.
        const first = makeEvent(1, null);
        const second = makeEvent(2, first.integrity.hash, { sequence: 1 });
        const result = verifyChain([first, second], sha256);
        assert.equal(result.intact, true);
    });
    it('refuses to verify events from two sessions as one chain', () => {
        const events = makeChain(3);
        const foreign = makeEvent(4, events[2].integrity.hash, {
            sessionId: SessionId.unsafe('sess_other'),
        });
        const result = verifyChain([...events, foreign], sha256);
        assert.equal(result.intact, false);
        assert.ok(result.violations.some((violation) => violation.code === ChainViolationCode.SESSION_MIXING));
    });
    it('reports every violation rather than stopping at the first', () => {
        const events = makeChain(6);
        events[1] = { ...events[1], payload: { intervalMs: 2, bufferedEventCount: 0 } };
        events[4] = { ...events[4], payload: { intervalMs: 3, bufferedEventCount: 0 } };
        const result = verifyChain(events, sha256);
        const mismatches = result.violations.filter((violation) => violation.code === ChainViolationCode.HASH_MISMATCH);
        assert.equal(mismatches.length, 2, 'a reviewer must see the full extent of the damage');
    });
});
//# sourceMappingURL=chain.test.js.map