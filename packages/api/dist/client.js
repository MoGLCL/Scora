/**
 * A failed call.
 *
 * Carries the problem detail rather than a bare message so a caller can branch
 * on `status` — and, for a rejected policy write, read the per-field
 * `errors` back out.
 */
export class TrustApiError extends Error {
    status;
    problem;
    constructor(problem) {
        super(problem.detail ?? problem.title);
        this.name = 'TrustApiError';
        this.status = problem.status;
        this.problem = problem;
    }
}
export function createTrustClient(options) {
    const doFetch = options.fetch ?? globalThis.fetch;
    const base = options.baseUrl.replace(/\/+$/, '');
    return {
        /**
         * Submits a batch of events for one session.
         *
         * The response is the whole outcome, not just a status: a batch can be
         * partly rejected or partly withheld for consent, and a caller that
         * discards this cannot tell that half its evidence never landed.
         */
        async ingest(sessionId, events, clockOffsetMs) {
            return await call('POST', `/v1/sessions/${sessionId}/events`, {
                events,
                ...(clockOffsetMs === undefined ? {} : { clockOffsetMs }),
            });
        },
        async report(sessionId) {
            return await call('GET', `/v1/sessions/${sessionId}/report`);
        },
        /** The rendered report, for a human reviewer. */
        async reportText(sessionId) {
            return await callText('GET', `/v1/sessions/${sessionId}/report.txt`);
        },
        async events(sessionId, page = {}) {
            const query = new URLSearchParams();
            if (page.limit !== undefined)
                query.set('limit', String(page.limit));
            if (page.cursor !== undefined)
                query.set('cursor', page.cursor);
            const suffix = query.size === 0 ? '' : `?${query.toString()}`;
            return await call('GET', `/v1/sessions/${sessionId}/events${suffix}`);
        },
        async integrity(sessionId) {
            return await call('GET', `/v1/sessions/${sessionId}/integrity`);
        },
        async sessions(developerId, limit) {
            const suffix = limit === undefined ? '' : `?limit=${String(limit)}`;
            return await call('GET', `/v1/developers/${developerId}/sessions${suffix}`);
        },
        /** The summary a developer is entitled to see about their own session. */
        async ownOutcome(sessionId) {
            return await call('GET', `/v1/me/outcome/${sessionId}`);
        },
        async policy() {
            return await call('GET', '/v1/policy');
        },
        /**
         * Replaces tenant policy.
         *
         * Throws `TrustApiError` with status 422 and per-field `errors` when the
         * proposed policy would weaken a guarantee — that is a rejection to show
         * the administrator, not an error to swallow.
         */
        async savePolicy(policy) {
            return await call('PUT', '/v1/policy', policy);
        },
        async permittedScopes() {
            return await call('GET', '/v1/policy/scopes');
        },
    };
    async function call(method, path, body) {
        return JSON.parse(await callText(method, path, body));
    }
    async function callText(method, path, body) {
        const response = await doFetch(`${base}${path}`, {
            method,
            headers: {
                authorization: `Bearer ${options.token}`,
                ...(body === undefined ? {} : { 'content-type': 'application/json' }),
            },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const text = await response.text();
        if (response.ok)
            return text;
        throw new TrustApiError(toProblem(text, response.status));
    }
}
/** A non-JSON error body still becomes a problem detail, never an unhandled parse throw. */
function toProblem(text, status) {
    try {
        const parsed = JSON.parse(text);
        if (typeof parsed === 'object' && parsed !== null && 'status' in parsed) {
            return parsed;
        }
    }
    catch {
        // fall through
    }
    return { type: 'about:blank', title: 'Request failed', status, detail: text.slice(0, 200) };
}
//# sourceMappingURL=client.js.map