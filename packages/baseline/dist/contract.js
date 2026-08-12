/** Which comparison target produced a deviation, so a reader can judge its worth. */
export const ComparisonBasis = {
    /** The developer's own history. Strongest. */
    SELF: 'SELF',
    /** A matched cohort — same task, same language, similar claimed level. */
    COHORT: 'COHORT',
    /** All developers in the tenant. Weakest; use only with explicit opt-in. */
    POPULATION: 'POPULATION',
    /** No comparison was possible, and none was invented. */
    NONE: 'NONE',
};
/** Adapts a full profile to the narrow shape feature extraction consumes. */
export function toExtractionBaseline(profile) {
    const value = (feature) => profile.established ? (profile.dimensions.get(feature)?.median ?? null) : null;
    return {
        developerId: profile.developerId,
        sessionsObserved: profile.sessionsObserved,
        medianTypingRateCpm: value('typing.rate_cpm'),
        medianInsertionChars: value('typing.median_insertion_chars'),
        medianCorrectionRatio: value('typing.correction_ratio'),
        medianSuggestionAcceptanceRate: value('assist.acceptance_rate'),
        medianErrorRecoveryMs: value('runtime.median_recovery_ms'),
    };
}
//# sourceMappingURL=contract.js.map