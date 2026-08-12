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
export function ok(value) {
    return { ok: true, value };
}
export function err(error) {
    return { ok: false, error };
}
export function isOk(result) {
    return result.ok;
}
export function isErr(result) {
    return !result.ok;
}
export function unwrapOr(result, fallback) {
    return result.ok ? result.value : fallback;
}
export function mapOk(result, fn) {
    return result.ok ? ok(fn(result.value)) : result;
}
export function mapErr(result, fn) {
    return result.ok ? result : err(fn(result.error));
}
/**
 * Collects a batch, keeping successes and failures side by side.
 *
 * Ingestion never aborts a whole batch because one event in it was malformed:
 * the good events must still land, and the bad ones must still be recorded as
 * rejections.
 */
export function partition(results) {
    const accepted = [];
    const rejected = [];
    for (const result of results) {
        if (result.ok)
            accepted.push(result.value);
        else
            rejected.push(result.error);
    }
    return { accepted, rejected };
}
//# sourceMappingURL=result.js.map