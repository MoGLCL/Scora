import { LAYER_DEFINITIONS, TrustLayer, clampUnit, type Unit } from '@scora/trust-core';
import { FeaturePolarity, type Feature, type LayerFeatures } from '@scora/trust-features';
import type { FeatureNote, LayerAssessment } from './contract.ts';

/**
 * Per-layer assessment.
 *
 * Each layer is judged only on its own features. Cross-layer reasoning happens
 * exclusively in the cluster stage, which keeps the two concerns separable: a
 * reviewer can see that Layer 05 looked strong even while a cluster spanning
 * Layers 03 and 06 raised a question.
 *
 * `standing` deliberately ignores RISK_CONTRIBUTING features. Risk is a cluster
 * property; letting it also depress a layer's standing would count the same
 * evidence twice.
 */

/**
 * Relative importance of features within a layer.
 *
 * These are not global trust weights — they order features against their peers
 * so that, for instance, resolving errors counts for more than merely running
 * code. Anything unlisted defaults to 1.
 */
const FEATURE_IMPORTANCE: Readonly<Record<string, number>> = {
  // Layer 02 — deliberate navigation says more than raw activity volume.
  'interaction.navigation_depth': 2,
  'interaction.verification_command_ratio': 2,
  'interaction.reading_ratio': 1.5,
  'interaction.engagement_rate': 0.5,

  // Layer 03 — self-correction and rewriting are the authorship signals.
  'typing.correction_ratio': 2,
  'typing.rewrite_count': 2,
  'typing.authorship_ratio': 1.5,
  'typing.internal_paste_ratio': 1,
  'typing.characters_authored': 0.25,

  // Layer 04 — revision and refactoring require understanding.
  'evolution.revision_ratio': 2,
  'evolution.refactor_count': 2,
  'evolution.post_insertion_revision_ratio': 2,
  'evolution.increment_count': 1,
  'evolution.growth_smoothness': 1,

  // Layer 05 — the strongest pre-interview evidence of capability.
  'runtime.error_resolution_rate': 3,
  'runtime.authored_test_ratio': 2.5,
  'runtime.breakpoint_precision': 2,
  'runtime.verification_before_submit': 2,
  'runtime.final_test_pass_ratio': 1.5,
  'runtime.debugging_engagement': 1,
  'runtime.execution_count': 0.5,
  'runtime.test_run_count': 0.5,

  // Layer 06 — how a resource was used, not that it was used.
  'external.adaptation_ratio': 2.5,
  'external.documentation_ratio': 1.5,
  'external.study_ratio': 1.5,
  'external.reference_diversity': 1,

  // Layer 07 — engagement with suggestions, never their volume.
  'assist.post_acceptance_engagement_rate': 3,
  'assist.modification_ratio': 2.5,
  'assist.verification_rate': 2.5,
  'assist.selective_acceptance_rate': 2,
  'assist.rejection_rate': 1.5,
};

/**
 * Normalises a feature's value onto [0,1] for comparison within its layer.
 *
 * Counts have no natural ceiling, so they saturate: the difference between zero
 * and two refactors is meaningful, between twenty and forty is not.
 */
function normalise(feature: Feature): number | null {
  if (feature.value === null) return null;

  switch (feature.kind) {
    case 'RATIO':
      return clampUnit(feature.value);
    case 'COUNT':
      return clampUnit(feature.value / (feature.value + 3));
    case 'INDEX':
      return clampUnit(feature.value / (feature.value + 1));
    case 'RATE':
    case 'DURATION':
      // Neither has a direction that is universally good, so they inform the
      // narrative rather than the standing.
      return null;
    default:
      return null;
  }
}

export function assessLayer(layerFeatures: LayerFeatures): LayerAssessment {
  const { layer, features, coverage } = layerFeatures;

  const supporting: FeatureNote[] = [];
  const concerning: FeatureNote[] = [];

  let weightedSum = 0;
  let weightTotal = 0;
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const feature of features) {
    if (feature.value === null) continue;

    confidenceSum += feature.confidence;
    confidenceCount += 1;

    const importance = FEATURE_IMPORTANCE[feature.name] ?? 1;
    const normalised = normalise(feature);

    if (feature.polarity === FeaturePolarity.SUPPORTIVE && normalised !== null) {
      // Confidence gates influence: a strong-looking value from one observation
      // must not carry the same weight as one from fifty.
      const weight = importance * feature.confidence;
      weightedSum += normalised * weight;
      weightTotal += weight;

      if (normalised > 0) {
        supporting.push(note(feature, clampUnit(normalised * feature.confidence)));
      }
    }

    if (feature.polarity === FeaturePolarity.RISK_CONTRIBUTING && feature.value > 0) {
      // Recorded as a question for the cluster stage, not subtracted here.
      concerning.push(note(feature, clampUnit((normalised ?? 1) * feature.confidence)));
    }
  }

  const standing = weightTotal > 0 ? clampUnit(weightedSum / weightTotal) : null;
  const confidence =
    confidenceCount > 0 ? clampUnit(confidenceSum / confidenceCount) : clampUnit(0);

  supporting.sort((a, b) => b.weight - a.weight);
  concerning.sort((a, b) => b.weight - a.weight);

  return {
    layer,
    standing,
    coverage,
    confidence,
    supporting,
    concerning,
    summary: summarise(layer, standing, coverage, supporting, concerning),
  };
}

function note(feature: Feature, weight: Unit): FeatureNote {
  return {
    name: feature.name,
    value: feature.value!,
    polarity: feature.polarity,
    weight,
    note: feature.note,
    evidence: feature.evidence,
  };
}

function summarise(
  layer: TrustLayer,
  standing: Unit | null,
  coverage: Unit,
  supporting: readonly FeatureNote[],
  concerning: readonly FeatureNote[],
): string {
  const name = LAYER_DEFINITIONS[layer].name;

  if (standing === null) {
    return `${name}: no scoreable evidence was collected (${(coverage * 100).toFixed(0)}% coverage).`;
  }

  const band =
    standing >= 0.75 ? 'strong' : standing >= 0.5 ? 'solid' : standing >= 0.25 ? 'limited' : 'sparse';

  const lead = supporting.at(0);
  const question = concerning.at(0);

  const parts = [`${name}: ${band} evidence (${(standing * 100).toFixed(0)}/100).`];
  if (lead !== undefined) parts.push(lead.note + '.');
  if (question !== undefined) parts.push(`Open question — ${question.note}.`);
  if (coverage < 0.6) {
    parts.push(`Only ${(coverage * 100).toFixed(0)}% of this layer could be computed.`);
  }

  return parts.join(' ');
}

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
export function combineStandings(
  assessments: readonly LayerAssessment[],
): {
  readonly standing: Unit | null;
  readonly layersScored: number;
  /** Share of the available layer weight that was actually observed. */
  readonly evidentialWeight: Unit;
} {
  const available = assessments.reduce((sum, assessment) => sum + LAYER_WEIGHT[assessment.layer], 0);
  const scored = assessments.filter((assessment) => assessment.standing !== null);
  if (scored.length === 0) {
    return { standing: null, layersScored: 0, evidentialWeight: clampUnit(0) };
  }

  let weightedSum = 0;
  let weightTotal = 0;
  let observed = 0;

  for (const assessment of scored) {
    // A layer's influence is bounded by how much of it was actually observed
    // and how confident its features were.
    const weight = LAYER_WEIGHT[assessment.layer] * assessment.coverage * assessment.confidence;
    weightedSum += assessment.standing! * weight;
    weightTotal += weight;
    observed += LAYER_WEIGHT[assessment.layer];
  }

  return {
    standing: weightTotal > 0 ? clampUnit(weightedSum / weightTotal) : null,
    layersScored: scored.length,
    evidentialWeight: clampUnit(available === 0 ? 0 : observed / available),
  };
}

/**
 * How much each layer contributes to overall support.
 *
 * Runtime and code evolution dominate because they are the hardest to fake:
 * debugging an unfamiliar failure and restructuring working code both require a
 * genuine mental model. Interaction and environment are weighted low because
 * they describe circumstances more than capability.
 */
const LAYER_WEIGHT: Readonly<Record<TrustLayer, number>> = {
  [TrustLayer.SYSTEM]: 0,
  [TrustLayer.ENVIRONMENT]: 0.5,
  [TrustLayer.INTERACTION]: 1,
  [TrustLayer.TYPING]: 1.5,
  [TrustLayer.CODE_EVOLUTION]: 2.5,
  [TrustLayer.RUNTIME]: 3,
  [TrustLayer.EXTERNAL]: 1,
  [TrustLayer.AI_ASSISTANCE]: 2,
  [TrustLayer.SKILL]: 3,
  [TrustLayer.INTERVIEW]: 3,
  [TrustLayer.HUMAN_REVIEW]: 0,
};

export { LAYER_WEIGHT };
