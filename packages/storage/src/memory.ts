import {
  type AppendResult,
  type ChainHead,
  type DeveloperId,
  type EpochMs,
  type EventId,
  type EventPage,
  type EventQuery,
  type EventStore,
  type SessionId,
  type SessionSummary,
  type TenantId,
  type TrustEvent,
} from '@scora/trust-core';

/**
 * In-memory evidence store.
 *
 * The reference implementation: every other adapter must behave identically,
 * and the shared conformance suite runs against all of them. Also the right
 * choice for the calibration harness, where thousands of synthetic sessions are
 * replayed and must never touch a real tenant's data.
 *
 * Append-only. There is no update or delete for individual events; erasure goes
 * through `eraseSubject`, which operates on whole subjects and reports what it
 * removed.
 */

interface SessionRecord {
  readonly tenantId: TenantId;
  readonly sessionId: SessionId;
  readonly developerId: DeveloperId;
  events: TrustEvent[];
  /** Kept sorted by chainPosition so reads never re-sort a long session. */
  head: ChainHead | null;
}

export interface MemoryEventStore extends EventStore {
  /** Total events held, across all tenants. For tests and diagnostics. */
  size(): number;
  clear(): void;
  eraseSubject(
    tenantId: TenantId,
    developerId: DeveloperId,
  ): Promise<{ readonly sessionsAffected: number; readonly eventsErased: number }>;
}

export function inMemoryEventStore(): MemoryEventStore {
  // Tenant is part of every key, so a wrong id can never surface another
  // tenant's evidence — isolation is structural rather than a query filter
  // someone might forget.
  const sessions = new Map<string, SessionRecord>();
  const eventIds = new Map<string, Set<EventId>>();

  const sessionKey = (tenantId: TenantId, sessionId: SessionId): string =>
    `${tenantId}::${sessionId}`;

  const idKey = (tenantId: TenantId): string => tenantId;

  function idsFor(tenantId: TenantId): Set<EventId> {
    let set = eventIds.get(idKey(tenantId));
    if (set === undefined) {
      set = new Set();
      eventIds.set(idKey(tenantId), set);
    }
    return set;
  }

  return {
    async append(events) {
      if (events.length === 0) {
        return { appended: 0, duplicates: [], head: null };
      }

      const first = events[0]!;
      // A batch spanning sessions cannot be appended atomically in a way that
      // preserves per-session chain continuity, so it is rejected rather than
      // silently split.
      for (const event of events) {
        if (event.sessionId !== first.sessionId || event.tenantId !== first.tenantId) {
          throw new Error('append() requires all events to belong to one tenant and session');
        }
      }

      const key = sessionKey(first.tenantId, first.sessionId);
      const known = idsFor(first.tenantId);

      let record = sessions.get(key);
      if (record === undefined) {
        record = {
          tenantId: first.tenantId,
          sessionId: first.sessionId,
          developerId: first.developerId,
          events: [],
          head: null,
        };
        sessions.set(key, record);
      }

      const duplicates: EventId[] = [];
      const fresh: TrustEvent[] = [];

      for (const event of events) {
        if (known.has(event.eventId)) duplicates.push(event.eventId);
        else fresh.push(event);
      }

      if (fresh.length > 0) {
        for (const event of fresh) known.add(event.eventId);
        record.events.push(...fresh);
        record.events.sort((a, b) => a.chainPosition - b.chainPosition);

        const last = record.events.at(-1)!;
        record.head = {
          sessionId: record.sessionId,
          chainPosition: last.chainPosition,
          sequence: Math.max(...record.events.map((event) => event.sequence)),
          hash: last.integrity.hash,
          eventCount: record.events.length,
          lastEventAt: last.occurredAtNormalized,
        };
      }

      return { appended: fresh.length, duplicates, head: record.head };
    },

    async head(tenantId, sessionId) {
      return sessions.get(sessionKey(tenantId, sessionId))?.head ?? null;
    },

    async existing(tenantId, ids) {
      const known = eventIds.get(idKey(tenantId));
      if (known === undefined) return new Set();
      return new Set(ids.filter((id) => known.has(id)));
    },

    async read(query) {
      const record = sessions.get(sessionKey(query.tenantId, query.sessionId));
      if (record === undefined) return { events: [], nextCursor: null };

      const types = query.types === undefined ? null : new Set<string>(query.types);
      const from = query.fromChainPosition ?? Number.NEGATIVE_INFINITY;
      const to = query.toChainPosition ?? Number.POSITIVE_INFINITY;
      // The cursor is the last chain position returned, so paging is stable even
      // though the log only ever grows at the end.
      const after = query.cursor == null ? Number.NEGATIVE_INFINITY : Number(query.cursor);

      const matching = record.events.filter(
        (event) =>
          event.chainPosition >= from &&
          event.chainPosition <= to &&
          event.chainPosition > after &&
          (types === null || types.has(event.type)),
      );

      const limit = query.limit ?? matching.length;
      const page = matching.slice(0, limit);
      const nextCursor =
        page.length < matching.length ? String(page.at(-1)!.chainPosition) : null;

      return { events: page, nextCursor };
    },

    async readSession(tenantId, sessionId) {
      return sessions.get(sessionKey(tenantId, sessionId))?.events.slice() ?? [];
    },

    async listSessions(tenantId, developerId, options) {
      const summaries: SessionSummary[] = [];

      for (const record of sessions.values()) {
        if (record.tenantId !== tenantId || record.developerId !== developerId) continue;
        if (record.events.length === 0) continue;

        const first = record.events[0]!;
        const last = record.events.at(-1)!;
        const ended = record.events.some((event) => event.type === 'SESSION_ENDED');

        if (options?.before !== undefined && first.occurredAtNormalized >= options.before) {
          continue;
        }

        summaries.push({
          sessionId: record.sessionId,
          developerId: record.developerId,
          startedAt: first.occurredAtNormalized,
          endedAt: ended ? last.occurredAtNormalized : null,
          eventCount: record.events.length,
          // Continuity is a cheap proxy here; full verification is a separate,
          // explicit operation because it rehashes every event.
          chainIntact: hasContinuousChain(record.events),
        });
      }

      summaries.sort((a, b) => b.startedAt - a.startedAt);
      return options?.limit === undefined ? summaries : summaries.slice(0, options.limit);
    },

    async eraseSubject(tenantId, developerId) {
      let sessionsAffected = 0;
      let eventsErased = 0;

      for (const [key, record] of sessions) {
        if (record.tenantId !== tenantId || record.developerId !== developerId) continue;
        sessionsAffected += 1;
        eventsErased += record.events.length;
        for (const event of record.events) idsFor(tenantId).delete(event.eventId);
        sessions.delete(key);
      }

      return { sessionsAffected, eventsErased };
    },

    size() {
      let total = 0;
      for (const record of sessions.values()) total += record.events.length;
      return total;
    },

    clear() {
      sessions.clear();
      eventIds.clear();
    },
  };
}

function hasContinuousChain(events: readonly TrustEvent[]): boolean {
  for (let index = 1; index < events.length; index += 1) {
    if (events[index]!.chainPosition !== events[index - 1]!.chainPosition + 1) return false;
  }
  return true;
}

export type { EpochMs };
