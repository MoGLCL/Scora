import type { Brand } from './brand.ts';
import { err, ok, type Result } from './result.ts';

/** Milliseconds since the Unix epoch, UTC. */
export type EpochMs = Brand<number, 'EpochMs'>;

/** A non-negative span of milliseconds. */
export type DurationMs = Brand<number, 'DurationMs'>;

export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;

/** 2020-01-01T00:00:00Z. An assessment timestamp before this is a broken or forged clock. */
const MIN_PLAUSIBLE_EPOCH_MS = 1_577_836_800_000;
/** 2100-01-01T00:00:00Z. */
const MAX_PLAUSIBLE_EPOCH_MS = 4_102_444_800_000;

export type TimeIssue = {
  readonly code: 'NOT_A_NUMBER' | 'IMPLAUSIBLE_TIMESTAMP' | 'NEGATIVE_DURATION';
  readonly received: unknown;
};

export function toEpochMs(value: unknown): Result<EpochMs, TimeIssue> {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return err({ code: 'NOT_A_NUMBER', received: value });
  }
  if (value < MIN_PLAUSIBLE_EPOCH_MS || value > MAX_PLAUSIBLE_EPOCH_MS) {
    return err({ code: 'IMPLAUSIBLE_TIMESTAMP', received: value });
  }
  return ok(value as EpochMs);
}

/** For timestamps from trusted sources (the server clock, a database row). */
export function unsafeEpochMs(value: number): EpochMs {
  return value as EpochMs;
}

export function toDurationMs(value: unknown): Result<DurationMs, TimeIssue> {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return err({ code: 'NOT_A_NUMBER', received: value });
  }
  if (value < 0) {
    return err({ code: 'NEGATIVE_DURATION', received: value });
  }
  return ok(value as DurationMs);
}

/** Absolute distance between two instants, so argument order can never produce a negative span. */
export function elapsed(from: EpochMs, to: EpochMs): DurationMs {
  return Math.abs(to - from) as DurationMs;
}

export function addMs(instant: EpochMs, offset: number): EpochMs {
  return (instant + offset) as EpochMs;
}

export function isWithin(instant: EpochMs, from: EpochMs, to: EpochMs): boolean {
  return instant >= from && instant <= to;
}

/**
 * Clock-offset estimate between a sandbox client and the server.
 *
 * Every timestamp the sandbox reports is written against a clock the engine
 * does not control and cannot trust. Two sessions cannot be compared, and no
 * "the developer paused for 40 seconds" claim can be defended, without knowing
 * how far that clock drifted. A large or jumping `offsetMs` is itself a
 * Layer 01 signal.
 */
export interface ClockSync {
  readonly clientSentAt: EpochMs;
  readonly serverReceivedAt: EpochMs;
  readonly serverSentAt: EpochMs;
  readonly clientReceivedAt: EpochMs;
  /** Positive when the client clock runs ahead of the server. */
  readonly offsetMs: number;
  readonly roundTripMs: DurationMs;
}

/**
 * NTP-style offset estimation from a single request/response exchange.
 *
 * offset = ((t1 - t0) + (t2 - t3)) / 2, roundTrip = (t3 - t0) - (t2 - t1),
 * where t0/t3 are client-side and t1/t2 are server-side. Accuracy degrades with
 * asymmetric network paths, so `roundTripMs` should be carried alongside the
 * offset and treated as its error bar rather than discarded.
 */
export function estimateClockSync(samples: {
  readonly clientSentAt: EpochMs;
  readonly serverReceivedAt: EpochMs;
  readonly serverSentAt: EpochMs;
  readonly clientReceivedAt: EpochMs;
}): ClockSync {
  const { clientSentAt, serverReceivedAt, serverSentAt, clientReceivedAt } = samples;
  const offsetMs =
    ((serverReceivedAt - clientSentAt) + (serverSentAt - clientReceivedAt)) / 2;
  const roundTrip = (clientReceivedAt - clientSentAt) - (serverSentAt - serverReceivedAt);
  return {
    clientSentAt,
    serverReceivedAt,
    serverSentAt,
    clientReceivedAt,
    // The sign convention above yields server-ahead-of-client; invert so that
    // positive means the client clock is ahead, which reads more naturally.
    offsetMs: -offsetMs,
    roundTripMs: Math.max(0, roundTrip) as DurationMs,
  };
}

/** Rebases a client-reported instant onto the server timeline. */
export function correctClientTimestamp(clientInstant: EpochMs, offsetMs: number): EpochMs {
  return (clientInstant - offsetMs) as EpochMs;
}
