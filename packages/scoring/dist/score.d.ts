import { type Unit } from '@scora/trust-core';
import type { FeatureExtractionResult } from '@scora/trust-features';
import { type FeatureNote, type ScoringResult } from './contract.ts';
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
export declare const POLICY_VERSION = "2026.08-1";
export interface ScoringOptions {
    /**
     * Layer 08/09 outcomes, when the interview has run.
     *
     * The interview is the strongest available test of ownership, so it can both
     * discharge concerns and raise them. Absent until Layer 09 is built.
     */
    readonly understanding?: {
        readonly interviewScore: Unit;
        readonly consistencyWithCode: Unit;
        readonly questionsAsked: number;
    } | undefined;
}
export declare function score(extraction: FeatureExtractionResult, options?: ScoringOptions): ScoringResult;
export type { FeatureNote };
//# sourceMappingURL=score.d.ts.map