import { EVENT_REGISTRY } from '../events/registry.ts';
import {
  EVENT_SCHEMA_VERSION,
  EventSource,
  type EventSubmission,
} from '../events/envelope.ts';
import { isTrustEventType, type TrustEventType } from '../events/types.ts';
import {
  AssessmentId,
  DeveloperId,
  EventId,
  SessionId,
  TaskId,
  TenantId,
  err,
  ok,
  toEpochMs,
  type EpochMs,
  type Result,
} from '../primitives/index.ts';
import { payloadSchemaFor } from './payloads.ts';
import { type FieldIssue } from './schema.ts';

/**
 * Validation of a whole inbound event.
 *
 * A rejection is a first-class outcome, not an error: it is recorded as an
 * EVENT_REJECTED event so that a session whose telemetry was partly malformed
 * shows up as lower Confidence rather than silently looking clean.
 */

export const RejectionCode = {
  MALFORMED_ENVELOPE: 'MALFORMED_ENVELOPE',
  UNKNOWN_EVENT_TYPE: 'UNKNOWN_EVENT_TYPE',
  UNSUPPORTED_SCHEMA_VERSION: 'UNSUPPORTED_SCHEMA_VERSION',
  INVALID_PAYLOAD: 'INVALID_PAYLOAD',
  /** A producer claimed an event it has no authority to assert. */
  SOURCE_NOT_PERMITTED: 'SOURCE_NOT_PERMITTED',
} as const;

export type RejectionCode = (typeof RejectionCode)[keyof typeof RejectionCode];

export interface EventRejection {
  readonly code: RejectionCode;
  /** Present when the envelope was well-formed enough to identify the event. */
  readonly eventId: string | null;
  readonly type: string | null;
  readonly issues: readonly FieldIssue[];
}

/**
 * Which producers may assert which layers.
 *
 * A sandbox can report that a suggestion was accepted; it cannot report that a
 * human approved the assessment. Without this, compromising a client would let
 * an attacker mint favourable evidence.
 */
const SOURCE_AUTHORITY: Readonly<Record<EventSource, 'any' | readonly string[]>> = {
  [EventSource.SANDBOX]: [
    'L01_ENVIRONMENT_INTEGRITY',
    'L02_INTERACTION_BEHAVIOR',
    'L03_TYPING_EDITING',
    'L04_CODE_EVOLUTION',
    'L05_RUNTIME_DEBUGGING',
    'L07_AI_ASSISTANCE',
  ],
  [EventSource.BROWSER_AGENT]: ['L06_EXTERNAL_ACTIVITY'],
  [EventSource.AI_SERVICE]: ['L08_SKILL_UNDERSTANDING', 'L09_AI_INTERVIEW'],
  [EventSource.HUMAN]: ['L10_HUMAN_REVIEW'],
  [EventSource.SERVER]: 'any',
  [EventSource.CALIBRATION_HARNESS]: 'any',
};

function envelopeIssue(path: string, code: string, message: string, received?: unknown): FieldIssue {
  return received === undefined ? { path, code, message } : { path, code, message, received };
}

export interface ValidatedSubmission extends EventSubmission {
  readonly type: TrustEventType;
}

/**
 * Validates an untrusted inbound event.
 *
 * Every issue is collected rather than failing at the first, so a
 * misconfigured sandbox gets one actionable rejection listing everything wrong
 * instead of revealing its problems one deploy at a time.
 */
export function validateSubmission(input: unknown): Result<ValidatedSubmission, EventRejection> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return err({
      code: RejectionCode.MALFORMED_ENVELOPE,
      eventId: null,
      type: null,
      issues: [envelopeIssue('', 'NOT_AN_OBJECT', 'Event must be an object', input)],
    });
  }

  const raw = input as Record<string, unknown>;
  const issues: FieldIssue[] = [];

  const eventId = raw['eventId'];
  const rawType = raw['type'];
  const identity = typeof eventId === 'string' ? eventId : null;
  const typeLabel = typeof rawType === 'string' ? rawType : null;

  const requireId = <T extends string>(
    field: string,
    codec: { parse(value: unknown): Result<T, { code: string }> },
  ): T | null => {
    const parsed = codec.parse(raw[field]);
    if (parsed.ok) return parsed.value;
    issues.push(envelopeIssue(field, parsed.error.code, `Invalid ${field}`, raw[field]));
    return null;
  };

  const parsedEventId = requireId('eventId', EventId);
  const parsedTenantId = requireId('tenantId', TenantId);
  const parsedSessionId = requireId('sessionId', SessionId);
  const parsedDeveloperId = requireId('developerId', DeveloperId);

  let parsedAssessmentId: ReturnType<typeof AssessmentId.unsafe> | undefined;
  if (raw['assessmentId'] !== undefined && raw['assessmentId'] !== null) {
    const parsed = AssessmentId.parse(raw['assessmentId']);
    if (parsed.ok) parsedAssessmentId = parsed.value;
    else issues.push(envelopeIssue('assessmentId', parsed.error.code, 'Invalid assessmentId', raw['assessmentId']));
  }

  let parsedTaskId: ReturnType<typeof TaskId.unsafe> | undefined;
  if (raw['taskId'] !== undefined && raw['taskId'] !== null) {
    const parsed = TaskId.parse(raw['taskId']);
    if (parsed.ok) parsedTaskId = parsed.value;
    else issues.push(envelopeIssue('taskId', parsed.error.code, 'Invalid taskId', raw['taskId']));
  }

  if (!isTrustEventType(rawType)) {
    return err({
      code: RejectionCode.UNKNOWN_EVENT_TYPE,
      eventId: identity,
      type: typeLabel,
      issues: [
        ...issues,
        envelopeIssue('type', 'UNKNOWN_EVENT_TYPE', 'Event type is not in the taxonomy', rawType),
      ],
    });
  }
  const type: TrustEventType = rawType;

  const schemaVersion = raw['schemaVersion'];
  if (schemaVersion !== EVENT_SCHEMA_VERSION) {
    return err({
      code: RejectionCode.UNSUPPORTED_SCHEMA_VERSION,
      eventId: identity,
      type,
      issues: [
        envelopeIssue(
          'schemaVersion',
          'UNSUPPORTED_SCHEMA_VERSION',
          `Expected schema version ${EVENT_SCHEMA_VERSION}`,
          schemaVersion,
        ),
      ],
    });
  }

  const source = raw['source'];
  const isKnownSource =
    typeof source === 'string' && Object.hasOwn(EventSource, source);
  if (!isKnownSource) {
    issues.push(envelopeIssue('source', 'UNKNOWN_SOURCE', 'Unrecognised event source', source));
  }

  const occurredAt = toEpochMs(raw['occurredAt']);
  if (!occurredAt.ok) {
    issues.push(
      envelopeIssue('occurredAt', occurredAt.error.code, 'Invalid occurredAt timestamp', raw['occurredAt']),
    );
  }

  const sequence = raw['sequence'];
  if (typeof sequence !== 'number' || !Number.isInteger(sequence) || sequence < 1) {
    issues.push(
      envelopeIssue('sequence', 'INVALID_SEQUENCE', 'Sequence must be an integer of at least 1', sequence),
    );
  }

  const payload = raw['payload'];
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    issues.push(envelopeIssue('payload', 'NOT_AN_OBJECT', 'Payload must be an object', payload));
  }

  for (const key of Object.keys(raw)) {
    if (!ENVELOPE_FIELDS.has(key)) {
      issues.push(envelopeIssue(key, 'UNKNOWN_FIELD', 'Field is not part of the event envelope'));
    }
  }

  if (isKnownSource) {
    const permitted = SOURCE_AUTHORITY[source as EventSource];
    const layer = EVENT_REGISTRY[type].layer;
    if (permitted !== 'any' && !permitted.includes(layer)) {
      return err({
        code: RejectionCode.SOURCE_NOT_PERMITTED,
        eventId: identity,
        type,
        issues: [
          ...issues,
          envelopeIssue(
            'source',
            'SOURCE_NOT_PERMITTED',
            `Source ${source} may not assert ${layer} events`,
            source,
          ),
        ],
      });
    }
  }

  if (issues.length > 0) {
    return err({
      code: RejectionCode.MALFORMED_ENVELOPE,
      eventId: identity,
      type,
      issues,
    });
  }

  const payloadResult = payloadSchemaFor(type).validate(payload, 'payload');
  if (!payloadResult.ok) {
    return err({
      code: RejectionCode.INVALID_PAYLOAD,
      eventId: identity,
      type,
      issues: payloadResult.error,
    });
  }

  return ok({
    eventId: parsedEventId!,
    tenantId: parsedTenantId!,
    sessionId: parsedSessionId!,
    developerId: parsedDeveloperId!,
    assessmentId: parsedAssessmentId,
    taskId: parsedTaskId,
    type,
    occurredAt: (occurredAt as { value: EpochMs }).value,
    sequence: sequence as number,
    source: source as EventSource,
    schemaVersion: EVENT_SCHEMA_VERSION,
    payload: payloadResult.value as Readonly<Record<string, unknown>>,
  });
}

const ENVELOPE_FIELDS = new Set([
  'eventId',
  'tenantId',
  'sessionId',
  'developerId',
  'assessmentId',
  'taskId',
  'type',
  'occurredAt',
  'sequence',
  'source',
  'schemaVersion',
  'payload',
]);
