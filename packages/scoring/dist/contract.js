/**
 * The scoring contract.
 *
 * Scoring is the only stage permitted to form a judgement, and it is deliberately
 * constrained in how it may do so:
 *
 *   1. A layer is assessed only from its own features, so a weak signal in one
 *      layer cannot be laundered into another.
 *   2. Risk originates from *clusters* — named, corroborated patterns — never
 *      from an isolated feature. This is the structural answer to "one paste is
 *      not cheating".
 *   3. Confidence is computed independently of Trust. A high Trust score on thin
 *      evidence must be reported as exactly that, not rounded up to a verdict.
 *
 * Nothing here produces a pass/fail. The output is a recommendation plus the
 * evidence for it; a human decides. See `RECOMMENDATION` for why.
 */
/**
 * Recommendations, not decisions.
 *
 * The engine never issues a verdict on a person. Layer 10 exists because a human
 * must make that call with the evidence in front of them; naming these
 * `APPROVE`/`REJECT` would quietly relocate the decision into the algorithm.
 */
export const RECOMMENDATION = {
    /** Evidence supports the developer's ownership of the work. */
    SUPPORTED: 'SUPPORTED',
    /** Supported, but confidence is too thin to stand alone. */
    SUPPORTED_LOW_CONFIDENCE: 'SUPPORTED_LOW_CONFIDENCE',
    /** Specific questions worth putting to the developer, e.g. at interview. */
    CLARIFICATION_SUGGESTED: 'CLARIFICATION_SUGGESTED',
    /** Corroborated concerns; a human must review the full package. */
    HUMAN_REVIEW_REQUIRED: 'HUMAN_REVIEW_REQUIRED',
    /** Too little evidence to say anything. Never adverse to the developer. */
    INSUFFICIENT_EVIDENCE: 'INSUFFICIENT_EVIDENCE',
};
//# sourceMappingURL=contract.js.map