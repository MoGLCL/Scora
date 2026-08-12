import type { Brand } from './brand.ts';
import { type Result } from './result.ts';
/**
 * Prefixed, branded identifiers.
 *
 * Every identifier carries its entity type in the value itself (`sess_...`,
 * `dev_...`). That makes mis-wired plumbing fail loudly at the boundary instead
 * of silently attributing one developer's evidence to another — the single most
 * damaging bug this system could have.
 */
export type IdIssue = {
    readonly code: 'NOT_A_STRING' | 'MISSING_PREFIX' | 'WRONG_PREFIX' | 'MALFORMED_BODY';
    readonly expectedPrefix: string;
    readonly received: unknown;
};
export interface IdCodec<T extends string> {
    readonly prefix: string;
    is(value: unknown): value is T;
    parse(value: unknown): Result<T, IdIssue>;
    /** No validation. Only for values already known good: generators, DB rows, tests. */
    unsafe(value: string): T;
}
export type TenantId = Brand<string, 'TenantId'>;
export declare const TenantId: IdCodec<TenantId>;
export type DeveloperId = Brand<string, 'DeveloperId'>;
export declare const DeveloperId: IdCodec<DeveloperId>;
export type SessionId = Brand<string, 'SessionId'>;
export declare const SessionId: IdCodec<SessionId>;
export type AssessmentId = Brand<string, 'AssessmentId'>;
export declare const AssessmentId: IdCodec<AssessmentId>;
export type TaskId = Brand<string, 'TaskId'>;
export declare const TaskId: IdCodec<TaskId>;
export type EventId = Brand<string, 'EventId'>;
export declare const EventId: IdCodec<EventId>;
export type SnapshotId = Brand<string, 'SnapshotId'>;
export declare const SnapshotId: IdCodec<SnapshotId>;
export type ChallengeId = Brand<string, 'ChallengeId'>;
export declare const ChallengeId: IdCodec<ChallengeId>;
export type SkillId = Brand<string, 'SkillId'>;
export declare const SkillId: IdCodec<SkillId>;
export type InterviewId = Brand<string, 'InterviewId'>;
export declare const InterviewId: IdCodec<InterviewId>;
export type QuestionId = Brand<string, 'QuestionId'>;
export declare const QuestionId: IdCodec<QuestionId>;
export type RecordingId = Brand<string, 'RecordingId'>;
export declare const RecordingId: IdCodec<RecordingId>;
export type ReviewerId = Brand<string, 'ReviewerId'>;
export declare const ReviewerId: IdCodec<ReviewerId>;
export type ReviewId = Brand<string, 'ReviewId'>;
export declare const ReviewId: IdCodec<ReviewId>;
export type AuditId = Brand<string, 'AuditId'>;
export declare const AuditId: IdCodec<AuditId>;
//# sourceMappingURL=ids.d.ts.map