/**
 * The scoring contract.
 *
 * Scoring is the only stage permitted to form a judgement, and it is deliberately
 * constrained in how it may do so:
 *
 *   1. A layer is assessed only from its own features, so a weak signal in one
 *      layer cannot be laundered into another.
 *   2. Risk originates from *clusters* — named, corroborated patterns — never
 *      from an isolated feature. This is the structural answer to "one paste is
 *      not cheating".
 *   3. Confidence is computed independently of Trust. A high Trust score on thin
 *      evidence must be reported as exactly that, not rounded up to a verdict.
 *
 * Nothing here produces a pass/fail. The output is a recommendation plus the
 * evidence for it; a human decides. See `RECOMMENDATION` for why.
 */

import type { EventId, TrustLayer, Unit } from '@scora/trust-core';
import type { Feature, FeaturePolarity } from '@scora/trust-features';

/** How a layer's own evidence came out, before anything is combined. */
export interface LayerAssessment {
  readonly layer: TrustLayer;
  /**
   * Layer standing in [0,1], or null when the layer had nothing to say.
   *
   * null is not a low score. A layer with no evidence must not drag Trust down;
   * it lowers Confidence instead.
   */
  readonly standing: Unit | null;
  /** How much of the layer could be computed at all. */
  readonly coverage: Unit;
  /** Mean confidence of the features that contributed. */
  readonly confidence: Unit;
  /** Features that spoke in the developer's favour, strongest first. */
  readonly supporting: readonly FeatureNote[];
  /** Features that raise a question. Never conclusions on their own. */
  readonly concerning: readonly FeatureNote[];
  /** Plain-language summary for the reviewer dashboard. */
  readonly summary: string;
}

export interface FeatureNote {
  readonly name: string;
  readonly value: number;
  readonly polarity: FeaturePolarity;
  /** Contribution weight in [0,1] — how much this note moved the layer. */
  readonly weight: Unit;
  readonly note: string;
  readonly evidence: readonly EventId[];
}

/**
 * A named risk pattern requiring several independent conditions to hold.
 *
 * Every cluster in the catalogue has at least two conditions drawn from at least
 * two different layers. A cluster that could fire from a single layer would be a
 * single signal wearing a cluster's clothes.
 */
export interface ClusterDefinition {
  readonly id: string;
  readonly title: string;
  /** What this pattern would mean if corroborated. */
  readonly meaning: string;
  /** Minimum conditions that must hold before the cluster fires at all. */
  readonly minimumConditions: number;
  /** Layers the conditions draw from — enforced to be ≥2. */
  readonly layers: readonly TrustLayer[];
  /** Severity ceiling in [0,1] when every condition holds. */
  readonly maximumSeverity: Unit;
  /** How a reviewer should read this, including what would exonerate. */
  readonly interpretation: string;
  /** Named conditions, each testable against the feature set. */
  readonly conditions: readonly ClusterCondition[];
}

export interface ClusterCondition {
  readonly id: string;
  readonly description: string;
  /**
   * The layer this condition draws its evidence from.
   *
   * Corroboration is enforced at fire time against these, not against the
   * definition's declared layers. Two conditions from the same layer are one
   * signal expressed twice, and must not be able to fire a cluster between them.
   */
  readonly layer: TrustLayer;
  /** Features consulted. A condition with no evidence is *unmet*, not met. */
  readonly features: readonly string[];
  readonly test: (lookup: FeatureLookup) => ConditionOutcome;
}

export interface ConditionOutcome {
  readonly met: boolean;
  /**
   * Degree in [0,1] when met — lets a barely-crossed condition contribute less
   * than an emphatic one, so severity is graded rather than stepwise.
   */
  readonly degree: Unit;
  /** Why it was or was not met, in the reviewer's language. */
  readonly reason: string;
  readonly evidence: readonly EventId[];
  /**
   * True when the condition could not be evaluated for want of evidence.
   * Unevaluable conditions lower cluster confidence; they never count as met.
   */
  readonly indeterminate?: boolean;
}

export interface ClusterFinding {
  readonly definition: ClusterDefinition;
  readonly fired: boolean;
  /** Conditions actually satisfied, out of the total. */
  readonly conditionsMet: number;
  readonly conditionsTotal: number;
  readonly conditionsIndeterminate: number;
  /** Distinct layers the satisfied conditions came from. Must be ≥2 to fire. */
  readonly layersCorroborating: readonly TrustLayer[];
  /** Realised severity in [0,1]: 0 when not fired. */
  readonly severity: Unit;
  /** Confidence in this finding, reduced by indeterminate conditions. */
  readonly confidence: Unit;
  readonly outcomes: readonly (ConditionOutcome & {
    readonly conditionId: string;
    readonly layer: TrustLayer;
  })[];
  readonly evidence: readonly EventId[];
  /** Evidence pointing the other way — recorded even when the cluster fires. */
  readonly mitigations: readonly FeatureNote[];
}

/**
 * Recommendations, not decisions.
 *
 * The engine never issues a verdict on a person. Layer 10 exists because a human
 * must make that call with the evidence in front of them; naming these
 * `APPROVE`/`REJECT` would quietly relocate the decision into the algorithm.
 */
export const RECOMMENDATION = {
  /** Evidence supports the developer's ownership of the work. */
  SUPPORTED: 'SUPPORTED',
  /** Supported, but confidence is too thin to stand alone. */
  SUPPORTED_LOW_CONFIDENCE: 'SUPPORTED_LOW_CONFIDENCE',
  /** Specific questions worth putting to the developer, e.g. at interview. */
  CLARIFICATION_SUGGESTED: 'CLARIFICATION_SUGGESTED',
  /** Corroborated concerns; a human must review the full package. */
  HUMAN_REVIEW_REQUIRED: 'HUMAN_REVIEW_REQUIRED',
  /** Too little evidence to say anything. Never adverse to the developer. */
  INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
} as const;

export type Recommendation = (typeof RECOMMENDATION)[keyof typeof RECOMMENDATION];

export interface TrustScore {
  /** 0–100. Support for the claim that the developer owns and understands the work. */
  readonly trust: number;
  /** 0–100. Corroborated concern. Rises from clusters, not from isolated events. */
  readonly risk: number;
  /** 0–100. How much the evidence justifies believing the two numbers above. */
  readonly confidence: number;
  readonly recommendation: Recommendation;
  /** Why the recommendation came out this way, in order of influence. */
  readonly rationale: readonly string[];
}

export interface ScoringResult extends TrustScore {
  readonly layers: readonly LayerAssessment[];
  readonly clusters: readonly ClusterFinding[];
  readonly explanation: Explanation;
  /** Caveats a reviewer must see: thin evidence, missing layers, degraded baselines. */
  readonly limitations: readonly string[];
  /** Version of the scoring policy, so a stored score stays interpretable. */
  readonly policyVersion: string;
}

/** The answer to "why did this developer get this score". */
export interface Explanation {
  readonly headline: string;
  readonly positiveEvidence: readonly FeatureNote[];
  readonly riskEvidence: readonly ClusterFinding[];
  readonly mitigatingEvidence: readonly FeatureNote[];
  readonly confidenceFactors: readonly string[];
  /** Questions the AI interview (Layer 09) should put to the developer. */
  readonly suggestedQuestions: readonly string[];
}

export interface FeatureLookup {
  readonly get: (name: string) => Feature | undefined;
  /** Value, or the fallback when the feature is absent or uncomputed. */
  readonly value: (name: string, fallback?: number | null) => number | null;
  readonly evidence: (...names: readonly string[]) => readonly EventId[];
}
