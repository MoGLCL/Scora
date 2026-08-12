import { type SessionId, type TrustEvent } from '@scora/trust-core';
import { ReviewDecision, type EvidenceAccess, type ReviewQuality, type ReviewRecord } from './contract.ts';
/**
 * Rebuilding a review from the log, and judging the process rather than the person.
 *
 * There is no mutable review table here on purpose. A review's state is a fold
 * over its events, which means the audit trail cannot drift from the record it
 * is supposed to be auditing: they are the same thing read twice.
 */
export declare const REVIEW_POLICY_VERSION = "review-1.0.0";
/**
 * A rationale shorter than this is not a reason.
 *
 * Length is a crude proxy and it is used for exactly one thing: telling an empty
 * box from a written explanation. The engine never reads the text.
 */
export declare const MINIMUM_RATIONALE_LENGTH = 40;
/**
 * Below this, nobody read the evidence.
 *
 * Two minutes is not a claim about how long a fair review takes — a reviewer who
 * has already seen the session may decide correctly in three. It is the floor
 * below which the *package cannot have been opened*, which is a different and
 * much safer claim.
 */
export declare const MINIMUM_REVIEW_DURATION_MS = 120000;
/** Adverse decisions carry an obligation the other two do not. */
export declare function isAdverse(decision: ReviewDecision): boolean;
/**
 * Every review in the log, keyed by review id.
 *
 * Events for unknown reviews are not dropped silently — a decision whose
 * assignment is missing still produces a record, because losing the assignment
 * must not lose the decision. `assignedTo` simply stays null and the quality
 * assessment notes it.
 */
export declare function reconstructReviews(events: readonly TrustEvent[]): readonly ReviewRecord[];
/** One review, or null when the log has never heard of it. */
export declare function reconstructReview(events: readonly TrustEvent[], reviewId: string): ReviewRecord | null;
/**
 * Whether a decision was made under conditions that justify relying on it.
 *
 * Read the doc comment on `ReviewQuality` before changing anything here. This
 * never blocks a decision and never grades a reviewer: an unsound review is
 * still binding on the developer's outcome. What it loses is the right to be
 * cited as corroborating evidence by any other layer.
 */
export declare function assessReviewQuality(record: ReviewRecord): ReviewQuality;
/**
 * Who looked at this developer's evidence, and for how long.
 *
 * The privacy answer, and a report the developer is entitled to. Recordings are
 * the most sensitive artefact SCORA holds, and "nobody can tell me who watched
 * it" is not an acceptable answer to give someone about their own interview.
 */
export declare function accessTrail(events: readonly TrustEvent[], sessionId: SessionId): readonly EvidenceAccess[];
//# sourceMappingURL=audit.d.ts.map