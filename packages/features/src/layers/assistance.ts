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
  mean,
  median,
  numberField,
  ratio,
  stringField,
  sumField,
} from '../window.ts';

/**
 * Layer 07 — Editor Assistance & Dependency.
 *
 * The SCORA sandbox is a professional editor with completions and inline
 * suggestions, in the manner of VS Code with IntelliSense. There is no
 * conversational assistant: the developer cannot ask it to write a function,
 * fix a file or produce a solution. Every event in this layer therefore
 * describes *editor-level* assistance around code the developer is already
 * writing.
 *
 * Accepting completions is completely normal — most professional development
 * happens with them switched on. The question this layer answers is not "did
 * they use assistance" but "were they in control of it":
 *
 *   assisted    accept → modify → test → understand
 *   dependent   accept → leave untouched → never verify → cannot explain
 *
 * Only the *dependency* feature is risk-contributing, and even that requires
 * corroboration from Layers 05, 08 and 09 before it means anything.
 */

const LAYER = TrustLayer.AI_ASSISTANCE;

export const ASSISTANCE_FEATURES: readonly FeatureDefinition[] = [
  {
    name: 'assist.suggestions_shown',
    layer: LAYER,
    kind: FeatureKind.COUNT,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Completion and inline suggestions the editor displayed.',
    inputs: [TrustEventType.AI_SUGGESTION_SHOWN, TrustEventType.INLINE_COMPLETION_SHOWN],
    calculation: 'count of suggestion-shown and inline-completion-shown events',
    interpretation:
      'Purely descriptive. The editor decides what to show; the developer does not control this and must never be judged on it.',
  },
  {
    name: 'assist.acceptance_rate',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Share of shown suggestions that were accepted.',
    inputs: [
      TrustEventType.AI_SUGGESTION_SHOWN,
      TrustEventType.AI_SUGGESTION_ACCEPTED,
      TrustEventType.INLINE_COMPLETION_SHOWN,
      TrustEventType.INLINE_COMPLETION_ACCEPTED,
    ],
    calculation: 'accepted suggestions / shown suggestions',
    interpretation:
      'Explicitly NEUTRAL. A high acceptance rate means the completions were good, which is a property of the editor. It is not a measure of the developer.',
  },
  {
    name: 'assist.rejection_rate',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of shown suggestions the developer declined.',
    inputs: [TrustEventType.AI_SUGGESTION_REJECTED, TrustEventType.INLINE_COMPLETION_REJECTED],
    calculation: 'rejected suggestions / shown suggestions',
    interpretation:
      'Deciding a suggestion is wrong requires understanding what it would do. Discrimination is a positive signal.',
  },
  {
    name: 'assist.selective_acceptance_rate',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of accepted suggestions taken only in part.',
    inputs: [
      TrustEventType.AI_SUGGESTION_PARTIALLY_ACCEPTED,
      TrustEventType.AI_SUGGESTION_ACCEPTED,
    ],
    calculation: 'partial acceptances / all acceptances',
    interpretation:
      'Taking half a completion and writing the rest yourself is strong evidence of reading it. Among the better ownership signals in this layer.',
  },
  {
    name: 'assist.modification_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Mean share of accepted suggestion content the developer subsequently changed.',
    inputs: [TrustEventType.AI_SUGGESTION_MODIFIED],
    calculation: 'mean(modificationRatio) across modified suggestions',
    interpretation:
      'The central quantity separating assisted from dependent use. Code that was accepted and then reshaped was engaged with.',
  },
  {
    name: 'assist.post_acceptance_engagement_rate',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description:
      'Share of accepted suggestions that were afterwards modified, deleted or tested.',
    inputs: [
      TrustEventType.AI_SUGGESTION_ACCEPTED,
      TrustEventType.AI_SUGGESTION_MODIFIED,
      TrustEventType.AI_SUGGESTION_DELETED,
      TrustEventType.AI_SUGGESTION_TESTED,
    ],
    calculation:
      'distinct suggestionIds appearing in a modified, deleted or tested event / distinct accepted suggestionIds',
    interpretation:
      'The headline feature of this layer. Doing something with a suggestion after taking it — even deleting it — shows the developer was evaluating rather than accumulating.',
  },
  {
    name: 'assist.verification_rate',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.SUPPORTIVE,
    description: 'Share of accepted suggestions that were executed or tested.',
    inputs: [TrustEventType.AI_SUGGESTION_TESTED, TrustEventType.AI_SUGGESTION_ACCEPTED],
    calculation: 'distinct tested suggestionIds / distinct accepted suggestionIds',
    interpretation:
      'Checking that accepted code actually works is basic professional discipline and is credited as such.',
  },
  {
    name: 'assist.median_deliberation_ms',
    layer: LAYER,
    kind: FeatureKind.DURATION,
    polarity: FeaturePolarity.CONTEXTUAL,
    description: 'Median time between a suggestion appearing and being accepted.',
    inputs: [TrustEventType.AI_SUGGESTION_ACCEPTED, TrustEventType.INLINE_COMPLETION_ACCEPTED],
    calculation: 'median(deliberationMs) across acceptances',
    interpretation:
      'Very short times on single-token completions are entirely normal — that is how autocomplete works. The same speed on a multi-line block means it was not read. Interpretation therefore depends on the size of what was accepted.',
  },
  {
    name: 'assist.assisted_character_ratio',
    layer: LAYER,
    kind: FeatureKind.RATIO,
    polarity: FeaturePolarity.NEUTRAL,
    description: 'Share of inserted characters that came from accepted suggestions.',
    inputs: [
      TrustEventType.AI_SUGGESTION_ACCEPTED,
      TrustEventType.INLINE_COMPLETION_ACCEPTED,
      TrustEventType.TYPING_BURST,
    ],
    calculation: 'accepted suggestion characters / (typed + accepted characters)',
    interpretation:
      'NEUTRAL by policy. This is the number a naive system would misuse as an "AI percentage". It describes tooling usage, not trustworthiness, and is reported only to give the engagement features a denominator.',
  },
  {
    name: 'assist.dependency_index',
    layer: LAYER,
    kind: FeatureKind.INDEX,
    polarity: FeaturePolarity.RISK_CONTRIBUTING,
    description:
      'Degree to which large accepted suggestions were taken instantly and never engaged with.',
    inputs: [
      TrustEventType.AI_SUGGESTION_ACCEPTED,
      TrustEventType.AI_SUGGESTION_MODIFIED,
      TrustEventType.AI_SUGGESTION_TESTED,
    ],
    calculation:
      'share of accepted suggestions that were multi-line, accepted below a deliberation floor, and never modified, deleted or tested',
    interpretation:
      'The only risk-contributing feature in this layer, and conjunctive by design: it requires a substantial suggestion AND near-instant acceptance AND no subsequent engagement. Accepting completions quickly is otherwise entirely normal. Must still be corroborated by Layer 08 or 09 — the interview is where understanding is genuinely established.',
  },
];

/**
 * Below this, a multi-line acceptance was almost certainly not read.
 *
 * Generous on purpose: experienced developers do recognise a correct completion
 * quickly, and this must not catch them. It exists to identify acceptance
 * faster than reading is physically possible for a block of code.
 */
const DELIBERATION_FLOOR_MS = 400;

/** Line count above which a suggestion is substantial rather than a token. */
const SUBSTANTIAL_LINES = 3;

export function extractAssistanceFeatures(
  window: SessionWindow,
  _context: ExtractionContext,
): readonly Feature[] {
  const shown = eventsOfType(window, TrustEventType.AI_SUGGESTION_SHOWN);
  const inlineShown = eventsOfType(window, TrustEventType.INLINE_COMPLETION_SHOWN);
  const accepted = eventsOfType(window, TrustEventType.AI_SUGGESTION_ACCEPTED);
  const inlineAccepted = eventsOfType(window, TrustEventType.INLINE_COMPLETION_ACCEPTED);
  const rejected = eventsOfType(window, TrustEventType.AI_SUGGESTION_REJECTED);
  const inlineRejected = eventsOfType(window, TrustEventType.INLINE_COMPLETION_REJECTED);
  const partial = eventsOfType(window, TrustEventType.AI_SUGGESTION_PARTIALLY_ACCEPTED);
  const modified = eventsOfType(window, TrustEventType.AI_SUGGESTION_MODIFIED);
  const deleted = eventsOfType(window, TrustEventType.AI_SUGGESTION_DELETED);
  const tested = eventsOfType(window, TrustEventType.AI_SUGGESTION_TESTED);
  const bursts = eventsOfType(window, TrustEventType.TYPING_BURST);

  const totalShown = shown.length + inlineShown.length;
  const totalAccepted = accepted.length + inlineAccepted.length;
  const totalRejected = rejected.length + inlineRejected.length;

  const features: Feature[] = [];

  features.push(
    makeFeature({
      name: 'assist.suggestions_shown',
      layer: LAYER,
      kind: FeatureKind.COUNT,
      polarity: FeaturePolarity.NEUTRAL,
      value: totalShown,
      sampleSize: totalShown,
      evidence: evidenceIds(shown, inlineShown),
      note: `Editor displayed ${totalShown} suggestion(s) — the editor chooses this, not the developer`,
    }),
  );

  features.push(
    makeFeature({
      name: 'assist.acceptance_rate',
      layer: LAYER,
      polarity: FeaturePolarity.NEUTRAL,
      value: ratio(totalAccepted, totalShown),
      sampleSize: totalShown,
      evidence: evidenceIds(accepted, inlineAccepted),
      note:
        totalShown === 0
          ? 'No suggestions were shown'
          : `${totalAccepted} of ${totalShown} suggestion(s) accepted — normal editor usage, not a trust signal`,
    }),
  );

  features.push(
    makeFeature({
      name: 'assist.rejection_rate',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(totalRejected, totalShown),
      sampleSize: totalShown,
      evidence: evidenceIds(rejected, inlineRejected, shown, inlineShown),
      note:
        totalShown === 0
          ? 'No suggestions were shown'
          : `${totalRejected} of ${totalShown} suggestion(s) declined — judging a suggestion wrong requires understanding it`,
    }),
  );

  features.push(
    makeFeature({
      name: 'assist.selective_acceptance_rate',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(partial.length, totalAccepted + partial.length),
      sampleSize: totalAccepted + partial.length,
      evidence: evidenceIds(partial, accepted),
      note:
        partial.length === 0
          ? 'No partial acceptances recorded'
          : `${partial.length} suggestion(s) were accepted only in part`,
    }),
  );

  const modificationRatios = collectField(modified, 'modificationRatio');
  features.push(
    makeFeature({
      name: 'assist.modification_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: mean(modificationRatios),
      sampleSize: modificationRatios.length,
      evidence: evidenceIds(modified),
      note:
        modificationRatios.length === 0
          ? 'No accepted suggestions were modified'
          : `Developer changed an average of ${((mean(modificationRatios) ?? 0) * 100).toFixed(0)}% of each modified suggestion`,
    }),
  );

  const acceptedIds = new Set(
    accepted
      .map((event) => stringField(event, 'suggestionId'))
      .filter((id): id is string => id !== null),
  );
  const engagedIds = new Set(
    [...modified, ...deleted, ...tested]
      .map((event) => stringField(event, 'suggestionId'))
      .filter((id): id is string => id !== null),
  );
  const engagedWithAccepted = [...engagedIds].filter((id) => acceptedIds.has(id));
  features.push(
    makeFeature({
      name: 'assist.post_acceptance_engagement_rate',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(engagedWithAccepted.length, acceptedIds.size),
      sampleSize: acceptedIds.size,
      evidence: evidenceIds(modified, deleted, tested, accepted),
      note:
        acceptedIds.size === 0
          ? 'No completion suggestions were accepted'
          : `${engagedWithAccepted.length} of ${acceptedIds.size} accepted suggestion(s) were later modified, deleted or tested`,
    }),
  );

  const testedIds = new Set(
    tested
      .map((event) => stringField(event, 'suggestionId'))
      .filter((id): id is string => id !== null),
  );
  const verifiedAccepted = [...testedIds].filter((id) => acceptedIds.has(id));
  features.push(
    makeFeature({
      name: 'assist.verification_rate',
      layer: LAYER,
      polarity: FeaturePolarity.SUPPORTIVE,
      value: ratio(verifiedAccepted.length, acceptedIds.size),
      sampleSize: acceptedIds.size,
      evidence: evidenceIds(tested, accepted),
      note:
        acceptedIds.size === 0
          ? 'No completion suggestions were accepted'
          : `${verifiedAccepted.length} of ${acceptedIds.size} accepted suggestion(s) were executed or tested`,
    }),
  );

  const deliberations = [
    ...collectField(accepted, 'deliberationMs'),
    ...collectField(inlineAccepted, 'deliberationMs'),
  ];
  features.push(
    makeFeature({
      name: 'assist.median_deliberation_ms',
      layer: LAYER,
      kind: FeatureKind.DURATION,
      polarity: FeaturePolarity.CONTEXTUAL,
      value: median(deliberations),
      sampleSize: deliberations.length,
      evidence: evidenceIds(accepted, inlineAccepted),
      note:
        deliberations.length === 0
          ? 'No acceptances to measure'
          : `Median ${fmtDuration(median(deliberations))} between a suggestion appearing and being accepted — fast acceptance of short completions is normal`,
    }),
  );

  const assistedChars =
    sumField(accepted, 'charactersAccepted') +
    sumField(inlineAccepted, 'charactersAccepted') +
    sumField(partial, 'charactersAccepted');
  const typedChars = sumField(bursts, 'charactersTyped');
  features.push(
    makeFeature({
      name: 'assist.assisted_character_ratio',
      layer: LAYER,
      polarity: FeaturePolarity.NEUTRAL,
      value: ratio(assistedChars, assistedChars + typedChars),
      sampleSize: totalAccepted + bursts.length,
      // Typed characters are the denominator, so the bursts are part of the
      // evidence for this ratio just as much as the acceptances are.
      evidence: evidenceIds(accepted, inlineAccepted, partial, bursts),
      note: `${assistedChars} character(s) from completions against ${typedChars} typed — describes tooling usage, not trustworthiness`,
    }),
  );

  // Dependency requires all three conditions together. Any one alone describes
  // an ordinary developer using an ordinary editor.
  const dependentAcceptances = accepted.filter((event) => {
    const lines = numberField(event, 'linesAccepted') ?? 0;
    const deliberation = numberField(event, 'deliberationMs') ?? Number.POSITIVE_INFINITY;
    const id = stringField(event, 'suggestionId');
    const substantial = lines >= SUBSTANTIAL_LINES;
    const instant = deliberation < DELIBERATION_FLOOR_MS;
    const unengaged = id === null || !engagedIds.has(id);
    return substantial && instant && unengaged;
  });
  features.push(
    makeFeature({
      name: 'assist.dependency_index',
      layer: LAYER,
      kind: FeatureKind.INDEX,
      polarity: FeaturePolarity.RISK_CONTRIBUTING,
      value: ratio(dependentAcceptances.length, accepted.length),
      sampleSize: accepted.length,
      evidence: evidenceIds(dependentAcceptances.length > 0 ? dependentAcceptances : accepted),
      note:
        dependentAcceptances.length === 0
          ? 'No suggestions were accepted instantly and left unexamined'
          : `${dependentAcceptances.length} of ${accepted.length} accepted suggestion(s) were substantial, taken in under ${fmt(DELIBERATION_FLOOR_MS, 0)}ms and never engaged with — requires corroboration from the interview`,
    }),
  );

  return features;
}
