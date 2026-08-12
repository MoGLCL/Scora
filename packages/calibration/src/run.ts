import { extractFeatures } from '@scora/trust-features';
import { TEST_CONTEXT, buildSession, type EventSpec } from '@scora/trust-features/testing';
import { POLICY_VERSION, score, type ScoringOptions } from '@scora/trust-scoring';
import {
  CaseLabel,
  CaseTrait,
  Consequence,
  type CalibrationReport,
  type CaseOutcome,
  type LabelledCase,
} from './contract.ts';
import { CORPUS } from './corpus.ts';
import { evaluate, limitationsOf } from './gates.ts';
import { bySubgroup, calibrationCurve, consequenceOf, rates, tally } from './metrics.ts';

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
export function runCase(entry: RunnableCase): CaseOutcome {
  const result = score(extractFeatures(buildSession(entry.specs), TEST_CONTEXT), entry.options ?? {});
  const consequence = consequenceOf(result.recommendation);

  const { specs: _specs, options: _options, ...labelled } = entry;

  return {
    case: labelled,
    recommendation: result.recommendation,
    consequence,
    trust: result.trust,
    risk: result.risk,
    confidence: result.confidence,
    firedClusters: result.clusters
      .filter((finding) => finding.fired)
      .map((finding) => finding.definition.id),
    falsePositive: entry.label === CaseLabel.OWNS_WORK && consequence === Consequence.ESCALATED,
    falseNegative: entry.label === CaseLabel.WARRANTS_REVIEW && consequence !== Consequence.ESCALATED,
    overclaim: entry.label === CaseLabel.INDETERMINATE && consequence !== Consequence.DECLINED,
    rationale: result.rationale,
  };
}

/**
 * Runs a corpus and produces the full report.
 *
 * Defaults to the built-in corpus so `npm run calibrate` needs no arguments, and
 * takes one so reviewed sessions can be measured the same way.
 */
export function calibrate(cases: readonly RunnableCase[] = CORPUS): CalibrationReport {
  const outcomes = cases.map(runCase);
  const counts = tally(outcomes);

  const partial = {
    policyVersion: POLICY_VERSION,
    counts,
    rates: rates(counts),
    calibration: calibrationCurve(outcomes),
    subgroups: bySubgroup(outcomes, Object.values(CaseTrait)),
    outcomes,
  };

  return {
    ...partial,
    failures: evaluate({ ...partial, limitations: [] }),
    limitations: limitationsOf(partial),
  };
}

/**
 * The report as text, for a terminal or a CI log.
 *
 * Failures come first and cases come last. Someone reading this at the end of a
 * red build should not have to scroll past a calibration curve to find out which
 * developer the engine would have accused.
 */
export function renderReport(report: CalibrationReport): string {
  const lines: string[] = [];

  lines.push(`SCORA calibration — policy ${report.policyVersion}`, '');

  if (report.failures.length === 0) {
    lines.push('All gates passed.', '');
  } else {
    lines.push(`${String(report.failures.length)} gate(s) FAILED`, '');
    for (const failure of report.failures) {
      lines.push(`  ✗ ${failure.gate}`);
      lines.push(`    ${failure.detail}`);
      if (failure.caseIds.length > 0) lines.push(`    cases: ${failure.caseIds.join(', ')}`);
      lines.push('');
    }
  }

  const { counts, rates: measured } = report;
  lines.push('Counts');
  lines.push(
    `  escalated and should have been      ${String(counts.truePositives)}`,
    `  escalated and should not have been  ${String(counts.falsePositives)}   <- the one that hurts`,
    `  left alone and should have been     ${String(counts.trueNegatives)}`,
    `  let through and should not have     ${String(counts.falseNegatives)}`,
    `  declined and should have            ${String(counts.correctRefusals)}`,
    `  asserted without evidence           ${String(counts.overclaims)}`,
    '',
  );

  lines.push('Rates');
  lines.push(
    `  false positive rate  ${show(measured.falsePositiveRate)}`,
    `  false negative rate  ${show(measured.falseNegativeRate)}`,
    `  precision            ${show(measured.precision)}`,
    `  recall               ${show(measured.recall)}`,
    `  overclaim rate       ${show(measured.overclaimRate)}`,
    `  cases                ${String(measured.sampleSize)}`,
    '',
  );

  lines.push('Calibration (stated confidence vs. observed accuracy)');
  for (const bin of report.calibration.bins) {
    if (bin.count === 0) continue;
    lines.push(
      `  ${String(bin.lowerBound).padStart(3)}–${String(bin.upperBound).padEnd(3)} ` +
        `n=${String(bin.count).padEnd(3)} stated ${show(bin.meanConfidence)} ` +
        `actual ${show(bin.observedAccuracy)} gap ${show(bin.gap)}`,
    );
  }
  lines.push(
    `  expected calibration error ${show(report.calibration.expectedCalibrationError)}   (reported, not gated)`,
    `  overconfidence             ${show(report.calibration.overconfidenceError)}   (gated)`,
    `  underconfidence            ${show(report.calibration.underconfidenceError)}   (reported, not gated)`,
    `  worst overconfidence       ${show(report.calibration.worstOverconfidence)}`,
    `  brier score                ${show(report.calibration.brierScore)}`,
    '',
  );

  if (report.subgroups.length > 0) {
    lines.push('By trait');
    for (const subgroup of report.subgroups) {
      lines.push(
        `  ${subgroup.trait.padEnd(22)} n=${String(subgroup.rates.sampleSize).padEnd(3)} ` +
          `fpr ${show(subgroup.rates.falsePositiveRate)}` +
          (subgroup.falsePositiveCaseIds.length > 0
            ? `   <- ${subgroup.falsePositiveCaseIds.join(', ')}`
            : ''),
      );
    }
    lines.push('');
  }

  lines.push('Cases');
  for (const outcome of report.outcomes) {
    const mark = outcome.falsePositive ? 'FP' : outcome.falseNegative ? 'FN' : outcome.overclaim ? 'OC' : '  ';
    lines.push(
      `  ${mark} ${outcome.case.caseId.padEnd(24)} ${outcome.case.label.padEnd(16)} ` +
        `-> ${outcome.recommendation.padEnd(26)} t=${String(outcome.trust).padStart(3)} ` +
        `r=${String(outcome.risk).padStart(3)} c=${String(outcome.confidence).padStart(3)}`,
    );
  }
  lines.push('');

  lines.push('What this does not establish');
  for (const limitation of report.limitations) lines.push(`  - ${limitation}`);

  return lines.join('\n');
}

function show(value: number | null): string {
  return value === null ? '  n/a' : value.toFixed(2).padStart(5);
}
