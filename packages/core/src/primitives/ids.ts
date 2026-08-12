import type { Brand } from './brand.ts';
import { err, ok, type Result } from './result.ts';

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

const ID_BODY = /^[0-9A-Za-z][0-9A-Za-z_-]{0,63}$/;

function idCodec<T extends string>(prefix: string): IdCodec<T> {
  const parse = (value: unknown): Result<T, IdIssue> => {
    if (typeof value !== 'string') {
      return err({ code: 'NOT_A_STRING', expectedPrefix: prefix, received: value });
    }
    const separator = value.indexOf('_');
    if (separator === -1) {
      return err({ code: 'MISSING_PREFIX', expectedPrefix: prefix, received: value });
    }
    if (value.slice(0, separator) !== prefix) {
      return err({ code: 'WRONG_PREFIX', expectedPrefix: prefix, received: value });
    }
    if (!ID_BODY.test(value.slice(separator + 1))) {
      return err({ code: 'MALFORMED_BODY', expectedPrefix: prefix, received: value });
    }
    return ok(value as T);
  };

  return {
    prefix,
    parse,
    is: (value: unknown): value is T => parse(value).ok,
    unsafe: (value: string) => value as T,
  };
}

export type TenantId = Brand<string, 'TenantId'>;
export const TenantId: IdCodec<TenantId> = idCodec('tnt');

export type DeveloperId = Brand<string, 'DeveloperId'>;
export const DeveloperId: IdCodec<DeveloperId> = idCodec('dev');

export type SessionId = Brand<string, 'SessionId'>;
export const SessionId: IdCodec<SessionId> = idCodec('sess');

export type AssessmentId = Brand<string, 'AssessmentId'>;
export const AssessmentId: IdCodec<AssessmentId> = idCodec('asm');

export type TaskId = Brand<string, 'TaskId'>;
export const TaskId: IdCodec<TaskId> = idCodec('task');

export type EventId = Brand<string, 'EventId'>;
export const EventId: IdCodec<EventId> = idCodec('evt');

export type SnapshotId = Brand<string, 'SnapshotId'>;
export const SnapshotId: IdCodec<SnapshotId> = idCodec('snap');

export type ChallengeId = Brand<string, 'ChallengeId'>;
export const ChallengeId: IdCodec<ChallengeId> = idCodec('chl');

export type SkillId = Brand<string, 'SkillId'>;
export const SkillId: IdCodec<SkillId> = idCodec('skl');

export type InterviewId = Brand<string, 'InterviewId'>;
export const InterviewId: IdCodec<InterviewId> = idCodec('itw');

export type QuestionId = Brand<string, 'QuestionId'>;
export const QuestionId: IdCodec<QuestionId> = idCodec('qst');

export type RecordingId = Brand<string, 'RecordingId'>;
export const RecordingId: IdCodec<RecordingId> = idCodec('rec');

export type ReviewerId = Brand<string, 'ReviewerId'>;
export const ReviewerId: IdCodec<ReviewerId> = idCodec('rvr');

export type ReviewId = Brand<string, 'ReviewId'>;
export const ReviewId: IdCodec<ReviewId> = idCodec('rev');

export type AuditId = Brand<string, 'AuditId'>;
export const AuditId: IdCodec<AuditId> = idCodec('aud');
