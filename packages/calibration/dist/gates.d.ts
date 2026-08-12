import { type CalibrationReport, type GateFailure } from './contract.ts';
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
export declare const GATE: {
    /**
     * Zero. Not "low".
     *
     * Fourteen cases is far too small a corpus for a 2% ceiling to mean anything —
     * with this denominator, any non-zero rate is one specific person the engine
     * would have accused, and they are identifiable in the report by name. When
     * the corpus grows into the thousands this becomes a rate. Until then the only
     * defensible ceiling is none.
     */
    readonly NO_FALSE_POSITIVES: "no-false-positives";
    /**
     * No subgroup may carry error the aggregate hides.
     *
     * An engine that is right 95% of the time overall and wrong every time about
     * developers who use dictation is not 95% accurate; it is broken for a group
     * of people and averaging over them.
     */
    readonly NO_SUBGROUP_HARM: "no-subgroup-harm";
    /** An `INDETERMINATE` session must be declined, in either direction. */
    readonly NO_OVERCLAIM: "no-overclaim";
    /** Recall is a target, not a promise. Missing cases is the acceptable failure. */
    readonly MINIMUM_RECALL: "minimum-recall";
    /**
     * Stated confidence must not overstate observed accuracy.
     *
     * One-sided, and the asymmetry is load-bearing. Gating the symmetric
     * calibration error would fail a build for hedging — and the cheapest way to
     * pass such a gate is to raise stated confidence across the board, which is
     * the one change the scoring contract explicitly forbids. A gate whose
     * easiest fix is the prohibited edit is a trap for whoever inherits it.
     */
    readonly CALIBRATION_ERROR: "calibration-error";
    /** Being confidently wrong is the failure mode worth its own gate. */
    readonly OVERCONFIDENCE: "overconfidence";
    /** Every escalation must name the clusters that caused it. */
    readonly EXPLAINED_ESCALATIONS: "explained-escalations";
    /** Below this many cases, the report is not evidence of anything. */
    readonly MINIMUM_CORPUS: "minimum-corpus";
};
/** Recall we aim for. Missing a genuine concern is the tolerable error here. */
export declare const TARGET_RECALL = 0.6;
/** How far stated confidence may exceed observed accuracy, averaged over bins. */
export declare const MAXIMUM_CALIBRATION_ERROR = 0.35;
/** How far confidence may exceed accuracy in any single bin. */
export declare const MAXIMUM_OVERCONFIDENCE = 0.4;
/** Under this, `evaluate` reports the corpus itself as the finding. */
export declare const MINIMUM_CASES = 10;
/**
 * Applies every gate and returns what failed.
 *
 * Returns failures rather than throwing, so a caller can print the whole picture
 * at once. A harness that stops at the first failure trains people to fix one
 * thing, rerun, and discover the next — and to stop reading.
 */
export declare function evaluate(report: Omit<CalibrationReport, 'failures'>): readonly GateFailure[];
/**
 * What this report does not establish.
 *
 * Attached to every report, and unconditional. A calibration number invites the
 * reading "the engine is 97% accurate"; these lines are what stops that sentence
 * being said out loud about a synthetic corpus of fourteen cases.
 */
export declare function limitationsOf(report: Omit<CalibrationReport, 'failures' | 'limitations'>): readonly string[];
//# sourceMappingURL=gates.d.ts.map