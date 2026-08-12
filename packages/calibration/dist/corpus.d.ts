import { type EventSpec } from '@scora/trust-features/testing';
import { type LabelledCase } from './contract.ts';
/**
 * Dictation and snippet expansion.
 *
 * Text arrives in large, fast, well-formed chunks because a machine is typing
 * what a human said. Every heuristic built on keystroke cadence reads this as
 * synthetic. The developer then debugs, refactors and tests it — which is what
 * ownership looks like, and what the engine is supposed to weigh instead.
 */
export declare const ASSISTIVE_DICTATION: readonly EventSpec[];
/**
 * A developer pasting their own prior work.
 *
 * 2,600 characters in one insertion from the clipboard — numerically identical
 * to the dependent session's paste. What differs is everything after it: they
 * navigate it, restructure it, break it, and fix it. Someone who did not write
 * the code they pasted does not refactor it eleven seconds later.
 */
export declare const REUSES_OWN_LIBRARY: readonly EventSpec[];
/**
 * A working session on a bad connection.
 *
 * Six minutes of the stream simply missing, with nothing replayed on reconnect —
 * the events are gone, not buffered, which is the blindest version of this and
 * therefore the right one to test. The gap is the network's fault. Read as
 * evasion — "they disabled monitoring" — it becomes an accusation manufactured
 * out of someone's hotel wifi.
 */
export declare const DEGRADED_CONNECTION: readonly EventSpec[];
/**
 * Minimum consent: assessment scope only.
 *
 * No external activity, no interview. Four layers are simply dark, because the
 * developer exercised a right the platform gave them. The correct response is
 * lower Confidence and an unchanged Trust — never an inference drawn from the
 * silence they chose.
 */
export declare const MINIMAL_CONSENT_SESSION: readonly EventSpec[];
/**
 * Heavy external AI use, fully engaged with.
 *
 * They went to an AI tool, brought something back, and then did the work: cut
 * it down, fixed what it got wrong, tested it. Under the governing philosophy
 * this is not a concern at all — "AI usage = cheating" is a forbidden rule, and
 * the adaptation ratio is what separates this from `DEPENDENT`.
 */
export declare const EXTERNAL_AI_ADAPTED: readonly EventSpec[];
/**
 * The second genuinely concerning shape, and not the same as `DEPENDENT`.
 *
 * Nothing is pasted and nothing external is touched. Completions are accepted
 * whole, instantly, one after another, and the result is submitted without ever
 * being run. The concern is not the assistance — it is that nobody, human or
 * otherwise, appears to have checked whether the code works.
 */
export declare const UNVERIFIED_ASSISTANCE: readonly EventSpec[];
/**
 * A session cut short when the sandbox died. The engine must decline, not guess.
 *
 * `reason: 'server'` — the platform's own failure, which is the version that
 * must not cost the developer anything. There is no `'crash'` reason in the
 * schema, and the four that exist are all about where the connection broke,
 * never about what the developer was doing when it did.
 */
export declare const TRUNCATED: readonly EventSpec[];
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
export declare const CORPUS: readonly CorpusEntry[];
export {};
//# sourceMappingURL=corpus.d.ts.map