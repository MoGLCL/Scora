import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DeveloperId,
  EVENT_SCHEMA_VERSION,
  EventId,
  EventSource,
  SessionId,
  TenantId,
  TrustEventType,
  describeEvent,
  sealEvent,
  unsafeEpochMs,
  verifyChain,
  type EventStore,
  type TrustEvent,
} from '@scora/trust-core';
import { nodeCrypto } from '@scora/trust-core/node';

/**
 * Conformance suite.
 *
 * Every EventStore adapter runs these identical tests. The in-memory store is
 * the reference implementation, and any behavioural divergence in a persistent
 * adapter is a bug in that adapter — an engine that scored differently against
 * SQLite than against Postgres would be indefensible.
 */

export const TENANT = TenantId.unsafe('tnt_conf');
export const OTHER_TENANT = TenantId.unsafe('tnt_other');
export const SESSION = SessionId.unsafe('sess_conf');
export const DEV = DeveloperId.unsafe('dev_conf');
const T0 = 1_705_312_800_000;

/**
 * One event at a given chain position.
 *
 * `sequence` defaults to the chain position because most tests only care about
 * one producer; tests about producer streams override it.
 */
export function makeEvent(
  chainPosition: number,
  previousHash: string | null,
  overrides: Partial<Omit<TrustEvent, 'integrity'>> = {},
): TrustEvent {
  const at = unsafeEpochMs(T0 + chainPosition * 1_000);
  const type = overrides.type ?? TrustEventType.SESSION_HEARTBEAT;

  return sealEvent(
    {
      eventId: EventId.unsafe(`evt_${String(chainPosition).padStart(6, '0')}`),
      tenantId: TENANT,
      sessionId: SESSION,
      developerId: DEV,
      assessmentId: undefined,
      taskId: undefined,
      type,
      occurredAt: at,
      sequence: chainPosition,
      source: EventSource.SANDBOX,
      schemaVersion: EVENT_SCHEMA_VERSION,
      payload: { intervalMs: 5_000, bufferedEventCount: 0 },
      layer: describeEvent(type).layer,
      chainPosition,
      receivedAt: at,
      clockOffsetMs: 0,
      occurredAtNormalized: at,
      redactedFields: [],
      ...overrides,
    },
    previousHash,
    nodeCrypto.sha256,
  );
}

export function makeChain(length: number, overrides: Partial<Omit<TrustEvent, 'integrity'>> = {}) {
  const events: TrustEvent[] = [];
  let previousHash: string | null = null;
  for (let sequence = 1; sequence <= length; sequence += 1) {
    const event = makeEvent(sequence, previousHash, overrides);
    events.push(event);
    previousHash = event.integrity.hash;
  }
  return events;
}

/** Runs the shared suite against one adapter. */
export function runStoreConformance(name: string, create: () => EventStore): void {
  describe(`${name} — EventStore conformance`, () => {
    it('starts empty', async () => {
      const store = create();
      assert.equal(await store.head(TENANT, SESSION), null);
      assert.deepEqual(await store.readSession(TENANT, SESSION), []);
    });

    it('appends and reads back in chain order', async () => {
      const store = create();
      const events = makeChain(5);
      const result = await store.append(events);

      assert.equal(result.appended, 5);
      assert.deepEqual(result.duplicates, []);

      const stored = await store.readSession(TENANT, SESSION);
      assert.deepEqual(
        stored.map((event) => event.chainPosition),
        [1, 2, 3, 4, 5],
      );
    });

    it('preserves every field through a storage round trip', async () => {
      const store = create();
      const [original] = makeChain(1);
      await store.append([original!]);

      const [stored] = await store.readSession(TENANT, SESSION);
      assert.deepEqual(stored, original, 'a round trip must not alter the evidence');
    });

    it('keeps the hash chain verifiable after a round trip', async () => {
      const store = create();
      await store.append(makeChain(6));

      const stored = await store.readSession(TENANT, SESSION);
      const verification = verifyChain(stored, nodeCrypto.sha256);
      assert.equal(verification.intact, true, JSON.stringify(verification.violations));
    });

    it('is idempotent on event id', async () => {
      const store = create();
      const events = makeChain(3);

      await store.append(events);
      const replay = await store.append(events);

      assert.equal(replay.appended, 0, 'a retried batch must not duplicate evidence');
      assert.equal(replay.duplicates.length, 3);
      assert.equal((await store.readSession(TENANT, SESSION)).length, 3);
    });

    it('accepts a partially-overlapping batch', async () => {
      const store = create();
      const events = makeChain(5);

      await store.append(events.slice(0, 3));
      const result = await store.append(events);

      assert.equal(result.appended, 2);
      assert.equal(result.duplicates.length, 3);
      assert.equal((await store.readSession(TENANT, SESSION)).length, 5);
    });

    it('reports the chain head', async () => {
      const store = create();
      const events = makeChain(4);
      await store.append(events);

      const head = await store.head(TENANT, SESSION);
      assert.equal(head?.chainPosition, 4);
      assert.equal(head?.sequence, 4);
      assert.equal(head?.hash, events[3]!.integrity.hash);
      assert.equal(head?.eventCount, 4);
    });

    it('returns a null head for an empty batch', async () => {
      const store = create();
      const result = await store.append([]);
      assert.equal(result.appended, 0);
      assert.equal(result.head, null);
    });

    it('refuses a batch spanning two sessions', async () => {
      const store = create();
      const [first] = makeChain(1);
      const foreign = makeEvent(2, first!.integrity.hash, {
        sessionId: SessionId.unsafe('sess_elsewhere'),
      });

      await assert.rejects(
        () => store.append([first!, foreign]),
        /one tenant and session/,
        'a cross-session batch cannot preserve per-session chain continuity',
      );
    });

    it('reports which event ids it already holds', async () => {
      const store = create();
      const events = makeChain(3);
      await store.append(events);

      const known = await store.existing(TENANT, [
        events[0]!.eventId,
        EventId.unsafe('evt_never_seen'),
        events[2]!.eventId,
      ]);

      assert.equal(known.size, 2);
      assert.ok(known.has(events[0]!.eventId));
      assert.ok(!known.has(EventId.unsafe('evt_never_seen')));
    });

    it('handles an empty existence check', async () => {
      const store = create();
      assert.equal((await store.existing(TENANT, [])).size, 0);
    });

    it('isolates tenants', async () => {
      const store = create();
      const events = makeChain(3);
      await store.append(events);

      assert.deepEqual(await store.readSession(OTHER_TENANT, SESSION), []);
      assert.equal(await store.head(OTHER_TENANT, SESSION), null);
      assert.equal(
        (await store.existing(OTHER_TENANT, [events[0]!.eventId])).size,
        0,
        'one tenant must never learn what another holds',
      );
    });

    it('filters a read by chain position range', async () => {
      const store = create();
      await store.append(makeChain(10));

      const page = await store.read({
        tenantId: TENANT,
        sessionId: SESSION,
        fromChainPosition: 4,
        toChainPosition: 6,
      });

      assert.deepEqual(
        page.events.map((event) => event.chainPosition),
        [4, 5, 6],
      );
    });

    it('filters a read by event type', async () => {
      const store = create();
      const events = [
        makeEvent(1, null),
        makeEvent(2, null, { type: TrustEventType.SESSION_PAUSED, payload: { pauseReason: 'user_action' } }),
        makeEvent(3, null),
      ];
      await store.append(events);

      const page = await store.read({
        tenantId: TENANT,
        sessionId: SESSION,
        types: [TrustEventType.SESSION_PAUSED],
      });

      assert.equal(page.events.length, 1);
      assert.equal(page.events[0]!.type, TrustEventType.SESSION_PAUSED);
    });

    it('pages through a long session without losing or repeating events', async () => {
      const store = create();
      await store.append(makeChain(25));

      const seen: number[] = [];
      let cursor: string | null = null;

      do {
        const page = await store.read({
          tenantId: TENANT,
          sessionId: SESSION,
          limit: 7,
          cursor,
        });
        seen.push(...page.events.map((event) => event.chainPosition));
        cursor = page.nextCursor;
      } while (cursor !== null);

      assert.deepEqual(seen, Array.from({ length: 25 }, (_, index) => index + 1));
    });

    it('reports no cursor on the final page', async () => {
      const store = create();
      await store.append(makeChain(3));

      const page = await store.read({ tenantId: TENANT, sessionId: SESSION, limit: 10 });
      assert.equal(page.nextCursor, null);
      assert.equal(page.events.length, 3);
    });

    it('lists a developer sessions newest first', async () => {
      const store = create();
      await store.append(makeChain(3));
      await store.append([
        makeEvent(1, null, {
          sessionId: SessionId.unsafe('sess_later'),
          eventId: EventId.unsafe('evt_later01'),
          occurredAtNormalized: unsafeEpochMs(T0 + 900_000),
        }),
      ]);

      const sessions = await store.listSessions(TENANT, DEV);
      assert.equal(sessions.length, 2);
      assert.equal(sessions[0]!.sessionId, 'sess_later');
    });

    it('marks a session ended only when it ended', async () => {
      const store = create();
      await store.append(makeChain(2));
      let sessions = await store.listSessions(TENANT, DEV);
      assert.equal(sessions[0]!.endedAt, null);

      const head = await store.head(TENANT, SESSION);
      await store.append([
        makeEvent(3, head!.hash, {
          type: TrustEventType.SESSION_ENDED,
          payload: { endReason: 'submitted', totalDurationMs: 3_000 },
        }),
      ]);

      sessions = await store.listSessions(TENANT, DEV);
      assert.notEqual(sessions[0]!.endedAt, null);
    });

    it('does not list another developer sessions', async () => {
      const store = create();
      await store.append(makeChain(3));
      assert.deepEqual(await store.listSessions(TENANT, DeveloperId.unsafe('dev_stranger')), []);
    });

    it('detects a sequence gap in the session summary', async () => {
      const store = create();
      const events = makeChain(5);
      // Sequence 3 never arrived.
      await store.append([events[0]!, events[1]!, events[3]!, events[4]!]);

      const sessions = await store.listSessions(TENANT, DEV);
      assert.equal(sessions[0]!.chainIntact, false);
    });
  });
}
