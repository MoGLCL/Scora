import { RECOMMENDATION } from '@scora/trust-scoring';
import { CaseLabel, Consequence, } from "./contract.js";
/**
 * Measurement.
 *
 * Nothing here decides anything; it counts, divides, and refuses to divide by
 * zero. The judgement lives in `gates.ts`, kept separate so that tightening a
 * threshold cannot quietly change what a rate means.
 *
 * One rule runs through the whole file: **an empty denominator yields `null`,
 * never `0`.** A false-positive rate of zero across zero honest cases is not a
 * pass, it is an untested engine, and a harness that reports the two identically
 * is worse than no harness at all.
 */
/**
 * What a recommendation costs the developer who receives it.
 *
 * `CLARIFICATION_SUGGESTED` counts as `QUESTIONED` rather than `ESCALATED`: being
 * asked to explain your own code is a normal part of an assessment, and treating
 * it as harm would make the interview layer unusable. It is still not free, and
 * the gates track it separately.
 */
export function consequenceOf(recommendation) {
    switch (recommendation) {
        case RECOMMENDATION.SUPPORTED:
        case RECOMMENDATION.SUPPORTED_LOW_CONFIDENCE:
            return Consequence.NONE;
        case RECOMMENDATION.CLARIFICATION_SUGGESTED:
            return Consequence.QUESTIONED;
        case RECOMMENDATION.HUMAN_REVIEW_REQUIRED:
            return Consequence.ESCALATED;
        case RECOMMENDATION.INSUFFICIENT_EVIDENCE:
        default:
            return Consequence.DECLINED;
    }
}
/**
 * Whether the engine got this case right.
 *
 * Asymmetric on purpose, and the asymmetry is the policy:
 *
 *   - `OWNS_WORK` is correct on `NONE` **or** `QUESTIONED`. A question is not an
 *     accusation, and an engine forbidden from ever asking one would have no way
 *     to resolve a genuine ambiguity in the developer's favour.
 *   - `WARRANTS_REVIEW` is correct only on `ESCALATED`. Questioning is not
 *     enough when a human should read the package.
 *   - `INDETERMINATE` is correct only on `DECLINED`. Anything else is a claim
 *     made without evidence, in whichever direction it points.
 */
export function isCorrect(outcome) {
    switch (outcome.case.label) {
        case CaseLabel.OWNS_WORK:
            return outcome.consequence === Consequence.NONE || outcome.consequence === Consequence.QUESTIONED;
        case CaseLabel.WARRANTS_REVIEW:
            return outcome.consequence === Consequence.ESCALATED;
        case CaseLabel.INDETERMINATE:
            return outcome.consequence === Consequence.DECLINED;
        default:
            return false;
    }
}
export function tally(outcomes) {
    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;
    let correctRefusals = 0;
    let overclaims = 0;
    for (const outcome of outcomes) {
        switch (outcome.case.label) {
            case CaseLabel.OWNS_WORK:
                if (outcome.consequence === Consequence.ESCALATED)
                    falsePositives += 1;
                else
                    trueNegatives += 1;
                break;
            case CaseLabel.WARRANTS_REVIEW:
                if (outcome.consequence === Consequence.ESCALATED)
                    truePositives += 1;
                else
                    falseNegatives += 1;
                break;
            case CaseLabel.INDETERMINATE:
                if (outcome.consequence === Consequence.DECLINED)
                    correctRefusals += 1;
                else
                    overclaims += 1;
                break;
            default:
                break;
        }
    }
    return { truePositives, falsePositives, trueNegatives, falseNegatives, correctRefusals, overclaims };
}
/** `null` when the denominator is empty. See the note at the top of the file. */
function ratio(numerator, denominator) {
    return denominator === 0 ? null : numerator / denominator;
}
export function rates(counts) {
    const { truePositives, falsePositives, trueNegatives, falseNegatives, correctRefusals, overclaims, } = counts;
    return {
        falsePositiveRate: ratio(falsePositives, falsePositives + trueNegatives),
        falseNegativeRate: ratio(falseNegatives, falseNegatives + truePositives),
        precision: ratio(truePositives, truePositives + falsePositives),
        recall: ratio(truePositives, truePositives + falseNegatives),
        overclaimRate: ratio(overclaims, overclaims + correctRefusals),
        sampleSize: truePositives + falsePositives + trueNegatives + falseNegatives + correctRefusals + overclaims,
    };
}
/**
 * Error rates per trait.
 *
 * A case appears in every subgroup it is tagged with, so the subgroups overlap
 * and do not sum to the whole. That is intended: the question each answers is
 * "among developers who dictate, how often are we wrong", and the answer must
 * not be diluted by the developers who do not.
 *
 * Traits with no cases are omitted entirely rather than reported as clean.
 */
export function bySubgroup(outcomes, traits) {
    const reports = [];
    for (const trait of traits) {
        const members = outcomes.filter((outcome) => outcome.case.traits.includes(trait));
        if (members.length === 0)
            continue;
        reports.push({
            trait,
            rates: rates(tally(members)),
            falsePositiveCaseIds: members
                .filter((outcome) => outcome.falsePositive)
                .map((outcome) => outcome.case.caseId),
        });
    }
    return reports;
}
const BIN_WIDTH = 20;
/**
 * Does a stated confidence mean what it says?
 *
 * Cases are bucketed by the confidence the engine reported, and each bucket is
 * checked against how often the engine was actually right in it. A bucket at 80%
 * confidence that is right 40% of the time is the engine overstating what it
 * knows — the specific failure "never claim Trust is 100% certain" is about, and
 * one that no amount of hedging in the report text can repair.
 *
 * `INDETERMINATE` cases are excluded. Confidence for a session the engine
 * declined to score is not a claim about a developer, so scoring its calibration
 * would measure nothing.
 */
export function calibrationCurve(outcomes) {
    const scored = outcomes.filter((outcome) => outcome.case.label !== CaseLabel.INDETERMINATE);
    const bins = [];
    for (let lower = 0; lower < 100; lower += BIN_WIDTH) {
        const upper = lower + BIN_WIDTH;
        const members = scored.filter((outcome) => {
            const value = outcome.confidence;
            return upper === 100 ? value >= lower && value <= 100 : value >= lower && value < upper;
        });
        if (members.length === 0) {
            bins.push({
                lowerBound: lower,
                upperBound: upper,
                count: 0,
                meanConfidence: null,
                observedAccuracy: null,
                gap: null,
            });
            continue;
        }
        const meanConfidence = members.reduce((sum, outcome) => sum + outcome.confidence, 0) / members.length / 100;
        const observedAccuracy = members.filter(isCorrect).length / members.length;
        bins.push({
            lowerBound: lower,
            upperBound: upper,
            count: members.length,
            meanConfidence,
            observedAccuracy,
            gap: observedAccuracy - meanConfidence,
        });
    }
    const populated = bins.filter((bin) => bin.count > 0);
    const total = populated.reduce((sum, bin) => sum + bin.count, 0);
    // One helper, three weightings. Overconfidence counts a bin only when the
    // engine claimed more than it delivered (gap < 0); underconfidence only the
    // reverse. Keeping them separate is what lets the gate be one-sided without
    // hiding the symmetric number a reader might expect to see.
    const weighted = (magnitude) => total === 0
        ? null
        : populated.reduce((sum, bin) => sum + (bin.count / total) * magnitude(bin.gap ?? 0), 0);
    // Only negative gaps are overconfidence. Taking min() over all gaps would
    // report the smallest underconfidence when the engine was never overconfident
    // at all — a number that looks like a finding and is an artefact.
    const overconfident = populated.map((bin) => bin.gap ?? 0).filter((gap) => gap < 0);
    return {
        bins,
        expectedCalibrationError: weighted(Math.abs),
        overconfidenceError: weighted((gap) => Math.max(0, -gap)),
        underconfidenceError: weighted((gap) => Math.max(0, gap)),
        worstOverconfidence: overconfident.length === 0 ? null : Math.min(...overconfident),
        brierScore: brier(scored),
    };
}
/**
 * Mean squared error between stated confidence and being right.
 *
 * Rewards an engine that is unsure when it is about to be wrong, and penalises
 * one that is sure and wrong far more than one that is unsure and wrong — which
 * is the right incentive for a system that must never overstate its case.
 */
function brier(outcomes) {
    if (outcomes.length === 0)
        return null;
    const total = outcomes.reduce((sum, outcome) => {
        const stated = outcome.confidence / 100;
        const actual = isCorrect(outcome) ? 1 : 0;
        return sum + (stated - actual) ** 2;
    }, 0);
    return total / outcomes.length;
}
//# sourceMappingURL=metrics.js.map