import { type Result } from '../primitives/index.ts';
/**
 * A small structural validator.
 *
 * Deliberately hand-rolled rather than pulling in a schema library: the core is
 * a zero-dependency package that other SCORA services embed, and validation
 * sits on the hottest path in the system (every keystroke burst from every
 * concurrent session). This covers exactly the shapes the taxonomy needs.
 *
 * Every failure carries a field path, because rejected events are themselves
 * evidence and a reviewer must be able to see precisely what was wrong.
 */
export interface FieldIssue {
    readonly path: string;
    readonly code: string;
    readonly message: string;
    readonly received?: unknown;
}
export type Validated<T> = Result<T, readonly FieldIssue[]>;
export interface Validator<T> {
    readonly describe: string;
    validate(value: unknown, path: string): Validated<T>;
}
export declare const v: {
    readonly string: (options?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    }) => Validator<string>;
    readonly number: (options?: {
        min?: number;
        max?: number;
        integer?: boolean;
    }) => Validator<number>;
    readonly boolean: () => Validator<boolean>;
    /** Membership in a closed set, for the string-union constants used throughout. */
    readonly literalUnion: <const T extends readonly string[]>(values: T) => Validator<T[number]>;
    readonly array: <T>(item: Validator<T>, options?: {
        minItems?: number;
        maxItems?: number;
    }) => Validator<T[]>;
    /**
     * A closed object.
     *
     * Unknown keys are rejected rather than stripped: an unexpected field means
     * the producer and the engine disagree about the schema, and silently
     * discarding it would hide a real integration bug — potentially one dropping
     * evidence.
     */
    readonly object: <S extends Record<string, Validator<unknown>>>(shape: S, options?: {
        optional?: readonly (keyof S)[];
    }) => Validator<{ [K in keyof S]: S[K] extends Validator<infer U> ? U : never; }>;
    /** A free-form map, for payloads whose keys are genuinely open (e.g. per-file counts). */
    readonly record: <T>(valueValidator: Validator<T>, options?: {
        maxKeys?: number;
    }) => Validator<Record<string, T>>;
    readonly nullable: <T>(inner: Validator<T>) => Validator<T | null>;
    /** A [0, 1] ratio, used pervasively for similarity and confidence payload fields. */
    readonly unitInterval: () => Validator<number>;
    /** A non-negative count. */
    readonly count: () => Validator<number>;
    /** A non-negative duration in milliseconds. */
    readonly durationMs: () => Validator<number>;
};
export declare function validate<T>(validator: Validator<T>, value: unknown): Validated<T>;
export declare function formatIssues(issues: readonly FieldIssue[]): string;
//# sourceMappingURL=schema.d.ts.map