# `@scora/trust-review` — Layer 10

Human review, the override record, and the audit trail that makes an adverse
decision accountable.

Every layer below this one produces a **signal**. This is the only layer that
produces a **decision**, and it is the only layer authorised to. The engine's
recommendation vocabulary contains no `REJECT` — not as an omission, but as the
point:

> **Rejecting a person is not an output an algorithm is allowed to have.**
> `impliedDecision` maps every recommendation the engine can make onto the
> vocabulary a human decides in, and nothing maps to `REJECT`. A test asserts
> this over `Object.values(RECOMMENDATION)`, so a future recommendation cannot
> quietly acquire the power to reject someone.

> **An adverse decision without a reason is not a decision.**
> `POST /decision` returns `422` when a `REJECT` or `REQUEST_REVIEW` arrives with
> a rationale under `MINIMUM_RATIONALE_LENGTH`, and no event reaches the log. Of
> everything `assessReviewQuality` reports, this is the only rule enforced at
> write time — the rest is already in the past by the time it is detected, but a
> missing reason is not: the reviewer is right there and can supply one.

## A review is a fold, not a row

There is no review table. `reconstructReview(events, reviewId)` replays the six
Layer 10 event types out of the session's own log and returns a `ReviewRecord`,
so the audit trail and the review are the same object. Nothing can update a
decision, because there is nothing to update — a second decision gets `409`, and
a further decision needs a new review.

| Event | Written by | Becomes |
| --- | --- | --- |
| `REVIEW_ASSIGNED` | `POST /v1/sessions/:sessionId/reviews` | `assignedTo`, `assignedAt`, `priority`, state `PENDING` |
| `REVIEW_OPENED` | `POST /open` | `openedAt`, state `IN_PROGRESS`; starts the review clock |
| `REVIEW_EVIDENCE_ACCESSED` | `POST /evidence` | one `EvidenceAccess` — who, which kind, how long |
| `REVIEW_DECISION_RECORDED` | `POST /decision` | `decision`, state `DECIDED` |
| `RECOMMENDATION_OVERRIDDEN` | `POST /decision`, when they disagree | `override` |
| `RESULT_RELEASED` | `POST /release` | `release`, state `RELEASED` |

`EventSource.HUMAN` is the only source `SOURCE_AUTHORITY` permits to assert
`L10_HUMAN_REVIEW`, and it may assert nothing else. A compromised sandbox cannot
mint its own approval, and this package — which holds a writable handle on the
log — cannot manufacture evidence about a developer: `PendingEvent.type` is
narrowed to the Layer 10 union, so appending an `AI_SUGGESTION_ACCEPTED` from
here is a compile error.

## The rationale text never enters the log

It arrives in the request, and what continues is a `rationaleLength` and a
`rationaleHash`. The prose belongs to the tenant's own storage under their
retention policy; SCORA keeps only enough to prove it existed and has not
changed. A test serialises the whole log and asserts the reason's own words
cannot be found in it.

## An override is detected, never declared

There is no "I am overriding the engine" flag to tick. `POST /decision` scores
the session itself, compares `impliedDecision(recommendation)` to what the
reviewer decided, and appends `RECOMMENDATION_OVERRIDDEN` if they differ —
whichever way the disagreement runs. A reviewer clearing what the engine flagged
is the false positive this platform exists to minimise; a reviewer rejecting what
the engine supported is the false negative. Both travel with
`engineRecommendation` and `engineTrustScore` so that Layer 10 does not have to
decide what either is worth.

A reviewer who must opt in to being counted as a disagreement will under-report,
and the cases they quietly skip are exactly the ones the calibration harness
needs most.

When the engine had `INSUFFICIENT_EVIDENCE` it had no position, so no override is
recorded — deciding either way is not contradicting something that never spoke.

## How much weight a decision can bear

`assessReviewQuality` returns `citable` plus plain-language `concerns`. A review
is still **binding** when it is not citable: the decision stands, and the
concerns travel with it. `present()` attaches the assessment to every response,
so a caller cannot display a decision without the caveats that belong to it.

- decided without opening any evidence → `citable: false`
- a rejection recorded without opening `FINAL_CODE` → flagged
- a review that took nine seconds → flagged, with the duration named
- decided by someone other than the assignee → noted, still citable; a hand-off
  is normal
- no decision yet → `['No decision has been recorded yet.']`

Concerns describe the record, never the reviewer. A test asserts no concern
matches `/negligent|careless|lazy|failed to do their job/i`.

## Who looked at my evidence

```
GET /v1/me/access-trail/:sessionId    Role.READ_OWN_OUTCOME
GET /v1/sessions/:sessionId/access-trail    Role.READ_EVIDENCE
```

Two routes over one handler, not one route declaring both roles: `resolveRoles`
refuses a developer credential any route that mentions a staff-only role, and it
is right to. Pairing them would have read as "staff or the subject" and silently
meant "staff only" — the sort of quiet denial nobody notices until a developer
asks who watched their interview recording and is told nothing.

A system that holds a recording of someone and cannot tell them who watched it
has not earned the right to hold it. A developer asking about a session that is
not theirs gets the same `404` as a session that does not exist, so the endpoint
cannot be used to discover who sat an assessment. `viewDurationMs` is `null`
rather than `0` when the client could not say — a duration invented to fill a
field is a fabricated number in a record that may one day have to answer that
question under oath.

## Layout

```
packages/review/src/
├── contract.ts     decisions, evidence access, quality, and the queue entry
├── audit.ts        event log → review record; whether a decision can be cited
├── queue.ts        the review index: where to find a review, and nothing else
└── routes.ts       the reviewer's endpoints; overrides detected, never declared
```

`ReviewIndex` is a pointer table — tenant + `reviewId` → `sessionId` — and holds
nothing else. It is a read model that can be dropped and rebuilt from the log,
because the log stays authoritative.

Routes mount into the same authenticated, access-logged app as everything else
via `additionalRoutes`, so tenant comes from the credential and a `403` is
written to the access log like any other. The tests run against that app rather
than a parallel one, which is why they catch an authorization rule this package
got wrong.

## Not in this package

- The prose of a rationale, a recording, or any evidence artefact — Layer 10
  records that they were opened, never copies them.
- What an override is worth. Layer 10 records the disagreement; the calibration
  harness reads it.
