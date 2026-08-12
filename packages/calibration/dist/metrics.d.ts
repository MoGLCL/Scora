import { type Recommendation } from '@scora/trust-scoring';
import { Consequence, type CalibrationCurve, type CaseOutcome, type CaseTrait, type ConfusionCounts, type ErrorRates, type SubgroupReport } from './contract.ts';
/**
 * Measurement.
 *
 * Nothing here decides anything; it counts, divides, and refuses to divide by
 * zero. The judgement lives in `gates.ts`, kept separate so that tightening a
 * threshold cannot quietly change what a rate means.
 *
 * One rule runs through the whole file: **an empty denominator yields `null`,
 * never `0`.** A false-positive rate of zero across zero honest cases is not a
 * pass, it is an untested engine, and a harness that reports the two identically
 * is worse than no harness at all.
 */
/**
 * What a recommendation costs the developer who receives it.
 *
 * `CLARIFICATION_SUGGESTED` counts as `QUESTIONED` rather than `ESCALATED`: being
 * asked to explain your own code is a normal part of an assessment, and treating
 * it as harm would make the interview layer unusable. It is still not free, and
 * the gates track it separately.
 */
export declare function consequenceOf(recommendation: Recommendation): Consequence;
/**
 * Whether the engine got this case right.
 *
 * Asymmetric on purpose, and the asymmetry is the policy:
 *
 *   - `OWNS_WORK` is correct on `NONE` **or** `QUESTIONED`. A question is not an
 *     accusation, and an engine forbidden from ever asking one would have no way
 *     to resolve a genuine ambiguity in the developer's favour.
 *   - `WARRANTS_REVIEW` is correct only on `ESCALATED`. Questioning is not
 *     enough when a human should read the package.
 *   - `INDETERMINATE` is correct only on `DECLINED`. Anything else is a claim
 *     made without evidence, in whichever direction it points.
 */
export declare function isCorrect(outcome: Pick<CaseOutcome, 'case' | 'consequence'>): boolean;
export declare function tally(outcomes: readonly CaseOutcome[]): ConfusionCounts;
export declare function rates(counts: ConfusionCounts): ErrorRates;
/**
 * Error rates per trait.
 *
 * A case appears in every subgroup it is tagged with, so the subgroups overlap
 * and do not sum to the whole. That is intended: the question each answers is
 * "among developers who dictate, how often are we wrong", and the answer must
 * not be diluted by the developers who do not.
 *
 * Traits with no cases are omitted entirely rather than reported as clean.
 */
export declare function bySubgroup(outcomes: readonly CaseOutcome[], traits: readonly CaseTrait[]): readonly SubgroupReport[];
/**
 * Does a stated confidence mean what it says?
 *
 * Cases are bucketed by the confidence the engine reported, and each bucket is
 * checked against how often the engine was actually right in it. A bucket at 80%
 * confidence that is right 40% of the time is the engine overstating what it
 * knows — the specific failure "never claim Trust is 100% certain" is about, and
 * one that no amount of hedging in the report text can repair.
 *
 * `INDETERMINATE` cases are excluded. Confidence for a session the engine
 * declined to score is not a claim about a developer, so scoring its calibration
 * would measure nothing.
 */
export declare function calibrationCurve(outcomes: readonly CaseOutcome[]): CalibrationCurve;
//# sourceMappingURL=metrics.d.ts.map