import type { DeveloperId, EpochMs, EventId, SessionId, TenantId } from '@scora/trust-core';
import type { Recommendation } from '@scora/trust-scoring';
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
export declare const ReviewDecision: {
    readonly APPROVE: "APPROVE";
    readonly REJECT: "REJECT";
    /** Not a verdict: send it back for more evidence, a re-interview, or a second reviewer. */
    readonly REQUEST_REVIEW: "REQUEST_REVIEW";
};
export type ReviewDecision = (typeof ReviewDecision)[keyof typeof ReviewDecision];
/** The kinds of evidence a reviewer can open. Each access is recorded separately. */
export declare const EvidenceKind: {
    readonly FINAL_CODE: "final_code";
    readonly CODE_EVOLUTION: "code_evolution";
    readonly BEHAVIORAL_TIMELINE: "behavioral_timeline";
    readonly RUNTIME_HISTORY: "runtime_history";
    readonly EXTERNAL_ACTIVITY: "external_activity";
    readonly AI_ASSISTANCE: "ai_assistance";
    readonly SKILL_CONFIDENCE: "skill_confidence";
    readonly INTERVIEW_TRANSCRIPT: "interview_transcript";
    readonly INTERVIEW_RECORDING: "interview_recording";
    readonly AI_ANALYSIS: "ai_analysis";
};
export type EvidenceKind = (typeof EvidenceKind)[keyof typeof EvidenceKind];
export declare const ReviewPriority: {
    readonly LOW: "low";
    readonly NORMAL: "normal";
    readonly HIGH: "high";
    readonly URGENT: "urgent";
};
export type ReviewPriority = (typeof ReviewPriority)[keyof typeof ReviewPriority];
export declare const ReviewState: {
    /** Assigned, not yet opened. */
    readonly PENDING: "PENDING";
    /** Opened; evidence may or may not have been accessed. */
    readonly IN_PROGRESS: "IN_PROGRESS";
    /** A decision is recorded. Immutable from here. */
    readonly DECIDED: "DECIDED";
    /** The outcome has been released to the developer. */
    readonly RELEASED: "RELEASED";
};
export type ReviewState = (typeof ReviewState)[keyof typeof ReviewState];
/**
 * One access to one kind of evidence.
 *
 * `viewDurationMs` is nullable because a client that navigated away without a
 * clean close cannot honestly report a duration, and inventing one would put a
 * fabricated number into an audit record.
 */
export interface EvidenceAccess {
    readonly eventId: EventId;
    readonly at: EpochMs;
    readonly reviewerId: string;
    readonly evidenceKind: EvidenceKind;
    readonly viewDurationMs: number | null;
}
/**
 * A recorded decision.
 *
 * The rationale text itself never enters this package — only its length and its
 * hash. The text lives in the tenant's own storage under their retention policy;
 * the hash is what makes it tamper-evident, and the length is what lets the
 * engine tell a reasoned decision from an empty one without ever reading it.
 */
export interface RecordedDecision {
    readonly eventId: EventId;
    readonly at: EpochMs;
    readonly reviewerId: string;
    readonly decision: ReviewDecision;
    readonly rationaleLength: number;
    readonly rationaleHash: string;
    readonly reviewDurationMs: number;
}
/**
 * A reviewer disagreeing with the engine, recorded as a fact rather than a fault.
 *
 * Both directions matter equally. A reviewer approving what the engine flagged
 * is a false positive — the failure mode SCORA cares most about. A reviewer
 * rejecting what the engine supported is a false negative. Step 10 reads both.
 */
export interface OverrideRecord {
    readonly eventId: EventId;
    readonly at: EpochMs;
    readonly reviewerId: string;
    readonly engineRecommendation: Recommendation | string;
    readonly humanDecision: ReviewDecision;
    readonly engineTrustScore: number;
    readonly rationaleHash: string;
}
export interface ReleaseRecord {
    readonly eventId: EventId;
    readonly at: EpochMs;
    readonly releasedBy: string;
    readonly channel: 'dashboard' | 'email' | 'api' | 'webhook';
    readonly scheduledFor: number | null;
}
/**
 * The full, reconstructed history of one review.
 *
 * Derived from the event log every time rather than stored as mutable state.
 * A review that cannot be rebuilt from its events is a review whose audit trail
 * has a hole in it, and this type is what makes that impossible by construction.
 */
export interface ReviewRecord {
    readonly reviewId: string;
    readonly tenantId: TenantId;
    readonly sessionId: SessionId;
    readonly developerId: DeveloperId;
    readonly state: ReviewState;
    readonly assignedTo: string | null;
    readonly assignedBy: string | null;
    readonly priority: ReviewPriority;
    readonly assignedAt: EpochMs | null;
    readonly openedAt: EpochMs | null;
    readonly accesses: readonly EvidenceAccess[];
    readonly decision: RecordedDecision | null;
    readonly override: OverrideRecord | null;
    readonly release: ReleaseRecord | null;
}
/**
 * How much weight this review can bear — about the *process*, never the person.
 *
 * A reviewer is not being assessed here. The question is whether this particular
 * decision was made under conditions that justify relying on it, which is the
 * same question the engine asks of its own outputs via Confidence. A decision
 * made in nine seconds without opening the code is still authoritative; it is
 * simply not a decision anyone should cite as corroboration.
 */
export interface ReviewQuality {
    /** Did the reviewer open any evidence at all before deciding? */
    readonly evidenceOpened: boolean;
    /** Distinct kinds of evidence accessed. */
    readonly kindsAccessed: number;
    /** Was a rationale of usable length recorded? */
    readonly rationaleRecorded: boolean;
    /** Time from opening the package to recording the decision. */
    readonly reviewDurationMs: number | null;
    /**
     * Concerns about the process, in plain language. Empty is the normal case.
     * Never phrased as an accusation against the reviewer.
     */
    readonly concerns: readonly string[];
    /**
     * Whether this decision is sound enough to be cited as corroboration
     * elsewhere. A decision is always *binding*; this says whether it is
     * *evidence*.
     */
    readonly citable: boolean;
}
/** A review awaiting a decision, for the reviewer's queue. */
export interface QueueEntry {
    readonly reviewId: string;
    readonly sessionId: SessionId;
    readonly developerId: DeveloperId;
    readonly priority: ReviewPriority;
    readonly state: ReviewState;
    readonly assignedTo: string | null;
    readonly assignedAt: EpochMs | null;
    /** Present when scoring ran; the reviewer sees what the engine thought. */
    readonly engineRecommendation: Recommendation | null;
}
//# sourceMappingURL=contract.d.ts.map