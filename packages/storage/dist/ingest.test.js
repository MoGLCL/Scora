import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EVENT_SCHEMA_VERSION, EventSource, TrustEventType, verifyChain, } from '@scora/trust-core';
import { fixedClock, nodeCrypto, sequentialIdGenerator, silentLogger, } from '@scora/trust-core/node';
import { DEV, SESSION, TENANT } from "./conformance.js";
import { createIngestion } from "./ingest.js";
import { inMemoryEventStore } from "./memory.js";
/**
 * Ingestion pipeline.
 *
 * These tests are written from the standpoint of a hostile network rather than a
 * hostile developer: batches arrive twice, out of order, half-malformed, or not
 * at all. None of that may be allowed to read as tampering, because a broken
 * chain is the strongest adverse signal the engine can produce and the network
 * is not evidence about the person.
 */
const T0 = 1_705_312_800_000;
function harness(consent) {
    const store = inMemoryEventStore();
    const ingestion = createIngestion({
        store,
        clock: fixedClock(T0 + 60_000),
        crypto: nodeCrypto,
        ids: sequentialIdGenerator('sys'),
        logger: silentLogger,
        ...(consent === undefined ? {} : { consent }),
    });
    return { store, ingestion };
}
/** An untrusted inbound submission, shaped as a sandbox would send it. */
function submission(sequence, overrides = {}) {
    return {
        eventId: `evt_${String(sequence).padStart(6, '0')}`,
        tenantId: TENANT,
        sessionId: SESSION,
        developerId: DEV,
        type: TrustEventType.SESSION_HEARTBEAT,
        occurredAt: T0 + sequence * 1_000,
        sequence,
        source: EventSource.SANDBOX,
        schemaVersion: EVENT_SCHEMA_VERSION,
        payload: { intervalMs: 5_000, bufferedEventCount: 0 },
        ...overrides,
    };
}
/** A Layer 06 submission, which requires the external_monitoring scope. */
function externalSubmission(sequence) {
    return submission(sequence, {
        type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED,
        source: EventSource.BROWSER_AGENT,
        payload: {
            category: 'official_documentation',
            domain: 'developer.mozilla.org',
            visitId: `visit_${sequence}`,
        },
    });
}
async function typesIn(store) {
    const events = await store.readSession(TENANT, SESSION);
    return events.map((event) => event.type);
}
describe('ingestion — the happy path', () => {
    it('seals a well-formed batch into a verifiable chain', async () => {
        const { store, ingestion } = harness();
        const result = await ingestion.ingest([submission(1), submission(2), submission(3)]);
        assert.equal(result.accepted, 3);
        assert.equal(result.duplicates, 0);
        assert.deepEqual(result.rejected, []);
        assert.equal(result.head?.sequence, 3);
        const stored = await store.readSession(TENANT, SESSION);
        const verification = verifyChain(stored, nodeCrypto.sha256);
        assert.equal(verification.intact, true, JSON.stringify(verification.violations));
    });
    it('continues the chain across separate calls', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([submission(1), submission(2)]);
        await ingestion.ingest([submission(3), submission(4)]);
        const stored = await store.readSession(TENANT, SESSION);
        assert.equal(stored.length, 4);
        assert.equal(verifyChain(stored, nodeCrypto.sha256).intact, true, 'a batch boundary is not a chain boundary');
    });
    it('sorts an out-of-order batch before chaining it', async () => {
        const { store, ingestion } = harness();
        // Arrival order is not emission order on a real network.
        await ingestion.ingest([submission(3), submission(1), submission(2)]);
        const stored = await store.readSession(TENANT, SESSION);
        assert.deepEqual(stored.map((event) => event.sequence), [1, 2, 3]);
        assert.equal(verifyChain(stored, nodeCrypto.sha256).intact, true);
    });
    it('normalises client timestamps by the known clock offset', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([submission(1)], { clockOffsetMs: 2_000 });
        const [stored] = await store.readSession(TENANT, SESSION);
        assert.equal(stored.clockOffsetMs, 2_000);
        assert.equal(stored.occurredAtNormalized, stored.occurredAt - 2_000);
    });
    it('records a null offset rather than pretending the timing is exact', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([submission(1)]);
        const [stored] = await store.readSession(TENANT, SESSION);
        assert.equal(stored.clockOffsetMs, null);
        assert.equal(stored.occurredAtNormalized, stored.occurredAt, 'an unknown offset lowers confidence; it does not invent a correction');
    });
});
describe('ingestion — retries must not look like tampering', () => {
    it('is idempotent on a replayed batch', async () => {
        const { store, ingestion } = harness();
        const batch = [submission(1), submission(2), submission(3)];
        await ingestion.ingest(batch);
        const replay = await ingestion.ingest(batch);
        assert.equal(replay.accepted, 0);
        assert.equal(replay.duplicates, 3);
        assert.equal((await store.readSession(TENANT, SESSION)).length, 3);
    });
    it('leaves the chain intact after a replay', async () => {
        const { store, ingestion } = harness();
        const batch = [submission(1), submission(2)];
        await ingestion.ingest(batch);
        await ingestion.ingest(batch);
        // The reason deduplication happens before sealing: re-sealing an event that
        // is already stored would compute a different previousHash and turn a
        // network retry into an apparent chain break.
        const verification = verifyChain(await store.readSession(TENANT, SESSION), nodeCrypto.sha256);
        assert.equal(verification.intact, true, JSON.stringify(verification.violations));
    });
    it('accepts the new half of a partially-replayed batch', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([submission(1), submission(2)]);
        const result = await ingestion.ingest([submission(2), submission(3), submission(4)]);
        assert.equal(result.accepted, 2);
        assert.equal(result.duplicates, 1);
        const stored = await store.readSession(TENANT, SESSION);
        assert.deepEqual(stored.map((event) => event.sequence), [1, 2, 3, 4]);
        assert.equal(verifyChain(stored, nodeCrypto.sha256).intact, true);
    });
});
describe('ingestion — malformed telemetry becomes evidence, not silence', () => {
    it('keeps the good events when one is malformed', async () => {
        const { store, ingestion } = harness();
        const result = await ingestion.ingest([
            submission(1),
            { eventId: 'evt_bad', type: 'NOT_A_REAL_EVENT' },
            submission(2),
        ]);
        assert.equal(result.accepted, 2, 'one bad event must not discard the batch');
        assert.equal(result.rejected.length, 1);
        assert.equal(result.rejected[0].code, 'UNKNOWN_EVENT_TYPE');
    });
    it('records the rejection in the log so confidence can fall', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([submission(1), submission(2, { payload: { intervalMs: -5 } })]);
        assert.ok((await typesIn(store)).includes(TrustEventType.EVENT_REJECTED), 'a session with partly broken telemetry must not read as clean');
    });
    it('does not copy the rejected payload into the record of it', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([
            submission(1),
            submission(2, { payload: { intervalMs: 5_000, secretField: 'do not store me' } }),
        ]);
        const events = await store.readSession(TENANT, SESSION);
        const note = events.find((event) => event.type === TrustEventType.EVENT_REJECTED);
        assert.ok(note !== undefined);
        // The reason it was rejected is that its contents could not be trusted.
        assert.equal(JSON.stringify(note.payload).includes('do not store me'), false);
    });
    it('attributes the rejection record to the server, not the sandbox', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([submission(1), { type: 'NOT_A_REAL_EVENT' }]);
        const events = await store.readSession(TENANT, SESSION);
        const note = events.find((event) => event.type === TrustEventType.EVENT_REJECTED);
        assert.equal(note?.source, EventSource.SERVER);
    });
    it('reports a fully-rejected batch without inventing a session', async () => {
        const { store, ingestion } = harness();
        const result = await ingestion.ingest([{ nonsense: true }, 'not even an object']);
        assert.equal(result.accepted, 0);
        assert.equal(result.rejected.length, 2);
        assert.equal(result.head, null);
        assert.deepEqual(await store.readSession(TENANT, SESSION), [], 'nothing identified a session, so there is no log to write into');
    });
    it('refuses a batch spanning two sessions', async () => {
        const { ingestion } = harness();
        await assert.rejects(() => ingestion.ingest([submission(1), submission(2, { sessionId: 'sess_elsewhere' })]), /one tenant and session/);
    });
    it('rejects a sandbox asserting a layer it has no authority over', async () => {
        const { ingestion } = harness();
        // A compromised client must not be able to mint favourable human-review
        // evidence about itself.
        const result = await ingestion.ingest([
            submission(1),
            submission(2, {
                type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED,
                source: EventSource.SANDBOX,
                payload: { category: 'ai_tool', domain: null, visitId: 'visit_2' },
            }),
        ]);
        assert.equal(result.rejected.length, 1);
        assert.equal(result.rejected[0].code, 'SOURCE_NOT_PERMITTED');
    });
});
describe('ingestion — lost telemetry lowers confidence, it does not raise risk', () => {
    it('reports a sequence gap', async () => {
        const { ingestion } = harness();
        // Sequence 2 never made it off the client.
        const result = await ingestion.ingest([submission(1), submission(3), submission(4)]);
        assert.deepEqual(result.gaps, [2]);
    });
    it('records the gap as evidence', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([submission(1), submission(3)]);
        assert.ok((await typesIn(store)).includes(TrustEventType.EVENT_SEQUENCE_GAP));
    });
    it('does not report a gap for a complete batch', async () => {
        const { store, ingestion } = harness();
        const result = await ingestion.ingest([submission(1), submission(2), submission(3)]);
        assert.deepEqual(result.gaps, []);
        assert.equal((await typesIn(store)).includes(TrustEventType.EVENT_SEQUENCE_GAP), false, 'a clean session must produce no system events at all');
    });
    it('closes the gap when the missing event arrives late', async () => {
        const { ingestion } = harness();
        await ingestion.ingest([submission(1), submission(3)]);
        const late = await ingestion.ingest([submission(2)]);
        assert.deepEqual(late.gaps, [], 'a delayed event is not a permanent accusation');
    });
});
describe('ingestion — consent gates collection, not reading', () => {
    const externalGranted = {
        async grantedScopes() {
            return ['assessment', 'external_monitoring'];
        },
    };
    const externalWithheld = {
        async grantedScopes() {
            return ['assessment'];
        },
    };
    it('stores external activity when the scope was granted', async () => {
        const { store, ingestion } = harness(externalGranted);
        const result = await ingestion.ingest([submission(1), externalSubmission(2)]);
        assert.equal(result.accepted, 2);
        assert.deepEqual(result.withheld, []);
        assert.ok((await typesIn(store)).includes(TrustEventType.EXTERNAL_RESOURCE_ACCESSED));
    });
    it('never stores what consent did not cover', async () => {
        const { store, ingestion } = harness(externalWithheld);
        const result = await ingestion.ingest([submission(1), externalSubmission(2)]);
        assert.equal(result.accepted, 1);
        assert.deepEqual(result.withheld, [
            { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, scope: 'external_monitoring' },
        ]);
        assert.equal((await typesIn(store)).includes(TrustEventType.EXTERNAL_RESOURCE_ACCESSED), false, 'filtering at read time would leave unlawful data sitting in storage');
    });
    it('does not treat withheld data as a rejection', async () => {
        const { ingestion } = harness(externalWithheld);
        const result = await ingestion.ingest([submission(1), externalSubmission(2)]);
        // Honouring consent is correct operation, not a telemetry fault, and must
        // not push the developer's confidence down.
        assert.deepEqual(result.rejected, []);
    });
});
describe('ingestion — the server must not consume the client sequence space', () => {
    it('accepts the next client batch after a rejection was recorded', async () => {
        const { store, ingestion } = harness();
        // Sequence 1 lands; the second event is malformed, so a server-side
        // EVENT_REJECTED note is written into the same session log.
        await ingestion.ingest([submission(1), { type: 'NOT_A_REAL_EVENT' }]);
        // The client knows nothing about that note and carries on numbering from 2.
        const next = await ingestion.ingest([submission(2), submission(3)]);
        assert.equal(next.accepted, 2, 'a server note must not block the client sequence');
        const stored = await store.readSession(TENANT, SESSION);
        assert.deepEqual(stored.filter((event) => event.source === EventSource.SANDBOX).map((event) => event.sequence), [1, 2, 3]);
    });
    it('keeps the chain verifiable once server notes and client events interleave', async () => {
        const { store, ingestion } = harness();
        await ingestion.ingest([submission(1), { type: 'NOT_A_REAL_EVENT' }]);
        await ingestion.ingest([submission(2)]);
        const verification = verifyChain(await store.readSession(TENANT, SESSION), nodeCrypto.sha256);
        assert.equal(verification.intact, true, JSON.stringify(verification.violations));
    });
});
//# sourceMappingURL=ingest.test.js.map