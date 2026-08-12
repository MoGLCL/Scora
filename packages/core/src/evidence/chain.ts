import type { EventIntegrity, EventSubmission, TrustEvent } from '../events/envelope.ts';
import type { EpochMs } from '../primitives/index.ts';
import { canonicalize } from './canonical.ts';

/**
 * Tamper-evident chaining of a session's evidence log.
 *
 * Each event's hash covers its own canonical form *and* the hash of the event
 * before it. Editing, reordering or deleting any event invalidates every hash
 * downstream of it, so a reviewer can be shown that what they are reading is
 * what was recorded.
 *
 * This is integrity, not authenticity: a party holding the database can still
 * rebuild a consistent chain from scratch. Defending against that requires
 * signing chain heads with a key the application server does not hold, and
 * periodically anchoring them externally. `ChainAnchor` below is the seam for
 * that; the signing itself belongs in an adapter, not in the domain core.
 */

/** Injected so the core stays free of Node built-ins and remains portable. */
export type HashFn = (input: string) => string;

export const GENESIS_HASH = null;

/** The event fields covered by the hash. */
interface HashableEvent {
  readonly eventId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly developerId: string;
  readonly assessmentId: string | null;
  readonly taskId: string | null;
  readonly type: string;
  readonly occurredAt: number;
  readonly occurredAtNormalized: number;
  readonly receivedAt: number;
  readonly sequence: number;
  readonly chainPosition: number;
  readonly source: string;
  readonly layer: string;
  readonly schemaVersion: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly redactedFields: readonly string[];
  readonly previousHash: string | null;
}

/**
 * Projects an event into the exact shape that gets hashed.
 *
 * `integrity.hash` is necessarily excluded — it is the output. Everything else
 * that a reader could act on is included, so no meaningful field can be altered
 * without detection. `redactedFields` is covered too, so a redaction cannot be
 * added or removed after the fact without breaking the chain.
 */
function toHashable(
  event: Omit<TrustEvent, 'integrity'>,
  previousHash: string | null,
): HashableEvent {
  return {
    eventId: event.eventId,
    tenantId: event.tenantId,
    sessionId: event.sessionId,
    developerId: event.developerId,
    assessmentId: event.assessmentId ?? null,
    taskId: event.taskId ?? null,
    type: event.type,
    occurredAt: event.occurredAt,
    occurredAtNormalized: event.occurredAtNormalized,
    receivedAt: event.receivedAt,
    sequence: event.sequence,
    chainPosition: event.chainPosition,
    source: event.source,
    layer: event.layer,
    schemaVersion: event.schemaVersion,
    payload: event.payload,
    // Copied so the caller's array cannot mutate under us between hashing and
    // storage, which would produce an event that fails its own verification.
    redactedFields: [...event.redactedFields],
    previousHash,
  };
}

export function computeEventHash(
  event: Omit<TrustEvent, 'integrity'>,
  previousHash: string | null,
  hash: HashFn,
): string {
  return hash(canonicalize(toHashable(event, previousHash)));
}

export function sealEvent(
  event: Omit<TrustEvent, 'integrity'>,
  previousHash: string | null,
  hash: HashFn,
): TrustEvent {
  const integrity: EventIntegrity = {
    algorithm: 'sha256',
    hash: computeEventHash(event, previousHash, hash),
    previousHash,
  };
  return { ...event, integrity };
}

export function verifyEventHash(event: TrustEvent, hash: HashFn): boolean {
  const { integrity: _integrity, ...rest } = event;
  return computeEventHash(rest, event.integrity.previousHash, hash) === event.integrity.hash;
}

export const ChainViolationCode = {
  /** An event's stored hash does not match a recomputation of its contents. */
  HASH_MISMATCH: 'HASH_MISMATCH',
  /** An event's previousHash does not match the hash of the preceding event. */
  BROKEN_LINK: 'BROKEN_LINK',
  /** Chain positions are not strictly increasing by one. */
  CHAIN_POSITION_GAP: 'CHAIN_POSITION_GAP',
  /** Two events share a chain position within one session. */
  CHAIN_POSITION_DUPLICATE: 'CHAIN_POSITION_DUPLICATE',
  /** The first event does not declare itself as genesis. */
  INVALID_GENESIS: 'INVALID_GENESIS',
  /** Events from more than one session were verified as a single chain. */
  SESSION_MIXING: 'SESSION_MIXING',
} as const;

export type ChainViolationCode =
  (typeof ChainViolationCode)[keyof typeof ChainViolationCode];

export interface ChainViolation {
  readonly code: ChainViolationCode;
  readonly eventId: string;
  readonly sequence: number;
  readonly detail: string;
}

export interface ChainVerification {
  readonly intact: boolean;
  readonly violations: readonly ChainViolation[];
  readonly eventsChecked: number;
  /** Hash of the last event, for anchoring or for continuing the chain. */
  readonly headHash: string | null;
  /**
   * Producer sequence numbers absent from the log.
   *
   * A gap means telemetry was lost in transit, which is common on flaky
   * networks and is not by itself evidence of tampering. It lowers Confidence —
   * the engine saw less than it should have — rather than raising Risk.
   *
   * Computed per producer, because each producer numbers its own stream: a
   * server-written note about a rejected event is not a sandbox event that went
   * missing.
   */
  readonly missingSequences: readonly number[];
}

/**
 * Verifies an ordered slice of one session's evidence log.
 *
 * Reports every violation rather than stopping at the first, because a reviewer
 * needs to know whether a single event is corrupt or the whole log is
 * untrustworthy. Verification continues past a break using each event's own
 * stored `previousHash`, so one bad link does not cascade into false reports
 * for every event after it.
 *
 * The chain is ordered by `chainPosition`, never by `sequence`. Producers
 * number their own streams and those numbers can collide, repeat, or go
 * missing; `chainPosition` is assigned by this engine alone, so a break in it
 * is genuinely attributable to tampering.
 */
export function verifyChain(
  events: readonly TrustEvent[],
  hash: HashFn,
): ChainVerification {
  if (events.length === 0) {
    return {
      intact: true,
      violations: [],
      eventsChecked: 0,
      headHash: null,
      missingSequences: [],
    };
  }

  const violations: ChainViolation[] = [];
  const ordered = [...events].sort((a, b) => a.chainPosition - b.chainPosition);
  const sessionId = ordered[0]!.sessionId;
  const seenPositions = new Set<number>();

  let previous: TrustEvent | null = null;

  for (const event of ordered) {
    if (event.sessionId !== sessionId) {
      violations.push({
        code: ChainViolationCode.SESSION_MIXING,
        eventId: event.eventId,
        sequence: event.sequence,
        detail: `Event belongs to session ${event.sessionId}, expected ${sessionId}`,
      });
      continue;
    }

    if (seenPositions.has(event.chainPosition)) {
      violations.push({
        code: ChainViolationCode.CHAIN_POSITION_DUPLICATE,
        eventId: event.eventId,
        sequence: event.sequence,
        detail: `Chain position ${event.chainPosition} appears more than once`,
      });
    }
    seenPositions.add(event.chainPosition);

    if (!verifyEventHash(event, hash)) {
      violations.push({
        code: ChainViolationCode.HASH_MISMATCH,
        eventId: event.eventId,
        sequence: event.sequence,
        detail: 'Recomputed hash does not match the stored hash; contents were altered',
      });
    }

    if (previous === null) {
      // Genesis is only expected at the start of the chain. A slice starting
      // mid-session is a legitimate way to verify a window of the log, so a
      // non-null previousHash here is not a violation.
      if (event.chainPosition === 1 && event.integrity.previousHash !== GENESIS_HASH) {
        violations.push({
          code: ChainViolationCode.INVALID_GENESIS,
          eventId: event.eventId,
          sequence: event.sequence,
          detail: 'First event in the session must have a null previousHash',
        });
      }
    } else {
      const expected = previous.chainPosition + 1;
      if (event.chainPosition !== expected) {
        violations.push({
          code: ChainViolationCode.CHAIN_POSITION_GAP,
          eventId: event.eventId,
          sequence: event.sequence,
          detail: `Expected chain position ${expected}, found ${event.chainPosition}; an event was removed`,
        });
      }

      if (event.integrity.previousHash !== previous.integrity.hash) {
        violations.push({
          code: ChainViolationCode.BROKEN_LINK,
          eventId: event.eventId,
          sequence: event.sequence,
          detail: `previousHash does not match the hash at chain position ${previous.chainPosition}`,
        });
      }
    }

    previous = event;
  }

  return {
    intact: violations.length === 0,
    violations,
    eventsChecked: ordered.length,
    headHash: previous?.integrity.hash ?? null,
    missingSequences: findMissingSequences(ordered),
  };
}

/**
 * Sequence numbers a producer emitted but the engine never received.
 *
 * Partitioned by source: two producers writing into one session each number
 * from 1, so pooling them would invent gaps that nothing lost.
 */
function findMissingSequences(events: readonly TrustEvent[]): readonly number[] {
  const bySource = new Map<string, Set<number>>();
  for (const event of events) {
    const seen = bySource.get(event.source) ?? new Set<number>();
    seen.add(event.sequence);
    bySource.set(event.source, seen);
  }

  const missing: number[] = [];
  for (const seen of bySource.values()) {
    const highest = Math.max(...seen);
    for (let sequence = 1; sequence < highest; sequence += 1) {
      if (!seen.has(sequence)) missing.push(sequence);
    }
  }

  return [...new Set(missing)].sort((a, b) => a - b);
}

/**
 * A signed, externally-anchorable commitment to a chain head.
 *
 * Produced periodically and at session close. Publishing these somewhere the
 * application server cannot rewrite is what upgrades the log from
 * tamper-evident to tamper-evident against the operator.
 */
export interface ChainAnchor {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly headHash: string;
  readonly eventCount: number;
  readonly highestChainPosition: number;
  readonly anchoredAt: EpochMs;
  /** Detached signature over the canonical anchor body. Absent until signed. */
  readonly signature?: string | undefined;
  readonly keyId?: string | undefined;
}

export function anchorBody(anchor: Omit<ChainAnchor, 'signature' | 'keyId'>): string {
  return canonicalize({
    sessionId: anchor.sessionId,
    tenantId: anchor.tenantId,
    headHash: anchor.headHash,
    eventCount: anchor.eventCount,
    highestChainPosition: anchor.highestChainPosition,
    anchoredAt: anchor.anchoredAt,
  });
}

/** Next chain position for a session, given its current head. */
export function nextChainPosition(head: { readonly chainPosition: number } | null): number {
  return head === null ? 1 : head.chainPosition + 1;
}

export function isGenesis(submission: Pick<EventSubmission, 'sequence'>): boolean {
  return submission.sequence === 1;
}
