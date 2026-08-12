import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SESSION, TENANT, harness, heartbeat, reviewerPrincipal, sandboxPrincipal } from "./testing.js";
/**
 * The read surface.
 *
 * These tests are about what a reader is told, and about the difference between
 * evidence that is missing and evidence that was tampered with. A reviewer who
 * cannot tell those apart will read lost telemetry as dishonesty.
 */
const tokens = { sandbox: sandboxPrincipal(), reviewer: reviewerPrincipal() };
async function seeded(events = [heartbeat(1), heartbeat(2), heartbeat(3)]) {
    const app = harness(tokens);
    const response = await app.request({
        method: 'POST',
        path: `/v1/sessions/${SESSION}/events`,
        token: 'sandbox',
        body: { events },
    });
    assert.equal(response.status, 202);
    return app;
}
describe('ingestion endpoint', () => {
    it('answers 202, not 201', async () => {
        // A batch can be partly rejected or partly withheld. 201 would report a
        // half-stored batch as fully accepted.
        const app = harness(tokens);
        const response = await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1)] },
        });
        assert.equal(response.status, 202);
    });
    it('reports what it rejected instead of failing the batch', async () => {
        // One malformed event must not discard the good ones, and the caller has to
        // be told which fell out — a session with partly broken telemetry should
        // read as lower confidence, not as clean.
        const app = harness(tokens);
        const response = await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1), { nonsense: true }, heartbeat(2)] },
        });
        const body = response.body;
        assert.equal(body.accepted, 2);
        assert.equal(body.rejected.length, 1);
    });
    it('is idempotent on a replayed batch', async () => {
        // Sandboxes retry on flaky networks. A replay must not duplicate evidence
        // or double-count anything the scoring layer reads.
        const app = await seeded();
        const replay = await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: [heartbeat(1), heartbeat(2), heartbeat(3)] },
        });
        const body = replay.body;
        assert.equal(body.accepted, 0);
        assert.equal(body.duplicates, 3);
        assert.equal((await app.store.readSession(TENANT, SESSION)).length, 3);
    });
    it('refuses a body that is not a batch', async () => {
        const app = harness(tokens);
        const response = await app.request({
            method: 'POST',
            path: `/v1/sessions/${SESSION}/events`,
            token: 'sandbox',
            body: { events: 'all of them' },
        });
        assert.equal(response.status, 400);
    });
});
describe('report endpoint', () => {
    it('returns Trust, Risk and Confidence together', async () => {
        // Never one without the others. A Trust score read without its Confidence
        // is a number presented as more certain than the evidence supports.
        const app = await seeded();
        const response = await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'reviewer' });
        assert.equal(response.status, 200);
        const body = response.body;
        assert.equal(typeof body['trust'], 'number');
        assert.equal(typeof body['risk'], 'number');
        assert.equal(typeof body['confidence'], 'number');
    });
    it('carries the evidence integrity check inline', async () => {
        // A reviewer must never read a score without knowing whether the evidence
        // under it is intact, which means it cannot be a separate call they might
        // not make.
        const app = await seeded();
        const response = await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'reviewer' });
        const body = response.body;
        assert.equal(body.evidenceIntegrity.intact, true);
        assert.equal(body.evidenceIntegrity.eventsChecked, 3);
    });
    it('states its limitations', async () => {
        // Three heartbeats are not an assessment. The report has to say so rather
        // than present a confident-looking number built on nothing.
        const app = await seeded();
        const response = await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'reviewer' });
        const body = response.body;
        assert.equal(body.limitations.length > 0, true);
        assert.equal(body.confidence < 50, true);
    });
    it('reports only clusters that actually fired', async () => {
        // The catalogue is evaluated in full, but a reviewer dashboard listing
        // every cluster that did *not* fire invites reading absence as suspicion.
        const app = await seeded();
        const response = await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'reviewer' });
        const body = response.body;
        assert.deepEqual(body.clusters, []);
    });
    it('renders a text report for a human', async () => {
        const app = await seeded();
        const response = await app.request({
            path: `/v1/sessions/${SESSION}/report.txt`,
            token: 'reviewer',
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers?.['content-type'], 'text/plain; charset=utf-8');
        assert.equal(typeof response.body, 'string');
        assert.match(response.body, /SCORA TRUST REPORT/);
    });
    it('answers 404 for a session with no events', async () => {
        const app = harness(tokens);
        const response = await app.request({ path: `/v1/sessions/${SESSION}/report`, token: 'reviewer' });
        assert.equal(response.status, 404);
    });
});
describe('evidence endpoints', () => {
    it('pages the raw log by chain position', async () => {
        const app = await seeded();
        const first = await app.request({
            path: `/v1/sessions/${SESSION}/events`,
            query: { limit: '2' },
            token: 'reviewer',
        });
        const page = first.body;
        assert.deepEqual(page.events.map((event) => event.chainPosition), [1, 2]);
        assert.notEqual(page.nextCursor, null);
        const second = await app.request({
            path: `/v1/sessions/${SESSION}/events`,
            query: { limit: '2', cursor: page.nextCursor },
            token: 'reviewer',
        });
        const rest = second.body;
        assert.deepEqual(rest.events.map((event) => event.chainPosition), [3]);
    });
    it('confirms an untampered chain', async () => {
        const app = await seeded();
        const response = await app.request({
            path: `/v1/sessions/${SESSION}/integrity`,
            token: 'reviewer',
        });
        const body = response.body;
        assert.equal(body.intact, true);
        assert.equal(body.eventsChecked, 3);
        assert.equal(typeof body.headHash, 'string');
    });
    it('reports lost telemetry as a gap, not as tampering', async () => {
        // The producer emitted sequence 2 and it never arrived. The chain is whole
        // — the engine numbers only what it received — so this must lower
        // Confidence without ever being described as a broken chain.
        const app = await seeded([heartbeat(1), heartbeat(3), heartbeat(4)]);
        const response = await app.request({
            path: `/v1/sessions/${SESSION}/integrity`,
            token: 'reviewer',
        });
        const body = response.body;
        assert.equal(body.intact, true);
        assert.deepEqual(body.violations, []);
        assert.deepEqual(body.missingSequences, [2]);
    });
});
describe('developer session listing', () => {
    it('lists sessions for a developer', async () => {
        const app = await seeded();
        const response = await app.request({
            path: '/v1/developers/dev_dana/sessions',
            token: 'reviewer',
        });
        assert.equal(response.status, 200);
        const body = response.body;
        assert.equal(body.sessions.length, 1);
        assert.equal(body.sessions[0]?.sessionId, SESSION);
    });
    it('returns an empty list, not a 404, for a developer with no sessions', async () => {
        // Nothing here is a secret: the caller already knows the developer id, and
        // an empty list is the honest answer.
        const app = await seeded();
        const response = await app.request({
            path: '/v1/developers/dev_nobody/sessions',
            token: 'reviewer',
        });
        assert.equal(response.status, 200);
        assert.deepEqual(response.body.sessions, []);
    });
});
//# sourceMappingURL=reporting.test.js.map