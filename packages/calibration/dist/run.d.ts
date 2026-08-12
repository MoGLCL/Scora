import { type EventSpec } from '@scora/trust-features/testing';
import { type ScoringOptions } from '@scora/trust-scoring';
import { type CalibrationReport, type CaseOutcome, type LabelledCase } from './contract.ts';
/**
 * Running the corpus.
 *
 * The engine is called exactly as production calls it — real feature extraction,
 * real scoring, no options a caller could use to make a case pass. A harness with
 * a thumb on the scale measures the thumb.
 */
export interface RunnableCase extends LabelledCase {
    readonly specs: readonly EventSpec[];
    /** Layer 08/09 outcomes, where the case models an interview having run. */
    readonly options?: ScoringOptions;
}
/** Puts one labelled case through the engine and classifies the result. */
export declare function runCase(entry: RunnableCase): CaseOutcome;
/**
 * Runs a corpus and produces the full report.
 *
 * Defaults to the built-in corpus so `npm run calibrate` needs no arguments, and
 * takes one so reviewed sessions can be measured the same way.
 */
export declare function calibrate(cases?: readonly RunnableCase[]): CalibrationReport;
/**
 * The report as text, for a terminal or a CI log.
 *
 * Failures come first and cases come last. Someone reading this at the end of a
 * red build should not have to scroll past a calibration curve to find out which
 * developer the engine would have accused.
 */
export declare function renderReport(report: CalibrationReport): string;
//# sourceMappingURL=run.d.ts.map