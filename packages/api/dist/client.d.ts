import type { DeveloperId, SessionId, TrustEvent } from '@scora/trust-core';
import type { ProblemDetail } from './contract.ts';
/**
 * Typed client for the Trust API.
 *
 * Thin on purpose. It adds the bearer header, parses problem details, and does
 * nothing else — no retry policy, no caching, no client-side filtering of what
 * came back. A client that quietly retried an ingest would double-count events;
 * a client that cached a report would show a reviewer a stale score after a
 * human review had already overridden it.
 *
 * Runs anywhere `fetch` exists: Node 22+, browsers, and the sandbox itself.
 */
export interface TrustClientOptions {
    readonly baseUrl: string;
    /** Bearer token. Sandbox tokens are per-session; staff tokens are per-person. */
    readonly token: string;
    /** Injected for tests and for runtimes with a non-global fetch. */
    readonly fetch?: typeof globalThis.fetch | undefined;
}
/**
 * A failed call.
 *
 * Carries the problem detail rather than a bare message so a caller can branch
 * on `status` — and, for a rejected policy write, read the per-field
 * `errors` back out.
 */
export declare class TrustApiError extends Error {
    readonly status: number;
    readonly problem: ProblemDetail;
    constructor(problem: ProblemDetail);
}
export interface IngestResponse {
    readonly accepted: number;
    readonly duplicates: number;
    readonly rejected: readonly {
        readonly eventId: string;
        readonly code: string;
    }[];
    readonly withheld: readonly {
        readonly type: string;
        readonly scope: string;
    }[];
    readonly gaps: readonly number[];
    readonly chainPosition: number | null;
}
export interface IntegrityResponse {
    readonly sessionId: string;
    readonly intact: boolean;
    readonly eventsChecked: number;
    readonly headHash: string | null;
    readonly violations: readonly {
        readonly code: string;
        readonly detail: string;
    }[];
    /** Lost telemetry. Lowers Confidence; categorically not tampering. */
    readonly missingSequences: readonly number[];
}
export interface DeveloperOutcome {
    readonly sessionId: string;
    readonly summary: string;
    readonly recommendation: string;
    readonly confidence: number;
}
export declare function createTrustClient(options: TrustClientOptions): {
    /**
     * Submits a batch of events for one session.
     *
     * The response is the whole outcome, not just a status: a batch can be
     * partly rejected or partly withheld for consent, and a caller that
     * discards this cannot tell that half its evidence never landed.
     */
    ingest(sessionId: SessionId, events: readonly unknown[], clockOffsetMs?: number): Promise<IngestResponse>;
    report(sessionId: SessionId): Promise<unknown>;
    /** The rendered report, for a human reviewer. */
    reportText(sessionId: SessionId): Promise<string>;
    events(sessionId: SessionId, page?: {
        readonly limit?: number;
        readonly cursor?: string;
    }): Promise<{
        readonly events: readonly TrustEvent[];
        readonly nextCursor: string | null;
    }>;
    integrity(sessionId: SessionId): Promise<IntegrityResponse>;
    sessions(developerId: DeveloperId, limit?: number): Promise<unknown>;
    /** The summary a developer is entitled to see about their own session. */
    ownOutcome(sessionId: SessionId): Promise<DeveloperOutcome>;
    policy(): Promise<unknown>;
    /**
     * Replaces tenant policy.
     *
     * Throws `TrustApiError` with status 422 and per-field `errors` when the
     * proposed policy would weaken a guarantee — that is a rejection to show
     * the administrator, not an error to swallow.
     */
    savePolicy(policy: unknown): Promise<unknown>;
    permittedScopes(): Promise<{
        readonly scopes: readonly string[];
    }>;
};
export type TrustClient = ReturnType<typeof createTrustClient>;
//# sourceMappingURL=client.d.ts.map