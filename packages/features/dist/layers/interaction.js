import { TrustEventType, TrustLayer } from '@scora/trust-core';
import { FeatureKind, FeaturePolarity } from "../contract.js";
import { evidenceIds, eventsOfType, fmt, fmtDuration, makeFeature, median, numberField, ratio, stringField, sumField, } from "../window.js";
/**
 * Layer 02 — Interaction Behavior.
 *
 * Describes how the developer moved through the workspace. Every feature here
 * is SUPPORTIVE or NEUTRAL by construction: there is no interaction pattern
 * that constitutes evidence of wrongdoing. A developer who opens three files
 * is not more honest than one who opens thirty.
 *
 * The value of this layer is corroborative. Someone who navigated to
 * definitions, searched the codebase and read broadly before writing was
 * engaging with the problem — which is what makes a large later insertion
 * unremarkable rather than surprising.
 */
const LAYER = TrustLayer.INTERACTION;
export const INTERACTION_FEATURES = [
    {
        name: 'interaction.workspace_exploration',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Distinct files the developer opened during the session.',
        inputs: [TrustEventType.FILE_OPENED],
        calculation: 'count of distinct paths in FILE_OPENED events',
        interpretation: 'Reading the surrounding code before changing it is what an experienced developer does. Low values are not adverse — a single-file task needs no exploration.',
    },
    {
        name: 'interaction.navigation_depth',
        layer: LAYER,
        kind: FeatureKind.RATE,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Structural navigation jumps (go-to-definition, find references) per active hour.',
        inputs: [TrustEventType.NAVIGATION_JUMP],
        calculation: 'NAVIGATION_JUMP count / active hours',
        interpretation: 'Using go-to-definition requires knowing what you are looking for. Strong corroborating evidence of genuine engagement with unfamiliar code.',
    },
    {
        name: 'interaction.search_usage',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Workspace searches performed.',
        inputs: [TrustEventType.SEARCH_PERFORMED],
        calculation: 'count of SEARCH_PERFORMED events',
        interpretation: 'Searching indicates orientation within the codebase. Neutral-to-positive; its absence proves nothing.',
    },
    {
        name: 'interaction.reading_ratio',
        layer: LAYER,
        kind: FeatureKind.RATIO,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Share of interaction events that indicate reading rather than writing.',
        inputs: [
            TrustEventType.TEXT_SELECTED,
            TrustEventType.EDITOR_SCROLLED,
            TrustEventType.NAVIGATION_JUMP,
            TrustEventType.FILE_OPENED,
        ],
        calculation: 'reading-type events / all interaction events',
        interpretation: 'A developer who reads before and while writing is behaving normally. Very low values are worth noting only alongside other signals.',
    },
    {
        name: 'interaction.terminal_usage',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Commands executed in the sandbox terminal.',
        inputs: [TrustEventType.TERMINAL_COMMAND_ENTERED],
        calculation: 'count of TERMINAL_COMMAND_ENTERED events',
        interpretation: 'Running tooling directly indicates comfort with the environment. Absence is neutral — many tasks need no terminal.',
    },
    {
        name: 'interaction.verification_command_ratio',
        layer: LAYER,
        kind: FeatureKind.RATIO,
        polarity: FeaturePolarity.SUPPORTIVE,
        description: 'Share of terminal commands that were tests, builds or type checks.',
        inputs: [TrustEventType.TERMINAL_COMMAND_ENTERED],
        calculation: 'verification-verb commands / all commands',
        interpretation: 'Choosing to verify your own work, unprompted, is a strong ownership signal.',
    },
    {
        name: 'interaction.idle_ratio',
        layer: LAYER,
        kind: FeatureKind.RATIO,
        polarity: FeaturePolarity.NEUTRAL,
        description: 'Share of session time spent idle.',
        inputs: [TrustEventType.IDLE_PERIOD_DETECTED],
        calculation: 'sum(idleMs) / session duration',
        interpretation: 'Explicitly NEUTRAL. Thinking, reading a spec and taking breaks all register as idle. Long idles before correct code are as consistent with careful thought as with anything else.',
    },
    {
        name: 'interaction.median_idle_ms',
        layer: LAYER,
        kind: FeatureKind.DURATION,
        polarity: FeaturePolarity.CONTEXTUAL,
        description: 'Median length of an idle period.',
        inputs: [TrustEventType.IDLE_PERIOD_DETECTED],
        calculation: 'median(idleMs)',
        interpretation: 'Only meaningful in a cluster: a long idle immediately followed by a large unmodified insertion is worth a question. The same idle followed by incremental typing is not.',
    },
    {
        name: 'interaction.engagement_rate',
        layer: LAYER,
        kind: FeatureKind.RATE,
        polarity: FeaturePolarity.NEUTRAL,
        description: 'Interaction events per active minute.',
        inputs: [TrustEventType.FILE_OPENED, TrustEventType.PANEL_SWITCHED],
        calculation: 'all Layer 02 events / active minutes',
        interpretation: 'Descriptive baseline material. Working styles vary enormously; this exists to compare a developer against themselves over time.',
    },
];
/** Command verbs that indicate the developer verifying their own work. */
const VERIFICATION_VERBS = new Set([
    'test',
    'jest',
    'vitest',
    'mocha',
    'pytest',
    'npm',
    'pnpm',
    'yarn',
    'make',
    'tsc',
    'eslint',
    'lint',
    'build',
    'cargo',
    'go',
    'mvn',
    'gradle',
]);
/** Runner verbs that only indicate verification when a sub-command followed. */
const AMBIGUOUS_RUNNERS = new Set(['npm', 'pnpm', 'yarn', 'go', 'cargo']);
export function extractInteractionFeatures(window, _context) {
    const opened = eventsOfType(window, TrustEventType.FILE_OPENED);
    const created = eventsOfType(window, TrustEventType.FILE_CREATED);
    const jumps = eventsOfType(window, TrustEventType.NAVIGATION_JUMP);
    const searches = eventsOfType(window, TrustEventType.SEARCH_PERFORMED);
    const selections = eventsOfType(window, TrustEventType.TEXT_SELECTED);
    const scrolls = eventsOfType(window, TrustEventType.EDITOR_SCROLLED);
    const panels = eventsOfType(window, TrustEventType.PANEL_SWITCHED);
    const commands = eventsOfType(window, TrustEventType.TERMINAL_COMMAND_ENTERED);
    const idles = eventsOfType(window, TrustEventType.IDLE_PERIOD_DETECTED);
    const activeHours = window.activeMs / 3_600_000;
    const activeMinutes = window.activeMs / 60_000;
    const features = [];
    const distinctFiles = new Set([...opened, ...created]
        .map((event) => stringField(event, 'path'))
        .filter((path) => path !== null));
    features.push(makeFeature({
        name: 'interaction.workspace_exploration',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: distinctFiles.size,
        sampleSize: opened.length + created.length,
        evidence: evidenceIds(opened, created),
        note: `Developer worked across ${distinctFiles.size} distinct file(s)`,
    }));
    features.push(makeFeature({
        name: 'interaction.navigation_depth',
        layer: LAYER,
        kind: FeatureKind.RATE,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: activeHours > 0 ? jumps.length / activeHours : null,
        sampleSize: jumps.length,
        evidence: evidenceIds(jumps),
        note: `${jumps.length} structural navigation jump(s) over ${fmtDuration(window.activeMs)} of active time`,
    }));
    features.push(makeFeature({
        name: 'interaction.search_usage',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: searches.length,
        sampleSize: searches.length,
        evidence: evidenceIds(searches),
        note: `${searches.length} workspace search(es) performed`,
    }));
    const readingEvents = selections.length + scrolls.length + jumps.length + opened.length;
    const allInteraction = readingEvents + panels.length + commands.length + created.length;
    features.push(makeFeature({
        name: 'interaction.reading_ratio',
        layer: LAYER,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: ratio(readingEvents, allInteraction),
        sampleSize: allInteraction,
        evidence: evidenceIds(selections, scrolls, jumps, opened),
        note: `${readingEvents} of ${allInteraction} interaction event(s) indicate reading the code`,
    }));
    features.push(makeFeature({
        name: 'interaction.terminal_usage',
        layer: LAYER,
        kind: FeatureKind.COUNT,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: commands.length,
        sampleSize: commands.length,
        evidence: evidenceIds(commands),
        note: `${commands.length} terminal command(s) executed`,
    }));
    const verificationCommands = commands.filter((event) => {
        const verb = stringField(event, 'commandVerb')?.toLowerCase() ?? '';
        if (!VERIFICATION_VERBS.has(verb))
            return false;
        // `npm` alone says nothing; `npm test` does. Where the sandbox reports only
        // a verb, count unambiguous test runners and treat generic runners as
        // verification only when the argument count suggests a sub-command.
        if (AMBIGUOUS_RUNNERS.has(verb)) {
            const argumentCount = numberField(event, 'argumentCount') ?? 0;
            return argumentCount > 0;
        }
        return true;
    });
    features.push(makeFeature({
        name: 'interaction.verification_command_ratio',
        layer: LAYER,
        polarity: FeaturePolarity.SUPPORTIVE,
        value: ratio(verificationCommands.length, commands.length),
        sampleSize: commands.length,
        evidence: evidenceIds(verificationCommands),
        note: commands.length === 0
            ? 'No terminal commands were run'
            : `${verificationCommands.length} of ${commands.length} command(s) were tests, builds or checks`,
    }));
    const idleMs = sumField(idles, 'idleMs');
    features.push(makeFeature({
        name: 'interaction.idle_ratio',
        layer: LAYER,
        polarity: FeaturePolarity.NEUTRAL,
        value: window.durationMs > 0 ? Math.min(1, idleMs / window.durationMs) : null,
        sampleSize: idles.length,
        evidence: evidenceIds(idles),
        note: `${fmtDuration(idleMs)} idle across ${idles.length} period(s) — thinking and reading register as idle`,
    }));
    const idleDurations = idles
        .map((event) => numberField(event, 'idleMs'))
        .filter((value) => value !== null);
    features.push(makeFeature({
        name: 'interaction.median_idle_ms',
        layer: LAYER,
        kind: FeatureKind.DURATION,
        polarity: FeaturePolarity.CONTEXTUAL,
        value: median(idleDurations),
        sampleSize: idleDurations.length,
        evidence: evidenceIds(idles),
        note: `Median idle period ${fmtDuration(median(idleDurations))}`,
    }));
    features.push(makeFeature({
        name: 'interaction.engagement_rate',
        layer: LAYER,
        kind: FeatureKind.RATE,
        polarity: FeaturePolarity.NEUTRAL,
        value: activeMinutes > 0 ? allInteraction / activeMinutes : null,
        sampleSize: allInteraction,
        evidence: evidenceIds(opened, panels),
        note: `${fmt(activeMinutes > 0 ? allInteraction / activeMinutes : null)} interaction event(s) per active minute`,
    }));
    return features;
}
//# sourceMappingURL=interaction.js.map