import { createHash, randomBytes } from 'node:crypto';
import { EventId, unsafeEpochMs } from "./primitives/index.js";
/**
 * Node adapters for the core ports.
 *
 * Kept out of the main entry point so the core itself stays platform-neutral:
 * the sandbox client bundles the taxonomy and validators for the browser, and
 * must not pull `node:crypto` in with them.
 */
export const nodeCrypto = {
    sha256: (input) => createHash('sha256').update(input, 'utf8').digest('hex'),
};
export const systemClock = {
    now: () => unsafeEpochMs(Date.now()),
};
/**
 * A clock that can be advanced by hand.
 *
 * Timing is evidence in this system, so tests and calibration replays must be
 * able to control it exactly rather than sleeping.
 */
export function fixedClock(startAt) {
    let current = startAt;
    return {
        now: () => unsafeEpochMs(current),
        advance: (ms) => {
            current += ms;
        },
    };
}
/** 128 bits of randomness, base36-encoded, prefixed by entity type. */
export function randomId(codec) {
    const bytes = randomBytes(16);
    let value = 0n;
    for (const byte of bytes)
        value = (value << 8n) | BigInt(byte);
    return codec.unsafe(`${codec.prefix}_${value.toString(36).padStart(25, '0')}`);
}
export const nodeIdGenerator = {
    eventId: () => randomId(EventId),
};
/**
 * Deterministic id generator for tests and replay.
 *
 * Reproducible ids let a calibration run be diffed against a previous run to
 * see whether a scoring change altered outcomes.
 */
export function sequentialIdGenerator(prefixSeed = 'test') {
    let counter = 0;
    return {
        eventId: () => {
            counter += 1;
            return EventId.unsafe(`${EventId.prefix}_${prefixSeed}${counter.toString().padStart(6, '0')}`);
        },
    };
}
export const consoleLogger = {
    debug: (message, context) => console.debug(message, context ?? {}),
    info: (message, context) => console.info(message, context ?? {}),
    warn: (message, context) => console.warn(message, context ?? {}),
    error: (message, context) => console.error(message, context ?? {}),
};
/** Discards everything. Default in tests, so output stays readable. */
export const silentLogger = {
    debug: () => { },
    info: () => { },
    warn: () => { },
    error: () => { },
};
//# sourceMappingURL=node.js.map