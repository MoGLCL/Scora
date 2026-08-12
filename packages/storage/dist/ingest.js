import { EVENT_SCHEMA_VERSION, EventSource, TrustEventType, describeEvent, nextChainPosition, sealEvent, unsafeEpochMs, validateSubmission, } from '@scora/trust-core';
export function createIngestion(dependencies) {
    const { store, clock, crypto, ids, logger, consent } = dependencies;
    return {
        /**
         * Ingests a batch of submissions for one session.
         *
         * One malformed event never aborts the batch: the good events still land,
         * and the bad ones are recorded as EVENT_REJECTED so a session with partly
         * broken telemetry reads as lower confidence rather than looking clean.
         */
        async ingest(submissions, options = {}) {
            const validated = [];
            const rejected = [];
            for (const submission of submissions) {
                const result = validateSubmission(submission);
                if (result.ok)
                    validated.push(result.value);
                else
                    rejected.push(result.error);
            }
            if (validated.length === 0) {
                // Nothing parsed well enough to identify a session, so there is no log
                // to record these into. Reported to the caller instead.
                logger.warn('entire batch rejected before a session could be identified', {
                    count: rejected.length,
                });
                return {
                    accepted: 0,
                    duplicates: 0,
                    rejected,
                    withheld: [],
                    gaps: [],
                    head: null,
                };
            }
            const first = validated[0];
            const { tenantId, sessionId } = first;
            const mixed = validated.some((event) => event.tenantId !== tenantId || event.sessionId !== sessionId);
            if (mixed) {
                throw new Error('ingest() requires all submissions to belong to one tenant and session');
            }
            // Consent gates collection, not reading. Data that was never lawful to
            // collect should not exist in the log at all — filtering at read time
            // would leave it sitting in storage.
            const withheld = [];
            let admissible = validated;
            if (consent !== undefined) {
                const granted = new Set(await consent.grantedScopes(tenantId, sessionId));
                admissible = validated.filter((event) => {
                    const required = describeEvent(event.type).requiresConsent;
                    if (required === 'none' || granted.has(required))
                        return true;
                    withheld.push({ type: event.type, scope: required });
                    return false;
                });
            }
            // Deduplicate before sealing. See the note at the top of this file.
            const known = await store.existing(tenantId, admissible.map((event) => event.eventId));
            const fresh = admissible
                .filter((event) => !known.has(event.eventId))
                .sort((a, b) => a.sequence - b.sequence);
            const duplicates = admissible.length - fresh.length;
            if (fresh.length === 0) {
                const existingGaps = await findGaps(tenantId, sessionId);
                await recordSystemEvents(tenantId, sessionId, first.developerId, rejected, []);
                const head = await store.head(tenantId, sessionId);
                return {
                    accepted: 0,
                    duplicates,
                    rejected,
                    withheld,
                    gaps: existingGaps,
                    head,
                };
            }
            const head = await store.head(tenantId, sessionId);
            let previousHash = head?.hash ?? null;
            let chainPosition = nextChainPosition(head);
            const receivedAt = clock.now();
            const offset = options.clockOffsetMs ?? null;
            const sealed = fresh.map((event) => {
                const normalized = offset === null
                    ? event.occurredAt
                    : unsafeEpochMs(event.occurredAt - offset);
                const trustEvent = sealEvent({
                    ...event,
                    layer: describeEvent(event.type).layer,
                    chainPosition: chainPosition++,
                    receivedAt,
                    clockOffsetMs: offset,
                    occurredAtNormalized: normalized,
                    redactedFields: [],
                }, previousHash, crypto.sha256);
                previousHash = trustEvent.integrity.hash;
                return trustEvent;
            });
            const appended = await store.append(sealed);
            const gaps = await findGaps(tenantId, sessionId);
            await recordSystemEvents(tenantId, sessionId, first.developerId, rejected, gaps);
            logger.debug('ingested batch', {
                tenantId,
                sessionId,
                accepted: appended.appended,
                duplicates,
                rejected: rejected.length,
                withheld: withheld.length,
            });
            return {
                accepted: appended.appended,
                duplicates,
                rejected,
                withheld,
                gaps,
                head: appended.head,
            };
        },
    };
    /**
     * Records rejections and gaps as first-class evidence.
     *
     * A rejected event is not merely discarded. A session whose telemetry was
     * partly malformed must read as *lower confidence*, and that only happens if
     * the rejection is in the log — otherwise a broken sandbox looks identical to
     * a clean session. These are emitted by the SERVER, a trusted producer, and
     * deliberately carry no payload from the rejected event itself: the whole
     * reason it was rejected is that its contents could not be trusted.
     */
    async function recordSystemEvents(tenantId, sessionId, developerId, rejections, gaps) {
        const notes = [];
        for (const rejection of rejections) {
            notes.push({
                type: TrustEventType.EVENT_REJECTED,
                payload: {
                    rejectedEventId: rejection.eventId,
                    rejectedType: rejection.type,
                    reasonCode: rejection.code,
                    issueCount: rejection.issues.length,
                },
            });
        }
        if (gaps.length > 0) {
            const lowest = Math.min(...gaps);
            notes.push({
                type: TrustEventType.EVENT_SEQUENCE_GAP,
                payload: {
                    expectedSequence: lowest,
                    receivedSequence: lowest + gaps.length,
                    missingCount: gaps.length,
                },
            });
        }
        if (notes.length === 0)
            return;
        const head = await store.head(tenantId, sessionId);
        let previousHash = head?.hash ?? null;
        let chainPosition = nextChainPosition(head);
        const receivedAt = clock.now();
        // The server numbers its own stream from 1. It must not continue the
        // client's numbering: the client has no idea these events exist and will
        // keep counting from where it left off, and two producers sharing one
        // counter would collide.
        let sequence = nextServerSequence(await store.readSession(tenantId, sessionId));
        const sealed = notes.map((note) => {
            const event = sealEvent({
                eventId: ids.eventId(),
                tenantId,
                sessionId,
                developerId,
                assessmentId: undefined,
                taskId: undefined,
                type: note.type,
                occurredAt: receivedAt,
                sequence: sequence++,
                source: EventSource.SERVER,
                schemaVersion: EVENT_SCHEMA_VERSION,
                payload: note.payload,
                layer: describeEvent(note.type).layer,
                chainPosition: chainPosition++,
                receivedAt,
                // Server-generated, so the server clock IS the truth here.
                clockOffsetMs: 0,
                occurredAtNormalized: receivedAt,
                redactedFields: [],
            }, previousHash, crypto.sha256);
            previousHash = event.integrity.hash;
            return event;
        });
        await store.append(sealed);
        logger.warn('recorded telemetry problems as evidence', {
            tenantId,
            sessionId,
            rejections: rejections.length,
            gaps: gaps.length,
        });
    }
    /**
     * Sequence numbers a producer emitted but the engine never received.
     *
     * Scoped to client-sourced events, and computed per source. Server-written
     * notes number their own stream, and counting them here would report gaps in
     * telemetry the sandbox never failed to deliver.
     */
    async function findGaps(tenantId, sessionId) {
        const events = await store.readSession(tenantId, sessionId);
        const client = events.filter((event) => event.source !== EventSource.SERVER);
        if (client.length === 0)
            return [];
        const present = new Set(client.map((event) => event.sequence));
        const highest = Math.max(...present);
        const missing = [];
        for (let sequence = 1; sequence < highest; sequence += 1) {
            if (!present.has(sequence))
                missing.push(sequence);
        }
        return missing;
    }
}
/** Next sequence number in the server's own stream for this session. */
function nextServerSequence(events) {
    const server = events.filter((event) => event.source === EventSource.SERVER);
    return server.length === 0 ? 1 : Math.max(...server.map((event) => event.sequence)) + 1;
}
//# sourceMappingURL=ingest.js.map