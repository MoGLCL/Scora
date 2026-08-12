import type { Recommendation } from '@scora/trust-scoring';
/**
 * What a fair reviewer would conclude, given the whole evidence package.
 *
 * Deliberately not `HONEST` / `CHEATED`. SCORA does not measure how little AI a
 * developer used, so a label saying "cheated" would smuggle back in the very
 * question the engine is not asking. The label answers something narrower and
 * answerable: was there a real reason to take a human's time over this session?
 */
export declare const CaseLabel: {
    /**
     * The developer owns and understands the work.
     *
     * True regardless of how much AI helped. A session labelled this way is one
     * where flagging the developer would be a mistake with a cost to a person.
     */
    readonly OWNS_WORK: "OWNS_WORK";
    /**
     * A human should genuinely look.
     *
     * Not "the developer is guilty" — the reviewer may well clear them. It means
     * the evidence contains something a reasonable reviewer would want explained.
     */
    readonly WARRANTS_REVIEW: "WARRANTS_REVIEW";
    /**
     * Too little evidence to have an opinion, and the engine must say so.
     *
     * A short or heavily-truncated session belongs here. Scoring one of these as
     * either of the above is its own kind of error: an unfounded claim.
     */
    readonly INDETERMINATE: "INDETERMINATE";
};
export type CaseLabel = (typeof CaseLabel)[keyof typeof CaseLabel];
/**
 * Where a label came from, because the two kinds are not equally trustworthy.
 *
 * Synthetic cases are constructed, so their labels are true by definition but
 * only test what we thought to construct. Reviewed cases are real sessions a
 * human ruled on, so their labels are evidence about the world — and they are
 * the only ones that can reveal a false positive nobody predicted.
 */
export declare const LabelSource: {
    /** Built by hand in the corpus. Label is a design decision. */
    readonly SYNTHETIC: "SYNTHETIC";
    /** Taken from a recorded Layer 10 decision. Label is a human's judgement. */
    readonly HUMAN_REVIEW: "HUMAN_REVIEW";
};
export type LabelSource = (typeof LabelSource)[keyof typeof LabelSource];
/**
 * Traits a case carries, so error rates can be broken out by group.
 *
 * An aggregate false-positive rate of 2% is worthless if all of it lands on
 * developers who use dictation software. These tags exist to make that visible,
 * and the report fails the subgroup gate rather than the average.
 */
export declare const CaseTrait: {
    /** Assistive input: dictation, snippet expansion, switch access, screen reader. */
    readonly ASSISTIVE_INPUT: "ASSISTIVE_INPUT";
    /** Works from their own prior code, so paste volume is high and legitimate. */
    readonly REUSES_OWN_CODE: "REUSES_OWN_CODE";
    /** Writes English as an additional language; comments and names may be terse. */
    readonly ADDITIONAL_LANGUAGE: "ADDITIONAL_LANGUAGE";
    /** Heavy but declared AI assistance. Allowed, and not a concern by itself. */
    readonly HEAVY_AI_ASSISTANCE: "HEAVY_AI_ASSISTANCE";
    /** Unusually fast typist. Fast typing is not evidence of anything. */
    readonly FAST_TYPIST: "FAST_TYPIST";
    /** Slow, deliberate, long pauses. Thinking is not evidence of anything either. */
    readonly DELIBERATE_PACE: "DELIBERATE_PACE";
    /** Poor connectivity: gaps in the stream that are the network's fault. */
    readonly DEGRADED_CAPTURE: "DEGRADED_CAPTURE";
    /** First session on the platform, so there is no personal baseline yet. */
    readonly NO_BASELINE: "NO_BASELINE";
    /** Junior developer whose absolute numbers look nothing like a senior's. */
    readonly EARLY_CAREER: "EARLY_CAREER";
    /** Consented to the minimum scope only, so whole layers are absent. */
    readonly MINIMAL_CONSENT: "MINIMAL_CONSENT";
};
export type CaseTrait = (typeof CaseTrait)[keyof typeof CaseTrait];
/** One labelled session, ready to be put through the engine. */
export interface LabelledCase {
    readonly caseId: string;
    /** What the case is, in a sentence a non-engineer can check. */
    readonly description: string;
    readonly label: CaseLabel;
    readonly labelSource: LabelSource;
    readonly traits: readonly CaseTrait[];
    /**
     * Why this label and not another.
     *
     * Required, and read out in the report. A corpus whose labels cannot be
     * justified in prose is a corpus that will drift to fit the engine.
     */
    readonly justification: string;
}
/**
 * How a recommendation lands on a developer.
 *
 * The engine has five recommendations and no `REJECT`, but for measuring harm
 * what matters is coarser: did this outcome cost the developer something? Being
 * sent to human review costs time, attention, and standing, whether or not the
 * reviewer clears them. That is the cost a false-positive rate must count.
 */
export declare const Consequence: {
    /** Nothing is asked of the developer. */
    readonly NONE: "NONE";
    /** Questions are put to them, at interview. Cheap, but not free. */
    readonly QUESTIONED: "QUESTIONED";
    /** A human reads their session. This is the outcome worth being afraid of. */
    readonly ESCALATED: "ESCALATED";
    /** The engine declines to assess. Costs nothing and claims nothing. */
    readonly DECLINED: "DECLINED";
};
export type Consequence = (typeof Consequence)[keyof typeof Consequence];
/** How a single case came out, kept so the report can name its own failures. */
export interface CaseOutcome {
    readonly case: LabelledCase;
    readonly recommendation: Recommendation;
    readonly consequence: Consequence;
    readonly trust: number;
    readonly risk: number;
    readonly confidence: number;
    /** Clusters that fired, by id — the specific reason for an escalation. */
    readonly firedClusters: readonly string[];
    /** True when the outcome is wrong in the direction that harms a person. */
    readonly falsePositive: boolean;
    /** True when a case that warranted review was let through. */
    readonly falseNegative: boolean;
    /**
     * True when the engine asserted something it lacked the evidence to assert.
     *
     * An `INDETERMINATE` case scored as either supported or escalated. Tracked
     * apart from the other two because the fix is different: not a threshold, but
     * a missing refusal.
     */
    readonly overclaim: boolean;
    /** The engine's own stated reasons, so a failure can be read without a rerun. */
    readonly rationale: readonly string[];
}
/** Counts over one group of cases. Named for what they mean, not for i/j. */
export interface ConfusionCounts {
    /** Warranted review, and was escalated. */
    readonly truePositives: number;
    /** Owned their work, and was escalated anyway. The one that hurts. */
    readonly falsePositives: number;
    /** Owned their work, and was left alone. */
    readonly trueNegatives: number;
    /** Warranted review, and was let through. */
    readonly falseNegatives: number;
    /** Indeterminate, and correctly declined. */
    readonly correctRefusals: number;
    /** Indeterminate, and asserted anyway. */
    readonly overclaims: number;
}
/**
 * Rates derived from the counts. `null` where the denominator is zero.
 *
 * Zero cases in a group is not a rate of zero — reporting it as one would turn
 * a coverage gap into a passing grade, which is exactly the failure mode a
 * calibration harness exists to prevent.
 */
export interface ErrorRates {
    /** FP / (FP + TN). The headline number. Gated hardest. */
    readonly falsePositiveRate: number | null;
    /** FN / (FN + TP). Permitted to be materially worse than the above. */
    readonly falseNegativeRate: number | null;
    /** TP / (TP + FP). Of those escalated, how many should have been. */
    readonly precision: number | null;
    /** TP / (TP + FN). Of those warranting review, how many were caught. */
    readonly recall: number | null;
    /** Overclaims / indeterminate cases. Should be zero. */
    readonly overclaimRate: number | null;
    readonly sampleSize: number;
}
/**
 * One confidence bucket, for checking that the number means what it says.
 *
 * "Never claim that Trust is 100% certain" is a claim about calibration, not
 * modesty in the copy. If sessions scored at 70% confidence are right 40% of
 * the time, the engine is lying in a way no wording can fix.
 */
export interface CalibrationBin {
    /** Inclusive lower bound of the bucket, 0–100. */
    readonly lowerBound: number;
    /** Exclusive upper bound, except the last bin which includes 100. */
    readonly upperBound: number;
    readonly count: number;
    /** Mean stated confidence of cases in the bin, 0–1. */
    readonly meanConfidence: number | null;
    /** Share of cases in the bin the engine actually got right, 0–1. */
    readonly observedAccuracy: number | null;
    /** `observedAccuracy - meanConfidence`. Negative means overconfident. */
    readonly gap: number | null;
}
/**
 * The calibration curve, with the two directions of error kept apart.
 *
 * Textbook calibration error is symmetric: it treats "claimed 80%, right 40%"
 * and "claimed 54%, right 100%" as equally wrong, because for a weather model
 * they are. Here they are not remotely equal. The first is the engine
 * overstating what it knows about a person. The second is the engine hedging
 * about a developer it turned out to be right about, which costs that developer
 * nothing.
 *
 * Both are reported. Only the first is gated. A gate on the symmetric number
 * would fail this build for being too modest, and the cheapest way to pass it
 * would be to raise stated confidence — which is precisely the change the
 * scoring contract forbids.
 */
export interface CalibrationCurve {
    readonly bins: readonly CalibrationBin[];
    /**
     * Expected calibration error: mean |gap|, weighted by bin size.
     *
     * The standard definition, kept symmetric and unmodified so it stays
     * comparable with published figures. Reported, never gated.
     */
    readonly expectedCalibrationError: number | null;
    /**
     * Bin-weighted mean of overconfident gaps only, treating every honest or
     * underconfident bin as zero error. This is what `CALIBRATION_ERROR` gates.
     */
    readonly overconfidenceError: number | null;
    /**
     * Bin-weighted mean of underconfident gaps only. Not a gate: hedging harms
     * nobody directly. Tracked because an engine that hedges about everything
     * floods human review, and reviewers who read everything stop reading.
     */
    readonly underconfidenceError: number | null;
    /**
     * The worst single overconfidence, i.e. the most negative gap. `null` when no
     * bin was overconfident — distinct from `0`, which would claim a bin sat
     * exactly on the line.
     */
    readonly worstOverconfidence: number | null;
    /** Brier score over all scored cases. Lower is better; 0.25 is a coin flip. */
    readonly brierScore: number | null;
}
/** Error rates for one trait, so harm concentrated on a group is visible. */
export interface SubgroupReport {
    readonly trait: CaseTrait;
    readonly rates: ErrorRates;
    /** Case ids of the false positives in this subgroup, named for follow-up. */
    readonly falsePositiveCaseIds: readonly string[];
}
/** A gate that failed, phrased as the thing to fix. */
export interface GateFailure {
    readonly gate: string;
    readonly detail: string;
    /** Case ids that caused the failure, where the gate has specific culprits. */
    readonly caseIds: readonly string[];
}
export interface CalibrationReport {
    readonly policyVersion: string;
    readonly counts: ConfusionCounts;
    readonly rates: ErrorRates;
    readonly calibration: CalibrationCurve;
    readonly subgroups: readonly SubgroupReport[];
    /** Every case, so a report is reproducible without rerunning the engine. */
    readonly outcomes: readonly CaseOutcome[];
    /** Gates that failed. Empty means the engine may ship. */
    readonly failures: readonly GateFailure[];
    /** What the corpus does not cover, stated rather than left to inference. */
    readonly limitations: readonly string[];
}
//# sourceMappingURL=contract.d.ts.map