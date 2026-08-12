import { type DeveloperId, type EpochMs, type TenantId, type Unit } from '@scora/trust-core';
import type { FeatureExtractionResult } from '@scora/trust-features';
import { type DeveloperProfile, type Deviation, type PopulationStatistics, type SessionObservation } from './contract.ts';
/**
 * Profile construction and comparison.
 *
 * A profile is derived data — rebuildable from the event log at any time — so
 * this module is pure and takes observations as input rather than reaching for
 * storage itself.
 */
/**
 * Sessions required before deviations may be reported at all.
 *
 * Below this the profile accumulates silently. Four is not a lot, but the
 * alternative is worse: a baseline from one or two sessions looks authoritative
 * while describing almost nothing, and would let a developer's first unusual day
 * define them.
 */
export declare const MINIMUM_SESSIONS_TO_ESTABLISH = 4;
/**
 * Features worth tracking across sessions.
 *
 * Deliberately excludes anything risk-contributing. A baseline exists to
 * interpret behaviour fairly, not to accumulate a record of concerns — building
 * a per-developer history of suspicion would invert the platform's purpose and
 * make one bad session follow someone permanently.
 */
export declare const TRACKED_FEATURES: readonly string[];
/** Extracts the trackable metrics from a scored session. */
export declare function observationFrom(extraction: FeatureExtractionResult, meta: {
    readonly tenantId: TenantId;
    readonly developerId: DeveloperId;
    readonly sessionId: SessionObservation['sessionId'];
    readonly observedAt: EpochMs;
}): SessionObservation;
export interface ProfileOptions {
    /** Now, for recency weighting. Injected so profiles rebuild deterministically. */
    readonly now: EpochMs;
    /** Days after which an observation carries half weight. */
    readonly halfLifeDays?: number | undefined;
    /** Sessions required before the profile may be compared against. */
    readonly minimumSessions?: number | undefined;
}
export declare function buildProfile(tenantId: TenantId, developerId: DeveloperId, observations: readonly SessionObservation[], options: ProfileOptions): DeveloperProfile;
export interface ComparisonOptions {
    /**
     * Permit falling back to population statistics when the developer has no
     * usable history.
     *
     * Defaults to false, and should stay false for anything affecting a person's
     * outcome. Comparing someone to a population they may legitimately differ
     * from is how systems end up penalising the unusual — the left-handed, the
     * self-taught, the developer using an unfamiliar keyboard layout.
     */
    readonly allowPopulationFallback?: boolean | undefined;
    readonly population?: PopulationStatistics | undefined;
}
/**
 * Compares one session's metric against the best available baseline.
 *
 * Returns a deviation with `basis: NONE` rather than a fabricated number when
 * no fair comparison exists. Downstream consumers must treat that as "unknown",
 * never as "normal" or "abnormal".
 */
export declare function compare(feature: string, observed: number, profile: DeveloperProfile | null, options?: ComparisonOptions): Deviation;
/** Compares every metric in a session against the profile. */
export declare function compareSession(observation: SessionObservation, profile: DeveloperProfile | null, options?: ComparisonOptions): readonly Deviation[];
/**
 * Deviations large enough to be worth a reviewer's attention.
 *
 * The threshold is high by design. At |z| ≥ 3 against a robust estimator, an
 * observation is genuinely unusual for that person — and even then it is a
 * question, never a finding: people have good days, bad days, and days when
 * they already knew the answer.
 */
export declare function notableDeviations(deviations: readonly Deviation[], threshold?: number): readonly Deviation[];
export declare function buildPopulation(tenantId: TenantId, profiles: readonly DeveloperProfile[], cohort?: string): PopulationStatistics;
export type { Unit };
//# sourceMappingURL=profile.d.ts.map