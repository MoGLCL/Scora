import type { EpochMs, EventId, TrustLayer, Unit } from '@scora/trust-core';

/**
 * Layer 08 — skill and technical understanding.
 *
 * The question this layer answers is narrow and worth stating precisely: *does
 * the session contain evidence that the developer can do the thing they said
 * they can do?* It is not "did they use AI", not "how fast did they type", and
 * not "is this code good".
 *
 * Two rules shape every type in this file.
 *
 * **Absence of evidence is not evidence of absence.** A session that never
 * touched SQL says nothing whatsoever about a claimed SQL skill. The verdict for
 * that is `NOT_EXERCISED` — a distinct outcome from `CONTRADICTED`, carrying no
 * penalty, because an assessment that never asked cannot conclude. Collapsing
 * the two is the single most likely way this layer would start producing false
 * accusations, so `SkillVerdict` gives them separate names and the scoring bridge
 * treats them differently.
 *
 * **A claim is not a lie because it is unproven.** `claimedLevel` is what the
 * developer asserted; `evidencedLevel` is what the session supports. A gap
 * between them is a *question*, and only a wide, corroborated, well-evidenced gap
 * is even that. Nothing here produces a decision about a person.
 */

/** A skill the developer said they have. The thing to be verified. */
export interface SkillClaim {
  readonly skillId: string;
  readonly skillName: string;
  readonly claimedLevel: SkillLevel;
  /** Years asserted, or null when not stated. Never used on its own. */
  readonly claimedYears: number | null;
  /** The event that recorded the claim, so a verdict can be traced to it. */
  readonly claimedIn: EventId | null;
}

/**
 * Claimed and evidenced levels share one scale.
 *
 * Ordered so a shortfall can be measured in steps, which is what lets a
 * one-level gap read as ordinary self-assessment noise and a three-level gap read
 * as a question worth asking.
 */
export const SkillLevel = {
  NONE: 'NONE',
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
} as const;

export type SkillLevel = (typeof SkillLevel)[keyof typeof SkillLevel];

/** Ascending. `NONE` is "the session evidences nothing", not "the developer has nothing". */
export const SKILL_LEVEL_ORDER: readonly SkillLevel[] = [
  SkillLevel.NONE,
  SkillLevel.BEGINNER,
  SkillLevel.INTERMEDIATE,
  SkillLevel.ADVANCED,
  SkillLevel.EXPERT,
];

export function levelOrdinal(level: SkillLevel): number {
  return SKILL_LEVEL_ORDER.indexOf(level);
}

/**
 * What the session had to say about one claim.
 *
 * `NOT_EXERCISED` and `CONTRADICTED` are deliberately far apart. The first means
 * the assessment did not put the skill to work; the second means it did and the
 * result did not hold up. Only the second is a finding.
 */
export const SkillVerdict = {
  /** Exercised and demonstrated at or above the claimed level. */
  CORROBORATED: 'CORROBORATED',
  /** Exercised and demonstrated, but below the claimed level. A question, not a finding. */
  PARTIALLY_CORROBORATED: 'PARTIALLY_CORROBORATED',
  /**
   * The session never exercised this skill.
   *
   * Carries no penalty and never lowers Trust. The correct response is to design
   * a task that exercises it, or to issue a verification challenge.
   */
  NOT_EXERCISED: 'NOT_EXERCISED',
  /** Exercised, and the evidence runs against the claim. Requires corroboration to be said at all. */
  CONTRADICTED: 'CONTRADICTED',
  /** Exercised, but the telemetry is too thin to read either way. */
  INDETERMINATE: 'INDETERMINATE',
} as const;

export type SkillVerdict = (typeof SkillVerdict)[keyof typeof SkillVerdict];

/**
 * One piece of evidence bearing on one skill.
 *
 * Every observation carries the layer it came from, because a verdict of
 * `CONTRADICTED` must draw on at least two layers to be stated at all — the same
 * corroboration rule the cluster catalogue enforces, applied here so that a
 * single weak signal cannot be dressed up as a skill finding.
 */
export interface SkillObservation {
  readonly kind: SkillObservationKind;
  readonly layer: TrustLayer;
  /** What was observed, in the reviewer's language. */
  readonly detail: string;
  /** Direction and strength in [0,1]. Sign lives in `kind`, not here. */
  readonly weight: Unit;
  /** How much this observation is worth believing, given sample size and telemetry quality. */
  readonly confidence: Unit;
  readonly evidence: readonly EventId[];
}

export const SkillObservationKind = {
  /** Direct designed evidence: a challenge targeting this skill, passed. */
  DEMONSTRATED: 'DEMONSTRATED',
  /** Behaviour consistent with the claim — tests written, errors resolved, code revised. */
  SUPPORTING: 'SUPPORTING',
  /** Context a reviewer needs, pointing neither way. */
  CONTEXT: 'CONTEXT',
  /** Behaviour inconsistent with the claim. Never conclusive alone. */
  COUNTER: 'COUNTER',
  /** Direct designed evidence, failed. */
  CHALLENGE_FAILED: 'CHALLENGE_FAILED',
} as const;

export type SkillObservationKind =
  (typeof SkillObservationKind)[keyof typeof SkillObservationKind];

/** The reconciliation of one claim against the session. */
export interface SkillFinding {
  readonly claim: SkillClaim;
  readonly verdict: SkillVerdict;
  /** The level the session supports. `NONE` when nothing exercised it. */
  readonly evidencedLevel: SkillLevel;
  /** Claimed minus evidenced, in level steps. Negative when the session exceeded the claim. */
  readonly levelGap: number;
  /** Confidence in this verdict, independent of whether it is favourable. */
  readonly confidence: Unit;
  /** Distinct layers that contributed. `CONTRADICTED` requires ≥2. */
  readonly layersCorroborating: readonly TrustLayer[];
  readonly observations: readonly SkillObservation[];
  /** Everything the verdict rests on, deduplicated. */
  readonly evidence: readonly EventId[];
  /** Plain-language reading, including what would change it. */
  readonly summary: string;
  /**
   * What would settle an unresolved claim.
   *
   * Populated for `NOT_EXERCISED` and `INDETERMINATE`, because the useful output
   * there is a next step, not a score.
   */
  readonly nextStep: string | null;
}

/** The whole Layer 08 assessment for one session. */
export interface SkillAssessment {
  readonly assessedAt: EpochMs;
  readonly findings: readonly SkillFinding[];
  /** Mean confidence across claims that were actually exercised. */
  readonly coverage: SkillCoverage;
  /** Caveats a reviewer must see before reading any finding. */
  readonly limitations: readonly string[];
  /** Version of the reconciliation policy, so a stored assessment stays interpretable. */
  readonly policyVersion: string;
}

/**
 * How much of the claimed inventory the assessment actually tested.
 *
 * Reported prominently because it is the honest headline: an assessment that
 * exercised two of nine claimed skills has verified two skills, whatever the
 * verdicts say.
 */
export interface SkillCoverage {
  readonly claimed: number;
  readonly exercised: number;
  readonly notExercised: number;
  /** `exercised / claimed`, or 0 when nothing was claimed. */
  readonly ratio: Unit;
}
