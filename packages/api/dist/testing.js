import { DeveloperId, EVENT_SCHEMA_VERSION, EventId, SessionId, TaskId, TenantId, TrustEventType, unsafeEpochMs, } from '@scora/trust-core';
import { nodeCrypto, nodeIdGenerator } from '@scora/trust-core/node';
import { createIngestion, inMemoryEventStore } from '@scora/trust-storage';
import { createApi, inMemoryAccessLog } from "./app.js";
import { PrincipalKind, Role, } from "./contract.js";
import { inMemoryPolicyStore } from "./policy.js";
/**
 * Test harness.
 *
 * Exported rather than kept in a test file so that the packages built on top of
 * this one — review, interview, calibration — mount their own routes into the
 * same authenticated, access-logged app instead of standing up a parallel one
 * whose authorization rules could drift from these.
 */
export const T0 = 1_700_000_000_000;
export const TENANT = TenantId.unsafe('tnt_acme');
export const OTHER_TENANT = TenantId.unsafe('tnt_other');
export const SESSION = SessionId.unsafe('sess_alpha');
export const DEV = DeveloperId.unsafe('dev_dana');
export const OTHER_DEV = DeveloperId.unsafe('dev_ravi');
export const TASK = TaskId.unsafe('task_fizzbuzz');
/** A clock that advances a fixed step per call, so ordering is deterministic. */
export function steppingClock(start = T0, stepMs = 1_000) {
    let current = start;
    return {
        now() {
            const value = unsafeEpochMs(current);
            current += stepMs;
            return value;
        },
    };
}
export function silentLogger() {
    return { debug() { }, info() { }, warn() { }, error() { } };
}
/** Token → principal, by exact string. Sufficient for testing authorization. */
export function fakeAuthenticator(tokens) {
    return {
        async authenticate(token) {
            if (token === null)
                return null;
            return tokens[token] ?? null;
        },
    };
}
export function sandboxPrincipal(tenantId = TENANT, sessionId = SESSION) {
    return {
        kind: PrincipalKind.SANDBOX,
        tenantId,
        subject: `sandbox:${sessionId}`,
        roles: [Role.INGEST],
        sessionId,
    };
}
export function reviewerPrincipal(tenantId = TENANT) {
    return {
        kind: PrincipalKind.STAFF,
        tenantId,
        subject: 'staff:reviewer',
        roles: [Role.READ_REPORT, Role.READ_EVIDENCE, Role.REVIEW],
    };
}
export function adminPrincipal(tenantId = TENANT) {
    return {
        kind: PrincipalKind.STAFF,
        tenantId,
        subject: 'staff:admin',
        roles: [Role.ADMINISTER],
    };
}
export function developerPrincipal(tenantId = TENANT, developerId = DEV) {
    return {
        kind: PrincipalKind.DEVELOPER,
        tenantId,
        subject: `dev:${developerId}`,
        roles: [Role.READ_OWN_OUTCOME],
        developerId,
    };
}
/** A fully wired in-memory API. Same composition as production, no I/O. */
export function harness(tokens, additionalRoutes = []) {
    const clock = steppingClock();
    const crypto = nodeCrypto;
    const ids = nodeIdGenerator;
    const logger = silentLogger();
    const store = inMemoryEventStore();
    const policies = inMemoryPolicyStore();
    const accessLog = inMemoryAccessLog();
    const ingestion = createIngestion({ store, clock, crypto, ids, logger });
    const api = createApi({
        store,
        ingestion,
        policies,
        clock,
        crypto,
        authenticator: fakeAuthenticator(tokens),
        accessLog,
        additionalRoutes: typeof additionalRoutes === 'function'
            ? additionalRoutes({ store, ingestion, policies, clock, crypto, ids })
            : additionalRoutes,
    });
    return {
        api,
        ingestion,
        policies,
        clock,
        crypto,
        ids,
        accessLog,
        store,
        async request(partial) {
            return await api.handle({
                method: 'GET',
                query: {},
                token: null,
                body: null,
                ...partial,
            });
        },
    };
}
/**
 * A minimal well-formed submission.
 *
 * A heartbeat, because it needs no consent scope beyond `assessment` and
 * carries no content — a test about authorization should not also be a test
 * about payload validation.
 */
export function heartbeat(sequence, overrides = {}) {
    return {
        eventId: EventId.unsafe(`evt_${String(sequence).padStart(6, '0')}`),
        tenantId: TENANT,
        sessionId: SESSION,
        developerId: DEV,
        taskId: TASK,
        type: TrustEventType.SESSION_HEARTBEAT,
        occurredAt: T0 + sequence * 1_000,
        sequence,
        source: 'SANDBOX',
        schemaVersion: EVENT_SCHEMA_VERSION,
        payload: { intervalMs: 5_000, bufferedEventCount: 0 },
        ...overrides,
    };
}
//# sourceMappingURL=testing.js.map