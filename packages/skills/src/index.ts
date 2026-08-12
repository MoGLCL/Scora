/**
 * @scora/trust-skills — Layer 08: skill and technical understanding.
 *
 *   claims + events → observations → verdict per skill → coverage
 *
 * The layer answers one question per claimed skill: did this session produce
 * evidence for it, against it, or neither? "Neither" is the most common answer
 * and carries no penalty — an assessment that never exercised a skill has not
 * disproved it.
 *
 * Deliberately not fused into `@scora/trust-scoring`'s `score()`. This package
 * produces a `SkillAssessment`; `skillStanding` and `skillConfidence` are the
 * only bridge, and `skillStanding` returns `null` rather than a low number when
 * there is nothing to judge.
 */

export {
  SKILL_LEVEL_ORDER,
  SkillLevel,
  SkillObservationKind,
  SkillVerdict,
  levelOrdinal,
  type SkillAssessment,
  type SkillClaim,
  type SkillCoverage,
  type SkillFinding,
  type SkillObservation,
} from './contract.ts';

export { collectClaims, observeSkills, taskWindows } from './observe.ts';

export {
  MINIMUM_CONFIDENCE_TO_JUDGE,
  MINIMUM_LAYERS_TO_CONTRADICT,
  TOLERATED_LEVEL_GAP,
  aggregateConfidence,
  inferLevel,
  reconcileClaim,
  type ReconcileOptions,
} from './reconcile.ts';

export {
  SKILL_POLICY_VERSION,
  assessSkills,
  skillConfidence,
  skillStanding,
  suggestedQuestions,
  type AssessSkillsOptions,
} from './assess.ts';
