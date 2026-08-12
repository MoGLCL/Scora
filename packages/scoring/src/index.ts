/**
 * @scora/trust-scoring — layer assessment, evidence clustering, and explainable
 * Trust / Risk / Confidence scoring.
 *
 *   features → layer assessments → clusters → Trust / Risk / Confidence
 *
 * Risk can only originate from a fired cluster, and every cluster requires
 * corroboration across at least two layers. There is no code path from a single
 * event to a meaningful Risk score.
 */

export {
  RECOMMENDATION,
  type ClusterCondition,
  type ClusterDefinition,
  type ClusterFinding,
  type ConditionOutcome,
  type Explanation,
  type FeatureLookup,
  type FeatureNote,
  type LayerAssessment,
  type Recommendation,
  type ScoringResult,
  type TrustScore,
} from './contract.ts';

export { CLUSTER_CATALOGUE, aggregateSeverity, evaluateCluster } from './clusters.ts';
export { LAYER_WEIGHT, assessLayer, combineStandings } from './layers.ts';
export { POLICY_VERSION, score, type ScoringOptions } from './score.ts';
export { developerFacingSummary, renderReport } from './report.ts';
