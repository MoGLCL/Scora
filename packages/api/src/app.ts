import type { Clock, DeveloperId, SessionId } from '@scora/trust-core';
import {
  type AccessLog,
  type AccessRecord,
  type ApiRequest,
  type ApiResponse,
  type Authenticator,
  type Principal,
  type RouteDefinition,
} from './contract.ts';
import { buildRoutes, type RouteDependencies } from './routes.ts';
import { buildRouter, type Router } from './router.ts';

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

export function createApi(dependencies: ApiDependencies): TrustApi {
  const { authenticator, accessLog, clock } = dependencies;

  const routes = [...buildRoutes(dependencies), ...(dependencies.additionalRoutes ?? [])];
  const router = buildRouter(routes);

  return {
    router,
    routes,

    async handle(request) {
      const principal = await authenticator.authenticate(request.token);

      if (principal === null) {
        const response = unauthorized();
        await log(null, request, response, 'unauthenticated');
        return response;
      }

      try {
        const response = await router.dispatch(request, principal);
        await log(
          principal,
          request,
          response,
          response.status >= 400 ? denialReasonOf(response) : undefined,
        );
        return response;
      } catch (error) {
        // A handler that throws must still be logged and must not leak its
        // message: an internal error string can carry a query, a path, or a
        // fragment of someone's evidence.
        const response: ApiResponse = {
          status: 500,
          body: {
            type: 'about:blank',
            title: 'Internal Server Error',
            status: 500,
            detail: 'the request could not be completed',
          },
        };
        await log(principal, request, response, 'handler threw');
        void error;
        return response;
      }
    },
  };

  async function log(
    principal: Principal | null,
    request: ApiRequest,
    response: ApiResponse,
    denialReason: string | undefined,
  ): Promise<void> {
    const entry: AccessRecord = {
      at: clock.now(),
      tenantId: principal?.tenantId ?? null,
      subject: principal?.subject ?? null,
      method: request.method,
      // The pattern, not the concrete path: a log full of literal session ids
      // becomes a second copy of who was assessed when, in a store with
      // different retention rules from the evidence itself.
      route: routeFor(request, routes),
      status: response.status,
      ...(denialReason === undefined ? {} : { denialReason }),
      ...extractResourceIds(request, routes),
    };
    await accessLog.record(entry);
  }
}

function unauthorized(): ApiResponse {
  return {
    status: 401,
    body: {
      type: 'about:blank',
      title: 'Unauthorized',
      status: 401,
      detail: 'a valid credential is required',
    },
    headers: { 'www-authenticate': 'Bearer' },
  };
}

function denialReasonOf(response: ApiResponse): string {
  const body = response.body;
  if (typeof body === 'object' && body !== null && 'detail' in body) {
    const detail = (body as { detail?: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return `status ${response.status}`;
}

/** The matching route pattern, or the literal path when nothing matched. */
function routeFor(request: ApiRequest, routes: readonly RouteDefinition[]): string {
  for (const route of routes) {
    if (matches(route.pattern, request.path)) return route.pattern;
  }
  return request.path;
}

/**
 * Resource ids from the path, for the access log.
 *
 * Recorded because "who read this developer's evidence" is the question the log
 * exists to answer, and a log of route patterns alone cannot answer it. The
 * pattern is stored instead of the raw path so that the ids appear in named
 * fields subject to the audit retention policy, rather than embedded in a
 * free-text URL.
 */
function extractResourceIds(
  request: ApiRequest,
  routes: readonly RouteDefinition[],
): { sessionId?: SessionId; developerId?: DeveloperId } {
  for (const route of routes) {
    const params = capture(route.pattern, request.path);
    if (params === null) continue;
    const result: Record<string, string> = {};
    if (params['sessionId'] !== undefined) result['sessionId'] = params['sessionId'];
    if (params['developerId'] !== undefined) result['developerId'] = params['developerId'];
    return result as { sessionId?: SessionId; developerId?: DeveloperId };
  }
  return {};
}

function matches(pattern: string, path: string): boolean {
  return capture(pattern, path) !== null;
}

function capture(pattern: string, path: string): Record<string, string> | null {
  const expected = pattern.split('/').filter(Boolean);
  const actual = path.split('/').filter(Boolean);
  if (expected.length !== actual.length) return null;

  const params: Record<string, string> = {};
  for (let index = 0; index < expected.length; index += 1) {
    const segment = expected[index]!;
    const part = actual[index]!;
    if (segment.startsWith(':')) params[segment.slice(1)] = part;
    else if (segment !== part) return null;
  }
  return params;
}

/** In-memory access log. Real deployments write to append-only external storage. */
export function inMemoryAccessLog(): AccessLog & { entries(): readonly AccessRecord[] } {
  const entries: AccessRecord[] = [];
  return {
    async record(entry) {
      entries.push(entry);
    },
    entries() {
      return entries;
    },
  };
}
