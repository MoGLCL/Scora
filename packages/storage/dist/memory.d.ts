import { type DeveloperId, type EpochMs, type EventStore, type TenantId } from '@scora/trust-core';
export interface MemoryEventStore extends EventStore {
    /** Total events held, across all tenants. For tests and diagnostics. */
    size(): number;
    clear(): void;
    eraseSubject(tenantId: TenantId, developerId: DeveloperId): Promise<{
        readonly sessionsAffected: number;
        readonly eventsErased: number;
    }>;
}
export declare function inMemoryEventStore(): MemoryEventStore;
export type { EpochMs };
//# sourceMappingURL=memory.d.ts.map