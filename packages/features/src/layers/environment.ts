import { TrustEventType, TrustLayer, clampUnit } from '@scora/trust-core';
import { FeatureKind, FeaturePolarity, type Feature, type FeatureDefinition } from '../contract.ts';
import {
  type ExtractionContext,
  type SessionWindow,
  coverageConfidence,
  evidenceIds,
  eventsOfType,
  fmt,
  fmtDuration,
  makeFeature,
  median,
  numberField,
  sampleConfidence,
  sumField,
} from '../window.ts';

/**
 * Layer 01 — Environment Integrity.
 *
 * Answers "how much of this session did we actually observe, and was the
 * environment behaving normally". Its output is primarily a Confidence input:
 * a session with large evidence gaps must not be scored as though it were
 * fully observed, in either direction.
 *
 * Focus loss and tab switching are recorded but are NOT adverse. Developers
 * check documentation, answer messages and look at other windows constantly.
 * Treating that as suspicious would fail most honest sessions.
 */

const LAYER = TrustLayer.ENVIRONMENT;

export const ENVIRONMENT_FEATURES: readonly FeatureDefinition[] = [
  {
    name: 'env.telemetry_coverage',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
    description: 'Share of session wall-clock time for which telemetry was being received.',
    inputs: [
      TrustEventType.SESSION_STARTED,
      TrustEventType.SESSION_ENDED,
      TrustEventType.SANDBOX_DISCONNECTED,
      TrustEventType.SANDBOX_RECONNECTED,
      TrustEventType.ENVIRONMENT_INTERRUPTION,
    ],
    calculation: '1 - (summed outage and interruption gap durations / session duration)',
    interpretation:
      'Low coverage means the engine saw less than it should have. It lowers Confidence in every other layer and never raises Risk on its own — a flaky network says nothing about a developer.',
  },
  {
    name: 'env.evidence_gap_ms',
    layer: LAYER,
    kind: FeatureKind.DURATION,
    polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
    description: 'Total milliseconds during which the engine was blind to what happened.',
    inputs: [TrustEventType.SANDBOX_RECONNECTED, TrustEventType.ENVIRONMENT_INTERRUPTION],
    calculation: 'sum(outageMs) + sum(evidenceGapMs)',
    interpretation:
      'Long gaps mean code may have changed unobserved. That warrants a verification challenge or interview question, not an adverse conclusion.',
  },
  {
    name: 'env.session_continuity',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
    description: 'Whether the session ran as one continuous stretch or was repeatedly broken.',
    inputs: [
      TrustEventType.SESSION_PAUSED,
      TrustEventType.SESSION_RESUMED,
      TrustEventType.SANDBOX_DISCONNECTED,
    ],
    calculation: '1 / (1 + number of interruption events)',
    interpretation:
      'A fragmented session is harder to reason about. Reported so reviewers can see it, not to penalise the developer for an unstable connection.',
  },
  {
    name: 'env.focus_retention',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Share of session time with the assessment window focused.',
    inputs: [TrustEventType.WINDOW_FOCUS_LOST, TrustEventType.WINDOW_FOCUS_GAINED],
    calculation: '1 - (summed away time / session duration)',
    interpretation:
      'Explicitly NEUTRAL. Leaving the window is ordinary developer behaviour. This feature exists to give context to other layers, never to suggest wrongdoing by itself.',
  },
  {
    name: 'env.focus_switch_rate',
    layer: LAYER,
    kind: FeatureKind.RATE,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Window focus changes per active hour.',
    inputs: [TrustEventType.WINDOW_FOCUS_LOST],
    calculation: 'focus-lost count / active hours',
    interpretation:
      'Descriptive context for correlating with Layer 06. High values alone mean nothing: some people work across two monitors.',
  },
  {
    name: 'env.runtime_integrity_violations',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.RISK_CONTRIBUTING,
    description: 'Times the sandbox detected tampering with its own instrumentation.',
    inputs: [TrustEventType.RUNTIME_INTEGRITY_VIOLATION],
    calculation: 'count of RUNTIME_INTEGRITY_VIOLATION events',
    interpretation:
      'One of the few genuinely adverse signals, because it targets the measurement apparatus rather than the work. Still requires corroboration: detectors produce false positives against browser extensions and accessibility tools.',
  },
  {
    name: 'env.device_context_changes',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.RISK_CONTRIBUTING,
    description: 'Times the reported device or browser context changed mid-session.',
    inputs: [TrustEventType.DEVICE_CONTEXT_CHANGED],
    calculation: 'count of DEVICE_CONTEXT_CHANGED events',
    interpretation:
      'Could indicate a different person taking over, but far more often means a browser update, a resized window or a monitor being connected. Never sufficient alone.',
  },
  {
    name: 'env.clock_reliability',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
    description: 'How trustworthy client-reported timings are, from clock-sync stability.',
    inputs: [TrustEventType.CLOCK_SYNC_SAMPLE],
    calculation: '1 / (1 + median absolute drift in seconds between consecutive samples)',
    interpretation:
      'All timing-derived features in Layers 03 and 05 depend on this. An unstable clock lowers their confidence rather than invalidating them.',
  },
];

export function extractEnvironmentFeatures(
  window: SessionWindow,
  _context: ExtractionContext,
): readonly Feature[] {
  const reconnects = eventsOfType(window, TrustEventType.SANDBOX_RECONNECTED);
  const interruptions = eventsOfType(window, TrustEventType.ENVIRONMENT_INTERRUPTION);
  const disconnects = eventsOfType(window, TrustEventType.SANDBOX_DISCONNECTED);
  const pauses = eventsOfType(window, TrustEventType.SESSION_PAUSED);
  const focusLost = eventsOfType(window, TrustEventType.WINDOW_FOCUS_LOST);
  const focusGained = eventsOfType(window, TrustEventType.WINDOW_FOCUS_GAINED);
  const violations = eventsOfType(window, TrustEventType.RUNTIME_INTEGRITY_VIOLATION);
  const deviceChanges = eventsOfType(window, TrustEventType.DEVICE_CONTEXT_CHANGED);
  const clockSamples = eventsOfType(window, TrustEventType.CLOCK_SYNC_SAMPLE);

  const outageMs = sumField(reconnects, 'outageMs');
  const gapMs = sumField(interruptions, 'evidenceGapMs');
  const totalGapMs = outageMs + gapMs;

  const features: Feature[] = [];

  const coverage =
    window.durationMs > 0 ? Math.max(0, 1 - totalGapMs / window.durationMs) : null;
  features.push(
    makeFeature({
      name: 'env.telemetry_coverage',
      layer: LAYER,
      polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
      value: coverage,
      sampleSize: window.events.length,
      confidence: coverageConfidence(window.durationMs - totalGapMs, window.durationMs),
      evidence: evidenceIds(reconnects, interruptions),
      note:
        coverage === null
          ? 'Session too short to assess telemetry coverage'
          : `Telemetry covered ${(coverage * 100).toFixed(1)}% of the session (${fmtDuration(totalGapMs)} unobserved)`,
    }),
  );

  features.push(
    makeFeature({
      name: 'env.evidence_gap_ms',
      layer: LAYER,
      kind: FeatureKind.DURATION,
      polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
      value: totalGapMs,
      sampleSize: reconnects.length + interruptions.length,
      evidence: evidenceIds(reconnects, interruptions),
      note: `${fmtDuration(totalGapMs)} of the session was unobserved across ${reconnects.length + interruptions.length} gap(s)`,
    }),
  );

  const breaks = pauses.length + disconnects.length + interruptions.length;
  features.push(
    makeFeature({
      name: 'env.session_continuity',
      layer: LAYER,
      polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
      value: 1 / (1 + breaks),
      sampleSize: window.events.length,
      evidence: evidenceIds(pauses, disconnects, interruptions),
      note:
        breaks === 0
          ? 'Session ran continuously without interruption'
          : `Session was interrupted ${breaks} time(s)`,
    }),
  );

  // Prefer the durations the client reports; fall back to pairing focus-lost
  // with focus-gained when awayMs is missing.
  const awayMs = sumField(focusGained, 'awayMs');
  const focusRetention =
    window.durationMs > 0 ? Math.max(0, 1 - awayMs / window.durationMs) : null;
  features.push(
    makeFeature({
      name: 'env.focus_retention',
      layer: LAYER,
      polarity: FeaturePolarity.NEUTRAL,
      value: focusRetention,
      sampleSize: focusLost.length,
      evidence: evidenceIds(focusLost, focusGained),
      note:
        focusRetention === null
          ? 'No focus data available'
          : `Window was focused for ${(focusRetention * 100).toFixed(1)}% of the session across ${focusLost.length} switch(es) — normal developer behaviour`,
    }),
  );

  const activeHours = window.activeMs / 3_600_000;
  features.push(
    makeFeature({
      name: 'env.focus_switch_rate',
      layer: LAYER,
      kind: FeatureKind.RATE,
      polarity: FeaturePolarity.NEUTRAL,
      value: activeHours > 0 ? focusLost.length / activeHours : null,
      sampleSize: focusLost.length,
      evidence: evidenceIds(focusLost),
      note: `${focusLost.length} focus switch(es) over ${fmtDuration(window.activeMs)} of active time`,
    }),
  );

  features.push(
    makeFeature({
      name: 'env.runtime_integrity_violations',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.RISK_CONTRIBUTING,
      value: violations.length,
      sampleSize: violations.length,
      // Confidence comes from the detector's own certainty, not from how many
      // times it fired: a detector that is wrong is wrong repeatedly.
      confidence: clampUnit(
        violations.length === 0
          ? 1
          : Math.min(...violations.map((e) => numberField(e, 'detectorConfidence') ?? 0.5)),
      ),
      evidence: evidenceIds(violations),
      note:
        violations.length === 0
          ? 'No runtime integrity violations detected'
          : `${violations.length} runtime integrity violation(s) detected — requires corroboration before any conclusion`,
    }),
  );

  features.push(
    makeFeature({
      name: 'env.device_context_changes',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.RISK_CONTRIBUTING,
      value: deviceChanges.length,
      sampleSize: deviceChanges.length,
      evidence: evidenceIds(deviceChanges),
      note:
        deviceChanges.length === 0
          ? 'Device context remained stable'
          : `Device context changed ${deviceChanges.length} time(s) — commonly benign (browser update, window resize)`,
    }),
  );

  const drifts = clockSamples
    .map((event) => numberField(event, 'driftFromPreviousMs'))
    .filter((value): value is number => value !== null)
    .map(Math.abs);
  const medianDrift = median(drifts);
  const medianDriftSeconds = medianDrift === null ? null : medianDrift / 1000;
  features.push(
    makeFeature({
      name: 'env.clock_reliability',
      layer: LAYER,
      polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
      value: medianDriftSeconds === null ? null : 1 / (1 + medianDriftSeconds),
      sampleSize: clockSamples.length,
      confidence: sampleConfidence(clockSamples.length, 3),
      evidence: evidenceIds(clockSamples),
      note:
        medianDriftSeconds === null
          ? 'No clock synchronisation samples; client timings are unverified'
          : `Median clock drift ${fmt(medianDriftSeconds * 1000, 0)}ms between samples`,
    }),
  );

  return features;
}
