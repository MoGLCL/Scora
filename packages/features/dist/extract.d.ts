import { TrustLayer, type TrustEvent, type Unit } from '@scora/trust-core';
import type { Feature, FeatureDefinition, FeatureExtractionResult } from './contract.ts';
import { type ExtractionContext } from './window.ts';
/** Every feature definition across all layers, indexed by name. */
export declare const FEATURE_DEFINITIONS: ReadonlyMap<string, FeatureDefinition>;
export declare const EXTRACTED_LAYERS: readonly TrustLayer[];
export interface ExtractionOptions {
    /** Restrict extraction to specific layers. Defaults to all seven. */
    readonly layers?: readonly TrustLayer[] | undefined;
}
export declare function extractFeatures(events: readonly TrustEvent[], context: ExtractionContext, options?: ExtractionOptions): FeatureExtractionResult;
/** Aggregate confidence across a set of features, weighted by their own confidence. */
export declare function aggregateConfidence(features: readonly Feature[]): Unit;
//# sourceMappingURL=extract.d.ts.map