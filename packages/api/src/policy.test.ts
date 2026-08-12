import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unsafeEpochMs } from '@scora/trust-core';
import {
  AssistanceProviderKind,
  MAXIMUM_COMPLETION_CHARS,
  MAXIMUM_REVIEW_THRESHOLD,
  MINIMUM_AUDIT_RETENTION_DAYS,
  assertPolicyInvariants,
  defaultPolicy,
  permittedScopes,
  type TenantPolicy,
} from './policy.ts';
import { T0, TENANT, adminPrincipal, harness, reviewerPrincipal } from './testing.ts';

/**
 * Tenant policy.
 *
 * The administrator's console is a client of these endpoints and holds no logic
 * of its own, so every guarantee an administrator must not be able to switch off
 * has to be enforced here. A policy write that would weaken one is a rejected
 * write, not a warning.
 */

const AT = unsafeEpochMs(T0);
const base = (): TenantPolicy => defaultPolicy(TENANT, AT, 'admin');

describe('default policy', () => {
  it('collects as little as possible', () => {
    // A tenant that has configured nothing must not be running an engine that
    // collects everything. Absence of configuration is not consent.
    const policy = base();
    assert.equal(policy.monitoring.externalActivityEnabled, false);
    assert.equal(policy.monitoring.recordingEnabled, false);
    assert.equal(policy.monitoring.recordDomains, false);
    assert.equal(policy.monitoring.consentNoticeVersion, null);
  });

  it('offers no completions and names no provider', () => {
    const policy = base();
    assert.equal(policy.assistance.completionsEnabled, false);
    assert.equal(policy.assistance.provider.kind, AssistanceProviderKind.NONE);
    assert.equal(policy.assistance.provider.apiKeyRef, null);
  });

  it('shows the developer their own outcome', () => {
    // Being assessed by a system that will not tell you its conclusion is the
    // failure this platform exists to avoid.
    assert.equal(base().review.developerVisibleOutcome, true);
  });

  it('satisfies its own invariants', () => {
    assert.deepEqual(assertPolicyInvariants(base()), []);
  });
});

describe('policy invariants', () => {
  it('refuses a review threshold that removes the human', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      review: { ...base().review, humanReviewRiskThreshold: 1 as never },
    });
    assert.equal(violations.length, 1);
    assert.equal(violations[0]?.path, 'review.humanReviewRiskThreshold');
  });

  it('accepts a threshold exactly at the maximum', () => {
    // The bound is inclusive: the invariant exists to stop the human being
    // removed, and at the cap they are still there.
    const violations = assertPolicyInvariants({
      ...base(),
      review: {
        ...base().review,
        humanReviewRiskThreshold: MAXIMUM_REVIEW_THRESHOLD as never,
      },
    });
    assert.deepEqual(violations, []);
  });

  it('refuses an adverse finding on thinner evidence than the floor', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      review: { ...base().review, minimumConfidenceForAdverse: 0.1 as never },
    });
    assert.equal(violations[0]?.path, 'review.minimumConfidenceForAdverse');
  });

  it('refuses an audit trail shorter than a year', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      retention: { ...base().retention, auditDays: 30 },
    });
    // Thirty days trips the floor and, because evidence is kept for 180, also
    // the rule that audit must outlast evidence. Both are true and both are
    // reported.
    assert.equal(violations.length, 2);
    assert.deepEqual(
      violations.map((violation) => violation.path),
      ['retention.auditDays', 'retention.auditDays'],
    );
    assert.match(violations[0]?.message ?? '', /at least 365 days/);
  });

  it('refuses an audit trail shorter than the evidence it describes', () => {
    // Evidence outliving its own access log means nobody can later establish
    // who read it.
    const violations = assertPolicyInvariants({
      ...base(),
      retention: {
        ...base().retention,
        evidenceDays: 1_000,
        auditDays: MINIMUM_AUDIT_RETENTION_DAYS,
      },
    });
    assert.equal(violations.length, 1);
    assert.match(violations[0]?.message ?? '', /shorter than evidence retention/);
  });

  it('refuses external monitoring without a consent notice', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      monitoring: { ...base().monitoring, externalActivityEnabled: true },
    });
    assert.equal(violations[0]?.path, 'monitoring.externalActivityEnabled');
  });

  it('refuses recording without a consent notice', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      monitoring: { ...base().monitoring, recordingEnabled: true },
    });
    assert.equal(violations[0]?.path, 'monitoring.recordingEnabled');
  });

  it('refuses domain recording while external monitoring is off', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      monitoring: {
        ...base().monitoring,
        recordDomains: true,
        consentNoticeVersion: 'notice-2026-01',
      },
    });
    assert.equal(violations[0]?.path, 'monitoring.recordDomains');
  });

  it('refuses completions with no provider behind them', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      assistance: { ...base().assistance, completionsEnabled: true },
    });
    assert.equal(violations[0]?.path, 'assistance.provider.kind');
  });

  it('refuses a managed provider with no secret reference', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      assistance: {
        ...base().assistance,
        completionsEnabled: true,
        provider: {
          kind: AssistanceProviderKind.MANAGED,
          model: 'completion-small',
          apiKeyRef: null,
          endpoint: null,
          timeoutMs: 2_000,
        },
      },
    });
    assert.equal(violations[0]?.path, 'assistance.provider.apiKeyRef');
  });

  it('refuses a completion long enough to be a solution', () => {
    // The ceiling is what keeps Layer 07 an editor feature. Past it the
    // platform is handing over the answer it is supposed to be assessing.
    const violations = assertPolicyInvariants({
      ...base(),
      assistance: { ...base().assistance, maxCompletionChars: MAXIMUM_COMPLETION_CHARS + 1 },
    });
    assert.equal(violations[0]?.path, 'assistance.maxCompletionChars');
  });

  it('accepts a fully configured managed provider', () => {
    const violations = assertPolicyInvariants({
      ...base(),
      assistance: {
        completionsEnabled: true,
        provider: {
          kind: AssistanceProviderKind.MANAGED,
          model: 'completion-small',
          apiKeyRef: 'secrets/scora/completion-key',
          endpoint: null,
          timeoutMs: 1_500,
        },
        maxCompletionChars: 240,
        maxCompletionsPerMinute: 60,
        languages: ['typescript'],
      },
    });
    assert.deepEqual(violations, []);
  });

  it('reports every violation at once', () => {
    // An administrator fixing one field at a time across six round trips will
    // give up and ask for the checks to be relaxed.
    const violations = assertPolicyInvariants({
      ...base(),
      retention: { ...base().retention, auditDays: 10 },
      review: {
        ...base().review,
        humanReviewRiskThreshold: 0.99 as never,
        minimumConfidenceForAdverse: 0 as never,
      },
    });
    assert.deepEqual(new Set(violations.map((violation) => violation.path)), new Set([
      'review.humanReviewRiskThreshold',
      'review.minimumConfidenceForAdverse',
      'retention.auditDays',
    ]));
  });
});

describe('permitted scopes', () => {
  it('permits only assessment by default', () => {
    // The bridge to the ingestion consent gate: without the scope, Layer 06
    // events are never written, not filtered out on read.
    assert.deepEqual(permittedScopes(base()), ['assessment']);
  });

  it('permits external monitoring once a notice exists', () => {
    const scopes = permittedScopes({
      ...base(),
      monitoring: {
        ...base().monitoring,
        externalActivityEnabled: true,
        consentNoticeVersion: 'notice-2026-01',
      },
    });
    assert.deepEqual(scopes, ['assessment', 'external_monitoring']);
  });

  it('withholds the scope when monitoring is on but the notice was removed', () => {
    // An inconsistent policy cannot be written through the API, but a store
    // migrated from elsewhere can hold one. Collection stays off.
    const scopes = permittedScopes({
      ...base(),
      monitoring: {
        ...base().monitoring,
        externalActivityEnabled: true,
        recordingEnabled: true,
        consentNoticeVersion: null,
      },
    });
    assert.deepEqual(scopes, ['assessment']);
  });
});

describe('policy endpoints', () => {
  const tokens = { admin: adminPrincipal(), reviewer: reviewerPrincipal() };

  it('returns the default policy for a tenant that has configured nothing', async () => {
    const app = harness(tokens);
    const response = await app.request({ path: '/v1/policy', token: 'admin' });

    assert.equal(response.status, 200);
    const body = response.body as TenantPolicy;
    assert.equal(body.tenantId, TENANT);
    assert.equal(body.monitoring.externalActivityEnabled, false);
  });

  it('refuses a reviewer reading policy', async () => {
    assert.equal((await harness(tokens).request({ path: '/v1/policy', token: 'reviewer' })).status, 403);
  });

  it('stores a valid policy and reads it back', async () => {
    const app = harness(tokens);
    const written = await app.request({
      method: 'PUT',
      path: '/v1/policy',
      token: 'admin',
      body: {
        ...base(),
        assistance: {
          ...base().assistance,
          completionsEnabled: true,
          provider: {
            kind: AssistanceProviderKind.SELF_HOSTED,
            model: 'local-completion',
            apiKeyRef: null,
            endpoint: 'http://127.0.0.1:8080',
            timeoutMs: 800,
          },
        },
      },
    });

    assert.equal(written.status, 200);
    const stored = await app.policies.load(TENANT);
    assert.equal(stored?.assistance.completionsEnabled, true);
    assert.equal(stored?.assistance.provider.model, 'local-completion');
  });

  it('rejects a policy that would weaken a guarantee, with the fields named', async () => {
    const app = harness(tokens);
    const response = await app.request({
      method: 'PUT',
      path: '/v1/policy',
      token: 'admin',
      body: { ...base(), retention: { ...base().retention, auditDays: 5 } },
    });

    assert.equal(response.status, 422);
    const body = response.body as { errors: { path: string }[] };
    assert.equal(body.errors[0]?.path, 'retention.auditDays');

    // And nothing was stored: a rejected write leaves the previous policy in
    // place rather than half-applying.
    assert.equal(await app.policies.load(TENANT), null);
  });

  it('stamps who changed the policy and when', async () => {
    // Policy changes are themselves auditable. "Who turned on recording" has to
    // have an answer.
    const app = harness(tokens);
    await app.request({ method: 'PUT', path: '/v1/policy', token: 'admin', body: base() });

    const stored = await app.policies.load(TENANT);
    assert.equal(stored?.updatedBy, 'staff:admin');
    assert.equal(typeof stored?.updatedAt, 'number');
  });

  it('ignores a tenant id in the body', async () => {
    // A policy write must not be able to retarget itself at another tenant.
    const app = harness(tokens);
    await app.request({
      method: 'PUT',
      path: '/v1/policy',
      token: 'admin',
      body: { ...base(), tenantId: 'tnt_victim' },
    });

    assert.equal(await app.policies.load(TENANT) !== null, true);
    assert.equal(await app.policies.load('tnt_victim' as never), null);
  });

  it('reports the consent scopes the policy permits', async () => {
    const app = harness(tokens);
    const response = await app.request({ path: '/v1/policy/scopes', token: 'admin' });

    assert.equal(response.status, 200);
    assert.deepEqual((response.body as { scopes: string[] }).scopes, ['assessment']);
  });
});
