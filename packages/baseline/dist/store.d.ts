import type { BaselineStore } from './contract.ts';
/**
 * In-memory baseline store.
 *
 * Profiles are derived data, rebuildable from the event log, so an in-memory
 * implementation is a legitimate production choice for small deployments and
 * the obvious one for the calibration harness — where thousands of synthetic
 * developers must never touch a real tenant's storage.
 */
export declare function inMemoryBaselineStore(): BaselineStore & {
    clear(): void;
};
//# sourceMappingURL=store.d.ts.map