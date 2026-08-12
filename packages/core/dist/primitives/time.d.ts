import type { Brand } from './brand.ts';
import { type Result } from './result.ts';
/** Milliseconds since the Unix epoch, UTC. */
export type EpochMs = Brand<number, 'EpochMs'>;
/** A non-negative span of milliseconds. */
export type DurationMs = Brand<number, 'DurationMs'>;
export declare const MS_PER_SECOND = 1000;
export declare const MS_PER_MINUTE = 60000;
export declare const MS_PER_HOUR = 3600000;
export declare const MS_PER_DAY = 86400000;
export type TimeIssue = {
    readonly code: 'NOT_A_NUMBER' | 'IMPLAUSIBLE_TIMESTAMP' | 'NEGATIVE_DURATION';
    readonly received: unknown;
};
export declare function toEpochMs(value: unknown): Result<EpochMs, TimeIssue>;
/** For timestamps from trusted sources (the server clock, a database row). */
export declare function unsafeEpochMs(value: number): EpochMs;
export declare function toDurationMs(value: unknown): Result<DurationMs, TimeIssue>;
/** Absolute distance between two instants, so argument order can never produce a negative span. */
export declare function elapsed(from: EpochMs, to: EpochMs): DurationMs;
export declare function addMs(instant: EpochMs, offset: number): EpochMs;
export declare function isWithin(instant: EpochMs, from: EpochMs, to: EpochMs): boolean;
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
export declare function estimateClockSync(samples: {
    readonly clientSentAt: EpochMs;
    readonly serverReceivedAt: EpochMs;
    readonly serverSentAt: EpochMs;
    readonly clientReceivedAt: EpochMs;
}): ClockSync;
/** Rebases a client-reported instant onto the server timeline. */
export declare function correctClientTimestamp(clientInstant: EpochMs, offsetMs: number): EpochMs;
//# sourceMappingURL=time.d.ts.map