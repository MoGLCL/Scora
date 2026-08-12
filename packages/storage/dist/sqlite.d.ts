import { DeveloperId, TenantId, type EventStore } from '@scora/trust-core';
export interface SqliteEventStore extends EventStore {
    close(): void;
    eraseSubject(tenantId: TenantId, developerId: DeveloperId): Promise<{
        readonly sessionsAffected: number;
        readonly eventsErased: number;
    }>;
}
/** `location` may be a file path or `:memory:`. */
export declare function sqliteEventStore(location?: string): SqliteEventStore;
//# sourceMappingURL=sqlite.d.ts.map