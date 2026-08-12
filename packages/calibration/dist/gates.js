import { CaseLabel, Consequence } from "./contract.js";
/**
 * The gates.
 *
 * Measurement is in `metrics.ts`; this file is where the platform says what it
 * will not ship, and the thresholds are deliberately not symmetric.
 *
 * A false negative means someone got away with something. A false positive means
 * SCORA told an employer that an honest developer's work needs investigating.
 * Those are not two versions of the same error. The first costs a customer some
 * assurance; the second costs a person a job they should have had, and they will
 * never know why. Every number below follows from that ordering, and the day
 * someone wants to relax `NO_FALSE_POSITIVES` to hit a recall target, this
 * paragraph is the argument they have to beat.
 */
/** Thresholds. Named so a failure report can point at the rule it broke. */
export const GATE = {
    /**
     * Zero. Not "low".
     *
     * Fourteen cases is far too small a corpus for a 2% ceiling to mean anything —
     * with this denominator, any non-zero rate is one specific person the engine
     * would have accused, and they are identifiable in the report by name. When
     * the corpus grows into the thousands this becomes a rate. Until then the only
     * defensible ceiling is none.
     */
    NO_FALSE_POSITIVES: 'no-false-positives',
    /**
     * No subgroup may carry error the aggregate hides.
     *
     * An engine that is right 95% of the time overall and wrong every time about
     * developers who use dictation is not 95% accurate; it is broken for a group
     * of people and averaging over them.
     */
    NO_SUBGROUP_HARM: 'no-subgroup-harm',
    /** An `INDETERMINATE` session must be declined, in either direction. */
    NO_OVERCLAIM: 'no-overclaim',
    /** Recall is a target, not a promise. Missing cases is the acceptable failure. */
    MINIMUM_RECALL: 'minimum-recall',
    /**
     * Stated confidence must not overstate observed accuracy.
     *
     * One-sided, and the asymmetry is load-bearing. Gating the symmetric
     * calibration error would fail a build for hedging — and the cheapest way to
     * pass such a gate is to raise stated confidence across the board, which is
     * the one change the scoring contract explicitly forbids. A gate whose
     * easiest fix is the prohibited edit is a trap for whoever inherits it.
     */
    CALIBRATION_ERROR: 'calibration-error',
    /** Being confidently wrong is the failure mode worth its own gate. */
    OVERCONFIDENCE: 'overconfidence',
    /** Every escalation must name the clusters that caused it. */
    EXPLAINED_ESCALATIONS: 'explained-escalations',
    /** Below this many cases, the report is not evidence of anything. */
    MINIMUM_CORPUS: 'minimum-corpus',
};
/** Recall we aim for. Missing a genuine concern is the tolerable error here. */
export const TARGET_RECALL = 0.6;
/** How far stated confidence may exceed observed accuracy, averaged over bins. */
export const MAXIMUM_CALIBRATION_ERROR = 0.35;
/** How far confidence may exceed accuracy in any single bin. */
export const MAXIMUM_OVERCONFIDENCE = 0.4;
/** Under this, `evaluate` reports the corpus itself as the finding. */
export const MINIMUM_CASES = 10;
/**
 * Applies every gate and returns what failed.
 *
 * Returns failures rather than throwing, so a caller can print the whole picture
 * at once. A harness that stops at the first failure trains people to fix one
 * thing, rerun, and discover the next — and to stop reading.
 */
export function evaluate(report) {
    const failures = [];
    const { counts, rates, calibration, subgroups, outcomes } = report;
    if (outcomes.length < MINIMUM_CASES) {
        failures.push({
            gate: GATE.MINIMUM_CORPUS,
            detail: `the corpus holds ${String(outcomes.length)} cases, below the ${String(MINIMUM_CASES)} ` +
                'needed for the other gates to mean anything; passing them proves nothing at this size',
            caseIds: [],
        });
    }
    if (counts.falsePositives > 0) {
        const culprits = outcomes.filter((outcome) => outcome.falsePositive);
        failures.push({
            gate: GATE.NO_FALSE_POSITIVES,
            detail: `${String(counts.falsePositives)} developer(s) who own their work were escalated to human ` +
                'review. Each one is a person this engine would have accused: ' +
                culprits.map((outcome) => `${outcome.case.caseId} (${outcome.case.description})`).join('; '),
            caseIds: culprits.map((outcome) => outcome.case.caseId),
        });
    }
    for (const subgroup of subgroups) {
        if (subgroup.falsePositiveCaseIds.length === 0)
            continue;
        failures.push({
            gate: GATE.NO_SUBGROUP_HARM,
            detail: `every false positive among developers tagged ${subgroup.trait} is a false positive that ` +
                'correlates with how they work rather than with what they did',
            caseIds: subgroup.falsePositiveCaseIds,
        });
    }
    if (counts.overclaims > 0) {
        const culprits = outcomes.filter((outcome) => outcome.overclaim);
        failures.push({
            gate: GATE.NO_OVERCLAIM,
            detail: `${String(counts.overclaims)} session(s) with too little evidence to assess were assessed ` +
                'anyway; the engine is required to decline, and declining is not a failure',
            caseIds: culprits.map((outcome) => outcome.case.caseId),
        });
    }
    // Recall is checked only when there is something to recall. A corpus with no
    // concerning cases would otherwise fail this gate for containing no concerns.
    if (rates.recall !== null && rates.recall < TARGET_RECALL) {
        failures.push({
            gate: GATE.MINIMUM_RECALL,
            detail: `recall is ${format(rates.recall)}, below the ${format(TARGET_RECALL)} target — sessions a ` +
                'reviewer should have seen are being let through. This is the failure the platform tolerates ' +
                'more of, but not without limit',
            caseIds: outcomes.filter((outcome) => outcome.falseNegative).map((outcome) => outcome.case.caseId),
        });
    }
    if (calibration.overconfidenceError !== null &&
        calibration.overconfidenceError > MAXIMUM_CALIBRATION_ERROR) {
        failures.push({
            gate: GATE.CALIBRATION_ERROR,
            detail: `stated confidence overstates observed accuracy by ${format(calibration.overconfidenceError)} ` +
                `on average, above the ${format(MAXIMUM_CALIBRATION_ERROR)} ceiling; the number is not ` +
                'carrying the meaning the report claims for it',
            caseIds: [],
        });
    }
    if (calibration.worstOverconfidence !== null &&
        calibration.worstOverconfidence < -MAXIMUM_OVERCONFIDENCE) {
        failures.push({
            gate: GATE.OVERCONFIDENCE,
            detail: `one confidence band overstates accuracy by ${format(Math.abs(calibration.worstOverconfidence))}; ` +
                'the engine is at its most dangerous when it is both wrong and sure',
            caseIds: [],
        });
    }
    const unexplained = outcomes.filter((outcome) => outcome.consequence === Consequence.ESCALATED && outcome.firedClusters.length === 0);
    if (unexplained.length > 0) {
        failures.push({
            gate: GATE.EXPLAINED_ESCALATIONS,
            detail: 'a session was escalated with no fired cluster to point at, which means Risk arrived from ' +
                'somewhere other than corroborated evidence — the one thing the scoring contract forbids',
            caseIds: unexplained.map((outcome) => outcome.case.caseId),
        });
    }
    return failures;
}
/**
 * What this report does not establish.
 *
 * Attached to every report, and unconditional. A calibration number invites the
 * reading "the engine is 97% accurate"; these lines are what stops that sentence
 * being said out loud about a synthetic corpus of fourteen cases.
 */
export function limitationsOf(report) {
    const limitations = [
        'These rates describe the corpus, not the world. A synthetic case tests what someone thought ' +
            'to construct, so this harness can only find false positives that were imagined in advance.',
        'The corpus cannot be used to claim an accuracy figure for the engine, and no figure derived ' +
            'from it should be quoted to a customer or to a developer.',
    ];
    const synthetic = report.outcomes.filter((outcome) => outcome.case.labelSource === 'SYNTHETIC').length;
    if (synthetic === report.outcomes.length) {
        limitations.push('Every label here is a design decision, not a human judgement. Until reviewed sessions are ' +
            'folded in through `fromReviews`, this measures self-consistency and nothing more.');
    }
    // Accuracy pinned at 1.00 in every bin makes the symmetric calibration error
    // degenerate: it reduces to (1 − mean confidence), which measures how easy the
    // corpus was, not whether the engine's confidence means anything. Saying so
    // matters more than the number does.
    const populated = report.calibration.bins.filter((bin) => bin.count > 0);
    if (populated.length > 0 && populated.every((bin) => bin.observedAccuracy === 1)) {
        limitations.push('The engine was right about every scored case, so the calibration curve has no incorrect ' +
            'predictions to calibrate against. At this size the calibration error is a restatement of ' +
            'the corpus being easy; it is not evidence that stated confidence is trustworthy.');
    }
    if (report.calibration.underconfidenceError !== null &&
        report.calibration.underconfidenceError > MAXIMUM_CALIBRATION_ERROR) {
        limitations.push(`Stated confidence understates observed accuracy by ${format(report.calibration.underconfidenceError)} ` +
            'on average. Not gated — hedging costs no developer anything, and inflating the number to ' +
            'close the gap is forbidden. It does mean a low Confidence in this report should not be read ' +
            'as the engine being unsure about a person.');
    }
    const indeterminate = report.outcomes.filter((outcome) => outcome.case.label === CaseLabel.INDETERMINATE).length;
    if (indeterminate < 2) {
        limitations.push('Too few indeterminate cases to test whether the engine declines when it should. Refusing to ' +
            'judge is a behaviour that needs testing like any other.');
    }
    for (const subgroup of report.subgroups) {
        if (subgroup.rates.sampleSize < 3) {
            limitations.push(`Subgroup ${subgroup.trait} holds ${String(subgroup.rates.sampleSize)} case(s). Its rates ` +
                'are not measurements; treat a clean result there as untested, not as safe.');
        }
    }
    return limitations;
}
function format(value) {
    return value.toFixed(2);
}
//# sourceMappingURL=gates.js.map