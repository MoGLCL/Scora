import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EVENT_SCHEMA_VERSION, EventSource } from '../events/envelope.ts';
import { ALL_EVENT_TYPES, TrustEventType } from '../events/types.ts';
import { PAYLOAD_SCHEMAS, eventTypesMissingSchemas } from './payloads.ts';
import { RejectionCode, validateSubmission } from './submission.ts';

const VALID_HASH = 'a'.repeat(64);

function submission(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventId: 'evt_01hqzx8k9m2p4r6t8v0w1y3z5a',
    tenantId: 'tnt_acme',
    sessionId: 'sess_alpha',
    developerId: 'dev_kata',
    assessmentId: 'asm_one',
    taskId: 'task_one',
    type: TrustEventType.CODE_PASTE,
    occurredAt: 1_700_000_000_000,
    sequence: 12,
    source: EventSource.SANDBOX,
    schemaVersion: EVENT_SCHEMA_VERSION,
    payload: {
      path: 'src/app.ts',
      charactersAdded: 1240,
      linesAdded: 38,
      language: 'typescript',
      origin: 'external',
      contentHash: VALID_HASH,
    },
    ...overrides,
  };
}

describe('payload schema coverage', () => {
  it('has a schema for every event type in the taxonomy', () => {
    assert.deepEqual(eventTypesMissingSchemas(), []);
  });

  it('has no schema for anything outside the taxonomy', () => {
    const known = new Set<string>(ALL_EVENT_TYPES);
    const stray = Object.keys(PAYLOAD_SCHEMAS).filter((type) => !known.has(type));
    assert.deepEqual(stray, []);
  });
});

describe('validateSubmission', () => {
  it('accepts a well-formed event', () => {
    const result = validateSubmission(submission());
    assert.ok(result.ok, `expected acceptance, got ${JSON.stringify(result)}`);
    assert.equal(result.value.type, TrustEventType.CODE_PASTE);
    assert.equal(result.value.sequence, 12);
  });

  it('accepts an event without the optional assessment and task ids', () => {
    const input = submission();
    delete input['assessmentId'];
    delete input['taskId'];
    const result = validateSubmission(input);
    assert.ok(result.ok);
    assert.equal(result.value.assessmentId, undefined);
  });

  it('rejects a non-object', () => {
    const result = validateSubmission('not an event');
    assert.ok(!result.ok);
    assert.equal(result.error.code, RejectionCode.MALFORMED_ENVELOPE);
  });

  it('rejects an unknown event type', () => {
    const result = validateSubmission(submission({ type: 'DEFINITELY_NOT_REAL' }));
    assert.ok(!result.ok);
    assert.equal(result.error.code, RejectionCode.UNKNOWN_EVENT_TYPE);
  });

  it('rejects a mismatched id prefix, which would misattribute evidence', () => {
    const result = validateSubmission(submission({ developerId: 'sess_alpha' }));
    assert.ok(!result.ok);
    assert.ok(result.error.issues.some((issue) => issue.path === 'developerId'));
  });

  it('rejects an unsupported schema version', () => {
    const result = validateSubmission(submission({ schemaVersion: 99 }));
    assert.ok(!result.ok);
    assert.equal(result.error.code, RejectionCode.UNSUPPORTED_SCHEMA_VERSION);
  });

  it('rejects sequence numbers below one', () => {
    const result = validateSubmission(submission({ sequence: 0 }));
    assert.ok(!result.ok);
    assert.ok(result.error.issues.some((issue) => issue.path === 'sequence'));
  });

  it('rejects an implausible timestamp', () => {
    const result = validateSubmission(submission({ occurredAt: 5 }));
    assert.ok(!result.ok);
    assert.ok(result.error.issues.some((issue) => issue.path === 'occurredAt'));
  });

  it('rejects unknown envelope fields instead of ignoring them', () => {
    const result = validateSubmission(submission({ extraField: 'smuggled' }));
    assert.ok(!result.ok);
    assert.ok(result.error.issues.some((issue) => issue.path === 'extraField'));
  });

  it('rejects unknown payload fields, so producers cannot quietly add data', () => {
    const result = validateSubmission(
      submission({
        payload: {
          path: 'src/app.ts',
          charactersAdded: 10,
          linesAdded: 1,
          language: 'typescript',
          origin: 'internal',
          contentHash: VALID_HASH,
          clipboardText: 'the actual pasted code',
        },
      }),
    );
    assert.ok(!result.ok);
    assert.equal(result.error.code, RejectionCode.INVALID_PAYLOAD);
    assert.ok(result.error.issues.some((issue) => issue.path === 'payload.clipboardText'));
  });

  it('reports a missing required payload field with its path', () => {
    const result = validateSubmission(
      submission({
        payload: {
          path: 'src/app.ts',
          charactersAdded: 10,
          linesAdded: 1,
          language: 'typescript',
          origin: 'internal',
        },
      }),
    );
    assert.ok(!result.ok);
    const issue = result.error.issues.find((i) => i.path === 'payload.contentHash');
    assert.ok(issue);
    assert.equal(issue.code, 'REQUIRED');
  });

  it('rejects a value outside a closed union', () => {
    const result = validateSubmission(
      submission({
        payload: {
          path: 'src/app.ts',
          charactersAdded: 10,
          linesAdded: 1,
          language: 'typescript',
          origin: 'telepathy',
          contentHash: VALID_HASH,
        },
      }),
    );
    assert.ok(!result.ok);
    assert.ok(result.error.issues.some((issue) => issue.code === 'NOT_IN_UNION'));
  });

  it('rejects an absolute file path, which would leak the host filesystem', () => {
    const result = validateSubmission(
      submission({
        payload: {
          path: '/home/dev/secret/app.ts',
          charactersAdded: 10,
          linesAdded: 1,
          language: 'typescript',
          origin: 'internal',
          contentHash: VALID_HASH,
        },
      }),
    );
    assert.ok(!result.ok);
    assert.ok(result.error.issues.some((issue) => issue.path === 'payload.path'));
  });

  it('rejects a malformed content hash', () => {
    const result = validateSubmission(
      submission({
        payload: {
          path: 'src/app.ts',
          charactersAdded: 10,
          linesAdded: 1,
          language: 'typescript',
          origin: 'internal',
          contentHash: 'not-a-hash',
        },
      }),
    );
    assert.ok(!result.ok);
    assert.ok(result.error.issues.some((issue) => issue.path === 'payload.contentHash'));
  });

  it('collects several envelope problems in one rejection', () => {
    const result = validateSubmission(
      submission({ developerId: 'nope', sequence: -1, occurredAt: 'yesterday' }),
    );
    assert.ok(!result.ok);
    assert.ok(result.error.issues.length >= 3, 'a misconfigured producer should learn everything at once');
  });
});

describe('producer authority', () => {
  it('stops a sandbox from asserting a human review decision', () => {
    const result = validateSubmission(
      submission({
        type: TrustEventType.REVIEW_DECISION_RECORDED,
        source: EventSource.SANDBOX,
        payload: {
          reviewId: 'rev_1',
          reviewerId: 'rvr_1',
          decision: 'APPROVE',
          rationaleLength: 10,
          rationaleHash: VALID_HASH,
          reviewDurationMs: 1000,
        },
      }),
    );
    assert.ok(!result.ok);
    assert.equal(result.error.code, RejectionCode.SOURCE_NOT_PERMITTED);
  });

  it('stops a sandbox from asserting an interview score', () => {
    const result = validateSubmission(
      submission({
        type: TrustEventType.INTERVIEW_ANSWER_SCORED,
        source: EventSource.SANDBOX,
        payload: {
          interviewId: 'itw_1',
          questionId: 'qst_1',
          correctness: 1,
          depth: 1,
          specificity: 1,
          consistencyWithCode: 1,
          graderModel: 'grader',
          graderConfidence: 1,
        },
      }),
    );
    assert.ok(!result.ok);
    assert.equal(result.error.code, RejectionCode.SOURCE_NOT_PERMITTED);
  });

  it('stops the browser agent from asserting typing behaviour', () => {
    const result = validateSubmission(submission({ source: EventSource.BROWSER_AGENT }));
    assert.ok(!result.ok);
    assert.equal(result.error.code, RejectionCode.SOURCE_NOT_PERMITTED);
  });

  it('lets a human reviewer record a decision', () => {
    const result = validateSubmission(
      submission({
        type: TrustEventType.REVIEW_DECISION_RECORDED,
        source: EventSource.HUMAN,
        payload: {
          reviewId: 'rev_1',
          reviewerId: 'rvr_1',
          decision: 'REQUEST_REVIEW',
          rationaleLength: 42,
          rationaleHash: VALID_HASH,
          reviewDurationMs: 90_000,
        },
      }),
    );
    assert.ok(result.ok, JSON.stringify(result));
  });

  it('lets the server assert anything, since it is the trusted producer', () => {
    const result = validateSubmission(
      submission({
        type: TrustEventType.EVENT_SEQUENCE_GAP,
        source: EventSource.SERVER,
        payload: { expectedSequence: 5, receivedSequence: 8, missingCount: 3 },
      }),
    );
    assert.ok(result.ok, JSON.stringify(result));
  });
});
