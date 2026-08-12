import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CanonicalizationError, canonicalize } from "./canonical.js";
describe('canonicalize', () => {
    it('is independent of key insertion order', () => {
        const a = canonicalize({ zeta: 1, alpha: 2, mid: 3 });
        const b = canonicalize({ mid: 3, alpha: 2, zeta: 1 });
        assert.equal(a, b);
        assert.equal(a, '{"alpha":2,"mid":3,"zeta":1}');
    });
    it('sorts nested keys too', () => {
        const output = canonicalize({ outer: { b: 1, a: 2 } });
        assert.equal(output, '{"outer":{"a":2,"b":1}}');
    });
    it('preserves array order', () => {
        assert.equal(canonicalize([3, 1, 2]), '[3,1,2]');
    });
    it('collapses negative zero so one logical value cannot yield two hashes', () => {
        assert.equal(canonicalize(-0), '0');
        assert.equal(canonicalize(0), canonicalize(-0));
    });
    it('escapes control characters and quotes', () => {
        assert.equal(canonicalize('a"b\\c'), '"a\\"b\\\\c"');
        assert.equal(canonicalize('line\nbreak'), '"line\\nbreak"');
        assert.equal(canonicalize('\u0001'), '"\\u0001"');
    });
    it('rejects undefined object properties instead of silently dropping them', () => {
        assert.throws(() => canonicalize({ present: 1, missing: undefined }), (error) => error instanceof CanonicalizationError && error.path === '' && /missing/.test(error.message));
    });
    it('rejects undefined inside arrays, which JSON.stringify would turn into null', () => {
        assert.throws(() => canonicalize([1, undefined, 3]), (error) => error instanceof CanonicalizationError && error.path === '[1]');
    });
    it('rejects non-finite numbers', () => {
        assert.throws(() => canonicalize(Number.NaN), CanonicalizationError);
        assert.throws(() => canonicalize(Number.POSITIVE_INFINITY), CanonicalizationError);
    });
    it('rejects Date so timestamps have exactly one encoding', () => {
        assert.throws(() => canonicalize(new Date(0)), CanonicalizationError);
    });
    it('rejects class instances', () => {
        class Payload {
            value = 1;
        }
        assert.throws(() => canonicalize(new Payload()), CanonicalizationError);
    });
    it('reports a usable path for deeply nested failures', () => {
        assert.throws(() => canonicalize({ a: { b: [{ c: Number.NaN }] } }), (error) => error instanceof CanonicalizationError && error.path === 'a.b[0].c');
    });
    it('accepts null and nested nulls', () => {
        assert.equal(canonicalize({ a: null }), '{"a":null}');
    });
    it('produces byte-identical output for structurally identical payloads', () => {
        const first = { sessionId: 'sess_1', counts: { added: 12, removed: 3 }, tags: ['a', 'b'] };
        const second = { tags: ['a', 'b'], counts: { removed: 3, added: 12 }, sessionId: 'sess_1' };
        assert.equal(canonicalize(first), canonicalize(second));
    });
});
//# sourceMappingURL=canonical.test.js.map