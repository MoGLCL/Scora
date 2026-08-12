import { err, ok } from "../primitives/index.js";
function issue(path, code, message, received) {
    return received === undefined
        ? { path, code, message }
        : { path, code, message, received };
}
function fail(...issues) {
    return err(issues);
}
export const v = {
    string(options = {}) {
        return {
            describe: 'string',
            validate(value, path) {
                if (typeof value !== 'string') {
                    return fail(issue(path, 'NOT_A_STRING', 'Expected a string', value));
                }
                if (options.minLength !== undefined && value.length < options.minLength) {
                    return fail(issue(path, 'TOO_SHORT', `Expected at least ${options.minLength} characters`, value.length));
                }
                if (options.maxLength !== undefined && value.length > options.maxLength) {
                    return fail(issue(path, 'TOO_LONG', `Expected at most ${options.maxLength} characters`, value.length));
                }
                if (options.pattern !== undefined && !options.pattern.test(value)) {
                    return fail(issue(path, 'PATTERN_MISMATCH', `Expected format ${options.pattern}`, value));
                }
                return ok(value);
            },
        };
    },
    number(options = {}) {
        return {
            describe: options.integer === true ? 'integer' : 'number',
            validate(value, path) {
                if (typeof value !== 'number' || !Number.isFinite(value)) {
                    return fail(issue(path, 'NOT_A_NUMBER', 'Expected a finite number', value));
                }
                if (options.integer === true && !Number.isInteger(value)) {
                    return fail(issue(path, 'NOT_AN_INTEGER', 'Expected an integer', value));
                }
                if (options.min !== undefined && value < options.min) {
                    return fail(issue(path, 'BELOW_MINIMUM', `Expected at least ${options.min}`, value));
                }
                if (options.max !== undefined && value > options.max) {
                    return fail(issue(path, 'ABOVE_MAXIMUM', `Expected at most ${options.max}`, value));
                }
                return ok(value);
            },
        };
    },
    boolean() {
        return {
            describe: 'boolean',
            validate(value, path) {
                return typeof value === 'boolean'
                    ? ok(value)
                    : fail(issue(path, 'NOT_A_BOOLEAN', 'Expected a boolean', value));
            },
        };
    },
    /** Membership in a closed set, for the string-union constants used throughout. */
    literalUnion(values) {
        const allowed = new Set(values);
        return {
            describe: values.join(' | '),
            validate(value, path) {
                if (typeof value !== 'string' || !allowed.has(value)) {
                    return fail(issue(path, 'NOT_IN_UNION', `Expected one of: ${values.join(', ')}`, value));
                }
                return ok(value);
            },
        };
    },
    array(item, options = {}) {
        return {
            describe: `${item.describe}[]`,
            validate(value, path) {
                if (!Array.isArray(value)) {
                    return fail(issue(path, 'NOT_AN_ARRAY', 'Expected an array', value));
                }
                if (options.minItems !== undefined && value.length < options.minItems) {
                    return fail(issue(path, 'TOO_FEW_ITEMS', `Expected at least ${options.minItems} items`, value.length));
                }
                if (options.maxItems !== undefined && value.length > options.maxItems) {
                    return fail(issue(path, 'TOO_MANY_ITEMS', `Expected at most ${options.maxItems} items`, value.length));
                }
                const out = [];
                const issues = [];
                for (const [index, entry] of value.entries()) {
                    const result = item.validate(entry, `${path}[${index}]`);
                    if (result.ok)
                        out.push(result.value);
                    else
                        issues.push(...result.error);
                }
                return issues.length > 0 ? err(issues) : ok(out);
            },
        };
    },
    /**
     * A closed object.
     *
     * Unknown keys are rejected rather than stripped: an unexpected field means
     * the producer and the engine disagree about the schema, and silently
     * discarding it would hide a real integration bug — potentially one dropping
     * evidence.
     */
    object(shape, options = {}) {
        const optional = new Set(options.optional ?? []);
        return {
            describe: 'object',
            validate(value, path) {
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    return fail(issue(path, 'NOT_AN_OBJECT', 'Expected an object', value));
                }
                const record = value;
                const issues = [];
                const out = {};
                for (const [key, validator] of Object.entries(shape)) {
                    const childPath = path ? `${path}.${key}` : key;
                    const present = Object.hasOwn(record, key) && record[key] !== undefined;
                    if (!present) {
                        if (!optional.has(key)) {
                            issues.push(issue(childPath, 'REQUIRED', 'Field is required'));
                        }
                        continue;
                    }
                    const result = validator.validate(record[key], childPath);
                    if (result.ok)
                        out[key] = result.value;
                    else
                        issues.push(...result.error);
                }
                for (const key of Object.keys(record)) {
                    if (!Object.hasOwn(shape, key)) {
                        issues.push(issue(path ? `${path}.${key}` : key, 'UNKNOWN_FIELD', 'Field is not part of this schema'));
                    }
                }
                return issues.length > 0
                    ? err(issues)
                    : ok(out);
            },
        };
    },
    /** A free-form map, for payloads whose keys are genuinely open (e.g. per-file counts). */
    record(valueValidator, options = {}) {
        return {
            describe: `Record<string, ${valueValidator.describe}>`,
            validate(value, path) {
                if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                    return fail(issue(path, 'NOT_AN_OBJECT', 'Expected an object', value));
                }
                const entries = Object.entries(value);
                if (options.maxKeys !== undefined && entries.length > options.maxKeys) {
                    return fail(issue(path, 'TOO_MANY_KEYS', `Expected at most ${options.maxKeys} keys`, entries.length));
                }
                const out = {};
                const issues = [];
                for (const [key, entry] of entries) {
                    const result = valueValidator.validate(entry, `${path}.${key}`);
                    if (result.ok)
                        out[key] = result.value;
                    else
                        issues.push(...result.error);
                }
                return issues.length > 0 ? err(issues) : ok(out);
            },
        };
    },
    nullable(inner) {
        return {
            describe: `${inner.describe} | null`,
            validate(value, path) {
                return value === null ? ok(null) : inner.validate(value, path);
            },
        };
    },
    /** A [0, 1] ratio, used pervasively for similarity and confidence payload fields. */
    unitInterval() {
        return v.number({ min: 0, max: 1 });
    },
    /** A non-negative count. */
    count() {
        return v.number({ min: 0, integer: true });
    },
    /** A non-negative duration in milliseconds. */
    durationMs() {
        return v.number({ min: 0 });
    },
};
export function validate(validator, value) {
    return validator.validate(value, '');
}
export function formatIssues(issues) {
    return issues.map((i) => `${i.path || '<root>'}: ${i.message} [${i.code}]`).join('; ');
}
//# sourceMappingURL=schema.js.map