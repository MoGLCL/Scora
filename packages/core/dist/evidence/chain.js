import { canonicalize } from "./canonical.js";
export const GENESIS_HASH = null;
/**
 * Projects an event into the exact shape that gets hashed.
 *
 * `integrity.hash` is necessarily excluded — it is the output. Everything else
 * that a reader could act on is included, so no meaningful field can be altered
 * without detection. `redactedFields` is covered too, so a redaction cannot be
 * added or removed after the fact without breaking the chain.
 */
function toHashable(event, previousHash) {
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
export function computeEventHash(event, previousHash, hash) {
    return hash(canonicalize(toHashable(event, previousHash)));
}
export function sealEvent(event, previousHash, hash) {
    const integrity = {
        algorithm: 'sha256',
        hash: computeEventHash(event, previousHash, hash),
        previousHash,
    };
    return { ...event, integrity };
}
export function verifyEventHash(event, hash) {
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
};
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
export function verifyChain(events, hash) {
    if (events.length === 0) {
        return {
            intact: true,
            violations: [],
            eventsChecked: 0,
            headHash: null,
            missingSequences: [],
        };
    }
    const violations = [];
    const ordered = [...events].sort((a, b) => a.chainPosition - b.chainPosition);
    const sessionId = ordered[0].sessionId;
    const seenPositions = new Set();
    let previous = null;
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
        }
        else {
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
function findMissingSequences(events) {
    const bySource = new Map();
    for (const event of events) {
        const seen = bySource.get(event.source) ?? new Set();
        seen.add(event.sequence);
        bySource.set(event.source, seen);
    }
    const missing = [];
    for (const seen of bySource.values()) {
        const highest = Math.max(...seen);
        for (let sequence = 1; sequence < highest; sequence += 1) {
            if (!seen.has(sequence))
                missing.push(sequence);
        }
    }
    return [...new Set(missing)].sort((a, b) => a - b);
}
export function anchorBody(anchor) {
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
export function nextChainPosition(head) {
    return head === null ? 1 : head.chainPosition + 1;
}
export function isGenesis(submission) {
    return submission.sequence === 1;
}
//# sourceMappingURL=chain.js.map