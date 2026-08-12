import { type TrustEvent } from '@scora/trust-core';
import { ReviewDecision } from '@scora/trust-review';
import { type LabelledCase } from './contract.ts';
/**
 * Ground truth from Layer 10.
 *
 * The corpus tests what someone thought to construct. This does not: a recorded
 * human decision is evidence about the world, and it is the only source that can
 * surface a false positive nobody imagined. Every override in the log is a case
 * where the engine and a person who read the whole package disagreed, and the
 * person was the one authorised to be right.
 *
 * A reviewer clearing what the engine flagged is a **confirmed false positive** —
 * not a suspected one, not a candidate for triage. It is the exact failure this
 * package exists to drive to zero, reported by the only authority that can
 * confirm it.
 *
 * Two refusals govern this file.
 *
 * **A decision only becomes a label if it can bear the weight.** `assessReviewQuality`
 * already decides whether a review is citable — decided without opening any
 * evidence, or in nine seconds, or a rejection recorded without reading the
 * submitted code. A label built on one of those would teach the engine from a
 * review nobody would defend, and the harm compounds: every future session is
 * scored against it. `citableOnly` defaults to true, and turning it off is a
 * deliberate act with a comment attached.
 *
 * **The engine never relabels itself.** Nothing here reads the engine's own
 * score to decide a label. That would be a system marking its own homework, and
 * the resulting rates would converge on whatever the engine already believed.
 */
export interface ReviewCase extends LabelledCase {
    /** The session the decision was about, so a rerun can be scored against it. */
    readonly sessionId: string;
    /**
     * Carried so a caller can scope a corpus to one tenant.
     *
     * Without it, labels from every customer would pool into one corpus and one
     * tenant's reviewers would silently calibrate the engine for another's — a
     * tenant isolation breach wearing the costume of a larger sample.
     */
    readonly tenantId: string;
    /** Whose session it was, so repeated labels about one person stay visible. */
    readonly developerId: string;
    /** What the engine had recommended, from the override record. */
    readonly engineRecommendation: string | null;
    /** What the human decided. */
    readonly humanDecision: ReviewDecision;
    /** True when the human contradicted the engine. */
    readonly wasOverride: boolean;
}
export interface FromReviewsOptions {
    /**
     * Skip decisions `assessReviewQuality` will not vouch for. Defaults to true.
     *
     * Set false only when auditing the quality of reviews themselves, never when
     * building labels to measure the engine against.
     */
    readonly citableOnly?: boolean;
}
/**
 * Turns recorded reviews into labelled cases.
 *
 * `REQUEST_REVIEW` produces no label. A reviewer asking for more work has not
 * concluded anything, and forcing that into a binary would invent a judgement
 * they declined to make.
 */
export declare function fromReviews(events: readonly TrustEvent[], options?: FromReviewsOptions): readonly ReviewCase[];
/**
 * Confirmed false positives: the engine wanted a review, a human said no.
 *
 * The most valuable rows in the whole system. Each one is a real developer who
 * would have been escalated for nothing, identified by someone who read their
 * evidence and disagreed — and the reason this package treats Layer 10 as its
 * primary signal rather than as a downstream consumer.
 */
export declare function confirmedFalsePositives(cases: readonly ReviewCase[]): readonly ReviewCase[];
/** The other direction: the engine was content, a human was not. */
export declare function confirmedFalseNegatives(cases: readonly ReviewCase[]): readonly ReviewCase[];
/**
 * How often reviewers contradict the engine, and which way.
 *
 * A rising `clearedRate` means the engine is escalating people it should not.
 * A falling one is not automatically good news: it can equally mean reviewers
 * have started agreeing with the engine by default, which is what happens when
 * a score is shown before the evidence. Both readings are reported, because the
 * number cannot distinguish them and a summary that picked one would mislead.
 */
export interface OverrideRates {
    readonly total: number;
    readonly overrides: number;
    /** Overrides where the human cleared someone the engine flagged. */
    readonly cleared: number;
    /** Overrides where the human rejected work the engine supported. */
    readonly rejected: number;
    readonly overrideRate: number | null;
    readonly clearedRate: number | null;
    readonly readings: readonly string[];
}
export declare function overrideRates(cases: readonly ReviewCase[]): OverrideRates;
/**
 * On citability, and why this file does not decide it.
 *
 * `assessReviewQuality` is the authority, and it is called on the reconstructed
 * record rather than re-implemented here. A second definition of "sound enough
 * to cite" living in the calibration package would drift from Layer 10's, and
 * the drift would show up as labels the review layer would not have vouched for.
 *
 * It is still derived from the log, not from a stored flag: `reconstructReviews`
 * folds the events, so the record being assessed is the log read forward.
 */
//# sourceMappingURL=overrides.d.ts.map