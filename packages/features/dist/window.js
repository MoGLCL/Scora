import { clampUnit, elapsed, } from '@scora/trust-core';
import { FeatureKind, FeaturePolarity } from "./contract.js";
export function buildSessionWindow(events) {
    const ordered = [...events].sort((a, b) => a.occurredAtNormalized - b.occurredAtNormalized || a.sequence - b.sequence);
    const byType = new Map();
    for (const event of ordered) {
        const bucket = byType.get(event.type);
        if (bucket === undefined)
            byType.set(event.type, [event]);
        else
            bucket.push(event);
    }
    const first = ordered.at(0);
    const last = ordered.at(-1);
    const startedAt = (first?.occurredAtNormalized ?? 0);
    const endedAt = (last?.occurredAtNormalized ?? 0);
    const durationMs = first !== undefined && last !== undefined ? elapsed(startedAt, endedAt) : 0;
    return {
        events: ordered,
        byType,
        startedAt,
        endedAt,
        durationMs,
        activeMs: computeActiveMs(ordered, durationMs),
    };
}
/** Subtracts declared idle periods and telemetry outages from wall-clock time. */
function computeActiveMs(events, durationMs) {
    let inactive = 0;
    for (const event of events) {
        switch (event.type) {
            case 'IDLE_PERIOD_DETECTED':
                inactive += numberField(event, 'idleMs') ?? 0;
                break;
            case 'SANDBOX_RECONNECTED':
                inactive += numberField(event, 'outageMs') ?? 0;
                break;
            case 'ENVIRONMENT_INTERRUPTION':
                inactive += numberField(event, 'evidenceGapMs') ?? 0;
                break;
            default:
                break;
        }
    }
    return Math.max(0, durationMs - inactive);
}
export function eventsOfType(window, ...types) {
    if (types.length === 1)
        return window.byType.get(types[0]) ?? [];
    const collected = [];
    for (const type of types)
        collected.push(...(window.byType.get(type) ?? []));
    return collected.sort((a, b) => a.occurredAtNormalized - b.occurredAtNormalized);
}
export function countOfType(window, ...types) {
    let total = 0;
    for (const type of types)
        total += window.byType.get(type)?.length ?? 0;
    return total;
}
export function numberField(event, key) {
    const value = event.payload[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function stringField(event, key) {
    const value = event.payload[key];
    return typeof value === 'string' ? value : null;
}
export function booleanField(event, key) {
    const value = event.payload[key];
    return typeof value === 'boolean' ? value : null;
}
export function sumField(events, key) {
    let total = 0;
    for (const event of events)
        total += numberField(event, key) ?? 0;
    return total;
}
export function collectField(events, key) {
    const values = [];
    for (const event of events) {
        const value = numberField(event, key);
        if (value !== null)
            values.push(value);
    }
    return values;
}
export function evidenceIds(...groups) {
    const ids = [];
    for (const group of groups)
        for (const event of group)
            ids.push(event.eventId);
    return ids;
}
export function sum(values) {
    let total = 0;
    for (const value of values)
        total += value;
    return total;
}
export function mean(values) {
    return values.length === 0 ? null : sum(values) / values.length;
}
export function median(values) {
    if (values.length === 0)
        return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
        : (sorted[middle] ?? 0);
}
export function standardDeviation(values) {
    if (values.length < 2)
        return null;
    const average = mean(values);
    const squaredDiffs = values.map((value) => (value - average) ** 2);
    return Math.sqrt(sum(squaredDiffs) / (values.length - 1));
}
/**
 * Coefficient of variation: spread relative to magnitude.
 *
 * Preferred over raw standard deviation whenever behaviour is compared across
 * developers, because a fast typist and a slow one have different absolute
 * variance while being equally consistent.
 */
export function coefficientOfVariation(values) {
    const average = mean(values);
    const deviation = standardDeviation(values);
    if (average === null || deviation === null || average === 0)
        return null;
    return deviation / Math.abs(average);
}
/** Safe division that returns null rather than NaN or Infinity. */
export function ratio(numerator, denominator) {
    return denominator === 0 ? null : numerator / denominator;
}
/**
 * Confidence from sample size, saturating.
 *
 * One observation supports a weak claim, ten support a solid one, and a hundred
 * add little beyond that. Chosen so a feature backed by a single event can
 * never present itself as certain.
 */
export function sampleConfidence(sampleSize, halfway = 6) {
    if (sampleSize <= 0)
        return clampUnit(0);
    return clampUnit(sampleSize / (sampleSize + halfway));
}
/** Confidence from how much of the session the evidence actually covers. */
export function coverageConfidence(coveredMs, totalMs) {
    if (totalMs <= 0)
        return clampUnit(0);
    return clampUnit(coveredMs / totalMs);
}
export function makeFeature(init) {
    return {
        name: init.name,
        layer: init.layer,
        kind: init.kind ?? FeatureKind.RATIO,
        polarity: init.polarity ?? FeaturePolarity.NEUTRAL,
        value: init.value,
        sampleSize: init.sampleSize,
        // A feature with no value has no confidence, whatever its sample size.
        confidence: init.value === null ? clampUnit(0) : (init.confidence ?? sampleConfidence(init.sampleSize)),
        evidence: init.evidence,
        note: init.note,
    };
}
/** Formats a number for the human-readable note attached to each feature. */
export function fmt(value, decimals = 2) {
    if (value === null)
        return 'n/a';
    return Number.isInteger(value) ? String(value) : value.toFixed(decimals);
}
export function fmtDuration(ms) {
    if (ms === null)
        return 'n/a';
    if (ms < 1000)
        return `${Math.round(ms)}ms`;
    if (ms < 60_000)
        return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3_600_000)
        return `${(ms / 60_000).toFixed(1)}min`;
    return `${(ms / 3_600_000).toFixed(1)}h`;
}
//# sourceMappingURL=window.js.map