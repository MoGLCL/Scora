import { HumanReviewEventType, } from '@scora/trust-core';
import { EvidenceKind, ReviewDecision, ReviewPriority, ReviewState, } from "./contract.js";
/**
 * Rebuilding a review from the log, and judging the process rather than the person.
 *
 * There is no mutable review table here on purpose. A review's state is a fold
 * over its events, which means the audit trail cannot drift from the record it
 * is supposed to be auditing: they are the same thing read twice.
 */
export const REVIEW_POLICY_VERSION = 'review-1.0.0';
/**
 * A rationale shorter than this is not a reason.
 *
 * Length is a crude proxy and it is used for exactly one thing: telling an empty
 * box from a written explanation. The engine never reads the text.
 */
export const MINIMUM_RATIONALE_LENGTH = 40;
/**
 * Below this, nobody read the evidence.
 *
 * Two minutes is not a claim about how long a fair review takes — a reviewer who
 * has already seen the session may decide correctly in three. It is the floor
 * below which the *package cannot have been opened*, which is a different and
 * much safer claim.
 */
export const MINIMUM_REVIEW_DURATION_MS = 120_000;
/** Adverse decisions carry an obligation the other two do not. */
export function isAdverse(decision) {
    return decision === ReviewDecision.REJECT;
}
/**
 * Every review in the log, keyed by review id.
 *
 * Events for unknown reviews are not dropped silently — a decision whose
 * assignment is missing still produces a record, because losing the assignment
 * must not lose the decision. `assignedTo` simply stays null and the quality
 * assessment notes it.
 */
export function reconstructReviews(events) {
    const byId = new Map();
    for (const event of events) {
        const payload = event.payload;
        const reviewId = typeof payload['reviewId'] === 'string' ? payload['reviewId'] : null;
        if (reviewId === null)
            continue;
        const record = byId.get(reviewId) ?? blank(reviewId, event);
        byId.set(reviewId, record);
        switch (event.type) {
            case HumanReviewEventType.REVIEW_ASSIGNED: {
                record.assignedTo = stringOr(payload['reviewerId'], null);
                record.assignedBy = stringOr(payload['assignedBy'], null);
                record.priority = priorityOf(payload['priority']);
                record.assignedAt = event.occurredAt;
                break;
            }
            case HumanReviewEventType.REVIEW_OPENED: {
                // The earliest open is the one that starts the clock. A reviewer who
                // closes and reopens the package has not restarted their review.
                if (record.openedAt === null)
                    record.openedAt = event.occurredAt;
                if (record.assignedTo === null)
                    record.assignedTo = stringOr(payload['reviewerId'], null);
                break;
            }
            case HumanReviewEventType.REVIEW_EVIDENCE_ACCESSED: {
                const kind = evidenceKindOf(payload['evidenceKind']);
                if (kind === null)
                    break;
                record.accesses.push({
                    eventId: event.eventId,
                    at: event.occurredAt,
                    reviewerId: stringOr(payload['reviewerId'], '') ?? '',
                    evidenceKind: kind,
                    viewDurationMs: typeof payload['viewDurationMs'] === 'number' ? payload['viewDurationMs'] : null,
                });
                break;
            }
            case HumanReviewEventType.REVIEW_DECISION_RECORDED: {
                const decision = decisionOf(payload['decision']);
                if (decision === null)
                    break;
                record.decision = {
                    eventId: event.eventId,
                    at: event.occurredAt,
                    reviewerId: stringOr(payload['reviewerId'], '') ?? '',
                    decision,
                    rationaleLength: typeof payload['rationaleLength'] === 'number' ? payload['rationaleLength'] : 0,
                    rationaleHash: stringOr(payload['rationaleHash'], '') ?? '',
                    reviewDurationMs: typeof payload['reviewDurationMs'] === 'number' ? payload['reviewDurationMs'] : 0,
                };
                break;
            }
            case HumanReviewEventType.RECOMMENDATION_OVERRIDDEN: {
                const human = decisionOf(payload['humanDecision']);
                if (human === null)
                    break;
                record.override = {
                    eventId: event.eventId,
                    at: event.occurredAt,
                    reviewerId: stringOr(payload['reviewerId'], '') ?? '',
                    engineRecommendation: stringOr(payload['engineRecommendation'], '') ?? '',
                    humanDecision: human,
                    engineTrustScore: typeof payload['engineTrustScore'] === 'number' ? payload['engineTrustScore'] : 0,
                    rationaleHash: stringOr(payload['rationaleHash'], '') ?? '',
                };
                break;
            }
            case HumanReviewEventType.RESULT_RELEASED: {
                record.release = {
                    eventId: event.eventId,
                    at: event.occurredAt,
                    releasedBy: stringOr(payload['releasedBy'], '') ?? '',
                    channel: channelOf(payload['channel']),
                    scheduledFor: typeof payload['scheduledFor'] === 'number' ? payload['scheduledFor'] : null,
                };
                break;
            }
            default:
                break;
        }
    }
    return [...byId.values()].map(finalise);
}
/** One review, or null when the log has never heard of it. */
export function reconstructReview(events, reviewId) {
    return reconstructReviews(events).find((record) => record.reviewId === reviewId) ?? null;
}
/**
 * Whether a decision was made under conditions that justify relying on it.
 *
 * Read the doc comment on `ReviewQuality` before changing anything here. This
 * never blocks a decision and never grades a reviewer: an unsound review is
 * still binding on the developer's outcome. What it loses is the right to be
 * cited as corroborating evidence by any other layer.
 */
export function assessReviewQuality(record) {
    const concerns = [];
    const kinds = new Set(record.accesses.map((access) => access.evidenceKind));
    const decision = record.decision;
    const duration = decision?.reviewDurationMs ?? null;
    const rationaleRecorded = decision !== null && decision.rationaleLength >= MINIMUM_RATIONALE_LENGTH;
    if (decision === null) {
        return {
            evidenceOpened: kinds.size > 0,
            kindsAccessed: kinds.size,
            rationaleRecorded: false,
            reviewDurationMs: null,
            concerns: ['No decision has been recorded yet.'],
            citable: false,
        };
    }
    if (kinds.size === 0) {
        concerns.push('A decision was recorded without any evidence being opened. The reviewer may have ' +
            'seen the package elsewhere, but this review cannot show that they did.');
    }
    if (duration !== null && duration < MINIMUM_REVIEW_DURATION_MS) {
        concerns.push(`The decision was recorded ${String(Math.round(duration / 1000))}s after the package was opened, ` +
            'which is less time than reading the evidence takes.');
    }
    if (isAdverse(decision.decision) && !rationaleRecorded) {
        concerns.push('An adverse decision was recorded without a written rationale. A developer who is ' +
            'rejected is entitled to a reason, and the engine cannot supply one on the reviewer’s behalf.');
    }
    if (isAdverse(decision.decision) && !kinds.has(EvidenceKind.FINAL_CODE)) {
        concerns.push('An adverse decision was recorded without opening the submitted code. Behavioural ' +
            'evidence alone does not establish that the work is not the developer’s.');
    }
    if (record.assignedTo !== null && decision.reviewerId !== record.assignedTo) {
        concerns.push(`The decision was recorded by ${decision.reviewerId}, who is not the assigned reviewer ` +
            `(${record.assignedTo}). This is permitted and is recorded here for the audit.`);
    }
    // Blocking concerns are the ones that mean the evidence cannot have been
    // weighed. A hand-off between reviewers is worth recording but does not make
    // the decision unsound, so it is deliberately not in this list.
    const unsound = kinds.size === 0 ||
        (duration !== null && duration < MINIMUM_REVIEW_DURATION_MS) ||
        (isAdverse(decision.decision) && !rationaleRecorded);
    return {
        evidenceOpened: kinds.size > 0,
        kindsAccessed: kinds.size,
        rationaleRecorded,
        reviewDurationMs: duration,
        concerns,
        citable: !unsound,
    };
}
/**
 * Who looked at this developer's evidence, and for how long.
 *
 * The privacy answer, and a report the developer is entitled to. Recordings are
 * the most sensitive artefact SCORA holds, and "nobody can tell me who watched
 * it" is not an acceptable answer to give someone about their own interview.
 */
export function accessTrail(events, sessionId) {
    return reconstructReviews(events)
        .filter((record) => record.sessionId === sessionId)
        .flatMap((record) => record.accesses)
        .toSorted((a, b) => a.at - b.at);
}
function blank(reviewId, event) {
    return {
        reviewId,
        tenantId: event.tenantId,
        sessionId: event.sessionId,
        developerId: event.developerId,
        assignedTo: null,
        assignedBy: null,
        priority: ReviewPriority.NORMAL,
        assignedAt: null,
        openedAt: null,
        accesses: [],
        decision: null,
        override: null,
        release: null,
    };
}
function finalise(record) {
    return {
        ...record,
        state: stateOf(record),
        accesses: record.accesses,
    };
}
function stateOf(record) {
    if (record.release !== null)
        return ReviewState.RELEASED;
    if (record.decision !== null)
        return ReviewState.DECIDED;
    if (record.openedAt !== null || record.accesses.length > 0)
        return ReviewState.IN_PROGRESS;
    return ReviewState.PENDING;
}
function stringOr(value, fallback) {
    return typeof value === 'string' ? value : fallback;
}
function decisionOf(value) {
    return typeof value === 'string' &&
        Object.values(ReviewDecision).includes(value)
        ? value
        : null;
}
function evidenceKindOf(value) {
    return typeof value === 'string' &&
        Object.values(EvidenceKind).includes(value)
        ? value
        : null;
}
function priorityOf(value) {
    return typeof value === 'string' &&
        Object.values(ReviewPriority).includes(value)
        ? value
        : ReviewPriority.NORMAL;
}
function channelOf(value) {
    return value === 'email' || value === 'api' || value === 'webhook' ? value : 'dashboard';
}
//# sourceMappingURL=audit.js.map