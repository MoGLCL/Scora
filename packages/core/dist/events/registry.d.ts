import { TrustLayer } from './layers.ts';
import { TrustEventType } from './types.ts';
/**
 * How sensitive an event's payload is, which drives retention, encryption and
 * who may see it in the reviewer dashboard.
 *
 * Data minimisation is a design requirement, not a policy document: the class
 * is attached to the event type here so storage and access control can enforce
 * it mechanically rather than relying on each producer to remember.
 */
export declare const Sensitivity: {
    /** Counters and timings. No content, no identifying detail. */
    readonly METRIC: "METRIC";
    /** Structural detail: file paths, resource categories, error classes. */
    readonly STRUCTURAL: "STRUCTURAL";
    /** Developer-authored or developer-directed content: code, queries, answers. */
    readonly CONTENT: "CONTENT";
    /** Personal data or recordings. Strictest handling; explicit consent required. */
    readonly PERSONAL: "PERSONAL";
};
export type Sensitivity = (typeof Sensitivity)[keyof typeof Sensitivity];
/**
 * How an event may influence scoring.
 *
 * This encodes the platform's central rule in the type system. An event marked
 * NEUTRAL cannot raise Risk under any circumstances — the scoring stage is not
 * permitted to read it as adverse, no matter how it correlates. Documentation
 * lookups, AI usage and fast typing all live here deliberately.
 */
export declare const EvidencePolarity: {
    /** Can support Trust. Never raises Risk. */
    readonly SUPPORTIVE: "SUPPORTIVE";
    /** Context only. Never moves Trust or Risk on its own in either direction. */
    readonly NEUTRAL: "NEUTRAL";
    /** May contribute to Risk, but only as part of a corroborated cluster. */
    readonly RISK_CONTRIBUTING: "RISK_CONTRIBUTING";
    /** Affects Confidence only: how much the evidence base can be relied on. */
    readonly CONFIDENCE_AFFECTING: "CONFIDENCE_AFFECTING";
};
export type EvidencePolarity = (typeof EvidencePolarity)[keyof typeof EvidencePolarity];
export interface EventDefinition {
    readonly type: TrustEventType;
    readonly layer: TrustLayer;
    readonly sensitivity: Sensitivity;
    readonly polarity: EvidencePolarity;
    /**
     * Whether this event may ever appear alone in an explanation as grounds for
     * a negative outcome. Always false for RISK_CONTRIBUTING events — that is the
     * mechanism preventing "one paste = cheating".
     */
    readonly sufficientAlone: boolean;
    /** Expected volume, used for sampling and storage planning. */
    readonly cardinality: 'low' | 'medium' | 'high';
    /** Consent scope that must be granted for this event to be collected at all. */
    readonly requiresConsent: 'none' | 'assessment' | 'external_monitoring' | 'recording';
    readonly description: string;
}
export declare const EVENT_REGISTRY: Readonly<Record<TrustEventType, EventDefinition>>;
export declare function describeEvent(type: TrustEventType): EventDefinition;
export declare function eventsForLayer(layer: TrustLayer): readonly EventDefinition[];
export declare function eventsRequiringConsent(scope: EventDefinition['requiresConsent']): readonly EventDefinition[];
/** True when an event may contribute to Risk — always as part of a cluster, never alone. */
export declare function canContributeToRisk(type: TrustEventType): boolean;
//# sourceMappingURL=registry.d.ts.map