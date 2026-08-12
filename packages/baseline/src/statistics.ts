import { clampUnit, type Unit } from '@scora/trust-core';

/**
 * Robust statistics.
 *
 * Everything here resists outliers, because assessment samples are small and
 * genuinely contain them: the session where the developer was interrupted, the
 * one where the network died, the one where everything went right. Classical
 * mean and standard deviation would let any of those redefine what "normal"
 * means for a person, manufacturing deviations that say nothing.
 */

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

/**
 * Linear-interpolated percentile.
 *
 * Interpolating matters at these sample sizes: with six sessions, a
 * nearest-rank p75 would jump discontinuously as the seventh arrives.
 */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0]!;

  const sorted = [...values].sort((a, b) => a - b);
  const rank = (sorted.length - 1) * clampUnit(p);
  const lower = Math.floor(rank);
  const upper = Math.ceil(rank);

  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (rank - lower);
}

/**
 * Median absolute deviation, scaled to be comparable with a standard deviation.
 *
 * The 1.4826 factor makes MAD a consistent estimator of sigma for normally
 * distributed data, so thresholds expressed in "sigmas" keep their usual
 * meaning while gaining resistance to outliers.
 */
export function medianAbsoluteDeviation(values: readonly number[]): number | null {
  const centre = median(values);
  if (centre === null) return null;
  const deviations = values.map((value) => Math.abs(value - centre));
  const mad = median(deviations);
  return mad === null ? null : mad * 1.4826;
}

/**
 * Weighted median, for observations of differing reliability.
 *
 * Sessions with partial telemetry contribute proportionally less, so one badly
 * observed session cannot skew a developer's profile.
 */
export function weightedMedian(
  values: readonly number[],
  weights: readonly number[],
): number | null {
  if (values.length === 0 || values.length !== weights.length) return null;

  const paired = values
    .map((value, index) => ({ value, weight: Math.max(0, weights[index] ?? 0) }))
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => a.value - b.value);

  if (paired.length === 0) return null;

  const total = paired.reduce((sum, entry) => sum + entry.weight, 0);
  let accumulated = 0;

  for (const entry of paired) {
    accumulated += entry.weight;
    if (accumulated >= total / 2) return entry.value;
  }

  return paired.at(-1)!.value;
}

/**
 * Robust z-score: how many MADs an observation sits from the centre.
 *
 * Returns null when dispersion is unmeasurable or zero. A zero-MAD baseline
 * means every observed session was identical, which at these sample sizes is
 * far more likely to reflect too little data than genuine perfect consistency —
 * treating it as infinite significance would be a fabrication.
 */
export function robustZScore(
  observed: number,
  centre: number,
  mad: number,
): number | null {
  if (!Number.isFinite(mad) || mad <= 0) return null;
  return (observed - centre) / mad;
}

/**
 * Confidence from sample size, saturating.
 *
 * Deliberately conservative for baselines: five sessions is a sketch, not a
 * portrait, and the curve is chosen so it never claims otherwise.
 */
export function sampleConfidence(samples: number, halfway = 8): Unit {
  if (samples <= 0) return clampUnit(0);
  return clampUnit(samples / (samples + halfway));
}

/**
 * Exponential recency weight.
 *
 * Developers improve. A session from a year ago describes a different person
 * from the one being assessed today, so older observations count for less.
 * `halfLifeDays` of 90 means a three-month-old session carries half the weight
 * of today's.
 */
export function recencyWeight(
  observedAt: number,
  now: number,
  halfLifeDays = 90,
): number {
  const ageDays = Math.max(0, (now - observedAt) / 86_400_000);
  return 2 ** (-ageDays / halfLifeDays);
}

/** Interquartile range, a dispersion measure that ignores the tails entirely. */
export function interquartileRange(values: readonly number[]): number | null {
  const p25 = percentile(values, 0.25);
  const p75 = percentile(values, 0.75);
  return p25 === null || p75 === null ? null : p75 - p25;
}
