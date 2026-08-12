/**
 * The feature contract.
 *
 * A feature is a single measured quantity derived from evidence. Every feature
 * carries the event ids that produced it, so any number appearing in a report
 * can be traced back to the exact evidence behind it. Without that link an
 * explanation is just an assertion.
 *
 * Features deliberately do NOT carry weights, thresholds or verdicts. They say
 * what was observed; deciding what it means belongs to layer assessment and
 * scoring, which run later and can see all layers at once.
 */
/**
 * How a feature relates to trust, in the abstract.
 *
 * This mirrors the event registry's polarity but applies to a derived quantity.
 * `CONTEXTUAL` exists because many features only acquire meaning alongside
 * others: a high suggestion-acceptance rate is neither good nor bad until you
 * know whether the developer then modified and tested the result.
 */
export const FeaturePolarity = {
    /** Higher values indicate stronger evidence of capability and ownership. */
    SUPPORTIVE: 'SUPPORTIVE',
    /** Descriptive only. Never moves trust or risk in either direction. */
    NEUTRAL: 'NEUTRAL',
    /** Meaning depends entirely on other features; interpret only in a cluster. */
    CONTEXTUAL: 'CONTEXTUAL',
    /** May contribute to risk, but only when corroborated across layers. */
    RISK_CONTRIBUTING: 'RISK_CONTRIBUTING',
    /** Describes how much the evidence base can be relied upon. */
    CONFIDENCE_AFFECTING: 'CONFIDENCE_AFFECTING',
};
/** What kind of quantity a feature holds, so consumers read it correctly. */
export const FeatureKind = {
    /** A [0, 1] proportion. */
    RATIO: 'RATIO',
    /** A non-negative count of occurrences. */
    COUNT: 'COUNT',
    /** Milliseconds. */
    DURATION: 'DURATION',
    /** A rate per unit time, such as events per minute. */
    RATE: 'RATE',
    /** A dimensionless statistic such as a coefficient of variation. */
    INDEX: 'INDEX',
};
export function findFeature(result, name) {
    return result.featuresByName.get(name);
}
/** Reads a feature's value, or a fallback when it could not be computed. */
export function featureValue(result, name, fallback) {
    return result.featuresByName.get(name)?.value ?? fallback;
}
//# sourceMappingURL=contract.js.map