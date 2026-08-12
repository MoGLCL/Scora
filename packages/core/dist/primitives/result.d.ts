/**
 * Explicit success/failure values.
 *
 * The Trust Engine ingests untrusted telemetry from sandboxes it does not
 * control, so "this input was rejected" is an ordinary, expected outcome rather
 * than an exceptional one — and a rejected event is itself evidence (see
 * Layer 01, environment integrity). Modelling that as a value instead of a
 * thrown exception keeps rejection reasons structured and auditable.
 *
 * Exceptions remain reserved for genuine programmer error.
 */
export type Ok<T> = {
    readonly ok: true;
    readonly value: T;
};
export type Err<E> = {
    readonly ok: false;
    readonly error: E;
};
export type Result<T, E> = Ok<T> | Err<E>;
export declare function ok<T>(value: T): Ok<T>;
export declare function err<E>(error: E): Err<E>;
export declare function isOk<T, E>(result: Result<T, E>): result is Ok<T>;
export declare function isErr<T, E>(result: Result<T, E>): result is Err<E>;
export declare function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T;
export declare function mapOk<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>;
export declare function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>;
/**
 * Collects a batch, keeping successes and failures side by side.
 *
 * Ingestion never aborts a whole batch because one event in it was malformed:
 * the good events must still land, and the bad ones must still be recorded as
 * rejections.
 */
export declare function partition<T, E>(results: readonly Result<T, E>[]): {
    readonly accepted: T[];
    readonly rejected: E[];
};
//# sourceMappingURL=result.d.ts.map