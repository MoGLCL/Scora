import { TrustEventType, TrustLayer, clampUnit } from '@scora/trust-core';
import { FeatureKind, FeaturePolarity, type Feature, type FeatureDefinition } from '../contract.ts';
import {
  type ExtractionContext,
  type SessionWindow,
  coefficientOfVariation,
  collectField,
  evidenceIds,
  eventsOfType,
  fmt,
  fmtDuration,
  makeFeature,
  median,
  numberField,
  ratio,
  sampleConfidence,
  stringField,
  sumField,
} from '../window.ts';

/**
 * Layer 03 — Typing & Editing Behavior.
 *
 * The layer where naive systems do the most damage. Fast typing is not
 * evidence of anything: experienced developers type quickly, touch-typists
 * exist, and a developer transcribing a design they already worked out on paper
 * looks identical to one copying. Every feature here is therefore either
 * descriptive or expressed relative to the developer's own baseline.
 *
 * Two rules hold throughout:
 *
 *  1. No absolute thresholds on speed. Comparison is against this developer's
 *     history, or failing that against their own behaviour earlier in the same
 *     session — never against a global constant.
 *  2. Pasting is normal. Developers paste constantly: from other files, from
 *     their own clipboard, from documentation. Only `typing.unexplained_insertion_ratio`
 *     is risk-contributing, and only for insertions that arrived from outside
 *     the workspace with no in-editor precursor.
 */

const LAYER = TrustLayer.TYPING;

export const TYPING_FEATURES: readonly FeatureDefinition[] = [
  {
    name: 'typing.characters_authored',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Characters entered by keystroke rather than paste or completion.',
    inputs: [TrustEventType.TYPING_BURST, TrustEventType.TEXT_INSERTED],
    calculation: 'sum(charactersTyped) across typing bursts',
    interpretation: 'Volume alone means nothing. Used as the denominator for authorship ratios.',
  },
  {
    name: 'typing.authorship_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of all inserted characters that were typed by hand.',
    inputs: [TrustEventType.TYPING_BURST, TrustEventType.CODE_PASTE, TrustEventType.LARGE_INSERTION],
    calculation: 'typed characters / (typed + pasted + bulk-inserted characters)',
    interpretation:
      'High values are supportive. Low values are NOT adverse on their own — a developer assembling code from their own earlier work, or accepting editor completions, legitimately types little.',
  },
  {
    name: 'typing.rhythm_variability',
    layer: LAYER,
    kind: FeatureKind.INDEX,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Coefficient of variation of inter-keystroke intervals across bursts.',
    inputs: [TrustEventType.TYPING_BURST],
    calculation: 'stddev(meanIntervalMs) / mean(meanIntervalMs) across bursts',
    interpretation:
      'Human typing is irregular: people pause to think mid-line. Near-zero variability suggests synthetic input rather than a fast human. High variability is normal and supportive.',
  },
  {
    name: 'typing.correction_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Deleted characters as a share of inserted characters.',
    inputs: [TrustEventType.TEXT_DELETED, TrustEventType.BACKSPACE_BURST, TrustEventType.TEXT_INSERTED],
    calculation: '(deleted characters + backspaces) / inserted characters',
    interpretation:
      'Self-correction is evidence of authorship: people who write code fix typos, rename things and change their minds. Code that arrives already perfect was authored elsewhere.',
  },
  {
    name: 'typing.rewrite_count',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Substantial rewrites of regions the developer had already written.',
    inputs: [TrustEventType.REWRITE_DETECTED],
    calculation: 'count of REWRITE_DETECTED events',
    interpretation:
      'Revisiting and reworking existing code requires understanding it. Among the more reliable ownership signals in this layer.',
  },
  {
    name: 'typing.paste_volume_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Share of inserted characters that arrived by paste.',
    inputs: [TrustEventType.CODE_PASTE],
    calculation: 'pasted characters / all inserted characters',
    interpretation:
      'Explicitly NEUTRAL. Pasting is ubiquitous in real development. This feature exists to be combined with paste origin and subsequent modification, never to stand alone.',
  },
  {
    name: 'typing.internal_paste_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of pastes that originated inside the workspace.',
    inputs: [TrustEventType.CODE_PASTE],
    calculation: 'pastes with origin=internal / all pastes',
    interpretation:
      'Moving your own code around is ordinary refactoring and is supportive, not suspicious. This feature separates that from importation.',
  },
  {
    name: 'typing.unexplained_insertion_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.RISK_CONTRIBUTING,
    description:
      'Share of characters arriving in bulk insertions from outside the workspace, unaccounted for by editor completions.',
    inputs: [TrustEventType.LARGE_INSERTION, TrustEventType.CODE_PASTE],
    calculation:
      'characters from externally-originated large insertions / all inserted characters',
    interpretation:
      'The only risk-contributing feature in this layer, and it is meaningless alone. It becomes evidence only when corroborated by absent modification (Layer 07), no testing (Layer 05) and a failed explanation (Layer 09). A developer pasting a config block they wrote yesterday scores identically to one pasting a solution.',
  },
  {
    name: 'typing.insertion_baseline_multiple',
    layer: LAYER,
    kind: FeatureKind.INDEX,
    polarity: FeaturePolarity.CONTEXTUAL,
    description: 'Largest insertion as a multiple of this developer usual insertion size.',
    inputs: [TrustEventType.LARGE_INSERTION, TrustEventType.TEXT_INSERTED],
    calculation:
      'largest insertion characters / median insertion size, taken from the developer baseline when available and from this session otherwise',
    interpretation:
      'Relative by construction. A developer who always works in large blocks has a low multiple even for big insertions; one who normally types line by line does not. Without history the session median is used and confidence is reduced accordingly.',
  },
  {
    name: 'typing.pause_before_insertion_ms',
    layer: LAYER,
    kind: FeatureKind.DURATION,
    polarity: FeaturePolarity.CONTEXTUAL,
    description: 'Median pause immediately preceding a bulk insertion.',
    inputs: [TrustEventType.TYPING_PAUSE, TrustEventType.LARGE_INSERTION],
    calculation: 'median gap between the previous event and each large insertion',
    interpretation:
      'Context for Layer 06 correlation. A long pause before a large insertion is equally consistent with reading documentation, thinking, or being away — it is a question to ask, not an answer.',
  },
  {
    name: 'typing.rate_vs_baseline',
    layer: LAYER,
    kind: FeatureKind.INDEX,
    polarity: FeaturePolarity.CONTEXTUAL,
    description: 'Session typing rate as a multiple of the developer historical rate.',
    inputs: [TrustEventType.TYPING_BURST],
    calculation: 'session median chars/min / baseline median chars/min',
    interpretation:
      'Null when no history exists, which is the correct answer for a first session — it must never default to a population average, because that would penalise anyone atypical.',
  },
];

/** A bulk insertion is only unexplained when it came from outside the workspace. */
const EXTERNAL_ORIGINS = new Set(['external', 'unknown']);

export function extractTypingFeatures(
  window: SessionWindow,
  context: ExtractionContext,
): readonly Feature[] {
  const bursts = eventsOfType(window, TrustEventType.TYPING_BURST);
  const inserts = eventsOfType(window, TrustEventType.TEXT_INSERTED);
  const deletes = eventsOfType(window, TrustEventType.TEXT_DELETED);
  const backspaces = eventsOfType(window, TrustEventType.BACKSPACE_BURST);
  const pastes = eventsOfType(window, TrustEventType.CODE_PASTE);
  const largeInsertions = eventsOfType(window, TrustEventType.LARGE_INSERTION);
  const rewrites = eventsOfType(window, TrustEventType.REWRITE_DETECTED);
  const pauses = eventsOfType(window, TrustEventType.TYPING_PAUSE);

  const typedChars = sumField(bursts, 'charactersTyped');
  const pastedChars = sumField(pastes, 'charactersAdded');
  const bulkChars = sumField(largeInsertions, 'charactersAdded');
  const insertedChars = sumField(inserts, 'charactersAdded');
  // Prefer explicit insert accounting; fall back to burst + paste totals when
  // the sandbox reports only summaries.
  const totalInserted = Math.max(insertedChars, typedChars + pastedChars + bulkChars);

  const features: Feature[] = [];

  features.push(
    makeFeature({
      name: 'typing.characters_authored',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.NEUTRAL,
      value: typedChars,
      sampleSize: bursts.length,
      evidence: evidenceIds(bursts),
      note: `${typedChars} character(s) entered by keystroke across ${bursts.length} burst(s)`,
    }),
  );

  features.push(
    makeFeature({
      name: 'typing.authorship_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(typedChars, totalInserted),
      sampleSize: bursts.length + pastes.length + largeInsertions.length,
      evidence: evidenceIds(bursts, pastes, largeInsertions),
      note:
        totalInserted === 0
          ? 'No character insertions recorded'
          : `${((typedChars / totalInserted) * 100).toFixed(1)}% of inserted characters were typed by hand`,
    }),
  );

  const intervals = collectField(bursts, 'meanIntervalMs');
  const variability = coefficientOfVariation(intervals);
  features.push(
    makeFeature({
      name: 'typing.rhythm_variability',
      layer: LAYER,
      kind: FeatureKind.INDEX,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: variability,
      sampleSize: intervals.length,
      evidence: evidenceIds(bursts),
      note:
        variability === null
          ? 'Insufficient typing bursts to assess rhythm'
          : `Inter-keystroke rhythm varies by a factor of ${fmt(variability)} — human typing is irregular`,
    }),
  );

  const deletedChars = sumField(deletes, 'charactersRemoved') + sumField(backspaces, 'backspaceCount');
  features.push(
    makeFeature({
      name: 'typing.correction_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(deletedChars, totalInserted),
      sampleSize: deletes.length + backspaces.length,
      evidence: evidenceIds(deletes, backspaces),
      note: `${deletedChars} character(s) corrected against ${totalInserted} inserted — self-correction indicates authorship`,
    }),
  );

  features.push(
    makeFeature({
      name: 'typing.rewrite_count',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: rewrites.length,
      sampleSize: rewrites.length,
      evidence: evidenceIds(rewrites),
      note: `${rewrites.length} substantial rewrite(s) of existing code`,
    }),
  );

  features.push(
    makeFeature({
      name: 'typing.paste_volume_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.NEUTRAL,
      value: ratio(pastedChars, totalInserted),
      sampleSize: pastes.length,
      evidence: evidenceIds(pastes),
      note: `${pastes.length} paste(s) contributing ${pastedChars} character(s) — pasting is ordinary developer behaviour`,
    }),
  );

  const internalPastes = pastes.filter((event) => stringField(event, 'origin') === 'internal');
  features.push(
    makeFeature({
      name: 'typing.internal_paste_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(internalPastes.length, pastes.length),
      sampleSize: pastes.length,
      evidence: evidenceIds(internalPastes),
      note:
        pastes.length === 0
          ? 'No pastes recorded'
          : `${internalPastes.length} of ${pastes.length} paste(s) came from within the workspace`,
    }),
  );

  const externalBulk = largeInsertions.filter((event) => {
    const method = stringField(event, 'insertionMethod');
    // Completions are Layer 07's concern and are legitimate editor assistance;
    // they must not be counted as unexplained here.
    if (method === 'completion_accept') return false;

    // Correlate with a paste at the same place and moment to recover the
    // clipboard origin. Code the developer moved from elsewhere in their own
    // workspace is ordinary refactoring, not importation.
    const originPaste = pastes.find(
      (paste) =>
        Math.abs(paste.occurredAtNormalized - event.occurredAtNormalized) < 2000 &&
        stringField(paste, 'path') === stringField(event, 'path'),
    );
    if (originPaste === undefined) {
      // No correlated paste: treat as unexplained only if it also was not a
      // file import, which has its own legitimate meaning.
      return method !== 'file_import';
    }
    const origin = stringField(originPaste, 'origin');
    return origin === null || EXTERNAL_ORIGINS.has(origin);
  });
  const unexplainedChars = sumField(externalBulk, 'charactersAdded');
  features.push(
    makeFeature({
      name: 'typing.unexplained_insertion_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.RISK_CONTRIBUTING,
      value: ratio(unexplainedChars, totalInserted),
      sampleSize: largeInsertions.length,
      evidence: evidenceIds(externalBulk),
      note:
        externalBulk.length === 0
          ? 'No bulk insertions from outside the workspace'
          : `${externalBulk.length} bulk insertion(s) totalling ${unexplainedChars} character(s) originated outside the workspace — requires corroboration from other layers before it means anything`,
    }),
  );

  const insertionSizes = collectField(inserts, 'charactersAdded');
  const sessionMedianInsertion = median(insertionSizes);
  const baselineMedian = context.baseline?.medianInsertionChars ?? null;
  const referenceMedian = baselineMedian ?? sessionMedianInsertion;
  const largestInsertion = Math.max(
    0,
    ...largeInsertions.map((event) => numberField(event, 'charactersAdded') ?? 0),
  );
  const baselineMultiple =
    referenceMedian !== null && referenceMedian > 0 && largestInsertion > 0
      ? largestInsertion / referenceMedian
      : null;
  features.push(
    makeFeature({
      name: 'typing.insertion_baseline_multiple',
      layer: LAYER,
      kind: FeatureKind.INDEX,
      polarity: FeaturePolarity.CONTEXTUAL,
      value: baselineMultiple,
      sampleSize: largeInsertions.length,
      // Without history this is a within-session comparison only, which is a
      // materially weaker claim and must present itself as such.
      confidence: clampUnit(
        sampleConfidence(largeInsertions.length) * (baselineMedian === null ? 0.5 : 1),
      ),
      evidence: evidenceIds(largeInsertions, inserts),
      note:
        baselineMultiple === null
          ? 'No bulk insertions to compare against a baseline'
          : `Largest insertion was ${fmt(baselineMultiple)}x the ${baselineMedian === null ? 'session' : 'historical'} median insertion size`,
    }),
  );

  const preInsertionGaps: number[] = [];
  for (const insertion of largeInsertions) {
    const previous = window.events
      .filter((event) => event.occurredAtNormalized < insertion.occurredAtNormalized)
      .at(-1);
    if (previous !== undefined) {
      preInsertionGaps.push(insertion.occurredAtNormalized - previous.occurredAtNormalized);
    }
  }
  features.push(
    makeFeature({
      name: 'typing.pause_before_insertion_ms',
      layer: LAYER,
      kind: FeatureKind.DURATION,
      polarity: FeaturePolarity.CONTEXTUAL,
      value: median(preInsertionGaps),
      sampleSize: preInsertionGaps.length,
      evidence: evidenceIds(largeInsertions, pauses),
      note:
        preInsertionGaps.length === 0
          ? 'No bulk insertions to measure against'
          : `Median pause before a bulk insertion was ${fmtDuration(median(preInsertionGaps))}`,
    }),
  );

  const burstRates = bursts
    .map((event) => {
      const chars = numberField(event, 'charactersTyped');
      const duration = numberField(event, 'durationMs');
      return chars !== null && duration !== null && duration > 0
        ? (chars / duration) * 60_000
        : null;
    })
    .filter((value): value is number => value !== null);
  const sessionRate = median(burstRates);
  const baselineRate = context.baseline?.medianTypingRateCpm ?? null;
  features.push(
    makeFeature({
      name: 'typing.rate_vs_baseline',
      layer: LAYER,
      kind: FeatureKind.INDEX,
      polarity: FeaturePolarity.CONTEXTUAL,
      value:
        sessionRate !== null && baselineRate !== null && baselineRate > 0
          ? sessionRate / baselineRate
          : null,
      sampleSize: burstRates.length,
      evidence: evidenceIds(bursts),
      note:
        baselineRate === null
          ? `No historical typing baseline for this developer; session median was ${fmt(sessionRate, 0)} chars/min and is not being compared against anyone else`
          : `Session typing rate was ${fmt((sessionRate ?? 0) / baselineRate)}x this developer usual rate`,
    }),
  );

  return features;
}
