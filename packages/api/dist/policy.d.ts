import { type EpochMs, type TenantId, type Unit } from '@scora/trust-core';
/**
 * Tenant policy — everything an administrator may configure.
 *
 * This is deliberately *data*, not code. The engine reads a policy record and
 * behaves accordingly; nothing here is compiled in, and no tenant's settings can
 * change another tenant's behaviour. The admin console is a client of the policy
 * endpoints in `routes.ts` and holds no logic of its own.
 *
 * What an administrator may NOT configure is as important as what they may.
 * There is no setting that:
 *
 *   - lowers the corroboration requirement for a cluster to fire,
 *   - lets a single event contribute to Risk,
 *   - enables "AI usage" as a risk signal in its own right,
 *   - or turns off the access log.
 *
 * Those are not preferences. A tenant that could switch them off would be
 * running a different product with this product's name on it, and the resulting
 * scores would be presented to developers as though they meant the same thing.
 * `assertPolicyInvariants` enforces this and is called on every write.
 */
export interface TenantPolicy {
    readonly tenantId: TenantId;
    readonly updatedAt: EpochMs;
    /** Subject who last changed it. Policy changes are themselves auditable. */
    readonly updatedBy: string;
    readonly assistance: AssistancePolicy;
    readonly monitoring: MonitoringPolicy;
    readonly retention: RetentionPolicy;
    readonly review: ReviewPolicy;
}
/**
 * Layer 07: the editor's completion provider.
 *
 * The sandbox is an editor with IntelliSense, not a chatbot. There is no
 * conversational mode to configure here because none exists: a developer who
 * could ask for the solution would make the assessment meaningless. The shape of
 * this interface is the enforcement — there is nowhere to put a prompt.
 */
export interface AssistancePolicy {
    /** Whether inline completion is offered at all. Disabling it is a valid tenant choice. */
    readonly completionsEnabled: boolean;
    /**
     * Provider configuration. Credentials are referenced, never stored here.
     *
     * `apiKeyRef` names a secret in the deploying platform's secret manager. A key
     * pasted into a policy record would end up in the policy audit trail, in
     * backups, and on any admin's screen — so the type gives it nowhere to live.
     */
    readonly provider: AssistanceProvider;
    /** Maximum characters a single completion may offer. */
    readonly maxCompletionChars: number;
    /** Completions per minute, per session. Rate limiting is a cost control, not a trust signal. */
    readonly maxCompletionsPerMinute: number;
    /**
     * Languages completions are offered for. Empty means all.
     *
     * A tenant assessing SQL may not want a model that writes it for them, while
     * still wanting completions in the test harness.
     */
    readonly languages: readonly string[];
}
export interface AssistanceProvider {
    readonly kind: AssistanceProviderKind;
    /** Model identifier, e.g. a completion-tuned model name. */
    readonly model: string;
    /** Name of a secret in the platform's secret manager. Never the secret itself. */
    readonly apiKeyRef: string | null;
    /** Override endpoint, for self-hosted or proxied deployments. */
    readonly endpoint: string | null;
    readonly timeoutMs: number;
}
export declare const AssistanceProviderKind: {
    /** No provider. Completions are disabled; the sandbox is a plain editor. */
    readonly NONE: "NONE";
    /** A local or self-hosted completion model. */
    readonly SELF_HOSTED: "SELF_HOSTED";
    /** A managed completion API. */
    readonly MANAGED: "MANAGED";
};
export type AssistanceProviderKind = (typeof AssistanceProviderKind)[keyof typeof AssistanceProviderKind];
/**
 * Layer 06: what the platform may observe outside the editor.
 *
 * Every field here defaults to the least-collecting option. External monitoring
 * must comply with applicable law and platform policy, which the engine cannot
 * verify — so it requires the tenant to assert consent was obtained, records
 * that assertion, and collects nothing without it.
 */
export interface MonitoringPolicy {
    /** Off by default. Requires `consentNoticeVersion` to be set. */
    readonly externalActivityEnabled: boolean;
    /**
     * Whether domains are recorded, or only categories.
     *
     * Categories by default. The path of a documentation page reveals what someone
     * did not know, which the engine does not need in order to correlate external
     * activity with understanding.
     */
    readonly recordDomains: boolean;
    /** Screen or audio recording. Off by default and gated on the `recording` consent scope. */
    readonly recordingEnabled: boolean;
    /**
     * The consent notice the developer was shown. Null means no notice exists, in
     * which case nothing beyond the `assessment` scope may be collected.
     */
    readonly consentNoticeVersion: string | null;
}
export interface RetentionPolicy {
    /** Days to keep METRIC and STRUCTURAL evidence. */
    readonly evidenceDays: number;
    /** Days to keep CONTENT evidence — code snapshots and the like. Shorter by default. */
    readonly contentDays: number;
    /** Days to keep recordings. Shortest of all. */
    readonly recordingDays: number;
    /**
     * Days to keep the access log and review audit trail.
     *
     * Longer than the evidence it describes, and floored by
     * `MINIMUM_AUDIT_RETENTION_DAYS`: proving that a deletion happened is not the
     * same as retaining the deleted data, and the record of who read what must
     * outlive what they read.
     */
    readonly auditDays: number;
}
export interface ReviewPolicy {
    /**
     * Risk at or above which a human must review before any adverse outcome.
     *
     * Capped by `MAXIMUM_REVIEW_THRESHOLD`. A tenant cannot set this to 100 and
     * thereby let the engine decide alone.
     */
    readonly humanReviewRiskThreshold: Unit;
    /** Confidence below which the engine declines to recommend anything adverse. */
    readonly minimumConfidenceForAdverse: Unit;
    /**
     * Whether a developer sees their own outcome summary. On by default.
     *
     * Being assessed by a system that will not tell you its conclusion is the
     * failure mode this platform exists to avoid, so the default is transparency.
     */
    readonly developerVisibleOutcome: boolean;
}
/** The audit trail must outlive the evidence it describes. */
export declare const MINIMUM_AUDIT_RETENTION_DAYS = 365;
/** No tenant may configure the engine to decide adverse outcomes without a human. */
export declare const MAXIMUM_REVIEW_THRESHOLD = 0.8;
/** Below this confidence nothing adverse may be recommended, regardless of policy. */
export declare const MINIMUM_CONFIDENCE_FLOOR = 0.4;
/**
 * The longest a single completion may be.
 *
 * This is the number that keeps Layer 07 an editor feature. Past it the platform
 * is handing over the answer it is meant to be assessing, and no tenant may
 * configure its way across that line.
 */
export declare const MAXIMUM_COMPLETION_CHARS = 2000;
/** The least-collecting policy that still permits an assessment. Used for new tenants. */
export declare function defaultPolicy(tenantId: TenantId, at: EpochMs, by: string): TenantPolicy;
export interface PolicyViolation {
    readonly path: string;
    readonly message: string;
}
/**
 * Rejects a policy that would weaken a guarantee the platform makes to developers.
 *
 * Called on every policy write. These are not validated as a courtesy to the
 * administrator: an administrator who sets `humanReviewRiskThreshold` to 1.0 has
 * not misconfigured a preference, they have removed the human from a decision
 * about someone's career, and the write must fail.
 */
export declare function assertPolicyInvariants(policy: TenantPolicy): readonly PolicyViolation[];
/**
 * Which consent scopes a policy permits collection under.
 *
 * The bridge between admin configuration and the ingestion pipeline's consent
 * gate. A policy that has not enabled external monitoring produces no
 * `external_monitoring` scope, so Layer 06 events are never stored — not
 * filtered on read, never written.
 */
export declare function permittedScopes(policy: TenantPolicy): readonly ('assessment' | 'external_monitoring' | 'recording')[];
export interface PolicyStore {
    load(tenantId: TenantId): Promise<TenantPolicy | null>;
    save(policy: TenantPolicy): Promise<void>;
}
/** In-memory policy store. Sufficient for tests and single-node deployments. */
export declare function inMemoryPolicyStore(): PolicyStore;
//# sourceMappingURL=policy.d.ts.map