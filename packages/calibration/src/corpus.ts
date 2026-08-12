import { TrustEventType } from '@scora/trust-core';
import { hexHash, payloads, type EventSpec } from '@scora/trust-features/testing';
import {
  DEPENDENT,
  FAST_DEVELOPER,
  HEAVY_ASSISTANCE_ENGAGED,
  HONEST_SOLO,
  HONEST_WITH_DOCS,
  SPARSE,
  STRUGGLING_BEGINNER,
  sessionStart,
} from '@scora/trust-scoring/scenarios';
import { CaseLabel, CaseTrait, LabelSource, type LabelledCase } from './contract.ts';

/**
 * The labelled corpus.
 *
 * Deliberately lopsided: most of these sessions are honest, and most of the
 * honest ones look bad. That is the whole design. A corpus balanced between
 * "obviously fine" and "obviously dependent" would pass any engine, including
 * one that flags every developer who types quickly.
 *
 * The cases that earn their place are the ones where a naive rule and a fair
 * reviewer disagree:
 *
 *   - the developer using dictation, whose input arrives in bursts no hand
 *     produces
 *   - the developer pasting three hundred lines of their own prior work
 *   - the developer who consented to the minimum scope, leaving four layers dark
 *   - the developer whose network dropped for six minutes
 *
 * Each of these trips "paste = cheating", "fast = AI", or "gaps = evasion". Each
 * is labelled `OWNS_WORK`, and the engine has to agree without being told which
 * ones they are.
 *
 * A note on what these labels are worth. Synthetic cases test what we thought
 * to construct, and no more; the corpus cannot discover a false positive nobody
 * imagined. That is what `fromReviews` is for, and why the report's limitations
 * say so in as many words.
 */

/** Repeats a spec at a fixed cadence, so long sessions stay readable. */
function repeat(count: number, at: number, everyMs: number, make: (index: number, at: number) => EventSpec): EventSpec[] {
  return Array.from({ length: count }, (_, index) => make(index, at + index * everyMs));
}

/**
 * Dictation and snippet expansion.
 *
 * Text arrives in large, fast, well-formed chunks because a machine is typing
 * what a human said. Every heuristic built on keystroke cadence reads this as
 * synthetic. The developer then debugs, refactors and tests it — which is what
 * ownership looks like, and what the engine is supposed to weigh instead.
 */
export const ASSISTIVE_DICTATION: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.FILE_OPENED, at: 2_000, payload: { path: 'src/app.ts', language: 'typescript', lineCount: 30 } },
  ...repeat(6, 6_000, 22_000, (index, at) => ({
    type: TrustEventType.TEXT_INSERTED,
    at,
    payload: payloads.insert(180, 6, 1 + index * 6),
  })),
  { type: TrustEventType.BACKSPACE_BURST, at: 140_000, payload: { path: 'src/app.ts', backspaceCount: 40, durationMs: 9_000 } },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 150_000, payload: payloads.diff(14, 9) },
  { type: TrustEventType.REFACTOR_DETECTED, at: 158_000, payload: { path: 'src/app.ts', kind: 'extract_function', affectedLines: 12, behaviourPreserved: true } },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 170_000, payload: payloads.error('undef') },
  { type: TrustEventType.BREAKPOINT_SET, at: 176_000, payload: { path: 'src/app.ts', line: 22, proximityToErrorLines: 0 } },
  { type: TrustEventType.FIX_ATTEMPTED, at: 184_000, payload: { errorSignatureHash: hexHash('undef'), attemptNumber: 1, path: 'src/app.ts', charactersChanged: 45, timeSinceErrorMs: 14_000 } },
  { type: TrustEventType.ERROR_RESOLVED, at: 200_000, payload: payloads.errorResolved('undef', 1, 30_000) },
  { type: TrustEventType.TEST_RUN_STARTED, at: 206_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 212_000, payload: payloads.testFinished('r1', 11, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 220_000, payload: { taskId: 'task_test', durationMs: 220_000, finalDigest: 'a'.repeat(64), testsPassing: 11, testsTotal: 11 } },
];

/**
 * A developer pasting their own prior work.
 *
 * 2,600 characters in one insertion from the clipboard — numerically identical
 * to the dependent session's paste. What differs is everything after it: they
 * navigate it, restructure it, break it, and fix it. Someone who did not write
 * the code they pasted does not refactor it eleven seconds later.
 */
export const REUSES_OWN_LIBRARY: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.FILE_OPENED, at: 2_000, payload: { path: 'src/app.ts', language: 'typescript', lineCount: 12 } },
  { type: TrustEventType.CODE_PASTE, at: 9_000, payload: payloads.paste(2_600, 88, 'internal') },
  { type: TrustEventType.LARGE_INSERTION, at: 9_100, payload: payloads.largeInsertion(2_600, 88, 'paste') },
  { type: TrustEventType.NAVIGATION_JUMP, at: 14_000, payload: { kind: 'definition', fromPath: 'src/app.ts', toPath: 'src/app.ts' } },
  { type: TrustEventType.REFACTOR_DETECTED, at: 20_000, payload: { path: 'src/app.ts', kind: 'rename_symbol', affectedLines: 26, behaviourPreserved: true } },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 26_000, payload: payloads.diff(11, 34) },
  { type: TrustEventType.TYPING_BURST, at: 34_000, payload: payloads.typingBurst(340, 38_000, 112) },
  { type: TrustEventType.TEXT_INSERTED, at: 74_000, payload: payloads.insert(340, 13) },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 84_000, payload: payloads.error('shape') },
  { type: TrustEventType.FIX_ATTEMPTED, at: 96_000, payload: { errorSignatureHash: hexHash('shape'), attemptNumber: 1, path: 'src/app.ts', charactersChanged: 70, timeSinceErrorMs: 12_000 } },
  { type: TrustEventType.ERROR_RESOLVED, at: 110_000, payload: payloads.errorResolved('shape', 1, 26_000) },
  { type: TrustEventType.REFACTOR_DETECTED, at: 120_000, payload: { path: 'src/app.ts', kind: 'extract_function', affectedLines: 18, behaviourPreserved: true } },
  { type: TrustEventType.TEST_RUN_STARTED, at: 130_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 136_000, payload: payloads.testFinished('r1', 16, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 145_000, payload: { taskId: 'task_test', durationMs: 145_000, finalDigest: 'a'.repeat(64), testsPassing: 16, testsTotal: 16 } },
];

/**
 * A working session on a bad connection.
 *
 * Six minutes of the stream simply missing, with nothing replayed on reconnect —
 * the events are gone, not buffered, which is the blindest version of this and
 * therefore the right one to test. The gap is the network's fault. Read as
 * evasion — "they disabled monitoring" — it becomes an accusation manufactured
 * out of someone's hotel wifi.
 */
export const DEGRADED_CONNECTION: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.TYPING_BURST, at: 5_000, payload: payloads.typingBurst(380, 52_000, 137) },
  { type: TrustEventType.TEXT_INSERTED, at: 60_000, payload: payloads.insert(380, 15) },
  { type: TrustEventType.SANDBOX_DISCONNECTED, at: 70_000, payload: { reason: 'network', lastAcknowledgedSequence: 4 } },
  { type: TrustEventType.SANDBOX_RECONNECTED, at: 430_000, payload: { outageMs: 360_000, eventsReplayed: 0 } },
  { type: TrustEventType.TYPING_BURST, at: 440_000, payload: payloads.typingBurst(300, 44_000, 147) },
  { type: TrustEventType.TEXT_INSERTED, at: 488_000, payload: payloads.insert(300, 11) },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 494_000, payload: payloads.diff(11, 4) },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 502_000, payload: payloads.error('net') },
  { type: TrustEventType.ERROR_RESOLVED, at: 530_000, payload: payloads.errorResolved('net', 2, 28_000) },
  { type: TrustEventType.TEST_RUN_STARTED, at: 540_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 546_000, payload: payloads.testFinished('r1', 8, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 555_000, payload: { taskId: 'task_test', durationMs: 555_000, finalDigest: 'a'.repeat(64), testsPassing: 8, testsTotal: 8 } },
];

/**
 * Minimum consent: assessment scope only.
 *
 * No external activity, no interview. Four layers are simply dark, because the
 * developer exercised a right the platform gave them. The correct response is
 * lower Confidence and an unchanged Trust — never an inference drawn from the
 * silence they chose.
 */
export const MINIMAL_CONSENT_SESSION: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.TYPING_BURST, at: 4_000, payload: payloads.typingBurst(460, 62_000, 135) },
  { type: TrustEventType.TEXT_INSERTED, at: 70_000, payload: payloads.insert(460, 19) },
  { type: TrustEventType.BACKSPACE_BURST, at: 76_000, payload: { path: 'src/app.ts', backspaceCount: 48, durationMs: 6_000 } },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 84_000, payload: payloads.diff(19, 6) },
  { type: TrustEventType.TYPING_BURST, at: 92_000, payload: payloads.typingBurst(280, 40_000, 143) },
  { type: TrustEventType.TEXT_INSERTED, at: 134_000, payload: payloads.insert(280, 10) },
  { type: TrustEventType.TEST_RUN_STARTED, at: 142_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 148_000, payload: payloads.testFinished('r1', 7, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 156_000, payload: { taskId: 'task_test', durationMs: 156_000, finalDigest: 'a'.repeat(64), testsPassing: 7, testsTotal: 7 } },
];

/**
 * Heavy external AI use, fully engaged with.
 *
 * They went to an AI tool, brought something back, and then did the work: cut
 * it down, fixed what it got wrong, tested it. Under the governing philosophy
 * this is not a concern at all — "AI usage = cheating" is a forbidden rule, and
 * the adaptation ratio is what separates this from `DEPENDENT`.
 */
export const EXTERNAL_AI_ADAPTED: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.EXTERNAL_RESOURCE_ACCESSED, at: 5_000, payload: payloads.externalVisit('v1', 'ai_tool') },
  { type: TrustEventType.EXTERNAL_RESOURCE_DWELL, at: 8_000, payload: { visitId: 'v1', category: 'ai_tool', dwellMs: 40_000, returnVisitNumber: 1 } },
  { type: TrustEventType.EXTERNAL_RESOURCE_LEFT, at: 48_000, payload: { visitId: 'v1', totalDwellMs: 40_000 } },
  { type: TrustEventType.EXTERNAL_ORIGIN_IMPORT, at: 52_000, payload: payloads.externalImport('v1', 'ai_tool', 900, 0.72) },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 56_000, payload: payloads.diff(30, 2) },
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 70_000, payload: payloads.diff(14, 22) },
  { type: TrustEventType.TYPING_BURST, at: 80_000, payload: payloads.typingBurst(420, 54_000, 129) },
  { type: TrustEventType.TEXT_INSERTED, at: 138_000, payload: payloads.insert(420, 16) },
  { type: TrustEventType.REFACTOR_DETECTED, at: 146_000, payload: { path: 'src/app.ts', kind: 'extract_function', affectedLines: 15, behaviourPreserved: true } },
  { type: TrustEventType.RUNTIME_ERROR_OBSERVED, at: 156_000, payload: payloads.error('adapt') },
  { type: TrustEventType.FIX_ATTEMPTED, at: 168_000, payload: { errorSignatureHash: hexHash('adapt'), attemptNumber: 1, path: 'src/app.ts', charactersChanged: 55, timeSinceErrorMs: 12_000 } },
  { type: TrustEventType.ERROR_RESOLVED, at: 182_000, payload: payloads.errorResolved('adapt', 2, 26_000) },
  { type: TrustEventType.TEST_RUN_STARTED, at: 190_000, payload: { runId: 'r1', scope: 'all', suiteOrigin: 'authored' } },
  { type: TrustEventType.TEST_RUN_FINISHED, at: 196_000, payload: payloads.testFinished('r1', 13, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 204_000, payload: { taskId: 'task_test', durationMs: 204_000, finalDigest: 'a'.repeat(64), testsPassing: 13, testsTotal: 13 } },
];

/**
 * The second genuinely concerning shape, and not the same as `DEPENDENT`.
 *
 * Nothing is pasted and nothing external is touched. Completions are accepted
 * whole, instantly, one after another, and the result is submitted without ever
 * being run. The concern is not the assistance — it is that nobody, human or
 * otherwise, appears to have checked whether the code works.
 */
export const UNVERIFIED_ASSISTANCE: readonly EventSpec[] = [
  sessionStart,
  ...repeat(7, 4_000, 6_000, (index, at) => ({
    type: TrustEventType.AI_SUGGESTION_SHOWN,
    at,
    payload: payloads.suggestionShown(`s${String(index)}`, 12, 500),
  })),
  ...repeat(7, 4_060, 6_000, (index, at) => ({
    type: TrustEventType.AI_SUGGESTION_ACCEPTED,
    at,
    payload: payloads.suggestionAccepted(`s${String(index)}`, 12, 500, 60),
  })),
  { type: TrustEventType.CODE_DIFF_APPLIED, at: 50_000, payload: payloads.diff(84, 0) },
  { type: TrustEventType.TASK_SUBMITTED, at: 56_000, payload: { taskId: 'task_test', durationMs: 56_000, finalDigest: 'a'.repeat(64), testsPassing: null, testsTotal: null } },
];

/**
 * A session cut short when the sandbox died. The engine must decline, not guess.
 *
 * `reason: 'server'` — the platform's own failure, which is the version that
 * must not cost the developer anything. There is no `'crash'` reason in the
 * schema, and the four that exist are all about where the connection broke,
 * never about what the developer was doing when it did.
 */
export const TRUNCATED: readonly EventSpec[] = [
  sessionStart,
  { type: TrustEventType.FILE_OPENED, at: 2_000, payload: { path: 'src/app.ts', language: 'typescript', lineCount: 20 } },
  { type: TrustEventType.TYPING_BURST, at: 5_000, payload: payloads.typingBurst(90, 12_000, 133) },
  { type: TrustEventType.SANDBOX_DISCONNECTED, at: 20_000, payload: { reason: 'server', lastAcknowledgedSequence: 3 } },
];

interface CorpusEntry extends LabelledCase {
  readonly specs: readonly EventSpec[];
}

/**
 * The corpus.
 *
 * Ten of the fourteen cases are `OWNS_WORK`, and eight of those ten contain at
 * least one behaviour a naive detector treats as proof of guilt. The imbalance
 * is the point, not a sampling error: this harness exists to catch the engine
 * accusing someone, and a corpus that mostly contained genuine concerns would
 * be measuring a different and much easier thing.
 */
export const CORPUS: readonly CorpusEntry[] = [
  {
    caseId: 'honest-solo',
    description: 'Types, corrects, debugs, tests, submits. No assistance of any kind.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [],
    justification: 'The uncontroversial case. If this is ever escalated the engine is broken outright.',
    specs: HONEST_SOLO,
  },
  {
    caseId: 'honest-with-docs',
    description: 'The same session, plus two visits to official documentation.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [],
    justification: 'Reading the manual is how the job is done. "External page = cheating" is a forbidden rule.',
    specs: HONEST_WITH_DOCS,
  },
  {
    caseId: 'fast-developer',
    description: 'Around 60ms per keystroke; accepts short completions in under 100ms.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.FAST_TYPIST],
    justification: 'Speed is competence, not evidence. Escalating this is punishing someone for being good.',
    specs: FAST_DEVELOPER,
  },
  {
    caseId: 'struggling-beginner',
    description: 'Slow, three failed fixes for one error, and a submission with tests still red.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.DELIBERATE_PACE, CaseTrait.EARLY_CAREER],
    justification: 'Struggling is a capability signal, never a trust one. Low skill must not read as low honesty.',
    specs: STRUGGLING_BEGINNER,
  },
  {
    caseId: 'heavy-assistance-engaged',
    description: 'Many completions, but modified, rejected, partially accepted, and tested.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.HEAVY_AI_ASSISTANCE],
    justification: 'Explicitly permitted. SCORA does not measure how little AI a developer uses.',
    specs: HEAVY_ASSISTANCE_ENGAGED,
  },
  {
    caseId: 'assistive-dictation',
    description: 'Text arrives in six large machine-typed chunks; the developer then debugs and tests it.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.ASSISTIVE_INPUT],
    justification:
      'A developer using dictation or switch access produces input no hand produces. Flagging this is ' +
      'flagging a disability, and no threshold makes that acceptable.',
    specs: ASSISTIVE_DICTATION,
  },
  {
    caseId: 'reuses-own-library',
    description: '2,600 characters pasted from their own prior work, then restructured and fixed.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.REUSES_OWN_CODE],
    justification:
      'Byte-for-byte the same paste as the dependent session. Only what follows it differs, which is ' +
      'exactly why "paste = cheating" is forbidden.',
    specs: REUSES_OWN_LIBRARY,
  },
  {
    caseId: 'degraded-connection',
    description: 'Six minutes of the event stream lost to the network, then a clean reconnect.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.DEGRADED_CAPTURE],
    justification:
      'Absence of evidence is not evidence. A gap the platform failed to capture is the platform’s ' +
      'problem and must not be charged to the developer.',
    specs: DEGRADED_CONNECTION,
  },
  {
    caseId: 'minimal-consent',
    description: 'Assessment scope only: no external monitoring, no interview. Four layers dark.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.MINIMAL_CONSENT, CaseTrait.NO_BASELINE],
    justification:
      'Exercising a consent right must lower Confidence and nothing else. If declining monitoring ' +
      'lowers Trust, the consent was never real.',
    specs: MINIMAL_CONSENT_SESSION,
  },
  {
    caseId: 'external-ai-adapted',
    description: 'Brought code back from an AI tool, then cut it down, fixed it and tested it.',
    label: CaseLabel.OWNS_WORK,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.HEAVY_AI_ASSISTANCE, CaseTrait.ADDITIONAL_LANGUAGE],
    justification:
      'External AI is permitted. What is assessed is what they did with it, and a 0.72 adaptation ratio ' +
      'is a developer working, not copying.',
    specs: EXTERNAL_AI_ADAPTED,
  },
  {
    caseId: 'dependent',
    description: 'External AI visit, 2,400 characters imported unchanged, two instant whole-block completions, no verification.',
    label: CaseLabel.WARRANTS_REVIEW,
    labelSource: LabelSource.SYNTHETIC,
    traits: [],
    justification:
      'Several independent conditions across several layers. A reviewer may still clear them — the ' +
      'label says a person should look, not that the person is guilty.',
    specs: DEPENDENT,
  },
  {
    caseId: 'unverified-assistance',
    description: 'Seven whole-block completions accepted in under 60ms each, submitted without ever running.',
    label: CaseLabel.WARRANTS_REVIEW,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.HEAVY_AI_ASSISTANCE],
    justification:
      'The concern is not the assistance, which is allowed. It is that nothing in the session shows ' +
      'anyone checked whether the submitted code works.',
    specs: UNVERIFIED_ASSISTANCE,
  },
  {
    caseId: 'sparse',
    description: 'Started, disconnected five seconds later. Almost nothing arrived.',
    label: CaseLabel.INDETERMINATE,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.DEGRADED_CAPTURE, CaseTrait.NO_BASELINE],
    justification: 'There is nothing here to assess. Any score at all would be an invention.',
    specs: SPARSE,
  },
  {
    caseId: 'truncated',
    description: 'Twenty seconds of real work, then the sandbox crashed.',
    label: CaseLabel.INDETERMINATE,
    labelSource: LabelSource.SYNTHETIC,
    traits: [CaseTrait.DEGRADED_CAPTURE],
    justification:
      'Enough to see a person was working, nowhere near enough to conclude anything about them. ' +
      'Declining is the correct output, and is not a failure.',
    specs: TRUNCATED,
  },
];
