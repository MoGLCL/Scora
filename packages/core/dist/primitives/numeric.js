import { err, ok } from "./result.js";
export function clamp(value, min, max) {
    if (Number.isNaN(value))
        return min;
    return value < min ? min : value > max ? max : value;
}
/**
 * Clamps a computed value into [0, 1].
 *
 * Use this for values the engine derives itself, where drifting slightly out of
 * range is a rounding artefact rather than a real error. Use `toUnit` for
 * anything that crossed a trust boundary.
 */
export function clampUnit(value) {
    return clamp(value, 0, 1);
}
export function clampScore(value) {
    return clamp(value, 0, 100);
}
/** Strict parse for values arriving from outside the engine. */
export function toUnit(value) {
    return parseBounded(value, 0, 1);
}
export function toScore(value) {
    return parseBounded(value, 0, 100);
}
function parseBounded(value, min, max) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return err({ code: 'NOT_A_NUMBER', min, max, received: value });
    }
    if (value < min || value > max) {
        return err({ code: 'OUT_OF_RANGE', min, max, received: value });
    }
    return ok(value);
}
export function unitToScore(value) {
    return clampScore(value * 100);
}
export function scoreToUnit(value) {
    return clampUnit(value / 100);
}
/** Rounds to a fixed number of decimal places, avoiding float display noise. */
export function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
}
//# sourceMappingURL=numeric.js.map