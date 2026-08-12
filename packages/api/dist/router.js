import { PrincipalKind, Role, } from "./contract.js";
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
export function buildRouter(routes, capabilities) {
    const forbiddenPatterns = new Set(capabilities?.forbidden ?? []);
    const compiled = routes.map((route) => {
        const segments = route.pattern.split('/').filter(Boolean);
        if (route.roles.length === 0) {
            throw new Error(`route ${route.method} ${route.pattern} declares no roles`);
        }
        if (route.roles.includes(Role.INGEST) &&
            route.roles.some((role) => SANDBOX_DENIED_ROLES.has(role))) {
            throw new Error(`route ${route.method} ${route.pattern} declares INGEST but pairs it with a role no sandbox may hold`);
        }
        if (forbiddenPatterns.has(route.pattern)) {
            throw new Error(`route ${route.method} ${route.pattern} is declared but forbidden by capabilities`);
        }
        return { definition: route, segments };
    });
    return {
        list: routes,
        async dispatch(request, principal) {
            // Two passes' worth of state in one loop. A pattern can be declared by
            // several routes with different methods (`GET /v1/policy` and
            // `PUT /v1/policy`), so a method mismatch must keep looking rather than
            // answer immediately — otherwise whichever route was declared first
            // shadows the rest of its pattern.
            let patternMatched = false;
            for (const route of compiled) {
                const params = matchSegments(route.segments, request.path);
                if (params === null)
                    continue;
                patternMatched = true;
                if (request.method !== route.definition.method)
                    continue;
                if (!resolveRoles(principal, route.definition.roles).includes('__ALLOW__')) {
                    return forbidden('caller lacks a required role');
                }
                const matched = { ...request, params };
                return await route.definition.handler(matched, principal);
            }
            // 404 rather than 405 even when the path exists under another method.
            // A 405 on `/v1/sessions/:id` would confirm the session id is real to a
            // caller who is not allowed to know that.
            return notFound(patternMatched ? 'method not allowed on this path' : 'no route matches this path');
        },
    };
}
function matchSegments(pattern, path) {
    const parts = path.split('/').filter(Boolean);
    if (parts.length !== pattern.length)
        return null;
    const params = {};
    for (let index = 0; index < pattern.length; index += 1) {
        const segment = pattern[index];
        const part = parts[index];
        if (segment.startsWith(':')) {
            params[segment.slice(1)] = part;
        }
        else if (segment !== part) {
            return null;
        }
    }
    return params;
}
function notFound(detail) {
    return { status: 404, body: { type: 'about:blank', title: 'Not Found', status: 404, detail } };
}
function forbidden(detail) {
    return { status: 403, body: { type: 'about:blank', title: 'Forbidden', status: 403, detail } };
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
export function resolveRoles(principal, required) {
    if (principal.kind === PrincipalKind.SANDBOX) {
        if (required.some((role) => SANDBOX_DENIED_ROLES.has(role)))
            return [];
        if (required.some((role) => principal.roles.includes(role)))
            return ['__ALLOW__'];
        return [];
    }
    if (principal.kind === PrincipalKind.DEVELOPER) {
        if (required.some((role) => STAFF_ONLY_ROLES.has(role)))
            return [];
        if (required.some((role) => principal.roles.includes(role)))
            return ['__ALLOW__'];
        return [];
    }
    // STAFF and SERVICE.
    if (required.some((role) => principal.roles.includes(role)))
        return ['__ALLOW__'];
    return [];
}
/** Roles a sandbox credential may never hold. */
const SANDBOX_DENIED_ROLES = new Set([
    Role.READ_REPORT,
    Role.READ_EVIDENCE,
    Role.READ_OWN_OUTCOME,
    Role.REVIEW,
    Role.ADMINISTER,
    Role.ERASE,
]);
/** Roles that only staff (or a service) may ever exercise. */
const STAFF_ONLY_ROLES = new Set([
    Role.REVIEW,
    Role.ADMINISTER,
    Role.ERASE,
    Role.READ_REPORT,
    Role.READ_EVIDENCE,
]);
//# sourceMappingURL=router.js.map