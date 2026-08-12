/**
 * @scora/trust-review — Layer 10: human review and the audit trail.
 *
 *   event log → reconstructed review → decision, quality, and access trail
 *
 * This is the only authoritative layer. The engine's recommendations — every
 * one of them — end here, where a human decides against the evidence in front
 * of them, and the engine deliberately has no vocabulary for rejecting a
 * person. A `REJECT` is only ever typed by a human.
 *
 * The layer has no mutable review state. A review is a fold over its events, so
 * the audit trail cannot drift from the record it is supposed to be auditing:
 * they are the same thing read twice.
 */
export { EvidenceKind, ReviewDecision, ReviewPriority, ReviewState, type EvidenceAccess, type OverrideRecord, type QueueEntry, type RecordedDecision, type ReleaseRecord, type ReviewQuality, type ReviewRecord, } from './contract.ts';
export { MINIMUM_RATIONALE_LENGTH, MINIMUM_REVIEW_DURATION_MS, REVIEW_POLICY_VERSION, accessTrail, assessReviewQuality, isAdverse, reconstructReview, reconstructReviews, } from './audit.ts';
export { buildReviewRoutes, impliedDecision, type ReviewRouteDependencies, } from './routes.ts';
export { inMemoryReviewIndex, type ReviewIndex, type ReviewLocation, } from './queue.ts';
//# sourceMappingURL=index.d.ts.map