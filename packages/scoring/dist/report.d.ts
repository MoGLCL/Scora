import { type ScoringResult } from './contract.ts';
/**
 * Renders a scoring result as the explanation a reviewer reads.
 *
 * This exists in the scoring package rather than the UI because the wording of a
 * finding is part of the policy, not a presentation detail. A cluster that fires
 * must be described as a question requiring corroboration wherever it is shown,
 * and that guarantee is easier to keep in one place than to re-implement per
 * surface.
 */
export declare function renderReport(result: ScoringResult): string;
/**
 * The single sentence a developer is entitled to see.
 *
 * Never names a cluster: a developer should not be told "you triggered the
 * dependence pattern" by an automated system before a human has looked at it.
 */
export declare function developerFacingSummary(result: ScoringResult): string;
//# sourceMappingURL=report.d.ts.map