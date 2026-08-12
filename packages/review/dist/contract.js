/**
 * Layer 10 — human review and validation.
 *
 * Every other layer produces evidence. This one produces a **decision**, and it
 * is the only layer in the engine that is authoritative: `REVIEW_DECISION_RECORDED`
 * and `RECOMMENDATION_OVERRIDDEN` are the two events in the registry marked
 * `sufficientAlone`, and L10's `corroboratedBy` list is deliberately empty. A
 * human with the evidence in front of them does not need the engine to agree.
 *
 * That authority is exactly why this package is mostly constraints. The engine's
 * own vocabulary has no `REJECT` in it — `RECOMMENDATION` tops out at
 * `HUMAN_REVIEW_REQUIRED`, because naming a machine output `REJECT` would
 * relocate the decision into the algorithm. A person is allowed to reject. What
 * the engine requires in return is that the rejection be **attributable,
 * reasoned, and reversible-in-audit**:
 *
 *   1. **A decision requires evidence to have been opened.** A reviewer who
 *      recorded a decision without accessing the package is recorded as such,
 *      and `reviewQuality` says so. Rubber-stamping is visible.
 *   2. **An adverse decision requires a rationale.** Not a checkbox — free text,
 *      length-checked, hashed into the log. A developer who is rejected is
 *      entitled to know why, and "the algorithm said so" is not a reason a human
 *      may give.
 *   3. **Disagreeing with the engine is not an error.** An override is recorded
 *      as a first-class event, never as an exception. It is also the single most
 *      valuable input to Step 10's calibration: every override is a labelled
 *      example of the engine being wrong.
 *   4. **Reading a developer's evidence is itself an event.** Access is logged
 *      per evidence kind, so the developer can be shown who looked at what. A
 *      recording viewed for 40 minutes and a recording never opened are
 *      different facts about a review.
 */
/** What a human may decide. Unlike the engine, a person is allowed to reject. */
export const ReviewDecision = {
    APPROVE: 'APPROVE',
    REJECT: 'REJECT',
    /** Not a verdict: send it back for more evidence, a re-interview, or a second reviewer. */
    REQUEST_REVIEW: 'REQUEST_REVIEW',
};
/** The kinds of evidence a reviewer can open. Each access is recorded separately. */
export const EvidenceKind = {
    FINAL_CODE: 'final_code',
    CODE_EVOLUTION: 'code_evolution',
    BEHAVIORAL_TIMELINE: 'behavioral_timeline',
    RUNTIME_HISTORY: 'runtime_history',
    EXTERNAL_ACTIVITY: 'external_activity',
    AI_ASSISTANCE: 'ai_assistance',
    SKILL_CONFIDENCE: 'skill_confidence',
    INTERVIEW_TRANSCRIPT: 'interview_transcript',
    INTERVIEW_RECORDING: 'interview_recording',
    AI_ANALYSIS: 'ai_analysis',
};
export const ReviewPriority = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
};
export const ReviewState = {
    /** Assigned, not yet opened. */
    PENDING: 'PENDING',
    /** Opened; evidence may or may not have been accessed. */
    IN_PROGRESS: 'IN_PROGRESS',
    /** A decision is recorded. Immutable from here. */
    DECIDED: 'DECIDED',
    /** The outcome has been released to the developer. */
    RELEASED: 'RELEASED',
};
//# sourceMappingURL=contract.js.map