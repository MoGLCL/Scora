import { TrustEventType, TrustLayer } from '@scora/trust-core';
import { FeatureKind, FeaturePolarity } from "../contract.js";
import { coefficientOfVariation, collectField, evidenceIds, eventsOfType, fmt, fmtDuration, makeFeature, median, numberField, ratio, sumField, } from "../window.js";
/**
 * Layer 04 — Code Evolution.
 *
 * Looks at the trajectory of the work rather than the artefact at the end. The
 * central question is whether the code grew the way code grows when someone is
 * building it — incrementally, with false starts and revisions — or arrived in
 * finished form.
 *
 * Crucially, arriving in large pieces is not itself adverse. Developers who
 * plan before typing, or who transcribe a design worked out on paper, produce
 * exactly that shape. What distinguishes the cases is what happened around the
 * insertions: revision afterwards, testing, debugging, and the ability to
 * explain the result later.
 */
const LAYER = TrustLayer.CODE_EVOLUTION;
export const CODE_EVOLUTION_FEATURES = [
    {
        name: 'evolution.snapshot_count',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
        description: 'Number of workspace snapshots captured during the session.',
        inputs: [TrustEventType.CODE_SNAPSHOT],
        calculation: 'count of CODE_SNAPSHOT events',
        interpretation: 'Determines how finely the evolution can be reconstructed. Few snapshots mean weaker claims about how the code developed, in either direction.',
    },
    {
        name: 'evolution.increment_count',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Distinct diffs applied over the session.',
        inputs: [TrustEventType.CODE_DIFF_APPLIED],
        calculation: 'count of CODE_DIFF_APPLIED events',
        interpretation: 'Many small changes are the signature of code being built rather than delivered. Few large ones are not adverse but do warrant corroboration.',
    },
    {
        name: 'evolution.growth_smoothness',
        layer: LAYER,
        kind: FeatureKind.INDEX,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Evenness of code growth, as inverse variability of per-diff size.',
        inputs: [TrustEventType.CODE_DIFF_APPLIED],
        calculation: '1 / (1 + coefficient of variation of linesAdded per diff)',
        interpretation: 'Smooth growth is characteristic of incremental development. Lumpy growth is common and legitimate; it simply carries less independent weight.',
    },
    {
        name: 'evolution.largest_increment_share',
        layer: LAYER,
        kind: FeatureKind.RATIO,
        polarity: FeaturePolarity.CONTEXTUAL,
        description: 'Share of the final code introduced by the single largest change.',
        inputs: [TrustEventType.CODE_DIFF_APPLIED],
        calculation: 'largest diff linesAdded / total linesAdded',
        interpretation: 'A high share means most of the solution appeared at once. Only meaningful alongside what followed: substantial revision and testing afterwards make it unremarkable.',
    },
    {
        name: 'evolution.revision_ratio',
        layer: LAYER,
        kind: FeatureKind.RATIO,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Share of diffs that modified previously written code rather than only adding.',
        inputs: [TrustEventType.CODE_DIFF_APPLIED],
        calculation: 'diffs with linesRemoved > 0 / all diffs',
        interpretation: 'Going back and changing your own code requires understanding it. Purely additive sessions are compatible with transcription and merit a closer look at Layers 05 and 09.',
    },
    {
        name: 'evolution.refactor_count',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Structure-preserving transformations performed.',
        inputs: [TrustEventType.REFACTOR_DETECTED],
        calculation: 'count of REFACTOR_DETECTED events',
        interpretation: 'Refactoring is difficult to perform without understanding what the code does. One of the strongest ownership signals available before the interview.',
    },
    {
        name: 'evolution.post_insertion_revision_ratio',
        layer: LAYER,
        kind: FeatureKind.RATIO,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Share of bulk insertions that were subsequently edited by the developer.',
        inputs: [TrustEventType.LARGE_INSERTION, TrustEventType.CODE_DIFF_APPLIED],
        calculation: 'bulk insertions followed by a diff touching the same file within the session / all bulk insertions',
        interpretation: 'The mitigating counterpart to typing.unexplained_insertion_ratio. Code that arrived whole and was then reworked was engaged with; code that arrived whole and was never touched again was not.',
    },
    {
        name: 'evolution.development_span_ms',
        layer: LAYER,
        kind: FeatureKind.DURATION,
        polarity: FeaturePolarity.NEUTRAL,
        description: 'Time between the first and last code-changing event.',
        inputs: [TrustEventType.CODE_DIFF_APPLIED, TrustEventType.FILE_SAVED],
        calculation: 'last change timestamp - first change timestamp',
        interpretation: 'Descriptive. Fast completion is a sign of competence at least as often as anything else.',
    },
    {
        name: 'evolution.files_touched',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.NEUTRAL,
        description: 'Distinct files modified.',
        inputs: [TrustEventType.CODE_DIFF_APPLIED, TrustEventType.FILE_SAVED],
        calculation: 'count of distinct paths across change events',
        interpretation: 'Scope descriptor, used to normalise other features against task size.',
    },
];
export function extractCodeEvolutionFeatures(window, _context) {
    const snapshots = eventsOfType(window, TrustEventType.CODE_SNAPSHOT);
    const diffs = eventsOfType(window, TrustEventType.CODE_DIFF_APPLIED);
    const saves = eventsOfType(window, TrustEventType.FILE_SAVED);
    const refactors = eventsOfType(window, TrustEventType.REFACTOR_DETECTED);
    const largeInsertions = eventsOfType(window, TrustEventType.LARGE_INSERTION);
    const features = [];
    features.push(makeFeature({
        name: 'evolution.snapshot_count',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.CONFIDENCE_AFFECTING,
        value: snapshots.length,
        sampleSize: snapshots.length,
        evidence: evidenceIds(snapshots),
        note: `${snapshots.length} workspace snapshot(s) captured`,
    }));
    features.push(makeFeature({
        name: 'evolution.increment_count',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: diffs.length,
        sampleSize: diffs.length,
        evidence: evidenceIds(diffs),
        note: `${diffs.length} incremental change(s) applied`,
    }));
    const diffSizes = collectField(diffs, 'linesAdded');
    const variability = coefficientOfVariation(diffSizes);
    features.push(makeFeature({
        name: 'evolution.growth_smoothness',
        layer: LAYER,
        kind: FeatureKind.INDEX,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: variability === null ? null : 1 / (1 + variability),
        sampleSize: diffSizes.length,
        evidence: evidenceIds(diffs),
        note: variability === null
            ? 'Too few changes to assess growth pattern'
            : `Change sizes vary by a factor of ${fmt(variability)}; median change was ${fmt(median(diffSizes), 0)} line(s)`,
    }));
    const totalLinesAdded = sumField(diffs, 'linesAdded');
    const largestDiff = diffSizes.length > 0 ? Math.max(...diffSizes) : 0;
    features.push(makeFeature({
        name: 'evolution.largest_increment_share',
        layer: LAYER,
        polarity: FeaturePolarity.CONTEXTUAL,
        value: ratio(largestDiff, totalLinesAdded),
        sampleSize: diffs.length,
        evidence: evidenceIds(diffs),
        note: totalLinesAdded === 0
            ? 'No line-level changes recorded'
            : `Largest single change introduced ${((largestDiff / totalLinesAdded) * 100).toFixed(1)}% of all added lines`,
    }));
    const revisingDiffs = diffs.filter((event) => (numberField(event, 'linesRemoved') ?? 0) > 0);
    features.push(makeFeature({
        name: 'evolution.revision_ratio',
        layer: LAYER,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: ratio(revisingDiffs.length, diffs.length),
        sampleSize: diffs.length,
        evidence: evidenceIds(revisingDiffs),
        note: diffs.length === 0
            ? 'No diffs recorded'
            : `${revisingDiffs.length} of ${diffs.length} change(s) modified existing code rather than only adding`,
    }));
    features.push(makeFeature({
        name: 'evolution.refactor_count',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: refactors.length,
        sampleSize: refactors.length,
        evidence: evidenceIds(refactors),
        note: `${refactors.length} structure-preserving refactor(s) performed`,
    }));
    // A bulk insertion counts as revised when a later diff touched the same file.
    // This is the mitigating evidence that keeps a large paste from reading as
    // adverse when the developer actually worked with what they inserted.
    const revisedInsertions = largeInsertions.filter((insertion) => {
        const path = insertion.payload['path'];
        return diffs.some((diff) => diff.occurredAtNormalized > insertion.occurredAtNormalized &&
            diff.payload['path'] === path &&
            (numberField(diff, 'linesRemoved') ?? 0) > 0);
    });
    features.push(makeFeature({
        name: 'evolution.post_insertion_revision_ratio',
        layer: LAYER,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: ratio(revisedInsertions.length, largeInsertions.length),
        sampleSize: largeInsertions.length,
        evidence: evidenceIds(revisedInsertions, largeInsertions),
        note: largeInsertions.length === 0
            ? 'No bulk insertions to assess'
            : `${revisedInsertions.length} of ${largeInsertions.length} bulk insertion(s) were subsequently revised by the developer`,
    }));
    const changeEvents = [...diffs, ...saves].sort((a, b) => a.occurredAtNormalized - b.occurredAtNormalized);
    const first = changeEvents.at(0);
    const last = changeEvents.at(-1);
    const span = first !== undefined && last !== undefined
        ? last.occurredAtNormalized - first.occurredAtNormalized
        : null;
    features.push(makeFeature({
        name: 'evolution.development_span_ms',
        layer: LAYER,
        kind: FeatureKind.DURATION,
        polarity: FeaturePolarity.NEUTRAL,
        value: span,
        sampleSize: changeEvents.length,
        evidence: evidenceIds(diffs, saves),
        note: `Code changed over a span of ${fmtDuration(span)}`,
    }));
    const paths = new Set(changeEvents
        .map((event) => event.payload['path'])
        .filter((path) => typeof path === 'string'));
    features.push(makeFeature({
        name: 'evolution.files_touched',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.NEUTRAL,
        value: paths.size,
        sampleSize: changeEvents.length,
        evidence: evidenceIds(diffs, saves),
        note: `${paths.size} distinct file(s) modified`,
    }));
    return features;
}
//# sourceMappingURL=evolution.js.map