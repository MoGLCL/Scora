import { TrustEventType, TrustLayer } from '@scora/trust-core';
import { FeatureKind, FeaturePolarity, type Feature, type FeatureDefinition } from '../contract.ts';
import {
  type ExtractionContext,
  type SessionWindow,
  collectField,
  evidenceIds,
  eventsOfType,
  fmt,
  fmtDuration,
  makeFeature,
  median,
  numberField,
  ratio,
  stringField,
} from '../window.ts';

/**
 * Layer 05 — Runtime & Debugging Behavior.
 *
 * The most informative layer that does not require asking the developer
 * anything. Debugging is hard to fake: locating a fault, forming a hypothesis,
 * placing a breakpoint where the problem actually is, and fixing it without
 * breaking something else all require a working model of the code.
 *
 * Encountering errors is entirely neutral — everyone does. What carries
 * information is what happened next.
 */

const LAYER = TrustLayer.RUNTIME;

export const RUNTIME_FEATURES: readonly FeatureDefinition[] = [
  {
    name: 'runtime.execution_count',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Times the developer ran their code.',
    inputs: [TrustEventType.CODE_EXECUTION_STARTED],
    calculation: 'count of CODE_EXECUTION_STARTED events',
    interpretation:
      'Running your own work is basic engineering practice. Never running it before submitting is worth noting, though a task may not be runnable.',
  },
  {
    name: 'runtime.test_run_count',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Test runs executed.',
    inputs: [TrustEventType.TEST_RUN_STARTED],
    calculation: 'count of TEST_RUN_STARTED events',
    interpretation: 'Verifying your own work unprompted is a strong ownership signal.',
  },
  {
    name: 'runtime.authored_test_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of test runs against tests the developer wrote themselves.',
    inputs: [TrustEventType.TEST_RUN_STARTED],
    calculation: 'runs with suiteOrigin in {authored, mixed} / all runs',
    interpretation:
      'Writing tests requires understanding both the requirement and the implementation. Considerably stronger evidence than running tests that were provided.',
  },
  {
    name: 'runtime.error_resolution_rate',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of distinct errors the developer resolved.',
    inputs: [TrustEventType.RUNTIME_ERROR_OBSERVED, TrustEventType.ERROR_RESOLVED],
    calculation: 'distinct resolved error signatures / distinct observed error signatures',
    interpretation:
      'Direct evidence of problem-solving capability. Unresolved errors are not adverse in themselves — the developer may have run out of time.',
  },
  {
    name: 'runtime.median_recovery_ms',
    layer: LAYER,
    kind: FeatureKind.DURATION,
    polarity: FeaturePolarity.CONTEXTUAL,
    description: 'Median time from observing an error to resolving it.',
    inputs: [TrustEventType.ERROR_RESOLVED],
    calculation: 'median(timeToResolveMs)',
    interpretation:
      'Fast recovery usually indicates competence. Suspiciously fast recovery on a complex, unfamiliar error is a question for the interview, never a verdict — experienced developers do recognise errors instantly.',
  },
  {
    name: 'runtime.fix_attempts_per_error',
    layer: LAYER,
    kind: FeatureKind.INDEX,
    polarity: FeaturePolarity.CONTEXTUAL,
    description: 'Median number of attempts required to resolve an error.',
    inputs: [TrustEventType.FIX_ATTEMPTED, TrustEventType.ERROR_RESOLVED],
    calculation: 'median(attemptsRequired)',
    interpretation:
      'Iterating toward a fix is normal and healthy. Resolving every error first try is compatible with expertise and with having the answer supplied; it is corroborating context, not a finding.',
  },
  {
    name: 'runtime.debugging_engagement',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Debugger sessions started and breakpoints set.',
    inputs: [TrustEventType.DEBUG_SESSION_STARTED, TrustEventType.BREAKPOINT_SET],
    calculation: 'debug session count + breakpoint count',
    interpretation:
      'Using a debugger deliberately is a mark of engagement. Its absence proves nothing: many developers debug effectively with print statements.',
  },
  {
    name: 'runtime.breakpoint_precision',
    layer: LAYER,
    kind: FeatureKind.INDEX,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'How close breakpoints were placed to the actual fault.',
    inputs: [TrustEventType.BREAKPOINT_SET],
    calculation: '1 / (1 + median line distance from the error location)',
    interpretation:
      'Where someone chooses to break reveals their mental model. Accurate placement is difficult without understanding the code, making this hard to fake.',
  },
  {
    name: 'runtime.regression_count',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Times a change broke something that previously worked.',
    inputs: [TrustEventType.REGRESSION_DETECTED],
    calculation: 'count of REGRESSION_DETECTED events',
    interpretation:
      'Regressions happen to everyone. Recorded so that recovery from them can be credited.',
  },
  {
    name: 'runtime.final_test_pass_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Pass rate of the last test run in the session.',
    inputs: [TrustEventType.TEST_RUN_FINISHED],
    calculation: 'passed / (passed + failed) for the final run',
    interpretation:
      'Outcome measure. Deliberately separate from the behavioural features so that a developer who worked well but did not finish is still visible as such.',
  },
  {
    name: 'runtime.verification_before_submit',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Whether the code was executed or tested before being submitted.',
    inputs: [TrustEventType.TASK_SUBMITTED, TrustEventType.TEST_RUN_FINISHED],
    calculation: '1 when a run or test preceded submission, else 0',
    interpretation:
      'Submitting without ever running the code suggests the developer was not in a position to know whether it worked.',
  },
];

export function extractRuntimeFeatures(
  window: SessionWindow,
  _context: ExtractionContext,
): readonly Feature[] {
  const executions = eventsOfType(window, TrustEventType.CODE_EXECUTION_STARTED);
  const executionsFinished = eventsOfType(window, TrustEventType.CODE_EXECUTION_FINISHED);
  const testStarts = eventsOfType(window, TrustEventType.TEST_RUN_STARTED);
  const testFinishes = eventsOfType(window, TrustEventType.TEST_RUN_FINISHED);
  const errors = eventsOfType(window, TrustEventType.RUNTIME_ERROR_OBSERVED);
  const resolutions = eventsOfType(window, TrustEventType.ERROR_RESOLVED);
  const fixes = eventsOfType(window, TrustEventType.FIX_ATTEMPTED);
  const debugSessions = eventsOfType(window, TrustEventType.DEBUG_SESSION_STARTED);
  const breakpoints = eventsOfType(window, TrustEventType.BREAKPOINT_SET);
  const regressions = eventsOfType(window, TrustEventType.REGRESSION_DETECTED);
  const submissions = eventsOfType(window, TrustEventType.TASK_SUBMITTED);

  const features: Feature[] = [];

  features.push(
    makeFeature({
      name: 'runtime.execution_count',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: executions.length,
      sampleSize: executions.length,
      evidence: evidenceIds(executions),
      note: `Code was executed ${executions.length} time(s)`,
    }),
  );

  features.push(
    makeFeature({
      name: 'runtime.test_run_count',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: testStarts.length,
      sampleSize: testStarts.length,
      evidence: evidenceIds(testStarts),
      note: `${testStarts.length} test run(s) executed`,
    }),
  );

  const authoredRuns = testStarts.filter((event) => {
    const origin = stringField(event, 'suiteOrigin');
    return origin === 'authored' || origin === 'mixed';
  });
  features.push(
    makeFeature({
      name: 'runtime.authored_test_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(authoredRuns.length, testStarts.length),
      sampleSize: testStarts.length,
      evidence: evidenceIds(authoredRuns),
      note:
        testStarts.length === 0
          ? 'No test runs recorded'
          : `${authoredRuns.length} of ${testStarts.length} test run(s) exercised tests the developer wrote`,
    }),
  );

  // Group by error signature so one failure hit repeatedly is counted once.
  const observedSignatures = new Set(
    errors
      .map((event) => stringField(event, 'signatureHash'))
      .filter((hash): hash is string => hash !== null),
  );
  const resolvedSignatures = new Set(
    resolutions
      .map((event) => stringField(event, 'errorSignatureHash'))
      .filter((hash): hash is string => hash !== null),
  );
  features.push(
    makeFeature({
      name: 'runtime.error_resolution_rate',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(resolvedSignatures.size, observedSignatures.size),
      sampleSize: observedSignatures.size,
      evidence: evidenceIds(errors, resolutions),
      note:
        observedSignatures.size === 0
          ? 'No runtime errors were encountered'
          : `${resolvedSignatures.size} of ${observedSignatures.size} distinct error(s) were resolved`,
    }),
  );

  const recoveryTimes = collectField(resolutions, 'timeToResolveMs');
  features.push(
    makeFeature({
      name: 'runtime.median_recovery_ms',
      layer: LAYER,
      kind: FeatureKind.DURATION,
      polarity: FeaturePolarity.CONTEXTUAL,
      value: median(recoveryTimes),
      sampleSize: recoveryTimes.length,
      evidence: evidenceIds(resolutions),
      note:
        recoveryTimes.length === 0
          ? 'No resolved errors to measure'
          : `Median time to resolve an error was ${fmtDuration(median(recoveryTimes))}`,
    }),
  );

  const attempts = collectField(resolutions, 'attemptsRequired');
  features.push(
    makeFeature({
      name: 'runtime.fix_attempts_per_error',
      layer: LAYER,
      kind: FeatureKind.INDEX,
      polarity: FeaturePolarity.CONTEXTUAL,
      value: median(attempts),
      sampleSize: attempts.length,
      evidence: evidenceIds(fixes, resolutions),
      note:
        attempts.length === 0
          ? 'No resolved errors to measure'
          : `Median of ${fmt(median(attempts), 1)} attempt(s) per resolved error`,
    }),
  );

  features.push(
    makeFeature({
      name: 'runtime.debugging_engagement',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: debugSessions.length + breakpoints.length,
      sampleSize: debugSessions.length + breakpoints.length,
      evidence: evidenceIds(debugSessions, breakpoints),
      note: `${debugSessions.length} debug session(s) and ${breakpoints.length} breakpoint(s)`,
    }),
  );

  const proximities = collectField(breakpoints, 'proximityToErrorLines');
  const medianProximity = median(proximities);
  features.push(
    makeFeature({
      name: 'runtime.breakpoint_precision',
      layer: LAYER,
      kind: FeatureKind.INDEX,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: medianProximity === null ? null : 1 / (1 + medianProximity),
      sampleSize: proximities.length,
      evidence: evidenceIds(breakpoints),
      note:
        medianProximity === null
          ? 'No breakpoints with known proximity to a fault'
          : `Breakpoints were placed a median of ${fmt(medianProximity, 0)} line(s) from the fault`,
    }),
  );

  features.push(
    makeFeature({
      name: 'runtime.regression_count',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.NEUTRAL,
      value: regressions.length,
      sampleSize: regressions.length,
      evidence: evidenceIds(regressions),
      note: `${regressions.length} regression(s) detected`,
    }),
  );

  const finalRun = testFinishes.at(-1);
  const passed = finalRun === undefined ? null : (numberField(finalRun, 'passed') ?? 0);
  const failed = finalRun === undefined ? null : (numberField(finalRun, 'failed') ?? 0);
  features.push(
    makeFeature({
      name: 'runtime.final_test_pass_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: passed === null || failed === null ? null : ratio(passed, passed + failed),
      sampleSize: testFinishes.length,
      evidence: finalRun === undefined ? [] : evidenceIds([finalRun]),
      note:
        finalRun === undefined
          ? 'No completed test runs'
          : `Final test run: ${passed} passed, ${failed} failed`,
    }),
  );

  // Verification counts only when it preceded submission; running tests after
  // submitting says nothing about the state the work was handed in.
  const submission = submissions.at(-1);
  const verifiedBeforeSubmit =
    submission === undefined
      ? null
      : [...executionsFinished, ...testFinishes].some(
          (event) => event.occurredAtNormalized <= submission.occurredAtNormalized,
        )
        ? 1
        : 0;
  features.push(
    makeFeature({
      name: 'runtime.verification_before_submit',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: verifiedBeforeSubmit,
      sampleSize: submission === undefined ? 0 : 1,
      evidence: evidenceIds(executionsFinished, testFinishes, submissions),
      note:
        submission === undefined
          ? 'No submission recorded in this session'
          : verifiedBeforeSubmit === 1
            ? 'Code was executed or tested before submission'
            : 'Code was submitted without any recorded execution or test run',
    }),
  );

  return features;
}
