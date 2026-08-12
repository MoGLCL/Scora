import type { Brand } from './brand.ts';
import { err, ok, type Result } from './result.ts';

/** A probability or ratio, clamped to the closed interval [0, 1]. */
export type Unit = Brand<number, 'Unit'>;

/** A human-facing score, clamped to the closed interval [0, 100]. */
export type Score = Brand<number, 'Score'>;

export type RangeIssue = {
  readonly code: 'NOT_A_NUMBER' | 'OUT_OF_RANGE';
  readonly min: number;
  readonly max: number;
  readonly received: unknown;
};

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return value < min ? min : value > max ? max : value;
}

/**
 * Clamps a computed value into [0, 1].
 *
 * Use this for values the engine derives itself, where drifting slightly out of
 * range is a rounding artefact rather than a real error. Use `toUnit` for
 * anything that crossed a trust boundary.
 */
export function clampUnit(value: number): Unit {
  return clamp(value, 0, 1) as Unit;
}

export function clampScore(value: number): Score {
  return clamp(value, 0, 100) as Score;
}

/** Strict parse for values arriving from outside the engine. */
export function toUnit(value: unknown): Result<Unit, RangeIssue> {
  return parseBounded(value, 0, 1) as Result<Unit, RangeIssue>;
}

export function toScore(value: unknown): Result<Score, RangeIssue> {
  return parseBounded(value, 0, 100) as Result<Score, RangeIssue>;
}

function parseBounded(value: unknown, min: number, max: number): Result<number, RangeIssue> {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return err({ code: 'NOT_A_NUMBER', min, max, received: value });
  }
  if (value < min || value > max) {
    return err({ code: 'OUT_OF_RANGE', min, max, received: value });
  }
  return ok(value);
}

export function unitToScore(value: Unit): Score {
  return clampScore(value * 100);
}

export function scoreToUnit(value: Score): Unit {
  return clampUnit(value / 100);
}

/** Rounds to a fixed number of decimal places, avoiding float display noise. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
