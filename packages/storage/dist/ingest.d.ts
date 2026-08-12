import { type AppendResult, type Clock, type CryptoPort, type EventRejection, type EventStore, type IdGenerator, type Logger, type SessionId, type TenantId } from '@scora/trust-core';
/**
 * The ingestion pipeline.
 *
 * Untrusted telemetry in, sealed evidence out. The order of operations is
 * load-bearing:
 *
 *   1. validate       — envelope, payload, producer authority
 *   2. consent        — drop what was never lawful to collect
 *   3. deduplicate    — BEFORE sealing, so a retry cannot fabricate a chain break
 *   4. order          — by sequence, so out-of-order delivery links correctly
 *   5. seal           — hash-chain each event to its predecessor
 *   6. append         — atomically, per session
 *   7. record         — rejections and gaps as evidence in their own right
 *
 * Step 3 before step 5 is the subtle one. Sealing computes `previousHash` from
 * the current chain head; re-sealing an already-stored event would produce a
 * different hash and turn an ordinary network retry into an apparent tampering
 * incident.
 */
export interface IngestionDependencies {
    readonly store: EventStore;
    readonly clock: Clock;
    readonly crypto: CryptoPort;
    readonly ids: IdGenerator;
    readonly logger: Logger;
    /** Granted consent scopes per session. Absent means collection is unrestricted. */
    readonly consent?: {
        grantedScopes(tenantId: TenantId, sessionId: SessionId): Promise<readonly ('assessment' | 'external_monitoring' | 'recording')[]>;
    };
}
export interface IngestionResult {
    readonly accepted: number;
    readonly duplicates: number;
    readonly rejected: readonly EventRejection[];
    /** Events dropped because the required consent scope was not granted. */
    readonly withheld: readonly {
        readonly type: string;
        readonly scope: string;
    }[];
    /** Sequence numbers missing from this session's log after the append. */
    readonly gaps: readonly number[];
    readonly head: AppendResult['head'];
}
export interface IngestOptions {
    /**
     * Clock offset for the submitting client, from a prior sync exchange.
     *
     * When absent, client timestamps are used as-is and the resulting events
     * record `clockOffsetMs: null` — which lowers confidence in every
     * timing-derived feature rather than pretending the timing is exact.
     */
    readonly clockOffsetMs?: number | undefined;
}
export declare function createIngestion(dependencies: IngestionDependencies): {
    /**
     * Ingests a batch of submissions for one session.
     *
     * One malformed event never aborts the batch: the good events still land,
     * and the bad ones are recorded as EVENT_REJECTED so a session with partly
     * broken telemetry reads as lower confidence rather than looking clean.
     */
    ingest(submissions: readonly unknown[], options?: IngestOptions): Promise<IngestionResult>;
};
export type Ingestion = ReturnType<typeof createIngestion>;
//# sourceMappingURL=ingest.d.ts.map