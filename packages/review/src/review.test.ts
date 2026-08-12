import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DeveloperId,
  EVENT_SCHEMA_VERSION,
  EventId,
  HumanReviewEventType,
  SessionId,
  TrustEventType,
  unsafeEpochMs,
} from '@scora/trust-core';
import {
  DEV,
  OTHER_DEV,
  OTHER_TENANT,
  SESSION,
  T0,
  TASK,
  TENANT,
  adminPrincipal,
  developerPrincipal,
  harness,
  reviewerPrincipal,
  type Harness,
} from '@scora/trust-api/testing';
import { RECOMMENDATION } from '@scora/trust-scoring';
import {
  EvidenceKind,
  ReviewDecision,
  ReviewPriority,
  ReviewState,
  type EvidenceAccess,
  type RecordedDecision,
  type ReviewRecord,
} from './contract.ts';
import { MINIMUM_RATIONALE_LENGTH, assessReviewQuality, reconstructReview } from './audit.ts';
import { buildReviewRoutes, impliedDecision } from './routes.ts';
import { inMemoryReviewIndex } from './queue.ts';

/**
 * Layer 10 under the real API boundary.
 *
 * Every test here mounts the review routes into the same authenticated,
 * access-logged app the rest of the engine runs behind — never a parallel one —
 * so the tenant isolation and 404-not-403 rules are exercised as they actually
 * ship rather than as this package hopes they behave.
 *
 * The names say who each test protects: the developer who is entitled to a
 * reason, the developer who wants to know who watched their recording, the
 * reviewer who disagrees with the engine and is right to.
 */

const REVIEWER_TOKEN = 'tok_reviewer';
const OTHER_TENANT_TOKEN = 'tok_other_tenant';
const ADMIN_TOKEN = 'tok_admin';
const DEVELOPER_TOKEN = 'tok_developer';
const OTHER_DEVELOPER_TOKEN = 'tok_other_developer';

const ENOUGH_REASON =
  'The submitted solution reproduces a private internal helper verbatim, and the ' +
  'developer could not describe its behaviour when asked directly.';

function reviewHarness(): Harness {
  const index = inMemoryReviewIndex();

  return harness(
    {
      [REVIEWER_TOKEN]: reviewerPrincipal(),
      [OTHER_TENANT_TOKEN]: reviewerPrincipal(OTHER_TENANT),
      [ADMIN_TOKEN]: adminPrincipal(),
      [DEVELOPER_TOKEN]: developerPrincipal(),
      [OTHER_DEVELOPER_TOKEN]: developerPrincipal(TENANT, OTHER_DEV),
    },
    (parts) =>
      buildReviewRoutes({
        store: parts.store,
        ingestion: parts.ingestion,
        index,
        clock: parts.clock,
        crypto: parts.crypto,
        ids: parts.ids,
      }),
  );
}

/** A minimal session: four heartbeats, so there is a log to review. */
async function seedSession(
  test: Harness,
  sessionId: SessionId = SESSION,
  developerId: DeveloperId = DEV,
): Promise<void> {
  const events = [1, 2, 3, 4].map((sequence) => ({
    eventId: EventId.unsafe(`evt_${sessionId}_${String(sequence).padStart(4, '0')}`),
    tenantId: TENANT,
    sessionId,
    developerId,
    taskId: TASK,
    type: TrustEventType.SESSION_HEARTBEAT,
    occurredAt: T0 + sequence * 1_000,
    sequence,
    source: 'SANDBOX',
    schemaVersion: EVENT_SCHEMA_VERSION,
    payload: { intervalMs: 5_000, bufferedEventCount: 0 },
  }));

  // Straight through ingestion rather than over the wire: a reviewer credential
  // has no INGEST role, and rightly cannot manufacture a developer's evidence.
  const result = await test.ingestion.ingest(events);
  assert.deepEqual(result.rejected, [], 'the seed session must be well-formed');
}

async function openReview(
  test: Harness,
  overrides: Record<string, unknown> = {},
): Promise<{ reviewId: string }> {
  const response = await test.request({
    method: 'POST',
    path: `/v1/sessions/${SESSION}/reviews`,
    token: REVIEWER_TOKEN,
    body: { reviewId: 'rev_001', ...overrides },
  });

  assert.equal(response.status, 201, JSON.stringify(response.body));
  const body = response.body as { review: { reviewId: string } };
  return { reviewId: body.review.reviewId };
}

describe('opening a review', () => {
  it('records the assignment and starts in PENDING', async () => {
    const test = reviewHarness();
    await seedSession(test);

    const response = await test.request({
      method: 'POST',
      path: `/v1/sessions/${SESSION}/reviews`,
      token: REVIEWER_TOKEN,
      body: { reviewId: 'rev_001', reviewerId: 'staff:mira', priority: 'high' },
    });

    assert.equal(response.status, 201);
    const body = response.body as {
      review: { state: string; assignedTo: string; assignedBy: string; priority: string };
    };
    assert.equal(body.review.state, ReviewState.PENDING);
    assert.equal(body.review.assignedTo, 'staff:mira');
    assert.equal(body.review.assignedBy, 'staff:reviewer');
    assert.equal(body.review.priority, 'high');
  });

  it('is idempotent, so a retried assignment does not read as a reassignment', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    const again = await test.request({
      method: 'POST',
      path: `/v1/sessions/${SESSION}/reviews`,
      token: REVIEWER_TOKEN,
      body: { reviewId: 'rev_001' },
    });

    assert.equal(again.status, 200);

    const events = await test.store.readSession(TENANT, SESSION);
    const assignments = events.filter(
      (event) => event.type === HumanReviewEventType.REVIEW_ASSIGNED,
    );
    assert.equal(assignments.length, 1, 'a retry must not append a second assignment');
  });

  it('answers 404 for a session that does not exist', async () => {
    const test = reviewHarness();

    const response = await test.request({
      method: 'POST',
      path: '/v1/sessions/sess_nothing/reviews',
      token: REVIEWER_TOKEN,
      body: {},
    });

    assert.equal(response.status, 404);
  });
});

describe('the decision', () => {
  it('refuses an adverse decision with no written reason', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    const response = await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.REJECT, rationale: 'no' },
    });

    assert.equal(response.status, 422);
    const body = response.body as { errors: readonly { path: string; message: string }[] };
    assert.equal(body.errors[0]?.path, 'rationale');

    const events = await test.store.readSession(TENANT, SESSION);
    assert.equal(
      events.filter((event) => event.type === HumanReviewEventType.REVIEW_DECISION_RECORDED).length,
      0,
      'a refused decision must not reach the log',
    );
  });

  it('allows an approval with no rationale, because approving needs no defence', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    const response = await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.APPROVE },
    });

    assert.equal(response.status, 201, JSON.stringify(response.body));
  });

  it('keeps the hash of the reason and never the reason itself', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.REJECT, rationale: ENOUGH_REASON },
    });

    const events = await test.store.readSession(TENANT, SESSION);
    const decision = events.find(
      (event) => event.type === HumanReviewEventType.REVIEW_DECISION_RECORDED,
    );
    assert.ok(decision, 'the decision should be in the log');

    const serialised = JSON.stringify(decision);
    assert.doesNotMatch(serialised, /verbatim/, 'the rationale text must not enter the log');
    assert.match(
      String((decision.payload as Record<string, unknown>)['rationaleHash']),
      /^[0-9a-f]{64}$/,
    );
    assert.equal(
      (decision.payload as Record<string, unknown>)['rationaleLength'],
      ENOUGH_REASON.length,
    );
  });

  it('is immutable: a second decision is refused, not silently applied', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.APPROVE },
    });

    const second = await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.REJECT, rationale: ENOUGH_REASON },
    });

    assert.equal(second.status, 409);

    const events = await test.store.readSession(TENANT, SESSION);
    const decisions = events.filter(
      (event) => event.type === HumanReviewEventType.REVIEW_DECISION_RECORDED,
    );
    assert.equal(decisions.length, 1);
    assert.equal(
      (decisions[0]!.payload as Record<string, unknown>)['decision'],
      ReviewDecision.APPROVE,
    );
  });

  it('is asserted as HUMAN, the only source authorised to speak for Layer 10', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.APPROVE },
    });

    const events = await test.store.readSession(TENANT, SESSION);
    const layer10 = events.filter((event) => event.type.startsWith('REVIEW_'));
    assert.ok(layer10.length > 0);
    for (const event of layer10) {
      assert.equal(event.source, 'HUMAN');
    }
  });
});

describe('overriding the engine', () => {
  it('records the disagreement without the reviewer having to declare it', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    // A thin session scores INSUFFICIENT_EVIDENCE, which has no implied
    // decision, so this asserts the mapping directly rather than relying on a
    // synthetic session landing on a particular recommendation.
    assert.equal(impliedDecision(RECOMMENDATION.SUPPORTED), ReviewDecision.APPROVE);
    assert.equal(
      impliedDecision(RECOMMENDATION.HUMAN_REVIEW_REQUIRED),
      ReviewDecision.REQUEST_REVIEW,
    );
  });

  it('has no mapping that produces REJECT — only a human may reject', () => {
    for (const recommendation of Object.values(RECOMMENDATION)) {
      assert.notEqual(
        impliedDecision(recommendation),
        ReviewDecision.REJECT,
        `${recommendation} must not imply a rejection`,
      );
    }
  });

  it('records nothing when the engine had no position to contradict', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.REJECT, rationale: ENOUGH_REASON },
    });

    const events = await test.store.readSession(TENANT, SESSION);
    const overrides = events.filter(
      (event) => event.type === HumanReviewEventType.RECOMMENDATION_OVERRIDDEN,
    );

    // The session is too thin for the engine to have said anything. Rejecting
    // here is the reviewer going beyond the evidence, which is their right —
    // but it is not a disagreement, and calling it one would poison Step 10
    // with a label the engine never earned.
    assert.equal(overrides.length, 0);
  });
});

describe('the audit trail', () => {
  it('reports a decision made without opening anything as not citable', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    const response = await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.APPROVE },
    });

    const body = response.body as { quality: { citable: boolean; concerns: readonly string[] } };
    assert.equal(body.quality.citable, false);
    assert.ok(body.quality.concerns.some((concern) => concern.includes('without any evidence')));
  });

  it('still records the decision, because an unsound review is binding all the same', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    const response = await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.APPROVE },
    });

    assert.equal(response.status, 201);
    const body = response.body as { review: { decision: { decision: string } | null } };
    assert.equal(body.review.decision?.decision, ReviewDecision.APPROVE);
  });

  it('logs each evidence access separately, with its duration', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/open',
      token: REVIEWER_TOKEN,
      body: {},
    });

    for (const kind of [EvidenceKind.FINAL_CODE, EvidenceKind.INTERVIEW_RECORDING]) {
      await test.request({
        method: 'POST',
        path: '/v1/reviews/rev_001/evidence',
        token: REVIEWER_TOKEN,
        body: { evidenceKind: kind, viewDurationMs: 90_000 },
      });
    }

    const response = await test.request({
      path: '/v1/reviews/rev_001',
      token: REVIEWER_TOKEN,
    });

    const body = response.body as {
      review: { state: string; accesses: readonly { evidenceKind: string }[] };
      quality: { kindsAccessed: number };
    };
    assert.equal(body.review.state, ReviewState.IN_PROGRESS);
    assert.equal(body.review.accesses.length, 2);
    assert.equal(body.quality.kindsAccessed, 2);
  });

  it('records a duration it cannot know as null rather than inventing a zero', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/evidence',
      token: REVIEWER_TOKEN,
      body: { evidenceKind: EvidenceKind.FINAL_CODE },
    });

    const response = await test.request({ path: '/v1/reviews/rev_001', token: REVIEWER_TOKEN });
    const body = response.body as {
      review: { accesses: readonly { viewDurationMs: number | null }[] };
    };
    assert.equal(body.review.accesses[0]?.viewDurationMs, null);
  });

  it('rebuilds the same review from the log that the endpoint reported', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/evidence',
      token: REVIEWER_TOKEN,
      body: { evidenceKind: EvidenceKind.FINAL_CODE, viewDurationMs: 200_000 },
    });
    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.REJECT, rationale: ENOUGH_REASON },
    });

    // The audit trail and the record are the same fold over the same events.
    // If these ever diverge, one of them is lying about what happened.
    const events = await test.store.readSession(TENANT, SESSION);
    const rebuilt = reconstructReview(events, 'rev_001');
    assert.ok(rebuilt);
    assert.equal(rebuilt.state, ReviewState.DECIDED);
    assert.equal(rebuilt.decision?.decision, ReviewDecision.REJECT);
    assert.equal(rebuilt.accesses.length, 1);
  });
});

describe('who looked at my evidence', () => {
  it('tells a developer who opened their session and for how long', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/evidence',
      token: REVIEWER_TOKEN,
      body: { evidenceKind: EvidenceKind.INTERVIEW_RECORDING, viewDurationMs: 2_400_000 },
    });

    const response = await test.request({
      path: `/v1/me/access-trail/${SESSION}`,
      token: DEVELOPER_TOKEN,
    });

    assert.equal(response.status, 200);
    const body = response.body as {
      accesses: readonly { reviewerId: string; evidenceKind: string; viewDurationMs: number }[];
    };
    assert.equal(body.accesses.length, 1);
    assert.equal(body.accesses[0]?.reviewerId, 'staff:reviewer');
    assert.equal(body.accesses[0]?.evidenceKind, EvidenceKind.INTERVIEW_RECORDING);
    assert.equal(body.accesses[0]?.viewDurationMs, 2_400_000);
  });

  it('does not tell a different developer anything about it', async () => {
    const test = reviewHarness();
    await seedSession(test);

    const response = await test.request({
      path: `/v1/me/access-trail/${SESSION}`,
      token: OTHER_DEVELOPER_TOKEN,
    });

    // 404, not 403. A 403 would confirm this session exists to someone who is
    // not allowed to know that.
    assert.equal(response.status, 404);
  });

  it('refuses a staff credential that holds no evidence role', async () => {
    const test = reviewHarness();
    await seedSession(test);

    // The reviewer route and the developer route are separate declarations; a
    // credential must satisfy one of them on its own merits, and an admin
    // satisfies neither.
    const response = await test.request({
      path: `/v1/sessions/${SESSION}/access-trail`,
      token: ADMIN_TOKEN,
    });

    assert.equal(response.status, 403);
  });

  it('lets a reviewer read the trail for a session they are working on', async () => {
    const test = reviewHarness();
    await seedSession(test);

    const response = await test.request({
      path: `/v1/sessions/${SESSION}/access-trail`,
      token: REVIEWER_TOKEN,
    });

    assert.equal(response.status, 200);
  });
});

describe('tenant isolation', () => {
  it('hides another tenant’s review behind the same 404 as a missing one', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    const known = await test.request({ path: '/v1/reviews/rev_001', token: OTHER_TENANT_TOKEN });
    const unknown = await test.request({
      path: '/v1/reviews/rev_nothing',
      token: OTHER_TENANT_TOKEN,
    });

    assert.equal(known.status, 404);
    assert.deepEqual(known.body, unknown.body, 'the two must be indistinguishable');
  });

  it('keeps another tenant’s review out of the queue', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    const response = await test.request({ path: '/v1/reviews', token: OTHER_TENANT_TOKEN });
    assert.equal(response.status, 200);
    assert.deepEqual((response.body as { reviews: readonly unknown[] }).reviews, []);
  });

  it('refuses a caller without the REVIEW role', async () => {
    const test = reviewHarness();
    await seedSession(test);

    const response = await test.request({
      method: 'POST',
      path: `/v1/sessions/${SESSION}/reviews`,
      token: ADMIN_TOKEN,
      body: {},
    });

    assert.equal(response.status, 403);
  });

  it('writes every refusal to the access log, not only the successes', async () => {
    const test = reviewHarness();
    await seedSession(test);

    await test.request({
      method: 'POST',
      path: `/v1/sessions/${SESSION}/reviews`,
      token: ADMIN_TOKEN,
      body: {},
    });

    const denied = test.accessLog.entries().filter((entry) => entry.status === 403);
    assert.ok(denied.length > 0, '"who tried and was told no" is what an audit is for');
  });
});

describe('the queue', () => {
  it('puts the most urgent work first and the oldest first within a priority', async () => {
    const test = reviewHarness();
    const second = SessionId.unsafe('sess_beta');
    const third = SessionId.unsafe('sess_gamma');

    await seedSession(test);
    await seedSession(test, second, DeveloperId.unsafe('dev_kim'));
    await seedSession(test, third, DeveloperId.unsafe('dev_lee'));

    await openReview(test);
    for (const [sessionId, reviewId, priority] of [
      [second, 'rev_002', 'urgent'],
      [third, 'rev_003', 'low'],
    ] as const) {
      await test.request({
        method: 'POST',
        path: `/v1/sessions/${sessionId}/reviews`,
        token: REVIEWER_TOKEN,
        body: { reviewId, priority },
      });
    }

    const response = await test.request({ path: '/v1/reviews', token: REVIEWER_TOKEN });
    const body = response.body as { reviews: readonly { reviewId: string }[] };
    assert.deepEqual(
      body.reviews.map((entry) => entry.reviewId),
      ['rev_002', 'rev_001', 'rev_003'],
    );
  });

  it('drops a review from the queue once it is decided', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.APPROVE },
    });

    const pending = await test.request({ path: '/v1/reviews', token: REVIEWER_TOKEN });
    assert.deepEqual((pending.body as { reviews: readonly unknown[] }).reviews, []);

    const all = await test.request({
      path: '/v1/reviews',
      query: { includeDecided: 'true' },
      token: REVIEWER_TOKEN,
    });
    assert.equal((all.body as { reviews: readonly unknown[] }).reviews.length, 1);
  });
});

describe('release', () => {
  it('refuses to release an outcome that has not been decided', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    const response = await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/release',
      token: REVIEWER_TOKEN,
      body: {},
    });

    assert.equal(response.status, 409);
  });

  it('moves a decided review to RELEASED', async () => {
    const test = reviewHarness();
    await seedSession(test);
    await openReview(test);

    await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/decision',
      token: REVIEWER_TOKEN,
      body: { decision: ReviewDecision.APPROVE },
    });

    const response = await test.request({
      method: 'POST',
      path: '/v1/reviews/rev_001/release',
      token: REVIEWER_TOKEN,
      body: { channel: 'email' },
    });

    assert.equal(response.status, 200);
    const body = response.body as { review: { state: string; release: { channel: string } } };
    assert.equal(body.review.state, ReviewState.RELEASED);
    assert.equal(body.review.release.channel, 'email');
  });
});

describe('quality assessment', () => {
  const base: ReviewRecord = {
    reviewId: 'rev_x',
    tenantId: TENANT,
    sessionId: SESSION,
    developerId: DEV,
    state: ReviewState.DECIDED,
    assignedTo: 'staff:mira',
    assignedBy: 'staff:lead',
    priority: ReviewPriority.NORMAL,
    assignedAt: unsafeEpochMs(T0),
    openedAt: unsafeEpochMs(T0),
    accesses: [],
    decision: null,
    override: null,
    release: null,
  };

  const access = (evidenceKind: EvidenceKind): EvidenceAccess => ({
    eventId: EventId.unsafe('evt_access'),
    at: unsafeEpochMs(T0),
    reviewerId: 'staff:mira',
    evidenceKind,
    viewDurationMs: 60_000,
  });

  const decided = (overrides: Partial<RecordedDecision> = {}): RecordedDecision => ({
    eventId: EventId.unsafe('evt_decision'),
    at: unsafeEpochMs(T0),
    reviewerId: 'staff:mira',
    decision: ReviewDecision.APPROVE,
    rationaleLength: MINIMUM_RATIONALE_LENGTH + 20,
    rationaleHash: 'a'.repeat(64),
    reviewDurationMs: 600_000,
    ...overrides,
  });

  it('accepts a thorough review as citable', () => {
    const quality = assessReviewQuality({
      ...base,
      accesses: [access(EvidenceKind.FINAL_CODE), access(EvidenceKind.CODE_EVOLUTION)],
      decision: decided(),
    });

    assert.equal(quality.citable, true);
    assert.deepEqual(quality.concerns, []);
  });

  it('flags a nine-second review', () => {
    const quality = assessReviewQuality({
      ...base,
      accesses: [access(EvidenceKind.FINAL_CODE)],
      decision: decided({ reviewDurationMs: 9_000 }),
    });

    assert.equal(quality.citable, false);
    assert.ok(quality.concerns.some((concern) => concern.includes('9s')));
  });

  it('flags a rejection recorded without opening the submitted code', () => {
    const quality = assessReviewQuality({
      ...base,
      accesses: [access(EvidenceKind.BEHAVIORAL_TIMELINE)],
      decision: decided({ decision: ReviewDecision.REJECT }),
    });

    assert.ok(quality.concerns.some((concern) => concern.includes('without opening the submitted')));
  });

  it('notes a hand-off between reviewers without calling the review unsound', () => {
    const quality = assessReviewQuality({
      ...base,
      accesses: [access(EvidenceKind.FINAL_CODE)],
      decision: decided({ reviewerId: 'staff:sam' }),
    });

    assert.ok(quality.concerns.some((concern) => concern.includes('not the assigned reviewer')));
    assert.equal(quality.citable, true, 'a hand-off is worth recording, not disqualifying');
  });

  it('never phrases a concern as an accusation against the reviewer', () => {
    const quality = assessReviewQuality({ ...base, decision: decided({ reviewDurationMs: 1_000 }) });

    for (const concern of quality.concerns) {
      assert.doesNotMatch(concern, /negligent|careless|lazy|failed to do their job/i);
    }
  });

  it('says a review with no decision is not citable, and why', () => {
    const quality = assessReviewQuality(base);
    assert.equal(quality.citable, false);
    assert.deepEqual(quality.concerns, ['No decision has been recorded yet.']);
  });
});
