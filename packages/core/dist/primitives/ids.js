import { err, ok } from "./result.js";
const ID_BODY = /^[0-9A-Za-z][0-9A-Za-z_-]{0,63}$/;
function idCodec(prefix) {
    const parse = (value) => {
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
        return ok(value);
    };
    return {
        prefix,
        parse,
        is: (value) => parse(value).ok,
        unsafe: (value) => value,
    };
}
export const TenantId = idCodec('tnt');
export const DeveloperId = idCodec('dev');
export const SessionId = idCodec('sess');
export const AssessmentId = idCodec('asm');
export const TaskId = idCodec('task');
export const EventId = idCodec('evt');
export const SnapshotId = idCodec('snap');
export const ChallengeId = idCodec('chl');
export const SkillId = idCodec('skl');
export const InterviewId = idCodec('itw');
export const QuestionId = idCodec('qst');
export const RecordingId = idCodec('rec');
export const ReviewerId = idCodec('rvr');
export const ReviewId = idCodec('rev');
export const AuditId = idCodec('aud');
//# sourceMappingURL=ids.js.map