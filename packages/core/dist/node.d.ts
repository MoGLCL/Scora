import { type IdCodec } from './primitives/index.ts';
import type { Clock, CryptoPort, IdGenerator, Logger } from './ports/index.ts';
/**
 * Node adapters for the core ports.
 *
 * Kept out of the main entry point so the core itself stays platform-neutral:
 * the sandbox client bundles the taxonomy and validators for the browser, and
 * must not pull `node:crypto` in with them.
 */
export declare const nodeCrypto: CryptoPort;
export declare const systemClock: Clock;
/**
 * A clock that can be advanced by hand.
 *
 * Timing is evidence in this system, so tests and calibration replays must be
 * able to control it exactly rather than sleeping.
 */
export declare function fixedClock(startAt: number): Clock & {
    advance(ms: number): void;
};
/** 128 bits of randomness, base36-encoded, prefixed by entity type. */
export declare function randomId<T extends string>(codec: IdCodec<T>): T;
export declare const nodeIdGenerator: IdGenerator;
/**
 * Deterministic id generator for tests and replay.
 *
 * Reproducible ids let a calibration run be diffed against a previous run to
 * see whether a scoring change altered outcomes.
 */
export declare function sequentialIdGenerator(prefixSeed?: string): IdGenerator;
export declare const consoleLogger: Logger;
/** Discards everything. Default in tests, so output stays readable. */
export declare const silentLogger: Logger;
//# sourceMappingURL=node.d.ts.map