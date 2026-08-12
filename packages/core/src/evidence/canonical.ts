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

export class CanonicalizationError extends Error {
  readonly path: string;

  constructor(message: string, path: string) {
    super(`${message} (at ${path || '<root>'})`);
    this.name = 'CanonicalizationError';
    this.path = path;
  }
}

export type CanonicalValue =
  | null
  | boolean
  | number
  | string
  | readonly CanonicalValue[]
  | { readonly [key: string]: CanonicalValue };

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
export function canonicalize(value: unknown, path = ''): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';

    case 'number': {
      if (!Number.isFinite(value)) {
        throw new CanonicalizationError(`Non-finite number cannot be canonicalized: ${value}`, path);
      }
      // Collapse -0 to 0: they are indistinguishable to consumers but serialize
      // differently, which would produce two hashes for one logical event.
      return Object.is(value, -0) ? '0' : String(value);
    }

    case 'string':
      return quoteString(value);

    case 'bigint':
      throw new CanonicalizationError('BigInt is not representable in JSON', path);

    case 'undefined':
      throw new CanonicalizationError('undefined cannot be canonicalized', path);

    case 'function':
    case 'symbol':
      throw new CanonicalizationError(`Value of type ${typeof value} is not serializable`, path);

    case 'object':
      break;
  }

  if (Array.isArray(value)) {
    const items = value.map((item, index) => {
      if (item === undefined) {
        // JSON.stringify would turn this into null, quietly changing the data.
        throw new CanonicalizationError('undefined is not permitted in arrays', `${path}[${index}]`);
      }
      return canonicalize(item, `${path}[${index}]`);
    });
    return `[${items.join(',')}]`;
  }

  if (value instanceof Date) {
    throw new CanonicalizationError(
      'Date is not permitted; use an epoch-milliseconds number so the encoding is unambiguous',
      path,
    );
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new CanonicalizationError(
      `Only plain objects can be canonicalized; received ${value.constructor?.name ?? 'unknown'}`,
      path,
    );
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries: string[] = [];

  for (const key of keys) {
    const entry = record[key];
    if (entry === undefined) {
      throw new CanonicalizationError(
        `Property "${key}" is undefined; omit it or set it to null explicitly`,
        path,
      );
    }
    entries.push(`${quoteString(key)}:${canonicalize(entry, path ? `${path}.${key}` : key)}`);
  }

  return `{${entries.join(',')}}`;
}

const ESCAPES: Readonly<Record<string, string>> = {
  '"': '\\"',
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

// Characters requiring escapes per RFC 8259: quote, backslash, and C0 controls.
const NEEDS_ESCAPE = /["\\\u0000-\u001f]/g;

function quoteString(value: string): string {
  return `"${value.replace(NEEDS_ESCAPE, (char) => {
    const shorthand = ESCAPES[char];
    if (shorthand !== undefined) return shorthand;
    return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`;
  })}"`;
}

/**
 * Rejects payloads that cannot be canonicalized, before they reach the chain.
 *
 * Ingestion calls this so a malformed payload is reported as a validation
 * failure with a field path, rather than surfacing later as an opaque hashing
 * crash.
 */
export function assertCanonicalizable(value: unknown): void {
  canonicalize(value);
}
