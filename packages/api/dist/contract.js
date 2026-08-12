export const PrincipalKind = {
    /** An instrumented sandbox submitting telemetry. Write-only, one session. */
    SANDBOX: 'SANDBOX',
    /** A human reviewer or admin using the console. */
    STAFF: 'STAFF',
    /** The assessed developer, reading their own outcome. */
    DEVELOPER: 'DEVELOPER',
    /** Another backend service in the tenant's own infrastructure. */
    SERVICE: 'SERVICE',
};
/**
 * Capabilities, not job titles.
 *
 * Named for what they permit rather than who typically holds them, because the
 * question at an endpoint is always "may this caller do this", never "is this
 * caller a manager".
 */
export const Role = {
    /** Submit telemetry into a session. */
    INGEST: 'INGEST',
    /** Read a full reviewer report, including cluster findings. */
    READ_REPORT: 'READ_REPORT',
    /** Read the raw event log for a session. The most sensitive read there is. */
    READ_EVIDENCE: 'READ_EVIDENCE',
    /** Read the one-sentence summary a developer is entitled to. */
    READ_OWN_OUTCOME: 'READ_OWN_OUTCOME',
    /** Record a human review decision, overriding the engine. */
    REVIEW: 'REVIEW',
    /** Change tenant policy: thresholds, AI provider configuration, retention. */
    ADMINISTER: 'ADMINISTER',
    /** Execute a data-subject erasure. Separated from ADMINISTER deliberately. */
    ERASE: 'ERASE',
};
//# sourceMappingURL=contract.js.map