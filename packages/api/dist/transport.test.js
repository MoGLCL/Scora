import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { describe, it } from 'node:test';
import { nodeCrypto, nodeIdGenerator } from '@scora/trust-core/node';
import { createIngestion, inMemoryEventStore } from '@scora/trust-storage';
import { createApi, inMemoryAccessLog } from "./app.js";
import { PrincipalKind, Role } from "./contract.js";
import { createTrustClient, TrustApiError } from "./client.js";
import { inMemoryPolicyStore } from "./policy.js";
import { MAX_BODY_BYTES, bearerAuthenticator, hashToken, issueCredential, issueSandboxCredential, nodeRequestListener, } from "./node.js";
import { SESSION, T0, TENANT, heartbeat, silentLogger, steppingClock } from "./testing.js";
/** A real HTTP server over the same composition production uses. */
async function deploy(context) {
    const sandbox = issueSandboxCredential(TENANT, SESSION, T0 + 3_600_000);
    const reviewer = issueCredential({
        kind: PrincipalKind.STAFF,
        tenantId: TENANT,
        subject: 'staff:reviewer',
        roles: [Role.READ_REPORT, Role.READ_EVIDENCE, Role.REVIEW],
    });
    const admin = issueCredential({
        kind: PrincipalKind.STAFF,
        tenantId: TENANT,
        subject: 'staff:admin',
        roles: [Role.ADMINISTER],
    });
    const url = await listen(bearerAuthenticator([sandbox.stored, reviewer.stored, admin.stored], { now: () => T0 }), context);
    return {
        url,
        tokens: { sandbox: sandbox.token, reviewer: reviewer.token, admin: admin.token },
        sandbox: createTrustClient({ baseUrl: url, token: sandbox.token }),
        reviewer: createTrustClient({ baseUrl: url, token: reviewer.token }),
        admin: createTrustClient({ baseUrl: url, token: admin.token }),
    };
}
async function listen(authenticator, context) {
    const clock = steppingClock();
    const store = inMemoryEventStore();
    const api = createApi({
        store,
        ingestion: createIngestion({
            store,
            clock,
            crypto: nodeCrypto,
            ids: nodeIdGenerator,
            logger: silentLogger(),
        }),
        policies: inMemoryPolicyStore(),
        clock,
        crypto: nodeCrypto,
        authenticator,
        accessLog: inMemoryAccessLog(),
    });
    const server = createServer(nodeRequestListener(api));
    await new Promise((resolve) => {
        server.listen(0, '127.0.0.1', resolve);
    });
    context.after(async () => await new Promise((resolve) => {
        server.close(() => resolve());
    }));
    return `http://127.0.0.1:${String(server.address().port)}`;
}
const batch = [heartbeat(1), heartbeat(2), heartbeat(3)];
describe('node transport', () => {
    it('carries a session from ingest to report over a socket', async (t) => {
        const app = await deploy(t);
        const accepted = await app.sandbox.ingest(SESSION, batch);
        assert.equal(accepted.accepted, 3);
        const report = (await app.reviewer.report(SESSION));
        assert.equal(typeof report['trust'], 'number');
        assert.equal(typeof report['confidence'], 'number');
    });
    it('forbids a shared cache from keeping a report', async (t) => {
        // A proxy that stored one reviewer's report would serve it to whoever asked
        // next on the same connection.
        const app = await deploy(t);
        await app.sandbox.ingest(SESSION, batch);
        const response = await fetch(`${app.url}/v1/sessions/${SESSION}/report`, {
            headers: { authorization: `Bearer ${app.tokens.reviewer}` },
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    });
    it('refuses an oversized body before authenticating anyone', async (t) => {
        // Parsing happens before the credential is checked, so the size limit has to
        // be enforced first — otherwise an anonymous caller can make the process
        // read megabytes by presenting no token at all.
        const app = await deploy(t);
        const response = await fetch(`${app.url}/v1/sessions/${SESSION}/events`, {
            method: 'POST',
            body: 'x'.repeat(MAX_BODY_BYTES + 1),
        });
        assert.equal(response.status, 413);
    });
    it('refuses a body that is not JSON', async (t) => {
        const app = await deploy(t);
        const response = await fetch(`${app.url}/v1/sessions/${SESSION}/events`, {
            method: 'POST',
            headers: { authorization: `Bearer ${app.tokens.sandbox}` },
            body: '{ not json',
        });
        assert.equal(response.status, 400);
    });
    it('answers a non-bearer authorization header with 401 and a challenge', async (t) => {
        const app = await deploy(t);
        const response = await fetch(`${app.url}/v1/sessions/${SESSION}/report`, {
            headers: { authorization: 'Basic ZGFuYTpodW50ZXIy' },
        });
        assert.equal(response.status, 401);
        assert.equal(response.headers.get('www-authenticate'), 'Bearer');
    });
    it('accepts the bearer scheme in any case', async (t) => {
        const app = await deploy(t);
        const response = await fetch(`${app.url}/v1/policy`, {
            headers: { authorization: `bEaReR ${app.tokens.admin}` },
        });
        assert.equal(response.status, 200);
    });
    it('labels a refusal as a problem document', async (t) => {
        const app = await deploy(t);
        const response = await fetch(`${app.url}/v1/policy`, {
            headers: { authorization: `Bearer ${app.tokens.reviewer}` },
        });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get('content-type'), 'application/problem+json; charset=utf-8');
    });
    it('sends the rendered report as plain text', async (t) => {
        const app = await deploy(t);
        await app.sandbox.ingest(SESSION, batch);
        const response = await fetch(`${app.url}/v1/sessions/${SESSION}/report.txt`, {
            headers: { authorization: `Bearer ${app.tokens.reviewer}` },
        });
        assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
        assert.match(await response.text(), /SCORA TRUST REPORT/);
    });
});
describe('bearer authenticator', () => {
    it('rejects an absent token', async () => {
        const auth = bearerAuthenticator([]);
        assert.equal(await auth.authenticate(null), null);
    });
    it('resolves a valid token to the matching principal', async () => {
        const issued = issueCredential({
            kind: PrincipalKind.DEVELOPER,
            tenantId: TENANT,
            subject: 'dev:someone',
            roles: [Role.READ_OWN_OUTCOME],
        });
        const auth = bearerAuthenticator([issued.stored]);
        const principal = await auth.authenticate(issued.token);
        assert.notEqual(principal, null);
        assert.equal(principal?.kind, PrincipalKind.DEVELOPER);
        assert.equal(principal?.subject, 'dev:someone');
    });
    it('rejects a wrong token', async () => {
        const issued = issueCredential({
            kind: PrincipalKind.STAFF,
            tenantId: TENANT,
            subject: 'staff:someone',
            roles: [Role.ADMINISTER],
        });
        const auth = bearerAuthenticator([issued.stored]);
        assert.equal(await auth.authenticate(`${issued.token}x`), null);
    });
    it('rejects a credential that has expired', async () => {
        const issued = issueSandboxCredential(TENANT, SESSION, T0 + 60_000);
        const auth = bearerAuthenticator([issued.stored], { now: () => T0 + 61_000 });
        assert.equal(await auth.authenticate(issued.token), null);
    });
    it('accepts a credential whose expiry has not arrived', async () => {
        const issued = issueSandboxCredential(TENANT, SESSION, T0 + 60_000);
        const auth = bearerAuthenticator([issued.stored], { now: () => T0 + 59_999 });
        assert.notEqual(await auth.authenticate(issued.token), null);
    });
    it('does not reveal whether a token matches anything', async () => {
        // A credential table is itself sensitive; every credential must be compared
        // regardless of a match so the timing does not leak which one was found.
        const issued = issueCredential({
            kind: PrincipalKind.STAFF,
            tenantId: TENANT,
            subject: 'staff:someone',
            roles: [Role.ADMINISTER],
        });
        const auth = bearerAuthenticator([issued.stored]);
        await auth.authenticate('definitely-not-a-token');
        await auth.authenticate(issued.token);
        await auth.authenticate('definitely-not-a-token');
    });
    it('stores only the hash, never the token', () => {
        const issued = issueSandboxCredential(TENANT, SESSION, T0 + 60_000);
        assert.notEqual(issued.stored.tokenHash, issued.token);
        assert.equal(issued.stored.tokenHash, hashToken(issued.token));
    });
    it('scopes a sandbox credential to one session and to INGEST only', async () => {
        const issued = issueSandboxCredential(TENANT, SESSION, T0 + 60_000);
        const auth = bearerAuthenticator([issued.stored], { now: () => T0 });
        const principal = await auth.authenticate(issued.token);
        assert.deepEqual(principal?.roles, [Role.INGEST]);
        assert.equal(principal?.sessionId, SESSION);
        assert.equal(principal?.developerId, undefined);
    });
    it('round-trips a tenant-scoped admin credential', async () => {
        const issued = issueCredential({
            kind: PrincipalKind.STAFF,
            tenantId: TENANT,
            subject: 'staff:admin',
            roles: [Role.ADMINISTER],
        });
        const auth = bearerAuthenticator([issued.stored], { now: () => T0 });
        const principal = await auth.authenticate(issued.token);
        assert.equal(principal?.tenantId, TENANT);
        assert.deepEqual(principal?.roles, [Role.ADMINISTER]);
    });
});
describe('client', () => {
    it('throws a TrustApiError carrying the problem detail on a refusal', async (t) => {
        const app = await deploy(t);
        await assert.rejects(app.reviewer.savePolicy({}), (error) => {
            assert.ok(error instanceof TrustApiError);
            assert.equal(error.status, 403);
            assert.equal(error.problem.status, 403);
            return true;
        });
    });
    it('reports a rejected policy write with its field errors', async (t) => {
        const app = await deploy(t);
        const proposed = (await app.admin.policy());
        const weakened = {
            ...proposed,
            retention: { ...proposed.retention, auditDays: 30 },
        };
        await assert.rejects(app.admin.savePolicy(weakened), (error) => {
            assert.ok(error instanceof TrustApiError);
            assert.equal(error.status, 422);
            assert.ok(error.problem.errors?.some((entry) => entry.path === 'retention.auditDays'));
            return true;
        });
    });
    it('parses a non-JSON error body into a problem detail, not a throw', async (t) => {
        const app = await deploy(t);
        await assert.rejects(app.reviewer.savePolicy({}), (error) => {
            assert.ok(error instanceof TrustApiError);
            assert.equal(error.status, 403);
            assert.equal(error.problem.title, 'Forbidden');
            return true;
        });
    });
    it('sends no body and no content-type on a read', async () => {
        // A GET that declares `content-type: application/json` with no body makes
        // some proxies and WAFs reject the request outright, and the client is meant
        // to run unchanged in a browser and in the sandbox.
        const seen = [];
        const client = createTrustClient({
            baseUrl: 'http://example.invalid',
            token: 'token',
            fetch: async (_input, init) => {
                seen.push(init ?? {});
                return new Response('{}', { status: 200 });
            },
        });
        await client.report(SESSION);
        const headers = seen[0]?.headers;
        assert.equal(seen[0]?.body, undefined);
        assert.equal(headers['content-type'], undefined);
        assert.equal(headers['authorization'], 'Bearer token');
    });
    it('sends a JSON body and content-type on a write', async () => {
        const seen = [];
        const client = createTrustClient({
            baseUrl: 'http://example.invalid/',
            token: 'token',
            fetch: async (_input, init) => {
                seen.push(init ?? {});
                return new Response('{}', { status: 200 });
            },
        });
        await client.ingest(SESSION, [heartbeat(1)]);
        const headers = seen[0]?.headers;
        assert.equal(headers['content-type'], 'application/json');
        assert.match(String(seen[0]?.body), /"events"/);
    });
    it('does not retry, so a flaky network cannot double-count evidence', async (t) => {
        // The whole point of the client being thin. A retry here would append the
        // same events twice under new ids and inflate whatever reads them.
        let calls = 0;
        const client = createTrustClient({
            baseUrl: await listen({ async authenticate() { return null; } }, t),
            token: 'token',
            fetch: async (input, init) => {
                calls += 1;
                return await fetch(input, init);
            },
        });
        await assert.rejects(client.ingest(SESSION, [heartbeat(1)]));
        assert.equal(calls, 1);
    });
});
//# sourceMappingURL=transport.test.js.map