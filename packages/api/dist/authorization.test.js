import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SessionId, TenantId } from '@scora/trust-core';
import { PrincipalKind, Role } from "./contract.js";
import { buildRouter, resolveRoles } from "./router.js";
import { defaultPolicy } from "./policy.js";
import { DEV, OTHER_DEV, OTHER_TENANT, SESSION, TENANT, adminPrincipal, developerPrincipal, harness, heartbeat, reviewerPrincipal, sandboxPrincipal, } from "./testing.js";
/**
 * The authorization boundary.
 *
 * These tests are about who may reach what, and about what a refusal tells the
 * caller. The single most damaging bug this system could have is returning one
 * person's evidence to another, and the second most damaging is a refusal that
 * confirms the evidence exists.
 */
describe('router construction', () => {
    const stub = {
        method: 'GET',
        pattern: '/v1/thing',
        roles: [Role.READ_REPORT],
        summary: 'stub',
        async handler() {
            return { status: 200, body: {} };
        },
    };
    it('refuses a route that declares no roles', () => {
        // An empty role list reads as "public". For an evidence platform that has
        // to be a decision someone made, not a field someone forgot.
        assert.throws(() => buildRouter([{ ...stub, roles: [] }]), /declares no roles/);
    });
    it('refuses an INGEST route paired with a role no sandbox may hold', () => {
        // resolveRoles denies the sandbox outright here, so the route would build
        // fine and then quietly reject every sandbox submission.
        assert.throws(() => buildRouter([{ ...stub, roles: [Role.INGEST, Role.READ_EVIDENCE] }]), /pairs it with a role no sandbox may hold/);
    });
    it('refuses a pattern the deployment has forbidden', () => {
        assert.throws(() => buildRouter([stub], { forbidden: ['/v1/thing'] }), /declared but forbidden/);
    });
    it('accepts a plain INGEST route', () => {
        assert.doesNotThrow(() => buildRouter([{ ...stub, roles: [Role.INGEST] }]));
    });
});
describe('resolveRoles', () => {
    const allow = (principal, required) => resolveRoles(principal, required).includes('__ALLOW__');
    it('lets a sandbox ingest', () => {
        assert.equal(allow(sandboxPrincipal(), [Role.INGEST]), true);
    });
    it('denies a sandbox every read, even holding the role', () => {
        // A sandbox is a program running on the assessed person's machine. Roles on
        // its token are not the last word: the principal kind is.
        const overprivileged = {
            ...sandboxPrincipal(),
            roles: [Role.INGEST, Role.READ_REPORT, Role.READ_EVIDENCE, Role.ADMINISTER],
        };
        assert.equal(allow(overprivileged, [Role.READ_REPORT]), false);
        assert.equal(allow(overprivileged, [Role.READ_EVIDENCE]), false);
        assert.equal(allow(overprivileged, [Role.ADMINISTER]), false);
    });
    it('denies a developer a staff-only role, even holding it', () => {
        // A developer credential must not be able to record a review of its own
        // work, or read the reviewer's copy of its own report.
        const overprivileged = {
            ...developerPrincipal(),
            roles: [Role.READ_OWN_OUTCOME, Role.REVIEW, Role.READ_REPORT],
        };
        assert.equal(allow(overprivileged, [Role.REVIEW]), false);
        assert.equal(allow(overprivileged, [Role.READ_REPORT]), false);
        assert.equal(allow(overprivileged, [Role.READ_OWN_OUTCOME]), true);
    });
    it('admits staff by role membership', () => {
        assert.equal(allow(reviewerPrincipal(), [Role.READ_REPORT]), true);
        assert.equal(allow(reviewerPrincipal(), [Role.ADMINISTER]), false);
    });
});
describe('request authorization', () => {
    const tokens = {
        sandbox: sandboxPrincipal(),
        reviewer: reviewerPrincipal(),
        admin: adminPrincipal(),
        developer: developerPrincipal(),
    };
    it('refuses an unauthenticated request with 401 and a challenge', async () => {
        const app = harness(tokens);
        const response = await app.request({ path: `/v1/sessions/${SESSION}/report` });
        assert.equal(response.status, 401);
        assert.equal(response.headers?.['www-authenticate'], 'Bearer');
    });
    it('refuses an unknown token with 401, not 403', async () => {
        // 403 would confirm the token is real but underprivileged.
        const app = harness(tokens);
        const response = await app.request({
            path: `/v1/sessions/${SESSION}/report`,
            token: 'not-a-token',
        });
        assert.equal(response.status, 401);
    });
    it('refuses a caller lacking the role with 403', async () => {
        const app = harness(tokens);
        const response = await app.request({ path: '/v1/policy', token: 'reviewer' });
        assert.equal(response.status, 403);
    });
    it('answers 404 for an unknown path', async () => {
        const app = harness(tokens);
        const response = await app.request({ path: '/v1/nope', token: 'reviewer' });
        assert.equal(response.status, 404);
    });
    it('answers 404 for the wrong method on a known path', async () => {
        const app = harness(tokens);
        const response = await app.request({ path: '/v1/policy/scopes', method: 'DELETE', token: 'admin' });
        assert.equal(response.status, 404);
    });
    it('does not let one method shadow the rest of its pattern', async () => {
        // GET and PUT are declared separately against `/v1/policy`. A dispatcher
        // that answered on the first pattern match would serve whichever was
        // declared first and 404 the other — an admin console that can read policy
        // but silently cannot save it.
        const app = harness(tokens);
        const read = await app.request({ path: '/v1/policy', token: 'admin' });
        const written = await app.request({
            method: 'PUT',
            path: '/v1/policy',
            token: 'admin',
            body: read.body,
        });
        assert.equal(read.status, 200);
        assert.equal(written.status, 200);
    });
    it('answers 405-worthy requests with 404 anyway', async () => {
        // A 405 on a session path would confirm the session id is real to a caller
        // who is not allowed to know that.
        const app = harness(tokens);
        const response = await app.request({
            method: 'PUT',
            path: `/v1/sessions/${SESSION}/report`,
            token: 'reviewer',
        });
        assert.equal(response.status, 404);
    });
});
describe('tenant isolation', () => {
    const tokens = {
        sandbox: sandboxPrincipal(),
        reviewer: reviewerPrincipal(),
        intruder: reviewerPrincipal(OTHER_TENANT),
    };
    async function seed(app) {
        const response = await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1), heartbeat(2)] },
        });
        assert.equal(response.status, 202);
    }
    it('does not return one tenant session to another', async () => {
        const app = harness(tokens);
        await seed(app);
        const mine = await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'reviewer' });
        assert.equal(mine.status, 200);
        // Same session id, same role, different tenant. The id is not the
        // authorization — the credential is.
        const theirs = await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'intruder' });
        assert.equal(theirs.status, 404);
    });
    it('answers the same 404 for a session that exists elsewhere and one that never existed', async () => {
        // Byte-identical, deliberately. Any difference — status, body, header — is
        // an oracle for enumerating another tenant's assessments.
        const app = harness(tokens);
        await seed(app);
        const elsewhere = await app.request({
            path: `/v1/sessions/${SESSION}/report`,
            token: 'intruder',
        });
        const nowhere = await app.request({
            path: `/v1/sessions/${SessionId.unsafe('sess_imaginary')}/report`,
            token: 'intruder',
        });
        assert.equal(elsewhere.status, nowhere.status);
        assert.deepEqual(elsewhere.body, nowhere.body);
        assert.deepEqual(elsewhere.headers, nowhere.headers);
    });
    it('ignores a tenant id supplied in the body', async () => {
        // The submission names another tenant. Ingestion must overwrite it from the
        // credential rather than honour it.
        const app = harness(tokens);
        const submitted = await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1, { tenantId: TenantId.unsafe('tnt_victim') })] },
        });
        assert.equal(submitted.status, 202);
        const stored = await app.store.readSession(TENANT, SESSION);
        assert.equal(stored.length, 1);
        assert.equal(stored[0]?.tenantId, TENANT);
    });
    it('ignores a session id supplied in the body', async () => {
        // Likewise for the session: the path and the credential agree, and the body
        // does not get a vote.
        const app = harness(tokens);
        await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1, { sessionId: SessionId.unsafe('sess_elsewhere') })] },
        });
        const stored = await app.store.readSession(TENANT, SESSION);
        assert.equal(stored.length, 1);
        assert.equal(stored[0]?.sessionId, SESSION);
    });
});
describe('sandbox session scoping', () => {
    it('refuses a sandbox writing into a session other than its own', async () => {
        // The most direct consequence of a leaked sandbox token: forging evidence
        // into someone else's assessment.
        const app = harness({ sandbox: sandboxPrincipal(TENANT, SESSION) });
        const response = await app.request({
            method: 'POST',
            path: `/v1/sessions/${SessionId.unsafe('sess_someone_else')}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1)] },
        });
        assert.equal(response.status, 403);
        const stored = await app.store.readSession(TENANT, SessionId.unsafe('sess_someone_else'));
        assert.equal(stored.length, 0);
    });
    it('lets a sandbox write into its own session', async () => {
        const app = harness({ sandbox: sandboxPrincipal(TENANT, SESSION) });
        const response = await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1)] },
        });
        assert.equal(response.status, 202);
    });
    it('refuses a sandbox reading the report it just fed', async () => {
        const app = harness({ sandbox: sandboxPrincipal() });
        const response = await app.request({
            path: `/v1/sessions/${SESSION}/report`,
            token: 'sandbox',
        });
        assert.equal(response.status, 403);
    });
});
describe('developer self-access', () => {
    const tokens = {
        sandbox: sandboxPrincipal(),
        dana: developerPrincipal(TENANT, DEV),
        ravi: developerPrincipal(TENANT, OTHER_DEV),
        reviewer: reviewerPrincipal(),
    };
    async function seeded() {
        const app = harness(tokens);
        await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1), heartbeat(2), heartbeat(3)] },
        });
        return app;
    }
    it('shows a developer their own outcome', async () => {
        const app = await seeded();
        const response = await app.request({ path: `/v1/me/outcome/${SESSION}`, token: 'dana' });
        assert.equal(response.status, 200);
        const body = response.body;
        assert.equal(typeof body['summary'], 'string');
        assert.equal(typeof body['confidence'], 'number');
    });
    it('never shows a developer a risk number or a cluster name', async () => {
        // A developer is not told "the engine thinks you may have cheated" by an
        // automated endpoint before a human has looked at the session.
        const app = await seeded();
        const response = await app.request({ path: `/v1/me/outcome/${SESSION}`, token: 'dana' });
        const serialised = JSON.stringify(response.body);
        assert.equal(Object.hasOwn(response.body, 'risk'), false);
        assert.equal(Object.hasOwn(response.body, 'clusters'), false);
        assert.equal(Object.hasOwn(response.body, 'trust'), false);
        assert.equal(serialised.includes('"risk"'), false);
    });
    it("answers 404 when a developer asks for another developer's session", async () => {
        // Same 404 as a session that does not exist, so this cannot be used to find
        // out whether a colleague sat this assessment.
        const app = await seeded();
        const theirs = await app.request({ path: `/v1/me/outcome/${SESSION}`, token: 'ravi' });
        const nowhere = await app.request({ path: '/v1/me/outcome/sess_imaginary', token: 'ravi' });
        assert.equal(theirs.status, 404);
        assert.deepEqual(theirs.body, nowhere.body);
    });
    it('withholds the outcome when the tenant has switched it off', async () => {
        // A distinct 403, not a 404: the developer is entitled to know that a
        // conclusion exists and that their employer chose not to show it.
        const app = await seeded();
        const base = defaultPolicy(TENANT, app.clock.now(), 'test');
        await app.policies.save({
            ...base,
            review: { ...base.review, developerVisibleOutcome: false },
        });
        const response = await app.request({ path: `/v1/me/outcome/${SESSION}`, token: 'dana' });
        assert.equal(response.status, 403);
    });
});
describe('access log', () => {
    const tokens = { reviewer: reviewerPrincipal(), sandbox: sandboxPrincipal() };
    it('records a refusal as deliberately as a success', async () => {
        // "Who tried to read this session and was told no" is exactly the question
        // an audit exists to answer.
        const app = harness(tokens);
        await app.request({ path: '/v1/policy', token: 'reviewer' });
        const entries = app.accessLog.entries();
        assert.equal(entries.length, 1);
        assert.equal(entries[0]?.status, 403);
        assert.equal(entries[0]?.subject, 'staff:reviewer');
        assert.equal(typeof entries[0]?.denialReason, 'string');
    });
    it('records an unauthenticated attempt with a null subject', async () => {
        const app = harness(tokens);
        await app.request({ path: `/v1/sessions/${SESSION}/report` });
        const entry = app.accessLog.entries()[0];
        assert.equal(entry?.status, 401);
        assert.equal(entry?.subject, null);
        assert.equal(entry?.tenantId, null);
        assert.equal(entry?.denialReason, 'unauthenticated');
    });
    it('records the route pattern, not the literal path', async () => {
        // A log full of literal session ids is a second copy of who was assessed
        // when, held under different retention rules from the evidence itself.
        const app = harness(tokens);
        await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'reviewer' });
        const entry = app.accessLog.entries()[0];
        assert.equal(entry?.route, '/v1/sessions/:sessionId/report');
    });
    it('records the resource id in its own field', async () => {
        // The pattern alone cannot answer "who read *this* developer's evidence",
        // so the id is stored in a named field under the audit retention policy.
        const app = harness(tokens);
        await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'reviewer' });
        assert.equal(app.accessLog.entries()[0]?.sessionId, SESSION);
    });
    it('records a handler crash without leaking its message', async () => {
        // An internal error string can carry a query, a path, or a fragment of
        // someone's evidence.
        const exploding = {
            method: 'GET',
            pattern: '/v1/explode',
            roles: [Role.READ_REPORT],
            summary: 'always throws',
            async handler() {
                throw new Error('SELECT * FROM events WHERE developer = dana');
            },
        };
        const app = harness(tokens, [exploding]);
        const response = await app.request({ path: '/v1/explode', token: 'reviewer' });
        assert.equal(response.status, 500);
        assert.equal(JSON.stringify(response.body).includes('dana'), false);
        assert.equal(app.accessLog.entries().at(-1)?.denialReason, 'handler threw');
    });
});
//# sourceMappingURL=authorization.test.js.map