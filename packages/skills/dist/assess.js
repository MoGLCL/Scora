import { clampUnit } from '@scora/trust-core';
import { SkillVerdict, } from "./contract.js";
import { collectClaims, observeSkills } from "./observe.js";
import { reconcileClaim } from "./reconcile.js";
/**
 * The Layer 08 assessment.
 *
 * `assessSkills` is the whole public surface: events in, one finding per claimed
 * skill out, plus the coverage figure that says how much of the inventory was
 * tested at all.
 *
 * Coverage is not a footnote. An assessment that exercised two of nine claimed
 * skills has verified two skills, and a reviewer who reads seven `NOT_EXERCISED`
 * verdicts as seven failures has been misled by the report rather than by the
 * developer. That is why `limitations` leads with coverage and why the
 * `NOT_EXERCISED` count is reported as its own number rather than folded into a
 * percentage.
 */
export const SKILL_POLICY_VERSION = 'skills-1.0.0';
export function assessSkills(events, options) {
    const claims = collectClaims(events);
    const observations = observeSkills(events, claims);
    const findings = claims.map((claim) => reconcileClaim(claim, observations.get(claim.skillId) ?? [], options));
    const coverage = coverageOf(findings);
    return {
        assessedAt: options.assessedAt,
        findings,
        coverage,
        limitations: limitationsOf(findings, coverage),
        policyVersion: SKILL_POLICY_VERSION,
    };
}
function coverageOf(findings) {
    const notExercised = findings.filter((finding) => finding.verdict === SkillVerdict.NOT_EXERCISED).length;
    const claimed = findings.length;
    const exercised = claimed - notExercised;
    return {
        claimed,
        exercised,
        notExercised,
        ratio: clampUnit(claimed === 0 ? 0 : exercised / claimed),
    };
}
/**
 * Caveats a reviewer must read before any finding.
 *
 * Ordered by how badly each one would distort the report if missed. Thin coverage
 * comes first because it is the one that makes every other line misleading.
 */
function limitationsOf(findings, coverage) {
    const limitations = [];
    if (coverage.claimed === 0) {
        return ['No skills were claimed in this session, so there was nothing for this layer to verify.'];
    }
    if (coverage.exercised === 0) {
        limitations.push(`None of the ${String(coverage.claimed)} claimed skills were exercised by this assessment. ` +
            'This layer has verified nothing, in either direction.');
    }
    else if (coverage.ratio < 0.5) {
        limitations.push(`Only ${String(coverage.exercised)} of ${String(coverage.claimed)} claimed skills were exercised. ` +
            'The unexercised claims are unverified, not disproved.');
    }
    const indeterminate = findings.filter((finding) => finding.verdict === SkillVerdict.INDETERMINATE).length;
    if (indeterminate > 0) {
        limitations.push(`${String(indeterminate)} claim(s) were exercised but produced telemetry too thin to read. ` +
            'Treat these as open questions.');
    }
    const challenged = findings.filter((finding) => finding.observations.some((observation) => observation.layer === 'L08_SKILL_UNDERSTANDING')).length;
    if (challenged === 0 && coverage.exercised > 0) {
        limitations.push('No verification challenges were issued. Every finding here rests on behaviour observed ' +
            'during ordinary work rather than on evidence designed to test a specific skill.');
    }
    return limitations;
}
/**
 * Layer 08's contribution to the Trust score.
 *
 * Returns `null` — not zero, not a low number — when nothing was exercised. A
 * layer with no evidence must not drag Trust down; it lowers Confidence instead,
 * which is the same rule `LayerAssessment.standing` already encodes for every
 * other layer.
 *
 * `NOT_EXERCISED` findings are excluded from the mean entirely rather than
 * counted as neutral. Averaging them in would mean a developer who claimed ten
 * skills and demonstrated the two that were tested scores lower than one who
 * claimed two and demonstrated both — punishing an honest inventory.
 */
export function skillStanding(assessment) {
    const exercised = assessment.findings.filter((finding) => finding.verdict !== SkillVerdict.NOT_EXERCISED);
    if (exercised.length === 0)
        return null;
    const total = exercised.reduce((sum, finding) => sum + standingOf(finding), 0);
    return clampUnit(total / exercised.length);
}
function standingOf(finding) {
    switch (finding.verdict) {
        case SkillVerdict.CORROBORATED:
            return 1;
        case SkillVerdict.PARTIALLY_CORROBORATED:
            // A one-step shortfall costs little; a wider one costs more, and never
            // reaches zero, because a partially corroborated skill is still a skill the
            // session evidenced.
            return Math.max(0.4, 1 - Math.max(0, finding.levelGap) * 0.2);
        case SkillVerdict.INDETERMINATE:
            // Neutral. Thin telemetry is a fact about the feed, not about the person.
            return 0.5;
        case SkillVerdict.CONTRADICTED:
            return 0.1;
        default:
            return 0.5;
    }
}
/**
 * Confidence in the layer as a whole.
 *
 * Scales with both the confidence of individual findings and how much of the
 * claimed inventory was exercised: high confidence in two findings out of nine
 * claims is not high confidence in the developer's skill profile.
 */
export function skillConfidence(assessment) {
    const exercised = assessment.findings.filter((finding) => finding.verdict !== SkillVerdict.NOT_EXERCISED);
    if (exercised.length === 0)
        return clampUnit(0);
    const mean = exercised.reduce((sum, finding) => sum + finding.confidence, 0) / exercised.length;
    return clampUnit(mean * assessment.coverage.ratio);
}
/**
 * Questions worth putting to the developer at interview.
 *
 * This is Layer 08's real output when a claim does not resolve. An unverified
 * skill is a prompt for Layer 09, not a mark against anyone — and a question
 * generated from the session cannot be prepared for in advance.
 */
export function suggestedQuestions(assessment) {
    return assessment.findings
        .filter((finding) => finding.nextStep !== null)
        .map((finding) => finding.nextStep)
        .slice(0, 10);
}
//# sourceMappingURL=assess.js.map