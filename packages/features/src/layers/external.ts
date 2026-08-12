import { TrustEventType, TrustLayer, clampUnit } from '@scora/trust-core';
import { FeatureKind, FeaturePolarity, type Feature, type FeatureDefinition } from '../contract.ts';
import {
  type ExtractionContext,
  type SessionWindow,
  collectField,
  evidenceIds,
  eventsOfType,
  fmtDuration,
  makeFeature,
  median,
  numberField,
  ratio,
  stringField,
} from '../window.ts';

/**
 * Layer 06 — External Activity.
 *
 * Consulting external resources is what professional developers do all day.
 * Documentation, Stack Overflow, GitHub and AI tools are all normal parts of
 * the trade, and this layer must not be read as a cheating detector.
 *
 * SCORA also does not claim it can reliably observe external AI use. A
 * developer with a second device is invisible here. Building a system that
 * depends on catching that would be both ineffective and unfair to the honest
 * developers it misclassifies. This layer therefore records what was permitted
 * and observable, and leaves the actual determination to correlation with
 * Layers 03, 04, 05, 07, 08 and 09 — where understanding, not access, is
 * measured.
 *
 * Only ONE feature here contributes to risk, and it is deliberately
 * conjunctive: an import correlated with an external visit AND left unadapted
 * AND never verified. Even then it is one cluster member, not a verdict.
 */

const LAYER = TrustLayer.EXTERNAL;

export const EXTERNAL_FEATURES: readonly FeatureDefinition[] = [
  {
    name: 'external.visit_count',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'External resource visits observed.',
    inputs: [TrustEventType.EXTERNAL_RESOURCE_ACCESSED],
    calculation: 'count of EXTERNAL_RESOURCE_ACCESSED events',
    interpretation:
      'Explicitly NEUTRAL. Looking things up is normal engineering. This is a count, not an accusation.',
  },
  {
    name: 'external.documentation_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of external visits that were official documentation.',
    inputs: [TrustEventType.EXTERNAL_RESOURCE_ACCESSED],
    calculation: 'visits with category=official_documentation / all visits',
    interpretation:
      'Reading primary sources is a positive professional habit. Treated as supportive, in direct contrast to systems that flag any external tab.',
  },
  {
    name: 'external.reference_diversity',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Distinct resource categories consulted.',
    inputs: [TrustEventType.EXTERNAL_RESOURCE_ACCESSED],
    calculation: 'count of distinct category values',
    interpretation:
      'Cross-referencing several kinds of source suggests the developer was reasoning about the problem rather than looking for something to copy.',
  },
  {
    name: 'external.median_dwell_ms',
    layer: LAYER,
    kind: FeatureKind.DURATION,
    polarity: FeaturePolarity.CONTEXTUAL,
    description: 'Median time spent on an external resource before returning.',
    inputs: [TrustEventType.EXTERNAL_RESOURCE_DWELL, TrustEventType.EXTERNAL_RESOURCE_LEFT],
    calculation: 'median(dwellMs)',
    interpretation:
      'Reading takes time; grabbing a snippet does not. Neither is adverse alone — a developer who already knows an API needs one glance at a signature.',
  },
  {
    name: 'external.study_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of resources the developer returned to more than once.',
    inputs: [TrustEventType.EXTERNAL_RESOURCE_DWELL],
    calculation: 'dwell events with returnVisitNumber > 1 / all dwell events',
    interpretation:
      'Going back to a reference indicates working through it rather than lifting from it. Supportive.',
  },
  {
    name: 'external.ai_tool_visit_count',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Visits to external AI assistant tools, where observable.',
    inputs: [TrustEventType.EXTERNAL_RESOURCE_ACCESSED],
    calculation: 'count of visits with category=ai_tool',
    interpretation:
      'NEUTRAL by policy. AI assistance is permitted; SCORA measures whether the developer understands and owns the result, not whether they had help. Also incomplete by nature — a second device is undetectable — so this must never be treated as a reliable AI detector.',
  },
  {
    name: 'external.adaptation_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of externally-correlated imports that the developer adapted.',
    inputs: [TrustEventType.EXTERNAL_ORIGIN_IMPORT, TrustEventType.CODE_DIFF_APPLIED],
    calculation:
      'mean(adaptationRatio) where reported, else imports followed by a revising diff to the same file / all imports',
    interpretation:
      'The distinction that matters in this layer. Taking an example and fitting it to your codebase demonstrates understanding; pasting it unchanged does not. High values are strongly mitigating.',
  },
  {
    name: 'external.unadapted_import_count',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.RISK_CONTRIBUTING,
    description:
      'Externally-correlated imports that were never adapted and never verified afterwards.',
    inputs: [
      TrustEventType.EXTERNAL_ORIGIN_IMPORT,
      TrustEventType.CODE_DIFF_APPLIED,
      TrustEventType.TEST_RUN_STARTED,
      TrustEventType.CODE_EXECUTION_STARTED,
    ],
    calculation:
      'count of EXTERNAL_ORIGIN_IMPORT events with low adaptation, no later revising diff to the same file, and no later test run or execution',
    interpretation:
      'The single risk-contributing feature in this layer, and deliberately conjunctive: it requires an external correlation AND absent adaptation AND absent verification. Any one of those alone is ordinary behaviour. Even satisfied, it must be corroborated by Layer 08 or 09 before it affects any decision.',
  },
  {
    name: 'external.import_latency_ms',
    layer: LAYER,
    kind: FeatureKind.DURATION,
    polarity: FeaturePolarity.CONTEXTUAL,
    description: 'Median gap between leaving a resource and the correlated code appearing.',
    inputs: [TrustEventType.EXTERNAL_ORIGIN_IMPORT],
    calculation: 'median(msSinceResourceLeft)',
    interpretation:
      'Short gaps mean less time to read and think. Context for the interview, which is where understanding is actually established.',
  },
];

/** Below this, an import is treated as substantially unmodified. */
const LOW_ADAPTATION_THRESHOLD = 0.15;

export function extractExternalFeatures(
  window: SessionWindow,
  _context: ExtractionContext,
): readonly Feature[] {
  const visits = eventsOfType(window, TrustEventType.EXTERNAL_RESOURCE_ACCESSED);
  const dwells = eventsOfType(window, TrustEventType.EXTERNAL_RESOURCE_DWELL);
  const departures = eventsOfType(window, TrustEventType.EXTERNAL_RESOURCE_LEFT);
  const imports = eventsOfType(window, TrustEventType.EXTERNAL_ORIGIN_IMPORT);
  const diffs = eventsOfType(window, TrustEventType.CODE_DIFF_APPLIED);
  const testRuns = eventsOfType(window, TrustEventType.TEST_RUN_STARTED);
  const executions = eventsOfType(window, TrustEventType.CODE_EXECUTION_STARTED);

  const features: Feature[] = [];

  features.push(
    makeFeature({
      name: 'external.visit_count',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.NEUTRAL,
      value: visits.length,
      sampleSize: visits.length,
      evidence: evidenceIds(visits),
      note: `${visits.length} external resource visit(s) — consulting references is normal developer behaviour`,
    }),
  );

  const documentationVisits = visits.filter(
    (event) => stringField(event, 'category') === 'official_documentation',
  );
  features.push(
    makeFeature({
      name: 'external.documentation_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(documentationVisits.length, visits.length),
      sampleSize: visits.length,
      evidence: evidenceIds(documentationVisits),
      note:
        visits.length === 0
          ? 'No external activity recorded'
          : `${documentationVisits.length} of ${visits.length} visit(s) were official documentation`,
    }),
  );

  const categories = new Set(
    visits
      .map((event) => stringField(event, 'category'))
      .filter((category): category is string => category !== null),
  );
  features.push(
    makeFeature({
      name: 'external.reference_diversity',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: categories.size,
      sampleSize: visits.length,
      evidence: evidenceIds(visits),
      note: `${categories.size} distinct resource category/categories consulted`,
    }),
  );

  const dwellTimes = [...collectField(dwells, 'dwellMs'), ...collectField(departures, 'totalDwellMs')];
  features.push(
    makeFeature({
      name: 'external.median_dwell_ms',
      layer: LAYER,
      kind: FeatureKind.DURATION,
      polarity: FeaturePolarity.CONTEXTUAL,
      value: median(dwellTimes),
      sampleSize: dwellTimes.length,
      evidence: evidenceIds(dwells, departures),
      note:
        dwellTimes.length === 0
          ? 'No dwell durations recorded'
          : `Median external visit lasted ${fmtDuration(median(dwellTimes))}`,
    }),
  );

  const returnVisits = dwells.filter((event) => (numberField(event, 'returnVisitNumber') ?? 1) > 1);
  features.push(
    makeFeature({
      name: 'external.study_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(returnVisits.length, dwells.length),
      sampleSize: dwells.length,
      evidence: evidenceIds(returnVisits),
      note:
        dwells.length === 0
          ? 'No dwell events recorded'
          : `${returnVisits.length} of ${dwells.length} resource visit(s) were return visits, indicating study`,
    }),
  );

  const aiVisits = visits.filter((event) => stringField(event, 'category') === 'ai_tool');
  features.push(
    makeFeature({
      name: 'external.ai_tool_visit_count',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.NEUTRAL,
      value: aiVisits.length,
      sampleSize: aiVisits.length,
      // Observability here is inherently partial, so this can never present
      // itself as a confident measurement of external AI use.
      confidence: clampUnit(0.4),
      evidence: evidenceIds(aiVisits),
      note:
        aiVisits.length === 0
          ? 'No AI tool visits observed (note: external AI use is not reliably detectable)'
          : `${aiVisits.length} AI tool visit(s) observed — permitted, and evaluated through understanding rather than access`,
    }),
  );

  /** An import is adapted if the producer says so, or if a later diff revised that file. */
  const wasAdapted = (event: (typeof imports)[number]): boolean => {
    const reported = numberField(event, 'adaptationRatio');
    if (reported !== null && reported >= LOW_ADAPTATION_THRESHOLD) return true;
    return diffs.some(
      (diff) =>
        diff.occurredAtNormalized > event.occurredAtNormalized &&
        diff.payload['path'] === event.payload['path'] &&
        (numberField(diff, 'linesRemoved') ?? 0) > 0,
    );
  };

  const adapted = imports.filter(wasAdapted);
  features.push(
    makeFeature({
      name: 'external.adaptation_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(adapted.length, imports.length),
      sampleSize: imports.length,
      evidence: evidenceIds(adapted, imports),
      note:
        imports.length === 0
          ? 'No externally-correlated imports recorded'
          : `${adapted.length} of ${imports.length} externally-correlated import(s) were adapted by the developer`,
    }),
  );

  const verifiedAfter = (event: (typeof imports)[number]): boolean =>
    [...testRuns, ...executions].some(
      (run) => run.occurredAtNormalized > event.occurredAtNormalized,
    );
  const unadapted = imports.filter((event) => !wasAdapted(event) && !verifiedAfter(event));
  features.push(
    makeFeature({
      name: 'external.unadapted_import_count',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.RISK_CONTRIBUTING,
      value: unadapted.length,
      sampleSize: imports.length,
      evidence: evidenceIds(unadapted),
      note:
        unadapted.length === 0
          ? 'No unadapted, unverified external imports'
          : `${unadapted.length} import(s) followed an external visit and were neither adapted nor verified — one cluster member, not a conclusion`,
    }),
  );

  const latencies = collectField(imports, 'msSinceResourceLeft');
  features.push(
    makeFeature({
      name: 'external.import_latency_ms',
      layer: LAYER,
      kind: FeatureKind.DURATION,
      polarity: FeaturePolarity.CONTEXTUAL,
      value: median(latencies),
      sampleSize: latencies.length,
      evidence: evidenceIds(imports),
      note:
        latencies.length === 0
          ? 'No externally-correlated imports to measure'
          : `Median gap from leaving a resource to correlated code appearing was ${fmtDuration(median(latencies))}`,
    }),
  );

  return features;
}
