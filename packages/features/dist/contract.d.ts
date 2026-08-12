import type { EventId, TrustEventType, TrustLayer, Unit } from '@scora/trust-core';
/**
 * The feature contract.
 *
 * A feature is a single measured quantity derived from evidence. Every feature
 * carries the event ids that produced it, so any number appearing in a report
 * can be traced back to the exact evidence behind it. Without that link an
 * explanation is just an assertion.
 *
 * Features deliberately do NOT carry weights, thresholds or verdicts. They say
 * what was observed; deciding what it means belongs to layer assessment and
 * scoring, which run later and can see all layers at once.
 */
/**
 * How a feature relates to trust, in the abstract.
 *
 * This mirrors the event registry's polarity but applies to a derived quantity.
 * `CONTEXTUAL` exists because many features only acquire meaning alongside
 * others: a high suggestion-acceptance rate is neither good nor bad until you
 * know whether the developer then modified and tested the result.
 */
export declare const FeaturePolarity: {
    /** Higher values indicate stronger evidence of capability and ownership. */
    readonly SUPPORTIVE: "SUPPORTIVE";
    /** Descriptive only. Never moves trust or risk in either direction. */
    readonly NEUTRAL: "NEUTRAL";
    /** Meaning depends entirely on other features; interpret only in a cluster. */
    readonly CONTEXTUAL: "CONTEXTUAL";
    /** May contribute to risk, but only when corroborated across layers. */
    readonly RISK_CONTRIBUTING: "RISK_CONTRIBUTING";
    /** Describes how much the evidence base can be relied upon. */
    readonly CONFIDENCE_AFFECTING: "CONFIDENCE_AFFECTING";
};
export type FeaturePolarity = (typeof FeaturePolarity)[keyof typeof FeaturePolarity];
/** What kind of quantity a feature holds, so consumers read it correctly. */
export declare const FeatureKind: {
    /** A [0, 1] proportion. */
    readonly RATIO: "RATIO";
    /** A non-negative count of occurrences. */
    readonly COUNT: "COUNT";
    /** Milliseconds. */
    readonly DURATION: "DURATION";
    /** A rate per unit time, such as events per minute. */
    readonly RATE: "RATE";
    /** A dimensionless statistic such as a coefficient of variation. */
    readonly INDEX: "INDEX";
};
export type FeatureKind = (typeof FeatureKind)[keyof typeof FeatureKind];
/**
 * A computed feature.
 *
 * `value` is null when the session contains no evidence to compute it from —
 * distinct from zero. A developer who was never shown a completion has a null
 * acceptance rate, not a rate of 0, and conflating the two would let absent
 * evidence masquerade as a measured result.
 */
export interface Feature {
    readonly name: string;
    readonly layer: TrustLayer;
    readonly kind: FeatureKind;
    readonly polarity: FeaturePolarity;
    readonly value: number | null;
    /**
     * How much of the evidence needed for this feature was actually present.
     *
     * Distinct from the value itself: a modification ratio computed from two
     * suggestions and one from two hundred may both read 0.5, but they do not
     * deserve equal weight downstream.
     */
    readonly sampleSize: number;
    readonly confidence: Unit;
    /** Every event that contributed. This is what makes the feature explainable. */
    readonly evidence: readonly EventId[];
    /** Human-readable statement of what was observed, for the reviewer dashboard. */
    readonly note: string;
}
/** Static description of a feature, independent of any session. */
export interface FeatureDefinition {
    readonly name: string;
    readonly layer: TrustLayer;
    readonly kind: FeatureKind;
    readonly polarity: FeaturePolarity;
    readonly description: string;
    /** Event types this feature reads. Used to check extractor/registry agreement. */
    readonly inputs: readonly TrustEventType[];
    /** How the value is computed, in prose, for auditors and reviewers. */
    readonly calculation: string;
    /** Why this feature exists and how it should and should not be read. */
    readonly interpretation: string;
}
/** All features produced by one layer for one session. */
export interface LayerFeatures {
    readonly layer: TrustLayer;
    readonly features: readonly Feature[];
    /**
     * Share of this layer's features that could be computed at all.
     *
     * A layer whose telemetry never arrived reports low coverage, which lowers
     * Confidence downstream rather than being silently treated as "nothing
     * suspicious found".
     */
    readonly coverage: Unit;
    /** Reasons features could not be computed. Surfaced to reviewers verbatim. */
    readonly gaps: readonly string[];
}
export interface FeatureExtractionResult {
    readonly layers: readonly LayerFeatures[];
    readonly featuresByName: ReadonlyMap<string, Feature>;
    /** Every feature flattened, for consumers that do not care about layering. */
    readonly all: readonly Feature[];
}
export declare function findFeature(result: FeatureExtractionResult, name: string): Feature | undefined;
/** Reads a feature's value, or a fallback when it could not be computed. */
export declare function featureValue(result: FeatureExtractionResult, name: string, fallback: number): number;
//# sourceMappingURL=contract.d.ts.map