import type {
  AssessmentId,
  DeveloperId,
  EpochMs,
  EventId,
  SessionId,
  TaskId,
  TenantId,
} from '../primitives/index.ts';
import type { TrustLayer } from './layers.ts';
import type { TrustEventType } from './types.ts';

/** Which component asserted the event. Producers are not equally trustworthy. */
export const EventSource = {
  /** The instrumented sandbox runtime. Client-side, therefore untrusted. */
  SANDBOX: 'SANDBOX',
  /** An opt-in external-activity agent. Client-side, therefore untrusted. */
  BROWSER_AGENT: 'BROWSER_AGENT',
  /** The platform's own backend. Trusted. */
  SERVER: 'SERVER',
  /** An AI service acting as examiner or analyst. Trusted, but its content is an opinion. */
  AI_SERVICE: 'AI_SERVICE',
  /** A human reviewer or administrator. Trusted and authoritative. */
  HUMAN: 'HUMAN',
  /** The calibration harness replaying synthetic sessions. Never mixed with real tenants. */
  CALIBRATION_HARNESS: 'CALIBRATION_HARNESS',
} as const;

export type EventSource = (typeof EventSource)[keyof typeof EventSource];

/** Producers whose claims must be corroborated before they can affect Risk. */
export const UNTRUSTED_SOURCES: readonly EventSource[] = [
  EventSource.SANDBOX,
  EventSource.BROWSER_AGENT,
];

export function isUntrustedSource(source: EventSource): boolean {
  return UNTRUSTED_SOURCES.includes(source);
}

/**
 * Envelope schema version, stored on every event.
 *
 * The evidence log is append-only and must stay readable for as long as
 * retention requires, so stored events are never rewritten to a new shape;
 * readers upgrade on the way out instead.
 */
export const EVENT_SCHEMA_VERSION = 1;

/**
 * Tamper-evidence for a single event.
 *
 * `hash` covers the event's own canonical form plus `previousHash`, chaining
 * every event in a session together. Altering or removing one event invalidates
 * every hash after it, so a reviewer can be shown that the evidence they are
 * looking at is the evidence that was recorded.
 */
export interface EventIntegrity {
  readonly algorithm: 'sha256';
  readonly hash: string;
  /** Null only for the first event in a session. */
  readonly previousHash: string | null;
}

/**
 * An event as submitted by a producer, before the engine has admitted it.
 *
 * Nothing here is trusted yet: the timestamp comes from a clock the engine does
 * not own, the sequence number can repeat, and the payload shape is unverified.
 */
export interface EventSubmission {
  readonly eventId: EventId;
  readonly tenantId: TenantId;
  readonly sessionId: SessionId;
  readonly developerId: DeveloperId;
  readonly assessmentId?: AssessmentId | undefined;
  readonly taskId?: TaskId | undefined;
  readonly type: TrustEventType;
  /** Producer's clock. Rebased onto the server timeline during ingestion. */
  readonly occurredAt: EpochMs;
  /** Monotonically increasing within a session, starting at 1. Gaps mean lost telemetry. */
  readonly sequence: number;
  readonly source: EventSource;
  readonly schemaVersion: number;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * An admitted, immutable evidence record.
 *
 * Everything the Trust Engine ever concludes is derived from a set of these.
 * There is no other input, and no score is ever stored without the events that
 * produced it — that is what lets the system answer "why did this developer get
 * this score" months later.
 */
export interface TrustEvent extends EventSubmission {
  /** Resolved from the registry at admission, not supplied by the producer. */
  readonly layer: TrustLayer;
  /**
   * Position in the session's hash chain. Server-assigned, 1-based, contiguous.
   *
   * Deliberately separate from `sequence`. `sequence` is the producer's *claim*
   * about its own emission order — a client can lose it, repeat it, or never
   * reach a value at all — whereas the chain must have exactly one total order
   * that the engine itself controls. Conflating the two means the server cannot
   * write into a session's log without colliding with numbering the client owns,
   * and a collision reads as tampering: the harshest conclusion the engine can
   * draw, produced by an ordinary telemetry fault.
   *
   * So: gaps in `sequence` are lost telemetry and lower Confidence. Gaps in
   * `chainPosition` are tampering, because nothing but this engine assigns them.
   */
  readonly chainPosition: number;
  /** Server clock at admission. The only timestamp the engine fully trusts. */
  readonly receivedAt: EpochMs;
  /**
   * Correction applied to reach `occurredAtNormalized`. Null when no clock sync
   * sample was available, which lowers Confidence for timing-derived features.
   */
  readonly clockOffsetMs: number | null;
  /** `occurredAt` rebased onto the server timeline. Features must read this, not `occurredAt`. */
  readonly occurredAtNormalized: EpochMs;
  readonly integrity: EventIntegrity;
  /**
   * Payload fields removed or hashed before storage under the event's privacy
   * policy. Recorded so a reviewer can see that something was deliberately not
   * retained, rather than silently missing.
   */
  readonly redactedFields: readonly string[];
}

export function isTrustEvent(value: EventSubmission | TrustEvent): value is TrustEvent {
  return 'integrity' in value && 'receivedAt' in value;
}
