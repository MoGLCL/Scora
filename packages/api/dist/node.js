import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { DeveloperId, SessionId, TenantId } from '@scora/trust-core';
import { PrincipalKind, Role, } from "./contract.js";
/**
 * Node bindings.
 *
 * The only place in the package that knows about sockets. Everything above it
 * — routes, RBAC, the access log — is plain data, so the same behaviour can be
 * mounted behind a different server without any of it being re-implemented.
 */
/** Largest request body accepted, in bytes. */
export const MAX_BODY_BYTES = 1_000_000;
/**
 * Adapts `createApi(...).handle` to Node's `http`.
 *
 * Returns a listener, not a server: the consuming platform usually already has
 * one, and this engine is meant to be embedded rather than to own the port.
 */
export function nodeRequestListener(api) {
    return (incoming, outgoing) => {
        void (async () => {
            let request;
            try {
                request = await toApiRequest(incoming);
            }
            catch (error) {
                // A body that is too large or not JSON is refused before authentication,
                // so an unauthenticated caller cannot make the process parse megabytes.
                const status = error instanceof BodyTooLarge ? 413 : 400;
                writeResponse(outgoing, {
                    status,
                    body: {
                        type: 'about:blank',
                        title: status === 413 ? 'Payload Too Large' : 'Bad Request',
                        status,
                        detail: error instanceof Error ? error.message : 'the request could not be read',
                    },
                });
                return;
            }
            const response = await api.handle(request);
            writeResponse(outgoing, response);
        })();
    };
}
class BodyTooLarge extends Error {
    constructor() {
        super(`body exceeds ${MAX_BODY_BYTES} bytes`);
        this.name = 'BodyTooLarge';
    }
}
/** Reads a Node request into the transport-neutral shape the router expects. */
export async function toApiRequest(incoming) {
    const url = new URL(incoming.url ?? '/', 'http://localhost');
    const query = {};
    for (const [key, value] of url.searchParams)
        query[key] = value;
    return {
        method: (incoming.method ?? 'GET').toUpperCase(),
        path: url.pathname,
        query,
        token: bearerToken(incoming.headers.authorization),
        body: await readJsonBody(incoming),
    };
}
export function writeResponse(outgoing, response) {
    const headers = {
        // Evidence and reports are per-caller and must never be held by a shared
        // cache: a proxy that stored one reviewer's report would serve it to the
        // next caller on the same connection.
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        ...response.headers,
    };
    if (typeof response.body === 'string') {
        headers['content-type'] ??= 'text/plain; charset=utf-8';
        outgoing.writeHead(response.status, headers);
        outgoing.end(response.body);
        return;
    }
    headers['content-type'] ??= isProblem(response.body)
        ? 'application/problem+json; charset=utf-8'
        : 'application/json; charset=utf-8';
    outgoing.writeHead(response.status, headers);
    outgoing.end(response.body === undefined ? '' : JSON.stringify(response.body));
}
function isProblem(body) {
    return typeof body === 'object' && body !== null && 'title' in body && 'status' in body;
}
function bearerToken(header) {
    if (header === undefined)
        return null;
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    return match?.[1] ?? null;
}
async function readJsonBody(incoming) {
    const method = (incoming.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'DELETE')
        return null;
    const chunks = [];
    let size = 0;
    for await (const chunk of incoming) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.byteLength;
        if (size > MAX_BODY_BYTES)
            throw new BodyTooLarge();
        chunks.push(buffer);
    }
    if (size === 0)
        return null;
    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    }
    catch {
        throw new Error('body is not valid JSON');
    }
}
export function hashToken(token) {
    return createHash('sha256').update(token, 'utf8').digest('hex');
}
/**
 * Bearer-token authenticator over a set of stored credentials.
 *
 * Sufficient for a single-node deployment and for tests. A real deployment
 * swaps in its own `Authenticator` — OIDC, mTLS, whatever the platform already
 * runs — which is the reason `Authenticator` is a one-method interface.
 *
 * Comparison is constant-time over the hashes. Comparing tokens with `===`
 * leaks their prefix through timing, which is a slow but real way to guess one.
 */
export function bearerAuthenticator(credentials, options = {}) {
    const now = options.now ?? Date.now;
    const byHash = new Map(credentials.map((credential) => [credential.tokenHash, credential]));
    return {
        async authenticate(token) {
            if (token === null || token.length === 0)
                return null;
            const presented = hashToken(token);
            let matched = null;
            // Every credential is compared even after a match, so the time taken does
            // not reveal where in the set the token was found.
            for (const [hash, credential] of byHash) {
                if (constantTimeEquals(hash, presented))
                    matched = credential;
            }
            if (matched === null)
                return null;
            if (matched.expiresAt !== undefined && matched.expiresAt <= now())
                return null;
            const principal = {
                kind: matched.kind,
                tenantId: matched.tenantId,
                subject: matched.subject,
                roles: matched.roles,
                ...(matched.developerId === undefined ? {} : { developerId: matched.developerId }),
                ...(matched.sessionId === undefined ? {} : { sessionId: matched.sessionId }),
            };
            return principal;
        },
    };
}
function constantTimeEquals(left, right) {
    const a = Buffer.from(left, 'utf8');
    const b = Buffer.from(right, 'utf8');
    if (a.byteLength !== b.byteLength)
        return false;
    return timingSafeEqual(a, b);
}
/**
 * Issues a credential and returns the token exactly once.
 *
 * The token is returned here and nowhere else — the stored record holds only
 * its hash, so a token that is not captured at this call is unrecoverable. That
 * is the intended behaviour, not a limitation.
 */
export function issueCredential(credential) {
    const token = `${credential.kind.toLowerCase()}_${randomUUID().replaceAll('-', '')}`;
    return { token, stored: { ...credential, tokenHash: hashToken(token) } };
}
/**
 * A per-session sandbox credential.
 *
 * Scoped to one session and holding only `INGEST`, because a sandbox that
 * leaked a broader token would let whoever holds it write evidence into someone
 * else's assessment.
 */
export function issueSandboxCredential(tenantId, sessionId, expiresAt) {
    return issueCredential({
        kind: PrincipalKind.SANDBOX,
        tenantId,
        subject: `sandbox:${sessionId}`,
        roles: [Role.INGEST],
        sessionId,
        expiresAt,
    });
}
export { DeveloperId, SessionId, TenantId };
//# sourceMappingURL=node.js.map