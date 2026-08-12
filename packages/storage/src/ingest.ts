import {
  EVENT_SCHEMA_VERSION,
  EventSource,
  TrustEventType,
  describeEvent,
  nextChainPosition,
  sealEvent,
  unsafeEpochMs,
  validateSubmission,
  type AppendResult,
  type Clock,
  type CryptoPort,
  type EventRejection,
  type EventStore,
  type IdGenerator,
  type Logger,
  type SessionId,
  type TenantId,
  type TrustEvent,
  type ValidatedSubmission,
} from '@scora/trust-core';

/**
 * The ingestion pipeline.
 *
 * Untrusted telemetry in, sealed evidence out. The order of operations is
 * load-bearing:
 *
 *   1. validate       — envelope, payload, producer authority
 *   2. consent        — drop what was never lawful to collect
 *   3. deduplicate    — BEFORE sealing, so a retry cannot fabricate a chain break
 *   4. order          — by sequence, so out-of-order delivery links correctly
 *   5. seal           — hash-chain each event to its predecessor
 *   6. append         — atomically, per session
 *   7. record         — rejections and gaps as evidence in their own right
 *
 * Step 3 before step 5 is the subtle one. Sealing computes `previousHash` from
 * the current chain head; re-sealing an already-stored event would produce a
 * different hash and turn an ordinary network retry into an apparent tampering
 * incident.
 */

export interface IngestionDependencies {
  readonly store: EventStore;
  readonly clock: Clock;
  readonly crypto: CryptoPort;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  /** Granted consent scopes per session. Absent means collection is unrestricted. */
  readonly consent?: {
    grantedScopes(
      tenantId: TenantId,
      sessionId: SessionId,
    ): Promise<readonly ('assessment' | 'external_monitoring' | 'recording')[]>;
  };
}

export interface IngestionResult {
  readonly accepted: number;
  readonly duplicates: number;
  readonly rejected: readonly EventRejection[];
  /** Events dropped because the required consent scope was not granted. */
  readonly withheld: readonly { readonly type: string; readonly scope: string }[];
  /** Sequence numbers missing from this session's log after the append. */
  readonly gaps: readonly number[];
  readonly head: AppendResult['head'];
}

export interface IngestOptions {
  /**
   * Clock offset for the submitting client, from a prior sync exchange.
   *
   * When absent, client timestamps are used as-is and the resulting events
   * record `clockOffsetMs: null` — which lowers confidence in every
   * timing-derived feature rather than pretending the timing is exact.
   */
  readonly clockOffsetMs?: number | undefined;
}

export function createIngestion(dependencies: IngestionDependencies) {
  const { store, clock, crypto, ids, logger, consent } = dependencies;

  return {
    /**
     * Ingests a batch of submissions for one session.
     *
     * One malformed event never aborts the batch: the good events still land,
     * and the bad ones are recorded as EVENT_REJECTED so a session with partly
     * broken telemetry reads as lower confidence rather than looking clean.
     */
    async ingest(
      submissions: readonly unknown[],
      options: IngestOptions = {},
    ): Promise<IngestionResult> {
      const validated: ValidatedSubmission[] = [];
      const rejected: EventRejection[] = [];

      for (const submission of submissions) {
        const result = validateSubmission(submission);
        if (result.ok) validated.push(result.value);
        else rejected.push(result.error);
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

      const first = validated[0]!;
      const { tenantId, sessionId } = first;

      const mixed = validated.some(
        (event) => event.tenantId !== tenantId || event.sessionId !== sessionId,
      );
      if (mixed) {
        throw new Error('ingest() requires all submissions to belong to one tenant and session');
      }

      // Consent gates collection, not reading. Data that was never lawful to
      // collect should not exist in the log at all — filtering at read time
      // would leave it sitting in storage.
      const withheld: { type: string; scope: string }[] = [];
      let admissible = validated;

      if (consent !== undefined) {
        const granted = new Set(await consent.grantedScopes(tenantId, sessionId));
        admissible = validated.filter((event) => {
          const required = describeEvent(event.type).requiresConsent;
          if (required === 'none' || granted.has(required)) return true;
          withheld.push({ type: event.type, scope: required });
          return false;
        });
      }

      // Deduplicate before sealing. See the note at the top of this file.
      const known = await store.existing(
        tenantId,
        admissible.map((event) => event.eventId),
      );
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

      const sealed: TrustEvent[] = fresh.map((event) => {
        const normalized =
          offset === null
            ? event.occurredAt
            : unsafeEpochMs(event.occurredAt - offset);

        const trustEvent = sealEvent(
          {
            ...event,
            layer: describeEvent(event.type).layer,
            chainPosition: chainPosition++,
            receivedAt,
            clockOffsetMs: offset,
            occurredAtNormalized: normalized,
            redactedFields: [],
          },
          previousHash,
          crypto.sha256,
        );

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
  async function recordSystemEvents(
    tenantId: TenantId,
    sessionId: SessionId,
    developerId: ValidatedSubmission['developerId'],
    rejections: readonly EventRejection[],
    gaps: readonly number[],
  ): Promise<void> {
    const notes: { type: TrustEventType; payload: Record<string, unknown> }[] = [];

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

    if (notes.length === 0) return;

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
      const event = sealEvent(
        {
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
        },
        previousHash,
        crypto.sha256,
      );
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
  async function findGaps(
    tenantId: TenantId,
    sessionId: SessionId,
  ): Promise<readonly number[]> {
    const events = await store.readSession(tenantId, sessionId);
    const client = events.filter((event) => event.source !== EventSource.SERVER);
    if (client.length === 0) return [];

    const present = new Set(client.map((event) => event.sequence));
    const highest = Math.max(...present);
    const missing: number[] = [];

    for (let sequence = 1; sequence < highest; sequence += 1) {
      if (!present.has(sequence)) missing.push(sequence);
    }

    return missing;
  }
}

/** Next sequence number in the server's own stream for this session. */
function nextServerSequence(events: readonly TrustEvent[]): number {
  const server = events.filter((event) => event.source === EventSource.SERVER);
  return server.length === 0 ? 1 : Math.max(...server.map((event) => event.sequence)) + 1;
}

export type Ingestion = ReturnType<typeof createIngestion>;
