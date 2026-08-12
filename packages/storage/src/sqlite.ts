import { DatabaseSync } from 'node:sqlite';
import {
  DeveloperId,
  EventId,
  SessionId,
  TenantId,
  unsafeEpochMs,
  type AppendResult,
  type ChainHead,
  type EventPage,
  type EventQuery,
  type EventStore,
  type SessionSummary,
  type TrustEvent,
} from '@scora/trust-core';

/**
 * SQLite evidence store, on Node's built-in driver.
 *
 * Chosen so the engine runs with zero external dependencies and no database
 * server — a single-file evidence log that can be handed to a reviewer, archived
 * with a case, or replayed in the calibration harness. The schema is written to
 * port cleanly to Postgres: no SQLite-specific types, and every query is
 * tenant-scoped.
 *
 * Append-only by construction. There is no UPDATE or per-event DELETE anywhere
 * in this file; erasure operates on whole subjects.
 */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (
  tenant_id             TEXT    NOT NULL,
  session_id            TEXT    NOT NULL,
  event_id              TEXT    NOT NULL,
  developer_id          TEXT    NOT NULL,
  assessment_id         TEXT,
  task_id               TEXT,
  type                  TEXT    NOT NULL,
  layer                 TEXT    NOT NULL,
  sequence              INTEGER NOT NULL,
  chain_position        INTEGER NOT NULL,
  occurred_at           INTEGER NOT NULL,
  occurred_at_norm      INTEGER NOT NULL,
  received_at           INTEGER NOT NULL,
  clock_offset_ms       INTEGER,
  source                TEXT    NOT NULL,
  schema_version        INTEGER NOT NULL,
  payload               TEXT    NOT NULL,
  redacted_fields       TEXT    NOT NULL,
  hash                  TEXT    NOT NULL,
  previous_hash         TEXT,
  -- Tenant leads the key so every lookup is tenant-scoped by construction and
  -- one tenant's evidence can never be returned for another.
  PRIMARY KEY (tenant_id, event_id)
) STRICT;

-- Serves both the session read path and the per-session head lookup. Unique on
-- chain position, never on sequence: producers number their own streams, so two
-- events in one session may legitimately share a sequence number, and a unique
-- constraint there would reject real evidence.
CREATE UNIQUE INDEX IF NOT EXISTS events_session_chain
  ON events (tenant_id, session_id, chain_position);

CREATE INDEX IF NOT EXISTS events_developer
  ON events (tenant_id, developer_id, occurred_at_norm DESC);
`;

export interface SqliteEventStore extends EventStore {
  close(): void;
  eraseSubject(
    tenantId: TenantId,
    developerId: DeveloperId,
  ): Promise<{ readonly sessionsAffected: number; readonly eventsErased: number }>;
}

/** `location` may be a file path or `:memory:`. */
export function sqliteEventStore(location = ':memory:'): SqliteEventStore {
  const db = new DatabaseSync(location);

  // WAL lets reviewers read a session while telemetry is still arriving.
  // Harmless and ignored for :memory:.
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(SCHEMA);

  const insert = db.prepare(`
    INSERT OR IGNORE INTO events (
      tenant_id, session_id, event_id, developer_id, assessment_id, task_id,
      type, layer, sequence, chain_position, occurred_at, occurred_at_norm,
      received_at, clock_offset_ms, source, schema_version, payload,
      redacted_fields, hash, previous_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const selectHead = db.prepare(`
    SELECT chain_position, hash, occurred_at_norm,
           (SELECT COUNT(*)      FROM events WHERE tenant_id = ? AND session_id = ?) AS event_count,
           (SELECT MAX(sequence) FROM events WHERE tenant_id = ? AND session_id = ?) AS max_sequence
    FROM events
    WHERE tenant_id = ? AND session_id = ?
    ORDER BY chain_position DESC
    LIMIT 1
  `);

  const selectSession = db.prepare(`
    SELECT * FROM events
    WHERE tenant_id = ? AND session_id = ?
    ORDER BY chain_position ASC
  `);

  const selectSessions = db.prepare(`
    SELECT session_id,
           MIN(occurred_at_norm)  AS started_at,
           MAX(occurred_at_norm)  AS last_at,
           COUNT(*)               AS event_count,
           MAX(chain_position)    AS max_chain_position,
           SUM(CASE WHEN type = 'SESSION_ENDED' THEN 1 ELSE 0 END) AS ended
    FROM events
    WHERE tenant_id = ? AND developer_id = ?
    GROUP BY session_id
    ORDER BY started_at DESC
  `);

  return {
    async append(events): Promise<AppendResult> {
      if (events.length === 0) return { appended: 0, duplicates: [], head: null };

      const first = events[0]!;
      for (const event of events) {
        if (event.sessionId !== first.sessionId || event.tenantId !== first.tenantId) {
          throw new Error('append() requires all events to belong to one tenant and session');
        }
      }

      const duplicates: EventId[] = [];
      let appended = 0;

      // One transaction for the whole batch: a partially applied batch would
      // leave a chain whose links point at events that were never stored.
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const event of events) {
          const result = insert.run(
            event.tenantId,
            event.sessionId,
            event.eventId,
            event.developerId,
            event.assessmentId ?? null,
            event.taskId ?? null,
            event.type,
            event.layer,
            event.sequence,
            event.chainPosition,
            event.occurredAt,
            event.occurredAtNormalized,
            event.receivedAt,
            event.clockOffsetMs,
            event.source,
            event.schemaVersion,
            JSON.stringify(event.payload),
            JSON.stringify(event.redactedFields),
            event.integrity.hash,
            event.integrity.previousHash,
          );
          // INSERT OR IGNORE reports zero changes for an existing event id,
          // which is exactly the idempotency the port requires.
          if (result.changes === 0) duplicates.push(event.eventId);
          else appended += 1;
        }
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }

      return { appended, duplicates, head: await this.head(first.tenantId, first.sessionId) };
    },

    async head(tenantId, sessionId): Promise<ChainHead | null> {
      const row = selectHead.get(
        tenantId,
        sessionId,
        tenantId,
        sessionId,
        tenantId,
        sessionId,
      ) as unknown as
        | {
            chain_position: number;
            hash: string;
            occurred_at_norm: number;
            event_count: number;
            max_sequence: number;
          }
        | undefined;

      if (row === undefined) return null;

      return {
        sessionId,
        chainPosition: row.chain_position,
        sequence: row.max_sequence,
        hash: row.hash,
        eventCount: row.event_count,
        lastEventAt: unsafeEpochMs(row.occurred_at_norm),
      };
    },

    async existing(tenantId, ids) {
      if (ids.length === 0) return new Set();

      // Parameterised IN-list, chunked to stay under SQLite's variable limit.
      const found = new Set<EventId>();
      const CHUNK = 400;

      for (let offset = 0; offset < ids.length; offset += CHUNK) {
        const chunk = ids.slice(offset, offset + CHUNK);
        const placeholders = chunk.map(() => '?').join(',');
        const statement = db.prepare(
          `SELECT event_id FROM events WHERE tenant_id = ? AND event_id IN (${placeholders})`,
        );
        const rows = statement.all(tenantId, ...chunk) as unknown as { event_id: string }[];
        for (const row of rows) found.add(EventId.unsafe(row.event_id));
      }

      return found;
    },

    async read(query): Promise<EventPage> {
      const conditions = ['tenant_id = ?', 'session_id = ?'];
      const parameters: (string | number)[] = [query.tenantId, query.sessionId];

      if (query.fromChainPosition !== undefined) {
        conditions.push('chain_position >= ?');
        parameters.push(query.fromChainPosition);
      }
      if (query.toChainPosition !== undefined) {
        conditions.push('chain_position <= ?');
        parameters.push(query.toChainPosition);
      }
      if (query.cursor != null) {
        conditions.push('chain_position > ?');
        parameters.push(Number(query.cursor));
      }
      if (query.types !== undefined && query.types.length > 0) {
        conditions.push(`type IN (${query.types.map(() => '?').join(',')})`);
        parameters.push(...query.types);
      }

      // Fetch one extra row to learn whether another page exists, without a
      // second COUNT query over the same predicate.
      const limit = query.limit ?? 1_000;
      const statement = db.prepare(
        `SELECT * FROM events WHERE ${conditions.join(' AND ')} ORDER BY chain_position ASC LIMIT ?`,
      );
      const rows = statement.all(...parameters, limit + 1) as unknown as SqlRow[];

      const hasMore = rows.length > limit;
      const page = (hasMore ? rows.slice(0, limit) : rows).map(toTrustEvent);

      return {
        events: page,
        nextCursor: hasMore ? String(page.at(-1)!.chainPosition) : null,
      };
    },

    async readSession(tenantId, sessionId) {
      const rows = selectSession.all(tenantId, sessionId) as unknown as SqlRow[];
      return rows.map(toTrustEvent);
    },

    async listSessions(tenantId, developerId, options) {
      const rows = selectSessions.all(tenantId, developerId) as unknown as {
        session_id: string;
        started_at: number;
        last_at: number;
        event_count: number;
        max_chain_position: number;
        ended: number;
      }[];

      const summaries: SessionSummary[] = rows
        .filter((row) => options?.before === undefined || row.started_at < options.before)
        .map((row) => ({
          sessionId: SessionId.unsafe(row.session_id),
          developerId,
          startedAt: unsafeEpochMs(row.started_at),
          endedAt: row.ended > 0 ? unsafeEpochMs(row.last_at) : null,
          eventCount: row.event_count,
          // Cheap proxy: a contiguous chain has as many events as its highest
          // position. Full hash verification is a separate, explicit operation.
          chainIntact: row.event_count === row.max_chain_position,
        }));

      return options?.limit === undefined ? summaries : summaries.slice(0, options.limit);
    },

    async eraseSubject(tenantId, developerId) {
      const sessions = db
        .prepare(
          'SELECT DISTINCT session_id FROM events WHERE tenant_id = ? AND developer_id = ?',
        )
        .all(tenantId, developerId) as unknown as { session_id: string }[];

      const result = db
        .prepare('DELETE FROM events WHERE tenant_id = ? AND developer_id = ?')
        .run(tenantId, developerId);

      return {
        sessionsAffected: sessions.length,
        eventsErased: Number(result.changes),
      };
    },

    close() {
      db.close();
    },
  };
}

interface SqlRow {
  tenant_id: string;
  session_id: string;
  event_id: string;
  developer_id: string;
  assessment_id: string | null;
  task_id: string | null;
  type: string;
  layer: string;
  sequence: number;
  chain_position: number;
  occurred_at: number;
  occurred_at_norm: number;
  received_at: number;
  clock_offset_ms: number | null;
  source: string;
  schema_version: number;
  payload: string;
  redacted_fields: string;
  hash: string;
  previous_hash: string | null;
}

function toTrustEvent(row: SqlRow): TrustEvent {
  return {
    eventId: EventId.unsafe(row.event_id),
    tenantId: TenantId.unsafe(row.tenant_id),
    sessionId: SessionId.unsafe(row.session_id),
    developerId: DeveloperId.unsafe(row.developer_id),
    assessmentId: row.assessment_id === null ? undefined : (row.assessment_id as never),
    taskId: row.task_id === null ? undefined : (row.task_id as never),
    type: row.type as TrustEvent['type'],
    layer: row.layer as TrustEvent['layer'],
    sequence: row.sequence,
    chainPosition: row.chain_position,
    occurredAt: unsafeEpochMs(row.occurred_at),
    occurredAtNormalized: unsafeEpochMs(row.occurred_at_norm),
    receivedAt: unsafeEpochMs(row.received_at),
    clockOffsetMs: row.clock_offset_ms,
    source: row.source as TrustEvent['source'],
    schemaVersion: row.schema_version,
    payload: JSON.parse(row.payload) as Record<string, unknown>,
    redactedFields: JSON.parse(row.redacted_fields) as string[],
    integrity: {
      algorithm: 'sha256',
      hash: row.hash,
      previousHash: row.previous_hash,
    },
  };
}
