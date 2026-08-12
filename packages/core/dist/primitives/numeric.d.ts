import type { Brand } from './brand.ts';
import { type Result } from './result.ts';
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
export declare function clamp(value: number, min: number, max: number): number;
/**
 * Clamps a computed value into [0, 1].
 *
 * Use this for values the engine derives itself, where drifting slightly out of
 * range is a rounding artefact rather than a real error. Use `toUnit` for
 * anything that crossed a trust boundary.
 */
export declare function clampUnit(value: number): Unit;
export declare function clampScore(value: number): Score;
/** Strict parse for values arriving from outside the engine. */
export declare function toUnit(value: unknown): Result<Unit, RangeIssue>;
export declare function toScore(value: unknown): Result<Score, RangeIssue>;
export declare function unitToScore(value: Unit): Score;
export declare function scoreToUnit(value: Score): Unit;
/** Rounds to a fixed number of decimal places, avoiding float display noise. */
export declare function roundTo(value: number, decimals: number): number;
//# sourceMappingURL=numeric.d.ts.map