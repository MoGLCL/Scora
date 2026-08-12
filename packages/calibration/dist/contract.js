/**
 * What a fair reviewer would conclude, given the whole evidence package.
 *
 * Deliberately not `HONEST` / `CHEATED`. SCORA does not measure how little AI a
 * developer used, so a label saying "cheated" would smuggle back in the very
 * question the engine is not asking. The label answers something narrower and
 * answerable: was there a real reason to take a human's time over this session?
 */
export const CaseLabel = {
    /**
     * The developer owns and understands the work.
     *
     * True regardless of how much AI helped. A session labelled this way is one
     * where flagging the developer would be a mistake with a cost to a person.
     */
    OWNS_WORK: 'OWNS_WORK',
    /**
     * A human should genuinely look.
     *
     * Not "the developer is guilty" — the reviewer may well clear them. It means
     * the evidence contains something a reasonable reviewer would want explained.
     */
    WARRANTS_REVIEW: 'WARRANTS_REVIEW',
    /**
     * Too little evidence to have an opinion, and the engine must say so.
     *
     * A short or heavily-truncated session belongs here. Scoring one of these as
     * either of the above is its own kind of error: an unfounded claim.
     */
    INDETERMINATE: 'INDETERMINATE',
};
/**
 * Where a label came from, because the two kinds are not equally trustworthy.
 *
 * Synthetic cases are constructed, so their labels are true by definition but
 * only test what we thought to construct. Reviewed cases are real sessions a
 * human ruled on, so their labels are evidence about the world — and they are
 * the only ones that can reveal a false positive nobody predicted.
 */
export const LabelSource = {
    /** Built by hand in the corpus. Label is a design decision. */
    SYNTHETIC: 'SYNTHETIC',
    /** Taken from a recorded Layer 10 decision. Label is a human's judgement. */
    HUMAN_REVIEW: 'HUMAN_REVIEW',
};
/**
 * Traits a case carries, so error rates can be broken out by group.
 *
 * An aggregate false-positive rate of 2% is worthless if all of it lands on
 * developers who use dictation software. These tags exist to make that visible,
 * and the report fails the subgroup gate rather than the average.
 */
export const CaseTrait = {
    /** Assistive input: dictation, snippet expansion, switch access, screen reader. */
    ASSISTIVE_INPUT: 'ASSISTIVE_INPUT',
    /** Works from their own prior code, so paste volume is high and legitimate. */
    REUSES_OWN_CODE: 'REUSES_OWN_CODE',
    /** Writes English as an additional language; comments and names may be terse. */
    ADDITIONAL_LANGUAGE: 'ADDITIONAL_LANGUAGE',
    /** Heavy but declared AI assistance. Allowed, and not a concern by itself. */
    HEAVY_AI_ASSISTANCE: 'HEAVY_AI_ASSISTANCE',
    /** Unusually fast typist. Fast typing is not evidence of anything. */
    FAST_TYPIST: 'FAST_TYPIST',
    /** Slow, deliberate, long pauses. Thinking is not evidence of anything either. */
    DELIBERATE_PACE: 'DELIBERATE_PACE',
    /** Poor connectivity: gaps in the stream that are the network's fault. */
    DEGRADED_CAPTURE: 'DEGRADED_CAPTURE',
    /** First session on the platform, so there is no personal baseline yet. */
    NO_BASELINE: 'NO_BASELINE',
    /** Junior developer whose absolute numbers look nothing like a senior's. */
    EARLY_CAREER: 'EARLY_CAREER',
    /** Consented to the minimum scope only, so whole layers are absent. */
    MINIMAL_CONSENT: 'MINIMAL_CONSENT',
};
/**
 * How a recommendation lands on a developer.
 *
 * The engine has five recommendations and no `REJECT`, but for measuring harm
 * what matters is coarser: did this outcome cost the developer something? Being
 * sent to human review costs time, attention, and standing, whether or not the
 * reviewer clears them. That is the cost a false-positive rate must count.
 */
export const Consequence = {
    /** Nothing is asked of the developer. */
    NONE: 'NONE',
    /** Questions are put to them, at interview. Cheap, but not free. */
    QUESTIONED: 'QUESTIONED',
    /** A human reads their session. This is the outcome worth being afraid of. */
    ESCALATED: 'ESCALATED',
    /** The engine declines to assess. Costs nothing and claims nothing. */
    DECLINED: 'DECLINED',
};
//# sourceMappingURL=contract.js.map