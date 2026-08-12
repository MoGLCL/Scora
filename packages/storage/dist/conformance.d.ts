import { DeveloperId, SessionId, TenantId, type EventStore, type TrustEvent } from '@scora/trust-core';
/**
 * Conformance suite.
 *
 * Every EventStore adapter runs these identical tests. The in-memory store is
 * the reference implementation, and any behavioural divergence in a persistent
 * adapter is a bug in that adapter — an engine that scored differently against
 * SQLite than against Postgres would be indefensible.
 */
export declare const TENANT: TenantId;
export declare const OTHER_TENANT: TenantId;
export declare const SESSION: SessionId;
export declare const DEV: DeveloperId;
/**
 * One event at a given chain position.
 *
 * `sequence` defaults to the chain position because most tests only care about
 * one producer; tests about producer streams override it.
 */
export declare function makeEvent(chainPosition: number, previousHash: string | null, overrides?: Partial<Omit<TrustEvent, 'integrity'>>): TrustEvent;
export declare function makeChain(length: number, overrides?: Partial<Omit<TrustEvent, 'integrity'>>): TrustEvent[];
/** Runs the shared suite against one adapter. */
export declare function runStoreConformance(name: string, create: () => EventStore): void;
//# sourceMappingURL=conformance.d.ts.map