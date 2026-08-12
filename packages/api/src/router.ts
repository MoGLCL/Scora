import {
  PrincipalKind,
  Role,
  type ApiRequest,
  type ApiResponse,
  type Principal,
  type RouteDefinition,
} from './contract.ts';

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
export function buildRouter(
  routes: readonly RouteDefinition[],
  capabilities?: RouteCapabilities,
): Router {
  const forbiddenPatterns = new Set(capabilities?.forbidden ?? []);

  const compiled: CompiledRoute[] = routes.map((route) => {
    const segments = route.pattern.split('/').filter(Boolean);
    if (route.roles.length === 0) {
      throw new Error(`route ${route.method} ${route.pattern} declares no roles`);
    }

    if (
      route.roles.includes(Role.INGEST) &&
      route.roles.some((role) => SANDBOX_DENIED_ROLES.has(role))
    ) {
      throw new Error(
        `route ${route.method} ${route.pattern} declares INGEST but pairs it with a role no sandbox may hold`,
      );
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
        if (params === null) continue;

        patternMatched = true;
        if (request.method !== route.definition.method) continue;

        if (!resolveRoles(principal, route.definition.roles).includes('__ALLOW__')) {
          return forbidden('caller lacks a required role');
        }

        const matched: MatchedRequest = { ...request, params };
        return await route.definition.handler(matched, principal);
      }

      // 404 rather than 405 even when the path exists under another method.
      // A 405 on `/v1/sessions/:id` would confirm the session id is real to a
      // caller who is not allowed to know that.
      return notFound(
        patternMatched ? 'method not allowed on this path' : 'no route matches this path',
      );
    },
  };
}

export interface Router {
  readonly list: readonly RouteDefinition[];
  dispatch(request: ApiRequest, principal: Principal): Promise<ApiResponse>;
}

export interface MatchedRequest extends ApiRequest {
  /** Captured path parameters, e.g. `{ sessionId }` from `/sessions/:sessionId`. */
  readonly params: Readonly<Record<string, string>>;
}

interface CompiledRoute {
  readonly definition: RouteDefinition;
  readonly segments: readonly string[];
}

function matchSegments(pattern: readonly string[], path: string): Readonly<Record<string, string>> | null {
  const parts = path.split('/').filter(Boolean);
  if (parts.length !== pattern.length) return null;
  const params: Record<string, string> = {};
  for (let index = 0; index < pattern.length; index += 1) {
    const segment = pattern[index]!;
    const part = parts[index]!;
    if (segment.startsWith(':')) {
      params[segment.slice(1)] = part;
    } else if (segment !== part) {
      return null;
    }
  }
  return params;
}

function notFound(detail: string): ApiResponse {
  return { status: 404, body: { type: 'about:blank', title: 'Not Found', status: 404, detail } };
}

function forbidden(detail: string): ApiResponse {
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
export function resolveRoles(principal: Principal, required: readonly string[]): readonly string[] {
  if (principal.kind === PrincipalKind.SANDBOX) {
    if (required.some((role) => SANDBOX_DENIED_ROLES.has(role))) return [];
    if (required.some((role) => principal.roles.includes(role as Role))) return ['__ALLOW__'];
    return [];
  }
  if (principal.kind === PrincipalKind.DEVELOPER) {
    if (required.some((role) => STAFF_ONLY_ROLES.has(role))) return [];
    if (required.some((role) => principal.roles.includes(role as Role))) return ['__ALLOW__'];
    return [];
  }
  // STAFF and SERVICE.
  if (required.some((role) => principal.roles.includes(role as Role))) return ['__ALLOW__'];
  return [];
}

/** Roles a sandbox credential may never hold. */
const SANDBOX_DENIED_ROLES: ReadonlySet<string> = new Set([
  Role.READ_REPORT,
  Role.READ_EVIDENCE,
  Role.READ_OWN_OUTCOME,
  Role.REVIEW,
  Role.ADMINISTER,
  Role.ERASE,
]);

/** Roles that only staff (or a service) may ever exercise. */
const STAFF_ONLY_ROLES: ReadonlySet<string> = new Set([
  Role.REVIEW,
  Role.ADMINISTER,
  Role.ERASE,
  Role.READ_REPORT,
  Role.READ_EVIDENCE,
]);
