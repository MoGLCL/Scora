import type { TrustEvent } from '../events/envelope.ts';
import type { HashFn } from '../evidence/chain.ts';
import type { DeveloperId, EpochMs, EventId, SessionId, TenantId } from '../primitives/index.ts';
/**
 * Outbound ports.
 *
 * The domain core performs no I/O. Everything it needs from the outside world
 * is expressed here as an interface, so the Trust Engine can run identically
 * against Postgres in production, SQLite locally, and an in-memory store inside
 * the calibration harness — where replaying thousands of synthetic sessions
 * must be fast and must never touch a real tenant's data.
 */
/** Time source. Injected so tests and replays are deterministic. */
export interface Clock {
    now(): EpochMs;
}
/** Identifier generation. Injected for the same reason. */
export interface IdGenerator {
    eventId(): EventId;
}
export interface CryptoPort {
    readonly sha256: HashFn;
}
/** Cursor-paginated read, so a long session never has to be materialised at once. */
export interface EventPage {
    readonly events: readonly TrustEvent[];
    readonly nextCursor: string | null;
}
/**
 * A slice of one session's log.
 *
 * Ranges and cursors are expressed in chain positions, not producer sequence
 * numbers: chain position is the log's only unique total order, and paging on a
 * key that can repeat would silently drop or duplicate evidence.
 */
export interface EventQuery {
    readonly tenantId: TenantId;
    readonly sessionId: SessionId;
    readonly fromChainPosition?: number | undefined;
    readonly toChainPosition?: number | undefined;
    readonly types?: readonly string[] | undefined;
    readonly limit?: number | undefined;
    readonly cursor?: string | null | undefined;
}
/**
 * Append-only evidence log.
 *
 * There is deliberately no update or delete for individual events. Erasure
 * requests are satisfied by `EvidenceLifecycle`, which operates on whole
 * subjects and records what it did — the audit trail must survive the data.
 */
export interface EventStore {
    /**
     * Appends events atomically.
     *
     * Implementations must be idempotent on `eventId`: sandboxes retry on flaky
     * networks, and a replayed batch must not duplicate evidence or double-count
     * a paste.
     */
    append(events: readonly TrustEvent[]): Promise<AppendResult>;
    /** Current chain head for a session, or null if it has no events yet. */
    head(tenantId: TenantId, sessionId: SessionId): Promise<ChainHead | null>;
    read(query: EventQuery): Promise<EventPage>;
    /** Full ordered log for a session. Convenience over `read`, for scoring and review. */
    readSession(tenantId: TenantId, sessionId: SessionId): Promise<readonly TrustEvent[]>;
    /**
     * Which of these event ids the store already holds.
     *
     * Ingestion needs this before sealing: a replayed batch must be detected
     * *ahead* of hash-chain linking, because re-sealing an event that already
     * exists would compute a different `previousHash` and fabricate a chain
     * break out of an ordinary network retry.
     */
    existing(tenantId: TenantId, eventIds: readonly EventId[]): Promise<ReadonlySet<EventId>>;
    /** Sessions for a developer, newest first. Used to build the behavioural baseline. */
    listSessions(tenantId: TenantId, developerId: DeveloperId, options?: {
        readonly limit?: number;
        readonly before?: EpochMs;
    }): Promise<readonly SessionSummary[]>;
}
export interface AppendResult {
    readonly appended: number;
    /** Event ids already present, skipped by the idempotent path. */
    readonly duplicates: readonly EventId[];
    /** Null when the batch was entirely duplicates and the session was empty. */
    readonly head: ChainHead | null;
}
export interface ChainHead {
    readonly sessionId: SessionId;
    /** Position of the last event in the chain. The next append continues from here. */
    readonly chainPosition: number;
    /** Highest producer sequence seen. Advisory: producers number their own streams. */
    readonly sequence: number;
    readonly hash: string;
    readonly eventCount: number;
    readonly lastEventAt: EpochMs;
}
export interface SessionSummary {
    readonly sessionId: SessionId;
    readonly developerId: DeveloperId;
    readonly startedAt: EpochMs;
    readonly endedAt: EpochMs | null;
    readonly eventCount: number;
    readonly chainIntact: boolean;
}
/**
 * Consent and retention.
 *
 * Collection is gated on consent at ingestion rather than filtered at read
 * time: data that was never lawfully collectable should not exist in the log
 * to begin with.
 */
export interface ConsentPort {
    /** Scopes granted for a session, as recorded at session start. */
    grantedScopes(tenantId: TenantId, sessionId: SessionId): Promise<readonly ('assessment' | 'external_monitoring' | 'recording')[]>;
}
export interface EvidenceLifecycle {
    /**
     * Erases a subject's evidence under a data-subject request.
     *
     * Returns what was removed. The audit record of the erasure itself is
     * retained — proving that a deletion happened is not the same as retaining
     * the deleted data.
     */
    eraseSubject(tenantId: TenantId, developerId: DeveloperId, reason: string): Promise<{
        readonly sessionsAffected: number;
        readonly eventsErased: number;
    }>;
}
/** Structured logging. No `any`, so log payloads stay canonicalizable. */
export interface Logger {
    debug(message: string, context?: Readonly<Record<string, unknown>>): void;
    info(message: string, context?: Readonly<Record<string, unknown>>): void;
    warn(message: string, context?: Readonly<Record<string, unknown>>): void;
    error(message: string, context?: Readonly<Record<string, unknown>>): void;
}
/** Everything the core needs, assembled once at the composition root. */
export interface CoreDependencies {
    readonly clock: Clock;
    readonly ids: IdGenerator;
    readonly crypto: CryptoPort;
    readonly events: EventStore;
    readonly logger: Logger;
    readonly consent?: ConsentPort | undefined;
}
//# sourceMappingURL=index.d.ts.map