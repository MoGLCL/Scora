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
export { RECOMMENDATION, } from "./contract.js";
export { CLUSTER_CATALOGUE, aggregateSeverity, evaluateCluster } from "./clusters.js";
export { LAYER_WEIGHT, assessLayer, combineStandings } from "./layers.js";
export { POLICY_VERSION, score } from "./score.js";
export { developerFacingSummary, renderReport } from "./report.js";
//# sourceMappingURL=index.js.map