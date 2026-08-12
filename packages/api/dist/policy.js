import { clampUnit } from '@scora/trust-core';
export const AssistanceProviderKind = {
    /** No provider. Completions are disabled; the sandbox is a plain editor. */
    NONE: 'NONE',
    /** A local or self-hosted completion model. */
    SELF_HOSTED: 'SELF_HOSTED',
    /** A managed completion API. */
    MANAGED: 'MANAGED',
};
/** The audit trail must outlive the evidence it describes. */
export const MINIMUM_AUDIT_RETENTION_DAYS = 365;
/** No tenant may configure the engine to decide adverse outcomes without a human. */
export const MAXIMUM_REVIEW_THRESHOLD = 0.8;
/** Below this confidence nothing adverse may be recommended, regardless of policy. */
export const MINIMUM_CONFIDENCE_FLOOR = 0.4;
/**
 * The longest a single completion may be.
 *
 * This is the number that keeps Layer 07 an editor feature. Past it the platform
 * is handing over the answer it is meant to be assessing, and no tenant may
 * configure its way across that line.
 */
export const MAXIMUM_COMPLETION_CHARS = 2_000;
/** The least-collecting policy that still permits an assessment. Used for new tenants. */
export function defaultPolicy(tenantId, at, by) {
    return {
        tenantId,
        updatedAt: at,
        updatedBy: by,
        assistance: {
            completionsEnabled: false,
            provider: {
                kind: AssistanceProviderKind.NONE,
                model: '',
                apiKeyRef: null,
                endpoint: null,
                timeoutMs: 2_000,
            },
            maxCompletionChars: 240,
            maxCompletionsPerMinute: 60,
            languages: [],
        },
        monitoring: {
            externalActivityEnabled: false,
            recordDomains: false,
            recordingEnabled: false,
            consentNoticeVersion: null,
        },
        retention: {
            evidenceDays: 180,
            contentDays: 90,
            recordingDays: 30,
            auditDays: MINIMUM_AUDIT_RETENTION_DAYS * 2,
        },
        review: {
            humanReviewRiskThreshold: clampUnit(0.5),
            minimumConfidenceForAdverse: clampUnit(0.45),
            developerVisibleOutcome: true,
        },
    };
}
/**
 * Rejects a policy that would weaken a guarantee the platform makes to developers.
 *
 * Called on every policy write. These are not validated as a courtesy to the
 * administrator: an administrator who sets `humanReviewRiskThreshold` to 1.0 has
 * not misconfigured a preference, they have removed the human from a decision
 * about someone's career, and the write must fail.
 */
export function assertPolicyInvariants(policy) {
    const violations = [];
    if (policy.review.humanReviewRiskThreshold > MAXIMUM_REVIEW_THRESHOLD) {
        violations.push({
            path: 'review.humanReviewRiskThreshold',
            message: `must not exceed ${MAXIMUM_REVIEW_THRESHOLD}: above this the engine would decide adverse outcomes without a human`,
        });
    }
    if (policy.review.minimumConfidenceForAdverse < MINIMUM_CONFIDENCE_FLOOR) {
        violations.push({
            path: 'review.minimumConfidenceForAdverse',
            message: `must be at least ${MINIMUM_CONFIDENCE_FLOOR}: an adverse finding on thinner evidence than this is not defensible`,
        });
    }
    if (policy.retention.auditDays < MINIMUM_AUDIT_RETENTION_DAYS) {
        violations.push({
            path: 'retention.auditDays',
            message: `must be at least ${MINIMUM_AUDIT_RETENTION_DAYS} days: the record of who read what must outlive what they read`,
        });
    }
    if (policy.retention.auditDays < policy.retention.evidenceDays) {
        violations.push({
            path: 'retention.auditDays',
            message: 'must not be shorter than evidence retention, or evidence would outlive its own access log',
        });
    }
    if (policy.monitoring.externalActivityEnabled && policy.monitoring.consentNoticeVersion === null) {
        violations.push({
            path: 'monitoring.externalActivityEnabled',
            message: 'external activity monitoring requires a consent notice version',
        });
    }
    if (policy.monitoring.recordingEnabled && policy.monitoring.consentNoticeVersion === null) {
        violations.push({
            path: 'monitoring.recordingEnabled',
            message: 'recording requires a consent notice version',
        });
    }
    if (policy.monitoring.recordDomains && !policy.monitoring.externalActivityEnabled) {
        violations.push({
            path: 'monitoring.recordDomains',
            message: 'cannot record domains while external activity monitoring is disabled',
        });
    }
    if (policy.assistance.completionsEnabled &&
        policy.assistance.provider.kind === AssistanceProviderKind.NONE) {
        violations.push({
            path: 'assistance.provider.kind',
            message: 'completions are enabled but no provider is configured',
        });
    }
    if (policy.assistance.provider.kind === AssistanceProviderKind.MANAGED &&
        policy.assistance.provider.apiKeyRef === null) {
        violations.push({
            path: 'assistance.provider.apiKeyRef',
            message: 'a managed provider needs a secret reference',
        });
    }
    if (policy.assistance.maxCompletionChars > MAXIMUM_COMPLETION_CHARS) {
        violations.push({
            path: 'assistance.maxCompletionChars',
            message: `must not exceed ${MAXIMUM_COMPLETION_CHARS}: a completion this long is a solution, not a completion; the sandbox is an editor`,
        });
    }
    return violations;
}
/**
 * Which consent scopes a policy permits collection under.
 *
 * The bridge between admin configuration and the ingestion pipeline's consent
 * gate. A policy that has not enabled external monitoring produces no
 * `external_monitoring` scope, so Layer 06 events are never stored — not
 * filtered on read, never written.
 */
export function permittedScopes(policy) {
    const scopes = ['assessment'];
    if (policy.monitoring.externalActivityEnabled && policy.monitoring.consentNoticeVersion !== null) {
        scopes.push('external_monitoring');
    }
    if (policy.monitoring.recordingEnabled && policy.monitoring.consentNoticeVersion !== null) {
        scopes.push('recording');
    }
    return scopes;
}
/** In-memory policy store. Sufficient for tests and single-node deployments. */
export function inMemoryPolicyStore() {
    const byTenant = new Map();
    return {
        async load(tenantId) {
            return byTenant.get(tenantId) ?? null;
        },
        async save(policy) {
            byTenant.set(policy.tenantId, policy);
        },
    };
}
//# sourceMappingURL=policy.js.map