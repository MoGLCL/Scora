import { createHash, randomBytes } from 'node:crypto';
import { EventId, unsafeEpochMs, type IdCodec } from './primitives/index.ts';
import type { Clock, CryptoPort, IdGenerator, Logger } from './ports/index.ts';

/**
 * Node adapters for the core ports.
 *
 * Kept out of the main entry point so the core itself stays platform-neutral:
 * the sandbox client bundles the taxonomy and validators for the browser, and
 * must not pull `node:crypto` in with them.
 */

export const nodeCrypto: CryptoPort = {
  sha256: (input: string) => createHash('sha256').update(input, 'utf8').digest('hex'),
};

export const systemClock: Clock = {
  now: () => unsafeEpochMs(Date.now()),
};

/**
 * A clock that can be advanced by hand.
 *
 * Timing is evidence in this system, so tests and calibration replays must be
 * able to control it exactly rather than sleeping.
 */
export function fixedClock(startAt: number): Clock & { advance(ms: number): void } {
  let current = startAt;
  return {
    now: () => unsafeEpochMs(current),
    advance: (ms: number) => {
      current += ms;
    },
  };
}

/** 128 bits of randomness, base36-encoded, prefixed by entity type. */
export function randomId<T extends string>(codec: IdCodec<T>): T {
  const bytes = randomBytes(16);
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  return codec.unsafe(`${codec.prefix}_${value.toString(36).padStart(25, '0')}`);
}

export const nodeIdGenerator: IdGenerator = {
  eventId: () => randomId(EventId),
};

/**
 * Deterministic id generator for tests and replay.
 *
 * Reproducible ids let a calibration run be diffed against a previous run to
 * see whether a scoring change altered outcomes.
 */
export function sequentialIdGenerator(prefixSeed = 'test'): IdGenerator {
  let counter = 0;
  return {
    eventId: () => {
      counter += 1;
      return EventId.unsafe(`${EventId.prefix}_${prefixSeed}${counter.toString().padStart(6, '0')}`);
    },
  };
}

export const consoleLogger: Logger = {
  debug: (message, context) => console.debug(message, context ?? {}),
  info: (message, context) => console.info(message, context ?? {}),
  warn: (message, context) => console.warn(message, context ?? {}),
  error: (message, context) => console.error(message, context ?? {}),
};

/** Discards everything. Default in tests, so output stays readable. */
export const silentLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};
