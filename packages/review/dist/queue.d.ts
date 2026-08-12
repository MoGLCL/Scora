import type { SessionId, TenantId } from '@scora/trust-core';
/**
 * Where to find a review, and nothing else.
 *
 * The evidence log is per-session by design — there is no "read every event in
 * this tenant" query, and adding one to serve a queue would mean any component
 * that wanted a list could sweep every developer's evidence. So a queue needs a
 * pointer table, and this is deliberately the smallest one that works: review id
 * to session id, plus the ability to list them.
 *
 * It holds no state, no priority, and no decision. Every judgement — who it is
 * assigned to, whether it has been decided, what was decided — is read back out
 * of the log by `reconstructReview`. That asymmetry is the point: **if the index
 * and the log ever disagree, the log is right**, because the index is a
 * convenience and the log is the evidence. An index that cached "decided" could
 * drift into saying a review was decided that never was, and there would be no
 * way to tell from the outside which one to believe.
 *
 * A tenant will normally implement this over whatever database already holds
 * their assignments. The in-memory version below is for tests and single-process
 * deployments.
 */
export interface ReviewIndex {
    /**
     * Records where a review's events live. Must be idempotent — a retried
     * assignment calls this again with the same pair.
     */
    note(tenantId: TenantId, reviewId: string, sessionId: SessionId): Promise<void>;
    /** The session holding this review's events, or null if it is unknown here. */
    locate(tenantId: TenantId, reviewId: string): Promise<SessionId | null>;
    /** Known reviews for one tenant. Never crosses a tenant boundary. */
    list(tenantId: TenantId, options?: {
        readonly limit?: number | undefined;
    }): Promise<readonly ReviewLocation[]>;
}
export interface ReviewLocation {
    readonly reviewId: string;
    readonly sessionId: SessionId;
}
/**
 * In-memory implementation.
 *
 * Keyed by tenant first, not by review id, so a lookup with the wrong tenant
 * cannot return another tenant's row even by accident. Scoping by filtering
 * after the lookup would work until someone forgot the filter once.
 */
export declare function inMemoryReviewIndex(): ReviewIndex;
//# sourceMappingURL=queue.d.ts.map