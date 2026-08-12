import { err, ok } from "./result.js";
export const MS_PER_SECOND = 1_000;
export const MS_PER_MINUTE = 60_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 86_400_000;
/** 2020-01-01T00:00:00Z. An assessment timestamp before this is a broken or forged clock. */
const MIN_PLAUSIBLE_EPOCH_MS = 1_577_836_800_000;
/** 2100-01-01T00:00:00Z. */
const MAX_PLAUSIBLE_EPOCH_MS = 4_102_444_800_000;
export function toEpochMs(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return err({ code: 'NOT_A_NUMBER', received: value });
    }
    if (value < MIN_PLAUSIBLE_EPOCH_MS || value > MAX_PLAUSIBLE_EPOCH_MS) {
        return err({ code: 'IMPLAUSIBLE_TIMESTAMP', received: value });
    }
    return ok(value);
}
/** For timestamps from trusted sources (the server clock, a database row). */
export function unsafeEpochMs(value) {
    return value;
}
export function toDurationMs(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return err({ code: 'NOT_A_NUMBER', received: value });
    }
    if (value < 0) {
        return err({ code: 'NEGATIVE_DURATION', received: value });
    }
    return ok(value);
}
/** Absolute distance between two instants, so argument order can never produce a negative span. */
export function elapsed(from, to) {
    return Math.abs(to - from);
}
export function addMs(instant, offset) {
    return (instant + offset);
}
export function isWithin(instant, from, to) {
    return instant >= from && instant <= to;
}
/**
 * NTP-style offset estimation from a single request/response exchange.
 *
 * offset = ((t1 - t0) + (t2 - t3)) / 2, roundTrip = (t3 - t0) - (t2 - t1),
 * where t0/t3 are client-side and t1/t2 are server-side. Accuracy degrades with
 * asymmetric network paths, so `roundTripMs` should be carried alongside the
 * offset and treated as its error bar rather than discarded.
 */
export function estimateClockSync(samples) {
    const { clientSentAt, serverReceivedAt, serverSentAt, clientReceivedAt } = samples;
    const offsetMs = ((serverReceivedAt - clientSentAt) + (serverSentAt - clientReceivedAt)) / 2;
    const roundTrip = (clientReceivedAt - clientSentAt) - (serverSentAt - serverReceivedAt);
    return {
        clientSentAt,
        serverReceivedAt,
        serverSentAt,
        clientReceivedAt,
        // The sign convention above yields server-ahead-of-client; invert so that
        // positive means the client clock is ahead, which reads more naturally.
        offsetMs: -offsetMs,
        roundTripMs: Math.max(0, roundTrip),
    };
}
/** Rebases a client-reported instant onto the server timeline. */
export function correctClientTimestamp(clientInstant, offsetMs) {
    return (clientInstant - offsetMs);
}
//# sourceMappingURL=time.js.map