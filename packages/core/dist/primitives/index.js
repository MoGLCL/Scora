export { err, isErr, isOk, mapErr, mapOk, ok, partition, unwrapOr, } from "./result.js";
export { clamp, clampScore, clampUnit, roundTo, scoreToUnit, toScore, toUnit, unitToScore, } from "./numeric.js";
export { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND, addMs, correctClientTimestamp, elapsed, estimateClockSync, isWithin, toDurationMs, toEpochMs, unsafeEpochMs, } from "./time.js";
// Each of these names carries both meanings: the branded type (`id: SessionId`)
// and the codec value (`SessionId.parse(input)`).
export { AssessmentId, AuditId, ChallengeId, DeveloperId, EventId, InterviewId, QuestionId, RecordingId, ReviewId, ReviewerId, SessionId, SkillId, SnapshotId, TaskId, TenantId, } from "./ids.js";
//# sourceMappingURL=index.js.map