import { type Unit } from '@scora/trust-core';
import type { ClusterDefinition, ClusterFinding, FeatureLookup } from './contract.ts';
export declare const CLUSTER_CATALOGUE: readonly ClusterDefinition[];
export declare function evaluateCluster(definition: ClusterDefinition, lookup: FeatureLookup): ClusterFinding;
/** Total corroborated concern across all findings, in [0,1]. */
export declare function aggregateSeverity(findings: readonly ClusterFinding[]): Unit;
//# sourceMappingURL=clusters.d.ts.map