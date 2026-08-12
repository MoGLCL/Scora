import type { EventSubmission, TrustEvent } from '../events/envelope.ts';
import type { EpochMs } from '../primitives/index.ts';
/**
 * Tamper-evident chaining of a session's evidence log.
 *
 * Each event's hash covers its own canonical form *and* the hash of the event
 * before it. Editing, reordering or deleting any event invalidates every hash
 * downstream of it, so a reviewer can be shown that what they are reading is
 * what was recorded.
 *
 * This is integrity, not authenticity: a party holding the database can still
 * rebuild a consistent chain from scratch. Defending against that requires
 * signing chain heads with a key the application server does not hold, and
 * periodically anchoring them externally. `ChainAnchor` below is the seam for
 * that; the signing itself belongs in an adapter, not in the domain core.
 */
/** Injected so the core stays free of Node built-ins and remains portable. */
export type HashFn = (input: string) => string;
export declare const GENESIS_HASH: null;
export declare function computeEventHash(event: Omit<TrustEvent, 'integrity'>, previousHash: string | null, hash: HashFn): string;
export declare function sealEvent(event: Omit<TrustEvent, 'integrity'>, previousHash: string | null, hash: HashFn): TrustEvent;
export declare function verifyEventHash(event: TrustEvent, hash: HashFn): boolean;
export declare const ChainViolationCode: {
    /** An event's stored hash does not match a recomputation of its contents. */
    readonly HASH_MISMATCH: "HASH_MISMATCH";
    /** An event's previousHash does not match the hash of the preceding event. */
    readonly BROKEN_LINK: "BROKEN_LINK";
    /** Chain positions are not strictly increasing by one. */
    readonly CHAIN_POSITION_GAP: "CHAIN_POSITION_GAP";
    /** Two events share a chain position within one session. */
    readonly CHAIN_POSITION_DUPLICATE: "CHAIN_POSITION_DUPLICATE";
    /** The first event does not declare itself as genesis. */
    readonly INVALID_GENESIS: "INVALID_GENESIS";
    /** Events from more than one session were verified as a single chain. */
    readonly SESSION_MIXING: "SESSION_MIXING";
};
export type ChainViolationCode = (typeof ChainViolationCode)[keyof typeof ChainViolationCode];
export interface ChainViolation {
    readonly code: ChainViolationCode;
    readonly eventId: string;
    readonly sequence: number;
    readonly detail: string;
}
export interface ChainVerification {
    readonly intact: boolean;
    readonly violations: readonly ChainViolation[];
    readonly eventsChecked: number;
    /** Hash of the last event, for anchoring or for continuing the chain. */
    readonly headHash: string | null;
    /**
     * Producer sequence numbers absent from the log.
     *
     * A gap means telemetry was lost in transit, which is common on flaky
     * networks and is not by itself evidence of tampering. It lowers Confidence —
     * the engine saw less than it should have — rather than raising Risk.
     *
     * Computed per producer, because each producer numbers its own stream: a
     * server-written note about a rejected event is not a sandbox event that went
     * missing.
     */
    readonly missingSequences: readonly number[];
}
/**
 * Verifies an ordered slice of one session's evidence log.
 *
 * Reports every violation rather than stopping at the first, because a reviewer
 * needs to know whether a single event is corrupt or the whole log is
 * untrustworthy. Verification continues past a break using each event's own
 * stored `previousHash`, so one bad link does not cascade into false reports
 * for every event after it.
 *
 * The chain is ordered by `chainPosition`, never by `sequence`. Producers
 * number their own streams and those numbers can collide, repeat, or go
 * missing; `chainPosition` is assigned by this engine alone, so a break in it
 * is genuinely attributable to tampering.
 */
export declare function verifyChain(events: readonly TrustEvent[], hash: HashFn): ChainVerification;
/**
 * A signed, externally-anchorable commitment to a chain head.
 *
 * Produced periodically and at session close. Publishing these somewhere the
 * application server cannot rewrite is what upgrades the log from
 * tamper-evident to tamper-evident against the operator.
 */
export interface ChainAnchor {
    readonly sessionId: string;
    readonly tenantId: string;
    readonly headHash: string;
    readonly eventCount: number;
    readonly highestChainPosition: number;
    readonly anchoredAt: EpochMs;
    /** Detached signature over the canonical anchor body. Absent until signed. */
    readonly signature?: string | undefined;
    readonly keyId?: string | undefined;
}
export declare function anchorBody(anchor: Omit<ChainAnchor, 'signature' | 'keyId'>): string;
/** Next chain position for a session, given its current head. */
export declare function nextChainPosition(head: {
    readonly chainPosition: number;
} | null): number;
export declare function isGenesis(submission: Pick<EventSubmission, 'sequence'>): boolean;
//# sourceMappingURL=chain.d.ts.map