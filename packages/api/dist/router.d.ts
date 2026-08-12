import { type ApiRequest, type ApiResponse, type Principal, type RouteDefinition } from './contract.ts';
/** Build-time route restrictions. See `resolveRoles` for the runtime semantics. */
export interface RouteCapabilities {
    /** Patterns that must not be served by this deployment. Violations throw at build time. */
    readonly forbidden: readonly string[];
}
/**
 * Builds a request dispatcher from route definitions.
 *
 * Two invariants are enforced here, at construction, so a broken configuration
 * fails loudly at startup rather than at 3am with someone's evidence on the
 * line:
 *
 *   1. Every route must declare at least one role. An empty list would be
 *      "anyone may call this" — for an evidence platform that is a review
 *      decision, not a default.
 *   2. A route declaring `INGEST` must not also declare a role no sandbox may
 *      hold. `resolveRoles` denies a sandbox any route touching a read or
 *      review role, so such a pairing would silently lock the sandbox out of
 *      the one endpoint it exists to call — an authorization bug that surfaces
 *      only as "no sessions ever arrive".
 *
 * Role membership is the outer gate and is checked here. The scoping that
 * matters is per-principal and enforced in the handlers: a sandbox token writes
 * only into its own session, a developer token reads only its own outcome.
 */
export declare function buildRouter(routes: readonly RouteDefinition[], capabilities?: RouteCapabilities): Router;
export interface Router {
    readonly list: readonly RouteDefinition[];
    dispatch(request: ApiRequest, principal: Principal): Promise<ApiResponse>;
}
export interface MatchedRequest extends ApiRequest {
    /** Captured path parameters, e.g. `{ sessionId }` from `/sessions/:sessionId`. */
    readonly params: Readonly<Record<string, string>>;
}
/**
 * Whether a principal may call a route declared with `required`.
 *
 *   - Sandbox principals are admitted only where the route explicitly grants
 *     the sandbox (the INGEST routes and their aliases).
 *   - A staff/developer principal is admitted if *any* required role is one of
 *     its roles.
 *   - A route that requires a *staff-only* role (e.g. REVIEW) is never reachable
 *     by a developer principal, even one holding REVIEW, because a developer
 *     credential must not be able to record a review of its own work.
 *   - A sandbox can never reach READ_REPORT, READ_OWN_OUTCOME, or REVIEW,
 *     regardless of roles.
 *
 * The sentinel makes the "denied" path explicit: the caller either passes or it
 * does not, and there is no third state in which the route silently runs.
 */
export declare function resolveRoles(principal: Principal, required: readonly string[]): readonly string[];
//# sourceMappingURL=router.d.ts.map