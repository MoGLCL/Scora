import { clampUnit, type EventId, type Unit } from '@scora/trust-core';
import type { Feature, FeatureExtractionResult } from '@scora/trust-features';
import { CLUSTER_CATALOGUE, aggregateSeverity, evaluateCluster } from './clusters.ts';
import {
  RECOMMENDATION,
  type ClusterFinding,
  type Explanation,
  type FeatureLookup,
  type FeatureNote,
  type LayerAssessment,
  type Recommendation,
  type ScoringResult,
} from './contract.ts';
import { assessLayer, combineStandings } from './layers.ts';

/**
 * The scoring engine.
 *
 *   features → layer assessments → clusters → Trust / Risk / Confidence
 *
 * Three properties are load-bearing and are asserted in tests:
 *
 *   1. Risk comes only from fired clusters. There is no path from a lone feature
 *      to a non-zero Risk score.
 *   2. Confidence is computed from evidence quality alone and never borrows from
 *      Trust, so "confidently trustworthy" and "probably fine, but we barely saw
 *      anything" are distinguishable.
 *   3. Adding one adverse event to a session can move Trust by only a bounded
 *      amount, because clusters need corroboration before they fire at all.
 */

export const POLICY_VERSION = '2026.08-1';

/** Trust cannot be pulled below this by Risk alone — the floor forces a human to decide. */
const TRUST_FLOOR_UNDER_RISK = 0.15;

/** Below this confidence, no recommendation may be adverse. */
const MINIMUM_CONFIDENCE_FOR_ADVERSE = 0.45;

/** Below this, the engine declines to say anything at all. */
const MINIMUM_CONFIDENCE_TO_SCORE = 0.2;

/**
 * Below this share of the available layer weight, the engine declines.
 *
 * Standing alone cannot carry this decision. A session that ends after twenty
 * seconds still produces a keystroke cadence and an interaction pattern, and
 * those two layers on their own yield a perfectly respectable standing — the
 * engine would be concluding "types like a developer, therefore owns the work",
 * which is the forbidden "fast typing = AI" rule with its sign flipped. Nothing
 * about a favourable direction makes an inference from circumstantial evidence
 * sound.
 *
 * Set at 0.3 against measured corpus values: the thinnest session anyone would
 * defend scoring sits at 0.39, a crash after twenty seconds sits at 0.22, and a
 * developer who consented to assessment scope only sits at 0.61 — so exercising
 * a consent right stays comfortably scoreable, which it must.
 */
const MINIMUM_EVIDENTIAL_WEIGHT = 0.3;

export interface ScoringOptions {
  /**
   * Layer 08/09 outcomes, when the interview has run.
   *
   * The interview is the strongest available test of ownership, so it can both
   * discharge concerns and raise them. Absent until Layer 09 is built.
   */
  readonly understanding?:
    | {
        readonly interviewScore: Unit;
        readonly consistencyWithCode: Unit;
        readonly questionsAsked: number;
      }
    | undefined;
}

export function score(
  extraction: FeatureExtractionResult,
  options: ScoringOptions = {},
): ScoringResult {
  const lookup = makeLookup(extraction);

  const layers = extraction.layers.map(assessLayer);
  const clusters = CLUSTER_CATALOGUE.map((definition) => evaluateCluster(definition, lookup));
  const fired = clusters.filter((finding) => finding.fired);

  const { standing, layersScored, evidentialWeight } = combineStandings(layers);
  const confidence = computeConfidence(layers, clusters, extraction, layersScored);
  const severity = aggregateSeverity(clusters);

  const trust = computeTrust(standing, severity, options);
  const risk = computeRisk(severity, confidence);

  const limitations = collectLimitations(layers, clusters, extraction, confidence);
  const recommendation = recommend(trust, risk, confidence, fired, standing, evidentialWeight);
  const explanation = explain(layers, clusters, trust, risk, confidence, recommendation);

  return {
    trust: toScore(trust),
    risk: toScore(risk),
    confidence: toScore(confidence),
    recommendation,
    rationale: explanation.confidenceFactors,
    layers,
    clusters,
    explanation,
    limitations,
    policyVersion: POLICY_VERSION,
  };
}

/**
 * Trust: how well the evidence supports the developer's ownership of the work.
 *
 * Starts from combined layer standing and is reduced — never zeroed — by
 * corroborated concern. The floor exists because the engine is not entitled to
 * declare someone untrustworthy; below it, the recommendation routes to a human.
 */
function computeTrust(
  standing: Unit | null,
  severity: Unit,
  options: ScoringOptions,
): Unit {
  if (standing === null) return clampUnit(0.5);

  let value: number = standing;

  // Demonstrated understanding is the most direct evidence available and can
  // both lift a thin-looking session and deflate a superficially strong one.
  const understanding = options.understanding;
  if (understanding !== undefined && understanding.questionsAsked > 0) {
    const interviewWeight = clampUnit(understanding.questionsAsked / (understanding.questionsAsked + 3));
    const interviewSignal = (understanding.interviewScore + understanding.consistencyWithCode) / 2;
    value = value * (1 - interviewWeight) + interviewSignal * interviewWeight;
  }

  const reduced = value * (1 - severity * (1 - TRUST_FLOOR_UNDER_RISK));
  return clampUnit(Math.max(reduced, severity > 0 ? TRUST_FLOOR_UNDER_RISK : 0));
}

/**
 * Risk: corroborated concern only.
 *
 * Scaled by confidence, so concerns raised on thin evidence present as
 * proportionally weaker rather than as certainties.
 */
function computeRisk(severity: Unit, confidence: Unit): Unit {
  return clampUnit(severity * (0.4 + 0.6 * confidence));
}

/**
 * Confidence: how much the evidence justifies believing the other two numbers.
 *
 * Independent of Trust by construction. Four inputs: how much telemetry arrived,
 * how many layers had something to say, how strong the underlying features were,
 * and whether any cluster could not be fully evaluated.
 */
function computeConfidence(
  layers: readonly LayerAssessment[],
  clusters: readonly ClusterFinding[],
  extraction: FeatureExtractionResult,
  layersScored: number,
): Unit {
  if (extraction.all.length === 0) return clampUnit(0);

  const coverage =
    layers.length === 0
      ? 0
      : layers.reduce((sum, layer) => sum + layer.coverage, 0) / layers.length;

  const breadth = layers.length === 0 ? 0 : layersScored / layers.length;

  const computed = extraction.all.filter((feature) => feature.value !== null);
  const featureConfidence =
    computed.length === 0
      ? 0
      : computed.reduce((sum, feature) => sum + feature.confidence, 0) / computed.length;

  const clusterConfidence =
    clusters.length === 0
      ? 1
      : clusters.reduce((sum, finding) => sum + finding.confidence, 0) / clusters.length;

  // Geometric-style combination: a single collapsed dimension drags the whole
  // thing down, which is the honest behaviour when one input is missing.
  return clampUnit(
    (coverage * 0.3 + breadth * 0.25 + featureConfidence * 0.3 + clusterConfidence * 0.15) ** 0.9,
  );
}

function recommend(
  trust: Unit,
  risk: Unit,
  confidence: Unit,
  fired: readonly ClusterFinding[],
  standing: Unit | null,
  evidentialWeight: Unit,
): Recommendation {
  // Declining is cheap and reversible: the session can be re-run, and nobody is
  // accused of anything. Asserting from two circumstantial layers is neither.
  if (
    standing === null ||
    confidence < MINIMUM_CONFIDENCE_TO_SCORE ||
    evidentialWeight < MINIMUM_EVIDENTIAL_WEIGHT
  ) {
    return RECOMMENDATION.INSUFFICIENT_EVIDENCE;
  }

  // An adverse recommendation on weak evidence is exactly the failure mode this
  // system exists to avoid, so it is blocked outright rather than discouraged.
  if (fired.length > 0 && confidence < MINIMUM_CONFIDENCE_FOR_ADVERSE) {
    return RECOMMENDATION.CLARIFICATION_SUGGESTED;
  }

  if (risk >= 0.4 && fired.length > 0) return RECOMMENDATION.HUMAN_REVIEW_REQUIRED;

  // Clarification requires something to actually clarify. Without a fired
  // cluster or material risk there is no question to put to the developer, and
  // flagging them anyway would turn "less positive evidence" into an
  // accusation — the exact false positive this system exists to avoid. A
  // developer who solved the task cleanly and quickly, encountering no bugs
  // and needing no help, generates little supporting evidence precisely
  // because they did well.
  if (fired.length > 0 || risk >= 0.2) return RECOMMENDATION.CLARIFICATION_SUGGESTED;

  return confidence < 0.5 || trust < 0.6
    ? RECOMMENDATION.SUPPORTED_LOW_CONFIDENCE
    : RECOMMENDATION.SUPPORTED;
}

function explain(
  layers: readonly LayerAssessment[],
  clusters: readonly ClusterFinding[],
  trust: Unit,
  risk: Unit,
  confidence: Unit,
  recommendation: Recommendation,
): Explanation {
  const positive = layers
    .flatMap((layer) => layer.supporting)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 8);

  const fired = clusters.filter((finding) => finding.fired);

  const mitigating = fired
    .flatMap((finding) => finding.mitigations)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);

  const confidenceFactors: string[] = [];
  const scoredLayers = layers.filter((layer) => layer.standing !== null);
  confidenceFactors.push(
    `${scoredLayers.length} of ${layers.length} layers produced scoreable evidence.`,
  );

  const thin = layers.filter((layer) => layer.coverage < 0.6);
  if (thin.length > 0) {
    confidenceFactors.push(
      `Partial telemetry in ${thin.length} layer(s): ${thin.map((layer) => layer.layer).join(', ')}.`,
    );
  }

  const undetermined = clusters.filter((finding) => finding.conditionsIndeterminate > 0);
  if (undetermined.length > 0) {
    confidenceFactors.push(
      `${undetermined.length} risk pattern(s) could not be fully evaluated for want of evidence.`,
    );
  }

  if (fired.length === 0) {
    confidenceFactors.push('No corroborated risk pattern was detected.');
  }

  return {
    headline: headline(trust, risk, confidence, fired, recommendation),
    positiveEvidence: positive,
    riskEvidence: fired,
    mitigatingEvidence: mitigating,
    confidenceFactors,
    suggestedQuestions: suggestQuestions(fired, layers),
  };
}

function headline(
  trust: Unit,
  risk: Unit,
  confidence: Unit,
  fired: readonly ClusterFinding[],
  recommendation: Recommendation,
): string {
  const t = (trust * 100).toFixed(0);
  const r = (risk * 100).toFixed(0);
  const c = (confidence * 100).toFixed(0);

  switch (recommendation) {
    case RECOMMENDATION.INSUFFICIENT_EVIDENCE:
      return `Insufficient evidence to assess this session (confidence ${c}%). This is not an adverse finding.`;
    case RECOMMENDATION.HUMAN_REVIEW_REQUIRED:
      return `Trust ${t}, Risk ${r}, Confidence ${c}%. ${fired.length} corroborated concern(s) warrant human review before any decision.`;
    case RECOMMENDATION.CLARIFICATION_SUGGESTED:
      return `Trust ${t}, Risk ${r}, Confidence ${c}%. Evidence is broadly supportive; specific points would benefit from clarification.`;
    case RECOMMENDATION.SUPPORTED_LOW_CONFIDENCE:
      return `Trust ${t}, Risk ${r}, Confidence ${c}%. Evidence supports the developer, but there is not much of it.`;
    case RECOMMENDATION.SUPPORTED:
      return `Trust ${t}, Risk ${r}, Confidence ${c}%. Evidence supports that the developer owns and understands the submitted work.`;
    default:
      return `Trust ${t}, Risk ${r}, Confidence ${c}%.`;
  }
}

/**
 * Turns findings into questions for the AI interview.
 *
 * A fired cluster is a question, not an answer — this is where that becomes
 * literal. The interview is what actually establishes understanding.
 */
function suggestQuestions(
  fired: readonly ClusterFinding[],
  layers: readonly LayerAssessment[],
): readonly string[] {
  const questions: string[] = [];

  for (const finding of fired) {
    switch (finding.definition.id) {
      case 'unverified_external_import':
        questions.push(
          'Walk through the section of code that was added in bulk: what does it do, and why is it structured that way?',
          'What would you change in that section if the requirements shifted?',
        );
        break;
      case 'assistance_dependence':
        questions.push(
          'Explain the implementation the editor suggested and you accepted — why is it correct here?',
          'What alternative approach would you have written by hand, and what are its trade-offs?',
        );
        break;
      case 'absent_development_process':
        questions.push(
          'You wrote this with very few revisions — talk through the design you had in mind before you started.',
          'Which part of this was hardest to get right, and why?',
        );
        break;
      case 'environment_integrity_compromise':
        // Deliberately not a question for the developer: this concerns the
        // apparatus, and asking about it would imply an accusation.
        break;
      default:
        break;
    }
  }

  // Even with no concerns, ground the interview in the strongest observed work.
  if (questions.length === 0) {
    const runtime = layers.find((layer) => layer.layer === 'L05_RUNTIME_DEBUGGING');
    if (runtime?.supporting.length) {
      questions.push('Describe the bug you hit and how you worked out what was causing it.');
    }
  }

  return questions;
}

function collectLimitations(
  layers: readonly LayerAssessment[],
  clusters: readonly ClusterFinding[],
  extraction: FeatureExtractionResult,
  confidence: Unit,
): readonly string[] {
  const limitations: string[] = [];

  if (confidence < 0.5) {
    limitations.push(
      'Confidence is below 50%. These scores describe what little was observed and should not carry decisive weight.',
    );
  }

  const missing = layers.filter((layer) => layer.standing === null);
  for (const layer of missing) {
    limitations.push(`${layer.layer} produced no scoreable evidence and was excluded from Trust.`);
  }

  const gaps = extraction.layers.flatMap((layer) => layer.gaps);
  if (gaps.length > 8) {
    limitations.push(`${gaps.length} individual features could not be computed.`);
  }

  for (const finding of clusters) {
    if (finding.conditionsIndeterminate > 0) {
      limitations.push(
        `"${finding.definition.title}" was evaluated with ${finding.conditionsIndeterminate} of ${finding.conditionsTotal} conditions undetermined.`,
      );
    }
  }

  limitations.push(
    'Trust is never certain. External AI use is not reliably observable, and these scores are a recommendation for human judgement, not a verdict.',
  );

  return limitations;
}

function makeLookup(extraction: FeatureExtractionResult): FeatureLookup {
  const get = (name: string): Feature | undefined => extraction.featuresByName.get(name);

  return {
    get,
    value: (name, fallback = null) => get(name)?.value ?? fallback,
    evidence: (...names) => {
      const ids: EventId[] = [];
      for (const name of names) {
        const feature = get(name);
        if (feature !== undefined) ids.push(...feature.evidence);
      }
      return [...new Set(ids)];
    },
  };
}

function toScore(value: Unit): number {
  return Math.round(value * 100);
}

export type { FeatureNote };
