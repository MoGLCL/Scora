import { type Unit } from '@scora/trust-core';
/**
 * Robust statistics.
 *
 * Everything here resists outliers, because assessment samples are small and
 * genuinely contain them: the session where the developer was interrupted, the
 * one where the network died, the one where everything went right. Classical
 * mean and standard deviation would let any of those redefine what "normal"
 * means for a person, manufacturing deviations that say nothing.
 */
export declare function median(values: readonly number[]): number | null;
/**
 * Linear-interpolated percentile.
 *
 * Interpolating matters at these sample sizes: with six sessions, a
 * nearest-rank p75 would jump discontinuously as the seventh arrives.
 */
export declare function percentile(values: readonly number[], p: number): number | null;
/**
 * Median absolute deviation, scaled to be comparable with a standard deviation.
 *
 * The 1.4826 factor makes MAD a consistent estimator of sigma for normally
 * distributed data, so thresholds expressed in "sigmas" keep their usual
 * meaning while gaining resistance to outliers.
 */
export declare function medianAbsoluteDeviation(values: readonly number[]): number | null;
/**
 * Weighted median, for observations of differing reliability.
 *
 * Sessions with partial telemetry contribute proportionally less, so one badly
 * observed session cannot skew a developer's profile.
 */
export declare function weightedMedian(values: readonly number[], weights: readonly number[]): number | null;
/**
 * Robust z-score: how many MADs an observation sits from the centre.
 *
 * Returns null when dispersion is unmeasurable or zero. A zero-MAD baseline
 * means every observed session was identical, which at these sample sizes is
 * far more likely to reflect too little data than genuine perfect consistency —
 * treating it as infinite significance would be a fabrication.
 */
export declare function robustZScore(observed: number, centre: number, mad: number): number | null;
/**
 * Confidence from sample size, saturating.
 *
 * Deliberately conservative for baselines: five sessions is a sketch, not a
 * portrait, and the curve is chosen so it never claims otherwise.
 */
export declare function sampleConfidence(samples: number, halfway?: number): Unit;
/**
 * Exponential recency weight.
 *
 * Developers improve. A session from a year ago describes a different person
 * from the one being assessed today, so older observations count for less.
 * `halfLifeDays` of 90 means a three-month-old session carries half the weight
 * of today's.
 */
export declare function recencyWeight(observedAt: number, now: number, halfLifeDays?: number): number;
/** Interquartile range, a dispersion measure that ignores the tails entirely. */
export declare function interquartileRange(values: readonly number[]): number | null;
//# sourceMappingURL=statistics.d.ts.map