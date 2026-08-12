import { type DeveloperId, type EpochMs, type EventId, type SessionId, type TaskId, type TenantId, type TrustEvent, type TrustEventType, type Unit } from '@scora/trust-core';
import { FeatureKind, FeaturePolarity, type Feature } from './contract.ts';
/**
 * A session's events, indexed once and reused by every extractor.
 *
 * Extractors run over the same stream dozens of times; bucketing by type once
 * turns each of those passes into a map lookup. It also gives every extractor
 * the same view of the session, so two features can never disagree about what
 * the timeline was.
 */
export interface SessionWindow {
    readonly events: readonly TrustEvent[];
    readonly byType: ReadonlyMap<TrustEventType, readonly TrustEvent[]>;
    readonly startedAt: EpochMs;
    readonly endedAt: EpochMs;
    readonly durationMs: number;
    /**
     * Session time minus periods where telemetry was absent or the developer was
     * demonstrably away. Rates are computed against this rather than wall-clock,
     * so a developer who took a lunch break does not read as inactive.
     */
    readonly activeMs: number;
}
export interface ExtractionContext {
    readonly tenantId: TenantId;
    readonly sessionId: SessionId;
    readonly developerId: DeveloperId;
    readonly taskId?: TaskId | undefined;
    /**
     * The developer's own historical behaviour, when available.
     *
     * Layer 03 in particular is meaningless without it: typing speed only carries
     * information relative to how this person normally types. Extractors must
     * degrade gracefully when it is absent — falling back to within-session
     * comparison and reporting lower confidence — because a first-time developer
     * has no history and must not be penalised for that.
     */
    readonly baseline?: DeveloperBaseline | undefined;
}
/**
 * Minimal baseline shape consumed by extractors.
 *
 * Declared here rather than imported so that `packages/baseline` depends on
 * features and not the reverse; features must remain computable without it.
 */
export interface DeveloperBaseline {
    readonly developerId: DeveloperId;
    readonly sessionsObserved: number;
    readonly medianTypingRateCpm: number | null;
    readonly medianInsertionChars: number | null;
    readonly medianCorrectionRatio: number | null;
    readonly medianSuggestionAcceptanceRate: number | null;
    readonly medianErrorRecoveryMs: number | null;
}
export declare function buildSessionWindow(events: readonly TrustEvent[]): SessionWindow;
export declare function eventsOfType(window: SessionWindow, ...types: readonly TrustEventType[]): readonly TrustEvent[];
export declare function countOfType(window: SessionWindow, ...types: readonly TrustEventType[]): number;
export declare function numberField(event: TrustEvent, key: string): number | null;
export declare function stringField(event: TrustEvent, key: string): string | null;
export declare function booleanField(event: TrustEvent, key: string): boolean | null;
export declare function sumField(events: readonly TrustEvent[], key: string): number;
export declare function collectField(events: readonly TrustEvent[], key: string): number[];
export declare function evidenceIds(...groups: readonly (readonly TrustEvent[])[]): readonly EventId[];
export declare function sum(values: readonly number[]): number;
export declare function mean(values: readonly number[]): number | null;
export declare function median(values: readonly number[]): number | null;
export declare function standardDeviation(values: readonly number[]): number | null;
/**
 * Coefficient of variation: spread relative to magnitude.
 *
 * Preferred over raw standard deviation whenever behaviour is compared across
 * developers, because a fast typist and a slow one have different absolute
 * variance while being equally consistent.
 */
export declare function coefficientOfVariation(values: readonly number[]): number | null;
/** Safe division that returns null rather than NaN or Infinity. */
export declare function ratio(numerator: number, denominator: number): number | null;
/**
 * Confidence from sample size, saturating.
 *
 * One observation supports a weak claim, ten support a solid one, and a hundred
 * add little beyond that. Chosen so a feature backed by a single event can
 * never present itself as certain.
 */
export declare function sampleConfidence(sampleSize: number, halfway?: number): Unit;
/** Confidence from how much of the session the evidence actually covers. */
export declare function coverageConfidence(coveredMs: number, totalMs: number): Unit;
export interface FeatureInit {
    readonly name: string;
    readonly layer: Feature['layer'];
    readonly kind?: FeatureKind;
    readonly polarity?: FeaturePolarity;
    readonly value: number | null;
    readonly sampleSize: number;
    readonly evidence: readonly EventId[];
    readonly note: string;
    /** Overrides the sample-size-derived confidence when a better estimate exists. */
    readonly confidence?: Unit;
}
export declare function makeFeature(init: FeatureInit): Feature;
/** Formats a number for the human-readable note attached to each feature. */
export declare function fmt(value: number | null, decimals?: number): string;
export declare function fmtDuration(ms: number | null): string;
//# sourceMappingURL=window.d.ts.map