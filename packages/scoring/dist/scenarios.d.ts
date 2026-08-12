import { type EventSpec } from '@scora/trust-features/testing';
/**
 * Session archetypes shared by the scoring tests.
 *
 * Defined once so that a change in what "an honest solo session" looks like
 * cannot be quietly made in one test while another keeps asserting the old
 * shape.
 */
export declare const sessionStart: EventSpec;
/** A developer working alone: typing, correcting, debugging, testing. */
export declare const HONEST_SOLO: readonly EventSpec[];
/** The same developer, additionally reading documentation. */
export declare const HONEST_WITH_DOCS: readonly EventSpec[];
/** Heavy but well-controlled use of editor completions. */
export declare const HEAVY_ASSISTANCE_ENGAGED: readonly EventSpec[];
/** The pattern the platform is genuinely concerned with. */
export declare const DEPENDENT: readonly EventSpec[];
/**
 * A genuinely fast, experienced developer: ~60ms per keystroke, accepting
 * completions almost instantly because they recognise correct output on sight.
 *
 * The single most important false-positive guard in the suite. Every behaviour
 * here is one a naive detector would flag, and none of it is evidence of
 * anything. If this session ever draws an adverse recommendation, the engine is
 * punishing competence.
 */
export declare const FAST_DEVELOPER: readonly EventSpec[];
/**
 * Slow, error-prone, lots of retries — and honest throughout.
 *
 * Struggling is not a trust problem. Low capability must surface as low skill
 * confidence, never as risk, and never as a recommendation against the person.
 */
export declare const STRUGGLING_BEGINNER: readonly EventSpec[];
/** Almost nothing arrived — the engine must decline to judge. */
export declare const SPARSE: readonly EventSpec[];
export declare function scoreOf(specs: readonly EventSpec[]): import("@scora/trust-features").FeatureExtractionResult;
//# sourceMappingURL=scenarios.d.ts.map