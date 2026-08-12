# @scora/trust-api

The security boundary. Every route, every refusal, and every line of the access
log.

Nothing above this package can compensate for a mistake in it. The scoring engine
can be perfectly calibrated and the evidence chain perfectly sealed, and one
missing tenant check still returns Dana's session to Ravi.

## Three rules everything here follows

**1. The tenant comes from the credential, never from the request.**
There is no route that reads a tenant id from a path, a query string, or a body.
A policy write that names another tenant has that field overwritten; a batch of
events that names another tenant has it overwritten per event. The single most
damaging bug this system could have is returning one person's evidence to
another, and the only defence that holds is making the request incapable of
expressing the question.

**2. Not-yours and not-found are the same answer.**
Byte-identical: same status, same body, same headers. A 403 for "exists but is
not yours" is an oracle — probe session ids, watch which ones change status, and
you have enumerated another tenant's assessments without ever reading one. This
extends to methods: a wrong method on a real path answers **404, not 405**,
because 405 would confirm the path is real.

**3. Roles are the outer gate; principal kind is the inner one.**
A role check alone is not enough, because a token can be misissued. `resolveRoles`
denies a `SANDBOX` principal every read even when its token carries `READ_REPORT`,
and denies a `DEVELOPER` principal every staff-only role even when its token
carries `REVIEW`. A developer credential must never be able to record a review of
its own work.

## Principals

| Kind | Is | May |
|---|---|---|
| `SANDBOX` | a program on the assessed person's machine | write into **its own session only** |
| `DEVELOPER` | the person being assessed | read **their own outcome only** |
| `STAFF` | reviewer or administrator | read reports/evidence, review, administer |
| `SERVICE` | another system in the platform | whatever its roles say |

A sandbox token is per-session and expiring, and holds `INGEST` and nothing else.
If one leaks, the blast radius is one session's ingestion — not a readable copy
of anyone's evidence.

## Endpoints

| Method | Path | Role | Notes |
|---|---|---|---|
| `POST` | `/v1/sessions/:sessionId/events` | `INGEST` | **202**, never 201 |
| `GET` | `/v1/sessions/:sessionId/report` | `READ_REPORT` | integrity embedded inline |
| `GET` | `/v1/sessions/:sessionId/report.txt` | `READ_REPORT` | rendered for a human |
| `GET` | `/v1/sessions/:sessionId/events` | `READ_EVIDENCE` | keyset paged by `chainPosition` |
| `GET` | `/v1/sessions/:sessionId/integrity` | `READ_EVIDENCE` | chain verification |
| `GET` | `/v1/developers/:developerId/sessions` | `READ_REPORT` | |
| `GET` | `/v1/me/outcome/:sessionId` | `READ_OWN_OUTCOME` | self only |
| `GET` | `/v1/policy` | `ADMINISTER` | secrets redacted |
| `PUT` | `/v1/policy` | `ADMINISTER` | 422 with the fields named |
| `GET` | `/v1/policy/scopes` | `ADMINISTER` | what consent permits |

**202, not 201.** A batch can be partly rejected and partly withheld for consent.
201 would report a half-stored batch as fully accepted, and the sandbox would
never learn that some of its evidence never landed.

**Integrity is embedded in the report, not a separate call.** A reviewer must
never read a score without knowing whether the evidence under it is intact, and a
separate endpoint is one a reviewer can forget to call.

**The developer outcome is `{ sessionId, summary, recommendation, confidence }`.**
No risk number, no cluster names, no Trust score. A developer is not told "the
engine thinks you may have cheated" by an automated endpoint before a human has
looked at the session. The test asserts the serialized body contains no `"risk"`
key at all.

## Tenant policy is the admin console

`TenantPolicy` is the entire configuration surface, and it is *data* — read and
written through `GET`/`PUT /v1/policy`. The console is a client of these endpoints
and holds no logic of its own, which is why every guarantee an administrator must
not be able to switch off is enforced here rather than in a UI.

`assertPolicyInvariants` runs on every write and returns **all** violations at
once. An administrator fixing one field per round trip across six attempts will
eventually ask for the checks to be relaxed.

| Invariant | Why it is not a preference |
|---|---|
| `humanReviewRiskThreshold ≤ 0.8` | at 1.0 the engine decides adverse outcomes alone |
| `minimumConfidenceForAdverse ≥ 0.4` | an adverse finding on thinner evidence is not defensible |
| `auditDays ≥ 365` | the record of who read what must outlive what they read |
| `auditDays ≥ evidenceDays` | otherwise evidence outlives its own access log |
| external monitoring ⇒ consent notice | collection without a notice is not lawful to begin with |
| recording ⇒ consent notice | as above |
| `recordDomains` ⇒ external monitoring on | cannot record domains you are not permitted to observe |
| completions on ⇒ a provider exists | |
| managed provider ⇒ `apiKeyRef` set | |
| `maxCompletionChars ≤ 2000` | past this the platform hands over the answer it is assessing |

There is deliberately **no** setting that lowers the corroboration a cluster
needs, lets a single event contribute to Risk, makes AI usage a risk signal in its
own right, or turns off the access log. A tenant that could switch those off would
be running a different product under this product's name, and its scores would be
shown to developers as though they meant the same thing.

## The AI provider is configuration, not code

```ts
assistance: {
  completionsEnabled: true,
  provider: {
    kind: 'MANAGED',              // NONE | SELF_HOSTED | MANAGED
    model: 'completion-small',
    apiKeyRef: 'secrets/scora/completion-key',   // a NAME, never a key
    endpoint: null,
    timeoutMs: 1_500,
  },
  maxCompletionChars: 240,
  maxCompletionsPerMinute: 60,
  languages: ['typescript'],
}
```

`apiKeyRef` names a secret in the deploying platform's secret manager. The type
gives an actual key nowhere to live — a key pasted into a policy record would end
up in the policy audit trail, in backups, and on the screen of every administrator
who opens the page. `GET /v1/policy` redacts the provider block through an
**allowlist**, so a future field that does carry a secret is withheld by default
rather than leaked by omission.

There is no conversational mode to configure because none exists. The sandbox is
an editor with IntelliSense; the shape of `AssistancePolicy` is the enforcement —
there is nowhere to put a prompt.

## Consent gates collection

`permittedScopes(policy)` is the bridge from admin configuration to the ingestion
consent gate. A policy that has not enabled external monitoring produces no
`external_monitoring` scope, so Layer 06 events are **never written** — not
filtered on read. It also withholds a scope when monitoring is enabled but the
notice was removed, which the API cannot produce but a migrated store can hold.

## The access log

Written in `handle`, after dispatch, for every outcome — success, refusal,
unauthenticated attempt, and handler crash. Logging inside handlers would
eventually mean a handler that forgot.

- **The route pattern, not the literal path.** A log full of session ids is a
  second copy of who was assessed when, sitting in a store with different
  retention rules from the evidence itself.
- **Resource ids in named fields.** The pattern alone cannot answer "who read
  *this* developer's evidence", so ids go in `sessionId` / `developerId` under
  the audit retention policy rather than embedded in a free-text URL.
- **A crash is logged and its message is never returned.** An internal error
  string can carry a query, a path, or a fragment of someone's evidence.

## Transport

`node.ts` is the only file that knows about sockets. Everything above it is plain
data, so the same behaviour mounts behind any server without being reimplemented.

- Body size and JSON parsing are enforced **before** authentication, so an
  anonymous caller cannot make the process read megabytes.
- `cache-control: no-store` on every response. A proxy that stored one reviewer's
  report would serve it to the next caller on the same connection.
- Credentials are stored as SHA-256 only, compared in constant time, and every
  credential is compared even after a match. `issueCredential` returns the token
  exactly once — a token not captured at that call is unrecoverable, which is the
  intent.

## Usage

```ts
import { createApi, nodeRequestListener, bearerAuthenticator } from '@scora/trust-api';
import { createIngestion, inMemoryEventStore } from '@scora/trust-storage';
import { nodeCrypto, nodeIdGenerator, systemClock, consoleLogger } from '@scora/trust-core/node';
import { createServer } from 'node:http';

const store = inMemoryEventStore();

const api = createApi({
  store,
  ingestion: createIngestion({ store, clock: systemClock, crypto: nodeCrypto, ids: nodeIdGenerator, logger: consoleLogger }),
  policies: inMemoryPolicyStore(),
  clock: systemClock,
  crypto: nodeCrypto,
  authenticator: bearerAuthenticator(credentials),
  accessLog,                       // append-only external storage in production
  additionalRoutes: reviewRoutes,  // mounted into the SAME authenticated app
});

createServer(nodeRequestListener(api)).listen(8080);
```

`additionalRoutes` is how the packages built on top of this one — review,
interview, calibration — mount their endpoints. They join the same authenticated,
access-logged app rather than standing up a parallel one whose authorization rules
could drift from these.

`Authenticator` is a one-method interface for the same reason: a real deployment
swaps in OIDC, mTLS, or whatever the platform already runs, without touching a
route.

## Client

```ts
const client = createTrustClient({ baseUrl, token });

await client.ingest(sessionId, events, clockOffsetMs);
await client.report(sessionId);
await client.integrity(sessionId);   // .missingSequences ≠ tampering
await client.savePolicy(policy);     // throws TrustApiError(422) with .problem.errors
```

Thin on purpose: it adds the bearer header, parses problem details, and does
nothing else. **No retry, no cache.** A client that quietly retried an ingest
would double-count evidence; a client that cached a report would show a reviewer a
stale score after a human review had already overridden it.

## Guarantees enforced by tests

| Guarantee | Test |
| --- | --- |
| A route with no roles fails at startup | `refuses a route that declares no roles` |
| A sandbox-locked ingest route fails at startup | `refuses an INGEST route paired with a role no sandbox may hold` |
| A sandbox cannot read, whatever its roles say | `denies a sandbox every read, even holding the role` |
| A developer cannot review, whatever its roles say | `denies a developer a staff-only role, even holding it` |
| An unknown token is 401, not 403 | `refuses an unknown token with 401, not 403` |
| One method cannot shadow its pattern | `does not let one method shadow the rest of its pattern` |
| A wrong method is 404, not 405 | `answers 405-worthy requests with 404 anyway` |
| One tenant never sees another's session | `does not return one tenant session to another` |
| Refusals are indistinguishable | `answers the same 404 for a session that exists elsewhere and one that never existed` |
| The body cannot name a tenant | `ignores a tenant id supplied in the body` |
| The body cannot name a session | `ignores a session id supplied in the body` |
| A leaked sandbox token cannot forge evidence elsewhere | `refuses a sandbox writing into a session other than its own` |
| A developer sees no risk number | `never shows a developer a risk number or a cluster name` |
| A developer cannot probe a colleague | `answers 404 when a developer asks for another developer's session` |
| Refusals are audited | `records a refusal as deliberately as a success` |
| The log holds patterns, not paths | `records the route pattern, not the literal path` |
| A crash leaks nothing | `records a handler crash without leaking its message` |
| A rejected policy stores nothing | `rejects a policy that would weaken a guarantee, with the fields named` |
| Policy changes are attributable | `stamps who changed the policy and when` |
| Lost telemetry is a gap, not tampering | `reports lost telemetry as a gap, not as tampering` |
| Reports are never cacheable | `forbids a shared cache from keeping a report` |
| Oversized bodies die before auth | `refuses an oversized body before authenticating anyone` |
| Expired credentials are refused | `rejects a credential that has expired` |
| Tokens are never stored | `stores only the hash, never the token` |
| The client never retries | `does not retry, so a flaky network cannot double-count evidence` |
