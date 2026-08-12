import { type EventSubmission } from '../events/envelope.ts';
import { type TrustEventType } from '../events/types.ts';
import { type Result } from '../primitives/index.ts';
import { type FieldIssue } from './schema.ts';
/**
 * Validation of a whole inbound event.
 *
 * A rejection is a first-class outcome, not an error: it is recorded as an
 * EVENT_REJECTED event so that a session whose telemetry was partly malformed
 * shows up as lower Confidence rather than silently looking clean.
 */
export declare const RejectionCode: {
    readonly MALFORMED_ENVELOPE: "MALFORMED_ENVELOPE";
    readonly UNKNOWN_EVENT_TYPE: "UNKNOWN_EVENT_TYPE";
    readonly UNSUPPORTED_SCHEMA_VERSION: "UNSUPPORTED_SCHEMA_VERSION";
    readonly INVALID_PAYLOAD: "INVALID_PAYLOAD";
    /** A producer claimed an event it has no authority to assert. */
    readonly SOURCE_NOT_PERMITTED: "SOURCE_NOT_PERMITTED";
};
export type RejectionCode = (typeof RejectionCode)[keyof typeof RejectionCode];
export interface EventRejection {
    readonly code: RejectionCode;
    /** Present when the envelope was well-formed enough to identify the event. */
    readonly eventId: string | null;
    readonly type: string | null;
    readonly issues: readonly FieldIssue[];
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
export declare function validateSubmission(input: unknown): Result<ValidatedSubmission, EventRejection>;
//# sourceMappingURL=submission.d.ts.map