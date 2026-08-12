import {
  type DeveloperId,
  type EpochMs,
  type EventId,
  type SessionId,
  type TaskId,
  type TenantId,
  type TrustEvent,
  type TrustEventType,
  type Unit,
  clampUnit,
  elapsed,
} from '@scora/trust-core';
import { FeatureKind, FeaturePolarity, type Feature } from './contract.ts';

/**
 * A session's events, indexed once and reused by every extractor.
 *
 * Extractors run over the same stream dozens of times; bucketing by type once
 * turns each of those passes into a map lookup. It also gives every extractor
 * the same view of the session, so two features can never disagree about what
 * the timeline was.
 */
export interface SessionWindow {
  readonly events: readonly TrustEvent[];
  readonly byType: ReadonlyMap<TrustEventType, readonly TrustEvent[]>;
  readonly startedAt: EpochMs;
  readonly endedAt: EpochMs;
  readonly durationMs: number;
  /**
   * Session time minus periods where telemetry was absent or the developer was
   * demonstrably away. Rates are computed against this rather than wall-clock,
   * so a developer who took a lunch break does not read as inactive.
   */
  readonly activeMs: number;
}

export interface ExtractionContext {
  readonly tenantId: TenantId;
  readonly sessionId: SessionId;
  readonly developerId: DeveloperId;
  readonly taskId?: TaskId | undefined;
  /**
   * The developer's own historical behaviour, when available.
   *
   * Layer 03 in particular is meaningless without it: typing speed only carries
   * information relative to how this person normally types. Extractors must
   * degrade gracefully when it is absent — falling back to within-session
   * comparison and reporting lower confidence — because a first-time developer
   * has no history and must not be penalised for that.
   */
  readonly baseline?: DeveloperBaseline | undefined;
}

/**
 * Minimal baseline shape consumed by extractors.
 *
 * Declared here rather than imported so that `packages/baseline` depends on
 * features and not the reverse; features must remain computable without it.
 */
export interface DeveloperBaseline {
  readonly developerId: DeveloperId;
  readonly sessionsObserved: number;
  readonly medianTypingRateCpm: number | null;
  readonly medianInsertionChars: number | null;
  readonly medianCorrectionRatio: number | null;
  readonly medianSuggestionAcceptanceRate: number | null;
  readonly medianErrorRecoveryMs: number | null;
}

export function buildSessionWindow(events: readonly TrustEvent[]): SessionWindow {
  const ordered = [...events].sort(
    (a, b) => a.occurredAtNormalized - b.occurredAtNormalized || a.sequence - b.sequence,
  );

  const byType = new Map<TrustEventType, TrustEvent[]>();
  for (const event of ordered) {
    const bucket = byType.get(event.type);
    if (bucket === undefined) byType.set(event.type, [event]);
    else bucket.push(event);
  }

  const first = ordered.at(0);
  const last = ordered.at(-1);
  const startedAt = (first?.occurredAtNormalized ?? 0) as EpochMs;
  const endedAt = (last?.occurredAtNormalized ?? 0) as EpochMs;
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
function computeActiveMs(events: readonly TrustEvent[], durationMs: number): number {
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

export function eventsOfType(
  window: SessionWindow,
  ...types: readonly TrustEventType[]
): readonly TrustEvent[] {
  if (types.length === 1) return window.byType.get(types[0]!) ?? [];
  const collected: TrustEvent[] = [];
  for (const type of types) collected.push(...(window.byType.get(type) ?? []));
  return collected.sort((a, b) => a.occurredAtNormalized - b.occurredAtNormalized);
}

export function countOfType(window: SessionWindow, ...types: readonly TrustEventType[]): number {
  let total = 0;
  for (const type of types) total += window.byType.get(type)?.length ?? 0;
  return total;
}

export function numberField(event: TrustEvent, key: string): number | null {
  const value = event.payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function stringField(event: TrustEvent, key: string): string | null {
  const value = event.payload[key];
  return typeof value === 'string' ? value : null;
}

export function booleanField(event: TrustEvent, key: string): boolean | null {
  const value = event.payload[key];
  return typeof value === 'boolean' ? value : null;
}

export function sumField(events: readonly TrustEvent[], key: string): number {
  let total = 0;
  for (const event of events) total += numberField(event, key) ?? 0;
  return total;
}

export function collectField(events: readonly TrustEvent[], key: string): number[] {
  const values: number[] = [];
  for (const event of events) {
    const value = numberField(event, key);
    if (value !== null) values.push(value);
  }
  return values;
}

export function evidenceIds(...groups: readonly (readonly TrustEvent[])[]): readonly EventId[] {
  const ids: EventId[] = [];
  for (const group of groups) for (const event of group) ids.push(event.eventId);
  return ids;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

export function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : sum(values) / values.length;
}

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

export function standardDeviation(values: readonly number[]): number | null {
  if (values.length < 2) return null;
  const average = mean(values)!;
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
export function coefficientOfVariation(values: readonly number[]): number | null {
  const average = mean(values);
  const deviation = standardDeviation(values);
  if (average === null || deviation === null || average === 0) return null;
  return deviation / Math.abs(average);
}

/** Safe division that returns null rather than NaN or Infinity. */
export function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

/**
 * Confidence from sample size, saturating.
 *
 * One observation supports a weak claim, ten support a solid one, and a hundred
 * add little beyond that. Chosen so a feature backed by a single event can
 * never present itself as certain.
 */
export function sampleConfidence(sampleSize: number, halfway = 6): Unit {
  if (sampleSize <= 0) return clampUnit(0);
  return clampUnit(sampleSize / (sampleSize + halfway));
}

/** Confidence from how much of the session the evidence actually covers. */
export function coverageConfidence(coveredMs: number, totalMs: number): Unit {
  if (totalMs <= 0) return clampUnit(0);
  return clampUnit(coveredMs / totalMs);
}

export interface FeatureInit {
  readonly name: string;
  readonly layer: Feature['layer'];
  readonly kind?: FeatureKind;
  readonly polarity?: FeaturePolarity;
  readonly value: number | null;
  readonly sampleSize: number;
  readonly evidence: readonly EventId[];
  readonly note: string;
  /** Overrides the sample-size-derived confidence when a better estimate exists. */
  readonly confidence?: Unit;
}

export function makeFeature(init: FeatureInit): Feature {
  return {
    name: init.name,
    layer: init.layer,
    kind: init.kind ?? FeatureKind.RATIO,
    polarity: init.polarity ?? FeaturePolarity.NEUTRAL,
    value: init.value,
    sampleSize: init.sampleSize,
    // A feature with no value has no confidence, whatever its sample size.
    confidence:
      init.value === null ? clampUnit(0) : (init.confidence ?? sampleConfidence(init.sampleSize)),
    evidence: init.evidence,
    note: init.note,
  };
}

/** Formats a number for the human-readable note attached to each feature. */
export function fmt(value: number | null, decimals = 2): string {
  if (value === null) return 'n/a';
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals);
}

export function fmtDuration(ms: number | null): string {
  if (ms === null) return 'n/a';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}
