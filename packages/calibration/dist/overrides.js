import {} from '@scora/trust-core';
import { ReviewDecision, assessReviewQuality, reconstructReviews } from '@scora/trust-review';
import { CaseLabel, CaseTrait, LabelSource } from "./contract.js";
/**
 * Turns recorded reviews into labelled cases.
 *
 * `REQUEST_REVIEW` produces no label. A reviewer asking for more work has not
 * concluded anything, and forcing that into a binary would invent a judgement
 * they declined to make.
 */
export function fromReviews(events, options = {}) {
    const citableOnly = options.citableOnly ?? true;
    const cases = [];
    for (const review of reconstructReviews(events)) {
        const decision = review.decision;
        if (decision === null)
            continue;
        if (decision.decision === ReviewDecision.REQUEST_REVIEW)
            continue;
        const quality = assessReviewQuality(review);
        if (citableOnly && !quality.citable)
            continue;
        const label = decision.decision === ReviewDecision.APPROVE ? CaseLabel.OWNS_WORK : CaseLabel.WARRANTS_REVIEW;
        const override = review.override;
        cases.push({
            caseId: `review:${review.reviewId}`,
            description: override === null
                ? `A reviewer decided ${decision.decision} and the engine did not disagree.`
                : `A reviewer decided ${decision.decision} against an engine recommendation of ` +
                    `${override.engineRecommendation}.`,
            label,
            labelSource: LabelSource.HUMAN_REVIEW,
            // Traits are not inferable from a decision. Guessing that a developer uses
            // assistive input because their session looked unusual would be the same
            // inference this package exists to prevent, aimed at a protected trait.
            traits: [],
            justification: `Recorded human decision, rationale ${String(decision.rationaleLength)} characters ` +
                `(hash ${decision.rationaleHash.slice(0, 12)}…), review took ` +
                `${String(decision.reviewDurationMs ?? 0)}ms.` +
                // Carried onto the case itself, not just checked and discarded. When
                // `citableOnly` is off, whoever reads this label needs to see what was
                // wrong with the review it came from without going back to the log.
                (quality.citable ? '' : ` Not citable: ${quality.concerns.join(' ')}`),
            sessionId: review.sessionId,
            tenantId: review.tenantId,
            developerId: review.developerId,
            engineRecommendation: override?.engineRecommendation ?? null,
            humanDecision: decision.decision,
            wasOverride: override !== null,
        });
    }
    return cases;
}
/**
 * Confirmed false positives: the engine wanted a review, a human said no.
 *
 * The most valuable rows in the whole system. Each one is a real developer who
 * would have been escalated for nothing, identified by someone who read their
 * evidence and disagreed — and the reason this package treats Layer 10 as its
 * primary signal rather than as a downstream consumer.
 */
export function confirmedFalsePositives(cases) {
    return cases.filter((entry) => entry.wasOverride && entry.humanDecision === ReviewDecision.APPROVE);
}
/** The other direction: the engine was content, a human was not. */
export function confirmedFalseNegatives(cases) {
    return cases.filter((entry) => entry.wasOverride && entry.humanDecision === ReviewDecision.REJECT);
}
export function overrideRates(cases) {
    const overrides = cases.filter((entry) => entry.wasOverride);
    const cleared = confirmedFalsePositives(cases).length;
    const rejected = confirmedFalseNegatives(cases).length;
    const readings = [];
    if (overrides.length === 0 && cases.length >= 20) {
        readings.push('No reviewer has contradicted the engine across ' +
            `${String(cases.length)} decisions. Perfect agreement between an algorithm and the people ` +
            'checking it usually means the people have stopped checking.');
    }
    if (cleared > rejected) {
        readings.push('Reviewers clear more than they reject, so the engine is escalating people it should not. ' +
            'These are the sessions to re-run the corpus against.');
    }
    if (rejected > cleared) {
        readings.push('Reviewers reject more than they clear. Read carefully: this can mean the engine is missing ' +
            'genuine concerns, or that reviewers are seeing something the evidence does not contain.');
    }
    return {
        total: cases.length,
        overrides: overrides.length,
        cleared,
        rejected,
        overrideRate: cases.length === 0 ? null : overrides.length / cases.length,
        clearedRate: overrides.length === 0 ? null : cleared / overrides.length,
        readings,
    };
}
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
//# sourceMappingURL=overrides.js.map