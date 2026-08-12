import type { DeveloperId, TenantId } from '@scora/trust-core';
import type { BaselineStore, DeveloperProfile, PopulationStatistics } from './contract.ts';

/**
 * In-memory baseline store.
 *
 * Profiles are derived data, rebuildable from the event log, so an in-memory
 * implementation is a legitimate production choice for small deployments and
 * the obvious one for the calibration harness — where thousands of synthetic
 * developers must never touch a real tenant's storage.
 */
export function inMemoryBaselineStore(): BaselineStore & { clear(): void } {
  const profiles = new Map<string, DeveloperProfile>();
  const populations = new Map<string, PopulationStatistics>();

  // Tenant is part of every key, so one tenant's data can never be served to
  // another even if a caller passes the wrong developer id.
  const profileKey = (tenantId: TenantId, developerId: DeveloperId): string =>
    `${tenantId}::${developerId}`;
  const populationKey = (tenantId: TenantId, cohort?: string): string =>
    `${tenantId}::${cohort ?? '*'}`;

  return {
    async load(tenantId, developerId) {
      return profiles.get(profileKey(tenantId, developerId)) ?? null;
    },
    async save(profile) {
      profiles.set(profileKey(profile.tenantId, profile.developerId), profile);
    },
    async loadPopulation(tenantId, cohort) {
      return populations.get(populationKey(tenantId, cohort)) ?? null;
    },
    async savePopulation(statistics) {
      populations.set(populationKey(statistics.tenantId, statistics.cohort), statistics);
    },
    clear() {
      profiles.clear();
      populations.clear();
    },
  };
}
