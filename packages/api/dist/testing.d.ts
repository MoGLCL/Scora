import { DeveloperId, SessionId, TaskId, TenantId, type Clock, type CryptoPort, type IdGenerator, type Logger } from '@scora/trust-core';
import { inMemoryEventStore, type Ingestion } from '@scora/trust-storage';
import { inMemoryAccessLog, type TrustApi } from './app.ts';
import { type ApiRequest, type ApiResponse, type Authenticator, type Principal, type RouteDefinition } from './contract.ts';
import { type PolicyStore } from './policy.ts';
/**
 * Test harness.
 *
 * Exported rather than kept in a test file so that the packages built on top of
 * this one — review, interview, calibration — mount their own routes into the
 * same authenticated, access-logged app instead of standing up a parallel one
 * whose authorization rules could drift from these.
 */
export declare const T0 = 1700000000000;
export declare const TENANT: TenantId;
export declare const OTHER_TENANT: TenantId;
export declare const SESSION: SessionId;
export declare const DEV: DeveloperId;
export declare const OTHER_DEV: DeveloperId;
export declare const TASK: TaskId;
/** A clock that advances a fixed step per call, so ordering is deterministic. */
export declare function steppingClock(start?: number, stepMs?: number): Clock;
export declare function silentLogger(): Logger;
/** Token → principal, by exact string. Sufficient for testing authorization. */
export declare function fakeAuthenticator(tokens: Readonly<Record<string, Principal>>): Authenticator;
export declare function sandboxPrincipal(tenantId?: TenantId, sessionId?: SessionId): Principal;
export declare function reviewerPrincipal(tenantId?: TenantId): Principal;
export declare function adminPrincipal(tenantId?: TenantId): Principal;
export declare function developerPrincipal(tenantId?: TenantId, developerId?: DeveloperId): Principal;
/**
 * The wired-up pieces, handed to a route factory before the app exists.
 *
 * A downstream package's routes need these to be built, and the app needs those
 * routes to be built — so the factory form below breaks the cycle rather than
 * making every consumer mutate the app after construction.
 */
export interface HarnessParts {
    readonly store: ReturnType<typeof inMemoryEventStore>;
    readonly ingestion: Ingestion;
    readonly policies: PolicyStore;
    readonly clock: Clock;
    readonly crypto: CryptoPort;
    readonly ids: IdGenerator;
}
export interface Harness extends HarnessParts {
    readonly api: TrustApi;
    readonly accessLog: ReturnType<typeof inMemoryAccessLog>;
    request(request: Partial<ApiRequest> & {
        readonly path: string;
    }): Promise<ApiResponse>;
}
/** A fully wired in-memory API. Same composition as production, no I/O. */
export declare function harness(tokens: Readonly<Record<string, Principal>>, additionalRoutes?: readonly RouteDefinition[] | ((parts: HarnessParts) => readonly RouteDefinition[])): Harness;
/**
 * A minimal well-formed submission.
 *
 * A heartbeat, because it needs no consent scope beyond `assessment` and
 * carries no content — a test about authorization should not also be a test
 * about payload validation.
 */
export declare function heartbeat(sequence: number, overrides?: Record<string, unknown>): unknown;
//# sourceMappingURL=testing.d.ts.map