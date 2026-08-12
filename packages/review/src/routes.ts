import {
  EVENT_SCHEMA_VERSION,
  EventSource,
  HumanReviewEventType,
  SessionId,
  unsafeEpochMs,
  type Clock,
  type CryptoPort,
  type EventStore,
  type IdGenerator,
  type SessionId as SessionIdType,
  type TenantId,
  type TrustEvent,
} from '@scora/trust-core';
import { extractFeatures } from '@scora/trust-features';
import { RECOMMENDATION, score, type Recommendation } from '@scora/trust-scoring';
import {
  PrincipalKind,
  Role,
  type ApiResponse,
  type MatchedRequest,
  type Principal,
  type RouteDefinition,
} from '@scora/trust-api';
import type { Ingestion } from '@scora/trust-storage';
import {
  EvidenceKind,
  ReviewDecision,
  ReviewPriority,
  ReviewState,
  type QueueEntry,
  type ReviewQuality,
  type ReviewRecord,
} from './contract.ts';
import {
  MINIMUM_RATIONALE_LENGTH,
  accessTrail,
  assessReviewQuality,
  isAdverse,
  reconstructReview,
} from './audit.ts';
import type { ReviewIndex } from './queue.ts';

/**
 * The reviewer's endpoints.
 *
 * Mounted into the same authenticated, access-logged app as everything else via
 * `additionalRoutes`, so the three rules in `@scora/trust-api`'s routes file
 * apply here unchanged: tenant comes from the credential, a not-yours read is
 * indistinguishable from a not-found read, and reads are scoped by principal
 * kind and not only by role.
 *
 * Two things are specific to this layer.
 *
 * **The rationale text is hashed at the boundary and discarded.** It arrives in
 * the request, it is measured and hashed here, and what continues into the log
 * is a length and a digest. The prose belongs to the tenant's own storage under
 * their retention policy; SCORA keeps only enough to prove it existed and has
 * not changed.
 *
 * **An override is detected, never declared.** There is no "I am overriding the
 * engine" flag for a reviewer to tick. The engine compares its own position to
 * the decision and records the disagreement itself, because a reviewer who has
 * to opt in to being counted as a disagreement will under-report — and the
 * cases they quietly skip are exactly the ones Step 10 needs most.
 */

export interface ReviewRouteDependencies {
  readonly store: EventStore;
  readonly ingestion: Ingestion;
  readonly index: ReviewIndex;
  readonly clock: Clock;
  readonly crypto: CryptoPort;
  readonly ids: IdGenerator;
}

export function buildReviewRoutes(
  dependencies: ReviewRouteDependencies,
): readonly RouteDefinition[] {
  const { store, ingestion, index, clock, crypto, ids } = dependencies;

  return [
    {
      method: 'POST',
      pattern: '/v1/sessions/:sessionId/reviews',
      roles: [Role.REVIEW],
      summary: 'Open a review on a session and assign it to a reviewer.',
      async handler(request, principal) {
        const matched = request as MatchedRequest;
        const sessionId = SessionId.unsafe(matched.params['sessionId'] ?? '');
        const body = isRecord(matched.body) ? matched.body : {};

        const events = await store.readSession(principal.tenantId, sessionId);
        if (events.length === 0) return notFound();

        const reviewerId = stringField(body, 'reviewerId') ?? principal.subject;
        const reviewId = stringField(body, 'reviewId') ?? `rev_${ids.eventId().slice(4)}`;
        const priority = priorityField(body['priority']);

        const existing = reconstructReview(events, reviewId);
        if (existing !== null) {
          // Idempotent on reviewId. A retried assignment must not append a
          // second REVIEW_ASSIGNED and make the audit read as a reassignment.
          return { status: 200, body: present(existing) };
        }

        await appendReviewEvents(principal, sessionId, events, [
          {
            type: HumanReviewEventType.REVIEW_ASSIGNED,
            payload: {
              reviewId,
              reviewerId,
              assignedBy: principal.subject,
              priority,
            },
          },
        ]);

        await index.note(principal.tenantId, reviewId, sessionId);

        const record = await load(principal, reviewId);
        return record === null ? notFound() : { status: 201, body: present(record) };
      },
    },

    {
      method: 'GET',
      pattern: '/v1/reviews',
      roles: [Role.REVIEW],
      summary: 'The review queue: everything not yet decided, most urgent first.',
      async handler(request, principal) {
        const matched = request as MatchedRequest;
        const mine = matched.query['assignedTo'] ?? null;
        const includeDecided = matched.query['includeDecided'] === 'true';

        const locations = await index.list(principal.tenantId, {
          limit: parsePositiveInt(matched.query['limit']) ?? 100,
        });

        const entries: QueueEntry[] = [];
        for (const location of locations) {
          const events = await store.readSession(principal.tenantId, location.sessionId);
          const record = reconstructReview(events, location.reviewId);
          if (record === null) continue;
          if (!includeDecided && record.decision !== null) continue;
          if (mine !== null && record.assignedTo !== mine) continue;

          entries.push({
            reviewId: record.reviewId,
            sessionId: record.sessionId,
            developerId: record.developerId,
            priority: record.priority,
            state: record.state,
            assignedTo: record.assignedTo,
            assignedAt: record.assignedAt,
            engineRecommendation: engineRecommendation(events, principal.tenantId, record),
          });
        }

        return { status: 200, body: { reviews: entries.toSorted(byUrgency) } };
      },
    },

    {
      method: 'GET',
      pattern: '/v1/reviews/:reviewId',
      roles: [Role.REVIEW],
      summary: 'The reconstructed review, its audit trail, and how much weight it can bear.',
      async handler(request, principal) {
        const record = await load(principal, matchedParam(request, 'reviewId'));
        return record === null ? notFound() : { status: 200, body: present(record) };
      },
    },

    {
      method: 'POST',
      pattern: '/v1/reviews/:reviewId/open',
      roles: [Role.REVIEW],
      summary: 'Record that the reviewer opened the package. Starts the review clock.',
      async handler(request, principal) {
        const reviewId = matchedParam(request, 'reviewId');
        const located = await locate(principal, reviewId);
        if (located === null) return notFound();

        if (located.record.decision !== null) return decided();

        await appendReviewEvents(principal, located.sessionId, located.events, [
          {
            type: HumanReviewEventType.REVIEW_OPENED,
            payload: { reviewId, reviewerId: principal.subject },
          },
        ]);

        const record = await load(principal, reviewId);
        return record === null ? notFound() : { status: 200, body: present(record) };
      },
    },

    {
      method: 'POST',
      pattern: '/v1/reviews/:reviewId/evidence',
      roles: [Role.REVIEW],
      summary: 'Record that a reviewer opened one kind of evidence, and for how long.',
      async handler(request, principal) {
        const matched = request as MatchedRequest;
        const reviewId = matchedParam(request, 'reviewId');
        const body = isRecord(matched.body) ? matched.body : {};

        const evidenceKind = evidenceKindField(body['evidenceKind']);
        if (evidenceKind === null) {
          return problem(400, 'Bad Request', 'evidenceKind must be one of the recorded kinds');
        }

        const located = await locate(principal, reviewId);
        if (located === null) return notFound();
        if (located.record.decision !== null) return decided();

        // Null rather than zero when the client cannot say. A duration invented
        // to fill a field is a fabricated number in an audit record, and this
        // record may one day have to answer "who watched the recording".
        const raw = body['viewDurationMs'];
        const viewDurationMs = typeof raw === 'number' && raw >= 0 ? Math.round(raw) : null;

        await appendReviewEvents(principal, located.sessionId, located.events, [
          {
            type: HumanReviewEventType.REVIEW_EVIDENCE_ACCESSED,
            payload: {
              reviewId,
              reviewerId: principal.subject,
              evidenceKind,
              viewDurationMs,
            },
          },
        ]);

        const record = await load(principal, reviewId);
        return record === null ? notFound() : { status: 200, body: present(record) };
      },
    },

    {
      method: 'POST',
      pattern: '/v1/reviews/:reviewId/decision',
      roles: [Role.REVIEW],
      summary: 'Record the decision. Adverse decisions require a written rationale.',
      async handler(request, principal) {
        const matched = request as MatchedRequest;
        const reviewId = matchedParam(request, 'reviewId');
        const body = isRecord(matched.body) ? matched.body : {};

        const decision = decisionField(body['decision']);
        if (decision === null) {
          return problem(400, 'Bad Request', 'decision must be APPROVE, REJECT, or REQUEST_REVIEW');
        }

        const rationale = typeof body['rationale'] === 'string' ? body['rationale'].trim() : '';

        // The one rule enforced at write time rather than described afterwards.
        // Everything else `assessReviewQuality` reports — an unopened package, a
        // nine-second review — is already in the past by the time it is
        // detected. A missing reason is not: the reviewer is right there and can
        // supply one, and a developer who is rejected is entitled to it.
        if (isAdverse(decision) && rationale.length < MINIMUM_RATIONALE_LENGTH) {
          return {
            status: 422,
            body: {
              type: 'about:blank',
              title: 'Unprocessable Entity',
              status: 422,
              detail: 'an adverse decision requires a written rationale',
              errors: [
                {
                  path: 'rationale',
                  message: `at least ${String(MINIMUM_RATIONALE_LENGTH)} characters; the developer is entitled to a reason, and the engine cannot supply one on the reviewer's behalf`,
                },
              ],
            },
          };
        }

        const located = await locate(principal, reviewId);
        if (located === null) return notFound();
        if (located.record.decision !== null) return decided();

        const now = clock.now();
        const openedAt = located.record.openedAt ?? located.record.assignedAt ?? now;
        const reviewDurationMs = Math.max(0, now - openedAt);

        // Hashed here, and the text goes no further. `rationaleHash` is the only
        // form of it that enters the log.
        const rationaleHash = crypto.sha256(rationale);

        const assessment = engineAssessment(located.events, principal.tenantId, located.record);
        const enginePosition = impliedDecision(assessment?.recommendation ?? null);

        const pending: PendingEvent[] = [
          {
            type: HumanReviewEventType.REVIEW_DECISION_RECORDED,
            payload: {
              reviewId,
              reviewerId: principal.subject,
              decision,
              rationaleLength: rationale.length,
              rationaleHash,
              reviewDurationMs,
            },
          },
        ];

        // Detected, not declared. Recorded whichever way the disagreement runs:
        // a reviewer clearing what the engine flagged is the false positive this
        // platform exists to minimise, and a reviewer rejecting what the engine
        // supported is the false negative. Step 10 reads both and decides what
        // each is worth — `engineRecommendation` and `engineTrustScore` travel
        // with the event precisely so that this layer does not have to.
        if (assessment !== null && enginePosition !== null && enginePosition !== decision) {
          pending.push({
            type: HumanReviewEventType.RECOMMENDATION_OVERRIDDEN,
            payload: {
              reviewId,
              reviewerId: principal.subject,
              engineRecommendation: enginePosition,
              humanDecision: decision,
              engineTrustScore: clampScore(assessment.trust),
              rationaleHash,
            },
          });
        }

        await appendReviewEvents(principal, located.sessionId, located.events, pending);

        const record = await load(principal, reviewId);
        if (record === null) return notFound();

        return {
          status: 201,
          body: {
            ...present(record),
            // Not a veto. The engine reports where its own evidence stood so the
            // reviewer knows when they have gone beyond it — which is their
            // right, and is the sort of thing a person should be told they are
            // doing rather than discover in an appeal.
            engineContext:
              assessment === null
                ? null
                : {
                    recommendation: assessment.recommendation,
                    trust: assessment.trust,
                    confidence: assessment.confidence,
                    overrode: enginePosition !== null && enginePosition !== decision,
                    note:
                      isAdverse(decision) && assessment.confidence < 45
                        ? 'The engine did not have enough confidence to support an adverse outcome. This decision rests on the reviewer’s own judgement of the evidence.'
                        : null,
                  },
          },
        };
      },
    },

    {
      method: 'POST',
      pattern: '/v1/reviews/:reviewId/release',
      roles: [Role.REVIEW],
      summary: 'Release the decided outcome to the developer.',
      async handler(request, principal) {
        const matched = request as MatchedRequest;
        const reviewId = matchedParam(request, 'reviewId');
        const body = isRecord(matched.body) ? matched.body : {};

        const located = await locate(principal, reviewId);
        if (located === null) return notFound();

        if (located.record.decision === null) {
          return problem(409, 'Conflict', 'nothing to release: no decision has been recorded');
        }
        if (located.record.release !== null) {
          return { status: 200, body: present(located.record) };
        }

        const channel = channelField(body['channel']);
        const scheduledFor =
          typeof body['scheduledFor'] === 'number' ? Math.round(body['scheduledFor']) : null;

        await appendReviewEvents(principal, located.sessionId, located.events, [
          {
            type: HumanReviewEventType.RESULT_RELEASED,
            payload: { reviewId, releasedBy: principal.subject, channel, scheduledFor },
          },
        ]);

        const record = await load(principal, reviewId);
        return record === null ? notFound() : { status: 200, body: present(record) };
      },
    },

    {
      method: 'GET',
      pattern: '/v1/sessions/:sessionId/access-trail',
      roles: [Role.READ_EVIDENCE],
      summary: 'Who opened this session’s evidence, what they opened, and for how long.',
      async handler(request, principal) {
        return await trailFor(principal, matchedParam(request, 'sessionId'));
      },
    },

    /**
     * The same trail, for the person it is about.
     *
     * A separate route rather than one route declaring both roles, because
     * `resolveRoles` refuses a developer credential any route that mentions a
     * staff-only role — READ_EVIDENCE among them — and it is right to. Pairing
     * the two would have read as "staff or the subject" and silently meant
     * "staff only", which is the sort of quiet denial nobody notices until a
     * developer asks who watched their recording and is told nothing.
     */
    {
      method: 'GET',
      pattern: '/v1/me/access-trail/:sessionId',
      roles: [Role.READ_OWN_OUTCOME],
      summary: 'Who opened my evidence, what they opened, and for how long.',
      async handler(request, principal) {
        return await trailFor(principal, matchedParam(request, 'sessionId'));
      },
    },
  ];

  async function trailFor(principal: Principal, rawSessionId: string): Promise<ApiResponse> {
    const sessionId = SessionId.unsafe(rawSessionId);
    const events = await store.readSession(principal.tenantId, sessionId);
    if (events.length === 0) return notFound();

    // A developer may read the trail for their own session and no other. Same
    // 404 as a session that does not exist, so this cannot be used to find out
    // whether someone else sat this assessment.
    const first = events[0]!;
    if (
      principal.kind === PrincipalKind.DEVELOPER &&
      principal.developerId !== undefined &&
      principal.developerId !== first.developerId
    ) {
      return notFound();
    }

    return {
      status: 200,
      body: {
        sessionId,
        // The developer's own answer to "who looked at my interview recording".
        // A system that holds a recording of someone and cannot tell them who
        // watched it has not earned the right to hold it.
        accesses: accessTrail(events, sessionId),
      },
    };
  }

  interface Located {
    readonly sessionId: SessionIdType;
    readonly events: readonly TrustEvent[];
    readonly record: ReviewRecord;
  }

  async function locate(principal: Principal, reviewId: string): Promise<Located | null> {
    const sessionId = await index.locate(principal.tenantId, reviewId);
    if (sessionId === null) return null;

    const events = await store.readSession(principal.tenantId, sessionId);
    const record = reconstructReview(events, reviewId);
    return record === null ? null : { sessionId, events, record };
  }

  async function load(principal: Principal, reviewId: string): Promise<ReviewRecord | null> {
    return (await locate(principal, reviewId))?.record ?? null;
  }

  /**
   * Appends Layer 10 events, and refuses to report success if they did not land.
   *
   * The rejection branch throws rather than returning a 4xx. A rejected L10
   * event is not a client mistake — this package built the payload itself, so a
   * rejection means a bug here. Answering 200 while the decision failed to
   * record would leave a reviewer believing they had decided something the log
   * has never heard of, which is the worst failure this layer has.
   */
  async function appendReviewEvents(
    principal: Principal,
    sessionId: SessionIdType,
    known: readonly TrustEvent[],
    pending: readonly PendingEvent[],
  ): Promise<void> {
    const head = await store.head(principal.tenantId, sessionId);
    const first = known[0];
    const startingSequence = (head?.sequence ?? known.length) + 1;

    const submissions = pending.map((event, offset) => ({
      eventId: ids.eventId(),
      tenantId: principal.tenantId,
      sessionId,
      developerId: first?.developerId,
      ...(first?.taskId === undefined ? {} : { taskId: first.taskId }),
      type: event.type,
      occurredAt: clock.now(),
      sequence: startingSequence + offset,
      // HUMAN is the only source authorised to assert Layer 10, which is what
      // stops a compromised sandbox minting its own approval.
      source: EventSource.HUMAN,
      schemaVersion: EVENT_SCHEMA_VERSION,
      payload: event.payload,
    }));

    const result = await ingestion.ingest(submissions);

    if (result.rejected.length > 0) {
      throw new Error(
        `review events were rejected by ingestion: ${JSON.stringify(
          result.rejected.map((rejection) => ({
            type: rejection.type,
            code: rejection.code,
            issues: rejection.issues,
          })),
        )}`,
      );
    }
  }

  function engineAssessment(
    events: readonly TrustEvent[],
    tenantId: TenantId,
    record: ReviewRecord,
  ): { recommendation: Recommendation; trust: number; confidence: number } | null {
    const first = events[0];
    if (first === undefined) return null;

    const extraction = extractFeatures(events, {
      tenantId,
      sessionId: record.sessionId,
      developerId: record.developerId,
      ...(first.taskId === undefined ? {} : { taskId: first.taskId }),
    });

    const result = score(extraction);
    return {
      recommendation: result.recommendation,
      trust: result.trust,
      confidence: result.confidence,
    };
  }

  function engineRecommendation(
    events: readonly TrustEvent[],
    tenantId: TenantId,
    record: ReviewRecord,
  ): Recommendation | null {
    return engineAssessment(events, tenantId, record)?.recommendation ?? null;
  }
}

/**
 * An event this package is about to append.
 *
 * The type is narrowed to Layer 10 deliberately. This package holds a writable
 * handle on the evidence log, and nothing stops it appending, say, an
 * `AI_SUGGESTION_ACCEPTED` — nothing except this, which makes it a compile
 * error. A review records what a reviewer did and never manufactures evidence
 * about what a developer did.
 */
type HumanReviewEvent = (typeof HumanReviewEventType)[keyof typeof HumanReviewEventType];

interface PendingEvent {
  readonly type: HumanReviewEvent;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * The engine's position, expressed in the vocabulary a human decides in.
 *
 * Note what is missing: nothing maps to `REJECT`. That is not an oversight in
 * the mapping, it is the mapping's whole content — the engine has no `REJECT` to
 * project, because rejecting a person is not an output an algorithm is allowed
 * to have. Only a human's decision can land there.
 */
export function impliedDecision(recommendation: Recommendation | null): ReviewDecision | null {
  switch (recommendation) {
    case RECOMMENDATION.SUPPORTED:
    case RECOMMENDATION.SUPPORTED_LOW_CONFIDENCE:
      return ReviewDecision.APPROVE;
    case RECOMMENDATION.HUMAN_REVIEW_REQUIRED:
    case RECOMMENDATION.CLARIFICATION_SUGGESTED:
      return ReviewDecision.REQUEST_REVIEW;
    // Too little evidence to have a position at all. A reviewer deciding either
    // way here is not contradicting the engine, because the engine did not say
    // anything to contradict, so no override is recorded.
    case RECOMMENDATION.INSUFFICIENT_EVIDENCE:
    default:
      return null;
  }
}

interface Presented {
  readonly review: ReviewRecord;
  readonly quality: ReviewQuality;
}

/**
 * A review never leaves this package without its quality assessment attached.
 *
 * Returning the record alone would let a caller display a decision without the
 * caveats that belong to it, which is the failure this layer exists to prevent.
 */
function present(record: ReviewRecord): Presented {
  return { review: record, quality: assessReviewQuality(record) };
}

const URGENCY: Readonly<Record<ReviewPriority, number>> = {
  [ReviewPriority.URGENT]: 0,
  [ReviewPriority.HIGH]: 1,
  [ReviewPriority.NORMAL]: 2,
  [ReviewPriority.LOW]: 3,
};

function byUrgency(a: QueueEntry, b: QueueEntry): number {
  const priority = URGENCY[a.priority] - URGENCY[b.priority];
  if (priority !== 0) return priority;
  // Oldest first within a priority. A queue that surfaces the newest work first
  // lets a review sit unlooked-at indefinitely while the developer waits.
  return (a.assignedAt ?? unsafeEpochMs(0)) - (b.assignedAt ?? unsafeEpochMs(0));
}

function matchedParam(request: unknown, name: string): string {
  return (request as MatchedRequest).params[name] ?? '';
}

function problem(status: number, title: string, detail: string): ApiResponse {
  return { status, body: { type: 'about:blank', title, status, detail } };
}

/** One response for "no such review" and "not your review". */
function notFound(): ApiResponse {
  return problem(404, 'Not Found', 'no such review');
}

function decided(): ApiResponse {
  return problem(
    409,
    'Conflict',
    'this review has been decided; a recorded decision is immutable, and a further decision needs a new review',
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringField(body: Record<string, unknown>, key: string): string | null {
  const value = body[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function decisionField(value: unknown): ReviewDecision | null {
  return typeof value === 'string' &&
    (Object.values(ReviewDecision) as readonly string[]).includes(value)
    ? (value as ReviewDecision)
    : null;
}

function evidenceKindField(value: unknown): EvidenceKind | null {
  return typeof value === 'string' &&
    (Object.values(EvidenceKind) as readonly string[]).includes(value)
    ? (value as EvidenceKind)
    : null;
}

function priorityField(value: unknown): ReviewPriority {
  return typeof value === 'string' &&
    (Object.values(ReviewPriority) as readonly string[]).includes(value)
    ? (value as ReviewPriority)
    : ReviewPriority.NORMAL;
}

function channelField(value: unknown): 'dashboard' | 'email' | 'api' | 'webhook' {
  return value === 'email' || value === 'api' || value === 'webhook' ? value : 'dashboard';
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function parsePositiveInt(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export { ReviewState };
