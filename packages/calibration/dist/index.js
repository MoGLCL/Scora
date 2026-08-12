/**
 * `@scora/trust-calibration` — Layer 11, the harness the engine has to pass.
 *
 * Exports the corpus, the measurement, the gates, and the Layer 10 ground truth
 * separately, because they answer different questions and a caller should have
 * to say which one they are asking.
 *
 * `runCase` and `calibrate` are exported so an operator can measure their own
 * sessions. There is deliberately no export that lets a caller relax a gate: the
 * thresholds are constants in `gates.ts`, and moving one is a diff someone
 * reviews rather than an argument someone passes.
 */
export { CaseLabel, CaseTrait, Consequence, LabelSource, } from "./contract.js";
// The archetypes are exported individually so a caller building their own case
// can start from a session that is already known to be benign, rather than
// hand-rolling one and accidentally testing their own fixture.
export { ASSISTIVE_DICTATION, CORPUS, DEGRADED_CONNECTION, EXTERNAL_AI_ADAPTED, MINIMAL_CONSENT_SESSION, REUSES_OWN_LIBRARY, TRUNCATED, UNVERIFIED_ASSISTANCE, } from "./corpus.js";
export { GATE, MAXIMUM_CALIBRATION_ERROR, MAXIMUM_OVERCONFIDENCE, MINIMUM_CASES, TARGET_RECALL, evaluate, limitationsOf, } from "./gates.js";
export { bySubgroup, calibrationCurve, consequenceOf, isCorrect, rates, tally, } from "./metrics.js";
export { confirmedFalseNegatives, confirmedFalsePositives, fromReviews, overrideRates, } from "./overrides.js";
export { calibrate, renderReport, runCase } from "./run.js";
//# sourceMappingURL=index.js.map