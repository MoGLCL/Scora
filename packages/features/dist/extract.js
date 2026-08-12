import { TrustLayer, clampUnit, } from '@scora/trust-core';
import { ENVIRONMENT_FEATURES, extractEnvironmentFeatures } from "./layers/environment.js";
import { INTERACTION_FEATURES, extractInteractionFeatures } from "./layers/interaction.js";
import { TYPING_FEATURES, extractTypingFeatures } from "./layers/typing.js";
import { CODE_EVOLUTION_FEATURES, extractCodeEvolutionFeatures } from "./layers/evolution.js";
import { RUNTIME_FEATURES, extractRuntimeFeatures } from "./layers/runtime.js";
import { EXTERNAL_FEATURES, extractExternalFeatures } from "./layers/external.js";
import { ASSISTANCE_FEATURES, extractAssistanceFeatures } from "./layers/assistance.js";
import { buildSessionWindow } from "./window.js";
const EXTRACTORS = [
    {
        layer: TrustLayer.ENVIRONMENT,
        definitions: ENVIRONMENT_FEATURES,
        extract: extractEnvironmentFeatures,
    },
    {
        layer: TrustLayer.INTERACTION,
        definitions: INTERACTION_FEATURES,
        extract: extractInteractionFeatures,
    },
    {
        layer: TrustLayer.TYPING,
        definitions: TYPING_FEATURES,
        extract: extractTypingFeatures,
    },
    {
        layer: TrustLayer.CODE_EVOLUTION,
        definitions: CODE_EVOLUTION_FEATURES,
        extract: extractCodeEvolutionFeatures,
    },
    {
        layer: TrustLayer.RUNTIME,
        definitions: RUNTIME_FEATURES,
        extract: extractRuntimeFeatures,
    },
    {
        layer: TrustLayer.EXTERNAL,
        definitions: EXTERNAL_FEATURES,
        extract: extractExternalFeatures,
    },
    {
        layer: TrustLayer.AI_ASSISTANCE,
        definitions: ASSISTANCE_FEATURES,
        extract: extractAssistanceFeatures,
    },
];
/** Every feature definition across all layers, indexed by name. */
export const FEATURE_DEFINITIONS = new Map(EXTRACTORS.flatMap((extractor) => extractor.definitions.map((definition) => [definition.name, definition])));
export const EXTRACTED_LAYERS = EXTRACTORS.map((extractor) => extractor.layer);
export function extractFeatures(events, context, options = {}) {
    const window = buildSessionWindow(events);
    const selected = options.layers === undefined
        ? EXTRACTORS
        : EXTRACTORS.filter((extractor) => options.layers.includes(extractor.layer));
    const layers = [];
    const featuresByName = new Map();
    const all = [];
    for (const extractor of selected) {
        const features = extractor.extract(window, context);
        const gaps = [];
        for (const feature of features) {
            featuresByName.set(feature.name, feature);
            all.push(feature);
            if (feature.value === null) {
                gaps.push(`${feature.name}: ${feature.note}`);
            }
        }
        layers.push({
            layer: extractor.layer,
            features,
            coverage: layerCoverage(features),
            gaps,
        });
    }
    return { layers, featuresByName, all };
}
/**
 * Share of a layer's features that could actually be computed.
 *
 * Reported rather than hidden because absent evidence is not the same as
 * absence of concern: a session with no runtime telemetry has not demonstrated
 * good debugging, and it has not demonstrated bad debugging either.
 */
function layerCoverage(features) {
    if (features.length === 0)
        return clampUnit(0);
    const computed = features.filter((feature) => feature.value !== null).length;
    return clampUnit(computed / features.length);
}
/** Aggregate confidence across a set of features, weighted by their own confidence. */
export function aggregateConfidence(features) {
    const usable = features.filter((feature) => feature.value !== null);
    if (usable.length === 0)
        return clampUnit(0);
    const total = usable.reduce((sum, feature) => sum + feature.confidence, 0);
    return clampUnit(total / usable.length);
}
//# sourceMappingURL=extract.js.map