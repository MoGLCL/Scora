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
export { FeatureKind, FeaturePolarity, featureValue, findFeature, } from "./contract.js";
export { EXTRACTED_LAYERS, FEATURE_DEFINITIONS, aggregateConfidence, extractFeatures, } from "./extract.js";
export { buildSessionWindow, } from "./window.js";
export { ENVIRONMENT_FEATURES } from "./layers/environment.js";
export { INTERACTION_FEATURES } from "./layers/interaction.js";
export { TYPING_FEATURES } from "./layers/typing.js";
export { CODE_EVOLUTION_FEATURES } from "./layers/evolution.js";
export { RUNTIME_FEATURES } from "./layers/runtime.js";
export { EXTERNAL_FEATURES } from "./layers/external.js";
export { ASSISTANCE_FEATURES } from "./layers/assistance.js";
//# sourceMappingURL=index.js.map