/**
 * Deterministic serialization for hashing.
 *
 * A hash chain is only meaningful if the same logical event always produces the
 * same bytes. `JSON.stringify` does not guarantee that: key order follows
 * insertion order, `undefined` disappears from objects but becomes `null` in
 * arrays, and `-0` and `1e21` have surprising forms. Any of those would let two
 * honest servers disagree about whether the evidence log is intact.
 *
 * The rules below are close to JCS (RFC 8785), with two deliberate departures
 * noted at `canonicalize`.
 */
export declare class CanonicalizationError extends Error {
    readonly path: string;
    constructor(message: string, path: string);
}
export type CanonicalValue = null | boolean | number | string | readonly CanonicalValue[] | {
    readonly [key: string]: CanonicalValue;
};
/**
 * Produces a stable string for any admissible payload.
 *
 * Departures from JCS, both chosen so that hashing cannot silently succeed on
 * data the engine would misread:
 *
 *  - Object keys sort by UTF-16 code unit (JavaScript's native `<`), not by
 *    code point. The two differ only for unpaired surrogates and non-BMP keys,
 *    which cannot occur in this schema, and the native comparison is
 *    substantially faster on the hot ingestion path.
 *  - `undefined` object properties throw instead of being dropped. Silently
 *    omitting a field would mean a payload that lost data still hashed as
 *    valid, which is exactly the failure the chain exists to catch.
 */
export declare function canonicalize(value: unknown, path?: string): string;
/**
 * Rejects payloads that cannot be canonicalized, before they reach the chain.
 *
 * Ingestion calls this so a malformed payload is reported as a validation
 * failure with a field path, rather than surfacing later as an opaque hashing
 * crash.
 */
export declare function assertCanonicalizable(value: unknown): void;
//# sourceMappingURL=canonical.d.ts.map