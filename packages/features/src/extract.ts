import {
  TrustLayer,
  clampUnit,
  type TrustEvent,
  type Unit,
} from '@scora/trust-core';
import type {
  Feature,
  FeatureDefinition,
  FeatureExtractionResult,
  LayerFeatures,
} from './contract.ts';
import { ENVIRONMENT_FEATURES, extractEnvironmentFeatures } from './layers/environment.ts';
import { INTERACTION_FEATURES, extractInteractionFeatures } from './layers/interaction.ts';
import { TYPING_FEATURES, extractTypingFeatures } from './layers/typing.ts';
import { CODE_EVOLUTION_FEATURES, extractCodeEvolutionFeatures } from './layers/evolution.ts';
import { RUNTIME_FEATURES, extractRuntimeFeatures } from './layers/runtime.ts';
import { EXTERNAL_FEATURES, extractExternalFeatures } from './layers/external.ts';
import { ASSISTANCE_FEATURES, extractAssistanceFeatures } from './layers/assistance.ts';
import { buildSessionWindow, type ExtractionContext, type SessionWindow } from './window.ts';

/**
 * The feature extraction pipeline.
 *
 * Events in, explainable per-layer feature vectors out. Deliberately the whole
 * job of this stage: no cross-layer reasoning, no weighting, no verdicts. Layer
 * assessment and scoring come later and can then see every layer at once, which
 * is the only point at which corroboration can honestly be judged.
 *
 * Extraction is pure and deterministic — the same events always produce the
 * same features. That property is what lets the calibration harness replay
 * thousands of synthetic sessions and compare scoring changes meaningfully.
 */

interface LayerExtractor {
  readonly layer: TrustLayer;
  readonly definitions: readonly FeatureDefinition[];
  readonly extract: (window: SessionWindow, context: ExtractionContext) => readonly Feature[];
}

const EXTRACTORS: readonly LayerExtractor[] = [
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
export const FEATURE_DEFINITIONS: ReadonlyMap<string, FeatureDefinition> = new Map(
  EXTRACTORS.flatMap((extractor) =>
    extractor.definitions.map((definition) => [definition.name, definition] as const),
  ),
);

export const EXTRACTED_LAYERS: readonly TrustLayer[] = EXTRACTORS.map(
  (extractor) => extractor.layer,
);

export interface ExtractionOptions {
  /** Restrict extraction to specific layers. Defaults to all seven. */
  readonly layers?: readonly TrustLayer[] | undefined;
}

export function extractFeatures(
  events: readonly TrustEvent[],
  context: ExtractionContext,
  options: ExtractionOptions = {},
): FeatureExtractionResult {
  const window = buildSessionWindow(events);
  const selected =
    options.layers === undefined
      ? EXTRACTORS
      : EXTRACTORS.filter((extractor) => options.layers!.includes(extractor.layer));

  const layers: LayerFeatures[] = [];
  const featuresByName = new Map<string, Feature>();
  const all: Feature[] = [];

  for (const extractor of selected) {
    const features = extractor.extract(window, context);
    const gaps: string[] = [];

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
function layerCoverage(features: readonly Feature[]): Unit {
  if (features.length === 0) return clampUnit(0);
  const computed = features.filter((feature) => feature.value !== null).length;
  return clampUnit(computed / features.length);
}

/** Aggregate confidence across a set of features, weighted by their own confidence. */
export function aggregateConfidence(features: readonly Feature[]): Unit {
  const usable = features.filter((feature) => feature.value !== null);
  if (usable.length === 0) return clampUnit(0);
  const total = usable.reduce((sum, feature) => sum + feature.confidence, 0);
  return clampUnit(total / usable.length);
}
