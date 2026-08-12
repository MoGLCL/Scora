import { TrustLayer, type Unit } from '@scora/trust-core';
import { type LayerFeatures } from '@scora/trust-features';
import type { LayerAssessment } from './contract.ts';
export declare function assessLayer(layerFeatures: LayerFeatures): LayerAssessment;
/**
 * Combines layer standings into an overall support level.
 *
 * Layers with no evidence are skipped rather than counted as zero — that
 * distinction is the difference between "we saw nothing" and "we saw nothing
 * good", and conflating them would punish sessions with patchy telemetry.
 *
 * `evidentialWeight` reports what that skipping cost. Standing is a weighted
 * mean over whichever layers happened to be observed, so it says nothing about
 * how much of the picture was missing: two circumstantial layers and all nine
 * produce numbers on the same scale, and a caller reading standing alone cannot
 * tell them apart. The share is returned so the decision boundary can.
 */
export declare function combineStandings(assessments: readonly LayerAssessment[]): {
    readonly standing: Unit | null;
    readonly layersScored: number;
    /** Share of the available layer weight that was actually observed. */
    readonly evidentialWeight: Unit;
};
/**
 * How much each layer contributes to overall support.
 *
 * Runtime and code evolution dominate because they are the hardest to fake:
 * debugging an unfamiliar failure and restructuring working code both require a
 * genuine mental model. Interaction and environment are weighted low because
 * they describe circumstances more than capability.
 */
declare const LAYER_WEIGHT: Readonly<Record<TrustLayer, number>>;
export { LAYER_WEIGHT };
//# sourceMappingURL=layers.d.ts.map