export type { Brand, Unbrand } from './brand.ts';

export {
  type Err,
  type Ok,
  type Result,
  err,
  isErr,
  isOk,
  mapErr,
  mapOk,
  ok,
  partition,
  unwrapOr,
} from './result.ts';

export {
  type RangeIssue,
  type Score,
  type Unit,
  clamp,
  clampScore,
  clampUnit,
  roundTo,
  scoreToUnit,
  toScore,
  toUnit,
  unitToScore,
} from './numeric.ts';

export {
  type ClockSync,
  type DurationMs,
  type EpochMs,
  type TimeIssue,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  addMs,
  correctClientTimestamp,
  elapsed,
  estimateClockSync,
  isWithin,
  toDurationMs,
  toEpochMs,
  unsafeEpochMs,
} from './time.ts';

export type { IdCodec, IdIssue } from './ids.ts';

// Each of these names carries both meanings: the branded type (`id: SessionId`)
// and the codec value (`SessionId.parse(input)`).
export {
  AssessmentId,
  AuditId,
  ChallengeId,
  DeveloperId,
  EventId,
  InterviewId,
  QuestionId,
  RecordingId,
  ReviewId,
  ReviewerId,
  SessionId,
  SkillId,
  SnapshotId,
  TaskId,
  TenantId,
} from './ids.ts';
