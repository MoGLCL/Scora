import type { Clock } from '@scora/trust-core';
import { type AccessLog, type AccessRecord, type ApiRequest, type ApiResponse, type Authenticator, type RouteDefinition } from './contract.ts';
import { type RouteDependencies } from './routes.ts';
import { type Router } from './router.ts';
/**
 * The composed API.
 *
 * Authentication, access logging and dispatch are assembled here so that no
 * individual handler can forget any of them. A handler is only ever reached
 * through `handle`, which means:
 *
 *   - the principal is always resolved before the handler runs,
 *   - the tenant on that principal is the only tenant the handler can see,
 *   - and every outcome — including a refusal, including a crash — is written
 *     to the access log before the response leaves.
 *
 * Logging *after* the fact rather than inside handlers is deliberate. An audit
 * that depends on each handler remembering to call it will eventually have a
 * handler that does not.
 */
export interface ApiDependencies extends RouteDependencies {
    readonly authenticator: Authenticator;
    readonly accessLog: AccessLog;
    readonly clock: Clock;
    /** Extra routes, e.g. review endpoints from another package. */
    readonly additionalRoutes?: readonly RouteDefinition[] | undefined;
}
export interface TrustApi {
    readonly router: Router;
    readonly routes: readonly RouteDefinition[];
    handle(request: ApiRequest): Promise<ApiResponse>;
}
export declare function createApi(dependencies: ApiDependencies): TrustApi;
/** In-memory access log. Real deployments write to append-only external storage. */
export declare function inMemoryAccessLog(): AccessLog & {
    entries(): readonly AccessRecord[];
};
//# sourceMappingURL=app.d.ts.map