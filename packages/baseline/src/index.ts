/**
 * @scora/trust-baseline — per-developer behavioural baselines.
 *
 * Behaviour is interpreted relative to the same person, not to a global
 * threshold. A developer with no established history is not compared to the
 * population by default: doing so would penalise anyone atypical for being
 * atypical, which is the precise failure this platform exists to avoid.
 */

export {
  ComparisonBasis,
  toExtractionBaseline,
  type BaselineDimension,
  type BaselineStore,
  type DeveloperProfile,
  type Deviation,
  type PopulationStatistics,
  type SessionObservation,
} from './contract.ts';

export {
  MINIMUM_SESSIONS_TO_ESTABLISH,
  TRACKED_FEATURES,
  buildPopulation,
  buildProfile,
  compare,
  compareSession,
  notableDeviations,
  observationFrom,
  type ComparisonOptions,
  type ProfileOptions,
} from './profile.ts';

export {
  interquartileRange,
  median,
  medianAbsoluteDeviation,
  percentile,
  recencyWeight,
  robustZScore,
  sampleConfidence,
  weightedMedian,
} from './statistics.ts';

export { inMemoryBaselineStore } from './store.ts';
