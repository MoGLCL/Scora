declare const BRAND: unique symbol;

/**
 * Nominal typing helper.
 *
 * `Brand<string, 'SessionId'>` is assignable to `string`, but a bare `string`
 * is not assignable to it. That asymmetry is what stops a `DeveloperId` from
 * being passed where a `SessionId` is expected, or a raw 0..1 probability from
 * being handed to something expecting a 0..100 score — mistakes that would
 * otherwise be invisible in an engine where nearly every value is a string or
 * a number.
 */
export type Brand<T, B extends string> = T & { readonly [BRAND]: B };

/** Recovers the underlying primitive of a branded type. */
export type Unbrand<T> = T extends Brand<infer U, string> ? U : T;
