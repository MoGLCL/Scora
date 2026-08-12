/**
 * SCORA Trust Engine — feature extraction.
 *
 * Turns an immutable evidence stream into explainable, per-layer feature
 * vectors for Layers 01 through 07. Every feature carries the event ids that
 * produced it, so any number in a report can be traced to its evidence.
 *
 * This stage measures. It does not judge: no weighting, no thresholds on
 * absolute speed, no verdicts. Those belong to scoring, which runs later and
 * can weigh all layers together — the only honest place to decide whether
 * signals corroborate one another.
 */

export {
  FeatureKind,
  FeaturePolarity,
  featureValue,
  findFeature,
  type Feature,
  type FeatureDefinition,
  type FeatureExtractionResult,
  type LayerFeatures,
} from './contract.ts';

export {
  EXTRACTED_LAYERS,
  FEATURE_DEFINITIONS,
  aggregateConfidence,
  extractFeatures,
  type ExtractionOptions,
} from './extract.ts';

export {
  buildSessionWindow,
  type DeveloperBaseline,
  type ExtractionContext,
  type SessionWindow,
} from './window.ts';

export { ENVIRONMENT_FEATURES } from './layers/environment.ts';
export { INTERACTION_FEATURES } from './layers/interaction.ts';
export { TYPING_FEATURES } from './layers/typing.ts';
export { CODE_EVOLUTION_FEATURES } from './layers/evolution.ts';
export { RUNTIME_FEATURES } from './layers/runtime.ts';
export { EXTERNAL_FEATURES } from './layers/external.ts';
export { ASSISTANCE_FEATURES } from './layers/assistance.ts';
