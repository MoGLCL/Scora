import { LAYER_DEFINITIONS } from '@scora/trust-core';
import { RECOMMENDATION } from "./contract.js";
/**
 * Renders a scoring result as the explanation a reviewer reads.
 *
 * This exists in the scoring package rather than the UI because the wording of a
 * finding is part of the policy, not a presentation detail. A cluster that fires
 * must be described as a question requiring corroboration wherever it is shown,
 * and that guarantee is easier to keep in one place than to re-implement per
 * surface.
 */
export function renderReport(result) {
    const lines = [];
    lines.push('SCORA TRUST REPORT');
    lines.push('='.repeat(72));
    lines.push('');
    lines.push(`Trust Score       ${String(result.trust).padStart(3)}`);
    lines.push(`Risk Score        ${String(result.risk).padStart(3)}`);
    lines.push(`Confidence        ${String(result.confidence).padStart(3)}%`);
    lines.push(`Recommendation    ${result.recommendation}`);
    lines.push('');
    lines.push(result.explanation.headline);
    lines.push('');
    if (result.explanation.positiveEvidence.length > 0) {
        lines.push('SUPPORTING EVIDENCE');
        for (const note of result.explanation.positiveEvidence) {
            lines.push(`  + ${note.note}`);
            lines.push(`      ${note.name} = ${round(note.value)}  (${note.evidence.length} event(s))`);
        }
        lines.push('');
    }
    if (result.explanation.riskEvidence.length > 0) {
        lines.push('CORROBORATED CONCERNS');
        for (const finding of result.explanation.riskEvidence) {
            lines.push(`  ! ${finding.definition.title}`);
            lines.push(`      severity ${round(finding.severity)}  confidence ${round(finding.confidence)}  ` +
                `${finding.conditionsMet}/${finding.conditionsTotal} conditions met ` +
                `across ${finding.layersCorroborating.length} layers`);
            for (const outcome of finding.outcomes) {
                const mark = outcome.indeterminate === true ? '?' : outcome.met ? 'x' : '-';
                lines.push(`      [${mark}] ${outcome.reason}`);
            }
            lines.push(`      How to read this: ${finding.definition.interpretation}`);
            lines.push('');
        }
    }
    else {
        lines.push('CORROBORATED CONCERNS');
        lines.push('  None. No risk pattern had enough independent corroboration to fire.');
        lines.push('');
    }
    if (result.explanation.mitigatingEvidence.length > 0) {
        lines.push('MITIGATING EVIDENCE');
        for (const note of result.explanation.mitigatingEvidence) {
            lines.push(`  + ${note.note}`);
        }
        lines.push('');
    }
    lines.push('LAYER ASSESSMENTS');
    for (const layer of result.layers) {
        const standing = layer.standing === null ? ' n/a' : String(Math.round(layer.standing * 100)).padStart(4);
        lines.push(`  ${standing}  ${shortName(layer.layer)}  (coverage ${pct(layer.coverage)})`);
    }
    lines.push('');
    if (result.explanation.suggestedQuestions.length > 0) {
        lines.push('SUGGESTED INTERVIEW QUESTIONS');
        for (const question of result.explanation.suggestedQuestions) {
            lines.push(`  ? ${question}`);
        }
        lines.push('');
    }
    lines.push('CONFIDENCE FACTORS');
    for (const factor of result.explanation.confidenceFactors) {
        lines.push(`  . ${factor}`);
    }
    lines.push('');
    lines.push('LIMITATIONS');
    for (const limitation of result.limitations) {
        lines.push(`  . ${limitation}`);
    }
    lines.push('');
    lines.push(`policy ${result.policyVersion}`);
    return lines.join('\n');
}
/**
 * The single sentence a developer is entitled to see.
 *
 * Never names a cluster: a developer should not be told "you triggered the
 * dependence pattern" by an automated system before a human has looked at it.
 */
export function developerFacingSummary(result) {
    switch (result.recommendation) {
        case RECOMMENDATION.SUPPORTED:
            return 'Your submission was assessed and the evidence supports your authorship of the work.';
        case RECOMMENDATION.SUPPORTED_LOW_CONFIDENCE:
            return 'Your submission was assessed. The evidence is supportive, though the session was short enough that we collected relatively little of it.';
        case RECOMMENDATION.CLARIFICATION_SUGGESTED:
            return 'Your submission was assessed. A follow-up conversation about some of your implementation choices is suggested.';
        case RECOMMENDATION.HUMAN_REVIEW_REQUIRED:
            return 'Your submission has been referred to a human reviewer, who will look at the full session before any decision is made.';
        case RECOMMENDATION.INSUFFICIENT_EVIDENCE:
            return 'We were unable to collect enough session data to assess this submission automatically. This is a limitation on our side, not a finding about your work.';
        default:
            return 'Your submission was assessed.';
    }
}
function shortName(layer) {
    return LAYER_DEFINITIONS[layer].name.padEnd(30);
}
function pct(value) {
    return `${Math.round(value * 100)}%`;
}
function round(value) {
    return Number(value.toFixed(3));
}
//# sourceMappingURL=report.js.map