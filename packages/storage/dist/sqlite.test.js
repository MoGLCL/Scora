import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DeveloperId, verifyChain } from '@scora/trust-core';
import { nodeCrypto } from '@scora/trust-core/node';
import { DEV, SESSION, TENANT, makeChain, runStoreConformance } from "./conformance.js";
import { sqliteEventStore } from "./sqlite.js";
runStoreConformance('sqliteEventStore', () => sqliteEventStore(':memory:'));
/** Behaviour specific to persistent storage, beyond the shared contract. */
describe('sqliteEventStore — persistence specifics', () => {
    it('survives a reopen of the same file', async (t) => {
        const { mkdtempSync, rmSync } = await import('node:fs');
        const { tmpdir } = await import('node:os');
        const { join } = await import('node:path');
        const directory = mkdtempSync(join(tmpdir(), 'scora-'));
        const file = join(directory, 'evidence.sqlite');
        t.after(() => rmSync(directory, { recursive: true, force: true }));
        const first = sqliteEventStore(file);
        await first.append(makeChain(4));
        first.close();
        // The whole point of a persistent adapter: evidence outlives the process.
        const second = sqliteEventStore(file);
        const stored = await second.readSession(TENANT, SESSION);
        assert.equal(stored.length, 4);
        const verification = verifyChain(stored, nodeCrypto.sha256);
        assert.equal(verification.intact, true, 'the chain must survive persistence');
        second.close();
    });
    it('rolls back a failed batch entirely', async () => {
        const store = sqliteEventStore(':memory:');
        const events = makeChain(3);
        // A payload that cannot be serialised fails mid-batch. Nothing may land:
        // a half-applied batch would leave chain links pointing at absent events.
        const poisoned = { ...events[1], payload: { bad: BigInt(1) } };
        await assert.rejects(() => store.append([events[0], poisoned, events[2]]));
        assert.equal((await store.readSession(TENANT, SESSION)).length, 0);
        store.close();
    });
    it('erases a subject and reports what it removed', async () => {
        const store = sqliteEventStore(':memory:');
        await store.append(makeChain(5));
        const result = await store.eraseSubject(TENANT, DEV);
        assert.equal(result.sessionsAffected, 1);
        assert.equal(result.eventsErased, 5);
        assert.deepEqual(await store.readSession(TENANT, SESSION), []);
        store.close();
    });
    it('does not erase another developer evidence', async () => {
        const store = sqliteEventStore(':memory:');
        await store.append(makeChain(3));
        const result = await store.eraseSubject(TENANT, DeveloperId.unsafe('dev_stranger'));
        assert.equal(result.eventsErased, 0);
        assert.equal((await store.readSession(TENANT, SESSION)).length, 3);
        store.close();
    });
});
//# sourceMappingURL=sqlite.test.js.map