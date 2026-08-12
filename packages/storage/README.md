# @scora/trust-storage

Append-only evidence storage and the ingestion pipeline that stands between
untrusted telemetry and the immutable log.

Everything downstream — features, scoring, baselines, review — reads from what
this package writes. If a sandbox can get a fabricated event past ingestion, or a
flaky network can make an honest session look tampered with, nothing above it can
recover.

## The ingestion order is load-bearing

```
1. validate       envelope, payload, producer authority
2. consent        drop what was never lawful to collect
3. deduplicate    BEFORE sealing
4. order          by sequence, so out-of-order delivery links correctly
5. seal           hash-chain each event to its predecessor
6. append         atomically, per session
7. record         rejections and gaps as evidence in their own right
```

**Step 3 before step 5** is the subtle one. Sealing computes `previousHash` from
the current chain head, so re-sealing an already-stored event produces a
different hash — turning an ordinary network retry into an apparent tampering
incident. Deduplication happens first, always.

**Step 7** is the one that is easy to skip. A rejected event is not merely
discarded: a session whose telemetry was partly malformed must read as *lower
confidence*, and that only happens if the rejection is in the log. Otherwise a
broken sandbox looks identical to a clean session. These notes are emitted by the
`SERVER` producer and deliberately carry no payload from the rejected event — the
whole reason it was rejected is that its contents could not be trusted.

## `chainPosition` is not `sequence`

The single most important distinction in this package.

| | `sequence` | `chainPosition` |
|---|---|---|
| Assigned by | the producer | this engine, at admission |
| Scope | one producer's own stream | the whole session |
| May repeat | **yes** | no |
| May have gaps | **yes** | no |
| A gap means | lost telemetry → lower Confidence | **tampering** |

`sequence` is a producer's *claim* about its own emission order. A client can
lose it, repeat it after a restart, or never reach a value at all. Several
producers write into one session — `SANDBOX`, `BROWSER_AGENT`, `SERVER` — and
each numbers its own stream from 1.

`chainPosition` is the log's only unique total order, and only this engine
assigns it. That is what makes a gap in it genuinely mean tampering.

Conflating the two is not a cosmetic error. If the server continued the client's
numbering when writing its own notes, the client — which has no idea those events
exist — would keep counting from where it left off and collide. The chain would
then report a duplicate, and a duplicate reads as tampering: the harshest
conclusion the engine can draw, produced by an ordinary telemetry fault. Gap
detection is likewise partitioned by source, because pooling two producers that
each start at 1 would invent gaps that nothing lost.

Reads, ranges and cursors are all expressed in chain positions. Paging on a key
that can repeat would silently drop or duplicate evidence.

## Consent gates collection, not reading

If a session did not grant `external_monitoring`, Layer 06 events are not stored
at all. Filtering them at read time would leave unlawful data sitting in storage
where a bug, a backup, or a subpoena could still reach it.

Withheld ≠ rejected. `IngestionResult` reports them separately, and withholding
produces no `EVENT_REJECTED` note — honouring consent is correct operation, not a
telemetry fault, and must not lower a developer's Confidence.

## Adapters

| Adapter | Import | Use |
|---|---|---|
| `inMemoryEventStore()` | `@scora/trust-storage` | reference implementation; calibration harness |
| `sqliteEventStore(path)` | `@scora/trust-storage/sqlite` | local, single-file, zero dependencies |

Both run the **identical** conformance suite. An engine that scored differently
against SQLite than against Postgres would be indefensible, so behavioural
divergence in an adapter is a bug in that adapter — never an accepted difference.

The SQLite schema uses `node:sqlite` with STRICT tables and no SQLite-specific
types, so it ports cleanly to Postgres. `tenant_id` leads every key, which makes
isolation structural rather than a `WHERE` clause someone might forget. Batches
are one `BEGIN IMMEDIATE` transaction: a partially applied batch would leave a
chain whose links point at events that were never stored.

The unique index is on `(tenant_id, session_id, chain_position)` and **never** on
sequence — a unique constraint there would reject real evidence from a second
producer.

## Append-only

There is no `UPDATE` and no per-event `DELETE` anywhere in this package. Erasure
goes through `eraseSubject`, which operates on whole subjects and reports what it
removed. The audit trail must outlive the data.

## Guarantees enforced by tests

The ingestion suite is written from the standpoint of a hostile *network* rather
than a hostile developer: batches arrive twice, out of order, half-malformed, or
not at all. None of that may read as tampering.

| Guarantee | Test |
| --- | --- |
| A batch boundary is not a chain boundary | `continues the chain across separate calls` |
| Out-of-order delivery still links correctly | `sorts an out-of-order batch before chaining it` |
| An unknown clock offset is not invented | `records a null offset rather than pretending the timing is exact` |
| Retrying a batch changes nothing | `is idempotent on a replayed batch` |
| A retry never breaks the chain | `leaves the chain intact after a replay` |
| A partial retry accepts only the new half | `accepts the new half of a partially-replayed batch` |
| One bad event does not discard the batch | `keeps the good events when one is malformed` |
| A rejection becomes evidence | `records the rejection in the log so confidence can fall` |
| A rejected payload is never copied | `does not copy the rejected payload into the record of it` |
| A rejection note is attributed to the server | `attributes the rejection record to the server, not the sandbox` |
| A fully-rejected batch invents no session | `reports a fully-rejected batch without inventing a session` |
| A sandbox cannot assert Layer 06 | `rejects a sandbox asserting a layer it has no authority over` |
| Lost telemetry lowers Confidence only | `reports a sequence gap` |
| A gap is recorded rather than merely counted | `records the gap as evidence` |
| A clean batch writes no system events | `does not report a gap for a complete batch` |
| A delayed event is not a permanent accusation | `closes the gap when the missing event arrives late` |
| Unlawful data never reaches storage | `never stores what consent did not cover` |
| Withheld is not rejected | `does not treat withheld data as a rejection` |
| The server never consumes client sequence space | `keeps the chain verifiable once server notes and client events interleave` |

## Usage

```ts
import { createIngestion, inMemoryEventStore } from '@scora/trust-storage';
import { sqliteEventStore } from '@scora/trust-storage/sqlite';
import { nodeCrypto, systemClock, nodeIdGenerator, consoleLogger } from '@scora/trust-core/node';

const store = sqliteEventStore('./evidence.db');

const ingestion = createIngestion({
  store,
  clock: systemClock,
  crypto: nodeCrypto,
  ids: nodeIdGenerator,
  logger: consoleLogger,
  consent: {
    async grantedScopes(tenantId, sessionId) {
      return ['assessment'];
    },
  },
});

const result = await ingestion.ingest(batchFromSandbox, { clockOffsetMs: 240 });
// { accepted, duplicates, rejected, withheld, gaps, head }
```

`clockOffsetMs` comes from a prior sync exchange. When it is absent, client
timestamps are used as-is and the events record `clockOffsetMs: null` — which
lowers confidence in every timing-derived feature rather than pretending the
timing is exact.

`ingest()` requires all submissions in one call to belong to a single tenant and
session; a cross-session batch cannot be appended atomically in a way that
preserves per-session chain continuity, so it throws rather than silently
splitting.

## Verifying a log

```ts
import { verifyChain } from '@scora/trust-core';
import { nodeCrypto } from '@scora/trust-core/node';

const events = await store.readSession(tenantId, sessionId);
const result = verifyChain(events, nodeCrypto.sha256);

result.intact;            // false only for genuine tampering
result.violations;        // every violation, not just the first
result.missingSequences;  // lost telemetry — lowers Confidence, not Trust
```

`listSessions` reports `chainIntact` as a cheap proxy (event count vs. highest
chain position). Full verification rehashes every event and is a separate,
explicit operation.
