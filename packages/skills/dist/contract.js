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
};
/** Ascending. `NONE` is "the session evidences nothing", not "the developer has nothing". */
export const SKILL_LEVEL_ORDER = [
    SkillLevel.NONE,
    SkillLevel.BEGINNER,
    SkillLevel.INTERMEDIATE,
    SkillLevel.ADVANCED,
    SkillLevel.EXPERT,
];
export function levelOrdinal(level) {
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
};
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
};
//# sourceMappingURL=contract.js.map