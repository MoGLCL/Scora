import type { DeveloperId, EpochMs, SessionId, TenantId } from '@scora/trust-core';

/**
 * The API boundary contract.
 *
 * Transport-agnostic on purpose. Everything here describes *what* a request is
 * and *who* may make it, with no reference to Node's `http`, a framework, or a
 * serverless runtime. The engine is meant to be embedded in whatever the
 * consuming platform already runs, and an authorization rule that lived inside a
 * framework adapter would have to be re-implemented — and eventually
 * re-implemented wrongly — for every surface.
 */

/**
 * Who is making a request.
 *
 * `tenantId` is not optional and is never read from the request body. It is
 * resolved from the credential, so a caller cannot address another tenant's
 * evidence by editing a field: the single most damaging bug this system could
 * have is returning one person's session to another.
 */
export interface Principal {
  readonly kind: PrincipalKind;
  readonly tenantId: TenantId;
  /** Stable identifier for the credential holder, for the access log. */
  readonly subject: string;
  readonly roles: readonly Role[];
  /**
   * Set only for `DEVELOPER` principals, and then enforced: a developer token
   * may read that developer's own sessions and nothing else.
   */
  readonly developerId?: DeveloperId | undefined;
  /**
   * Set only for `SANDBOX` principals. A sandbox credential is issued per
   * session and may write into that session alone, so a leaked token cannot be
   * used to forge evidence into an unrelated assessment.
   */
  readonly sessionId?: SessionId | undefined;
}

export const PrincipalKind = {
  /** An instrumented sandbox submitting telemetry. Write-only, one session. */
  SANDBOX: 'SANDBOX',
  /** A human reviewer or admin using the console. */
  STAFF: 'STAFF',
  /** The assessed developer, reading their own outcome. */
  DEVELOPER: 'DEVELOPER',
  /** Another backend service in the tenant's own infrastructure. */
  SERVICE: 'SERVICE',
} as const;

export type PrincipalKind = (typeof PrincipalKind)[keyof typeof PrincipalKind];

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
} as const;

export type Role = (typeof Role)[keyof typeof Role];

/** Authenticates a raw credential. Returns null for anything it cannot verify. */
export interface Authenticator {
  authenticate(token: string | null): Promise<Principal | null>;
}

/**
 * Every request that reached an endpoint, decided or refused.
 *
 * Refusals are logged as deliberately as successes. "Who tried to read this
 * session and was told no" is exactly the question an audit exists to answer,
 * and a log that only records successes cannot answer it.
 */
export interface AccessRecord {
  readonly at: EpochMs;
  readonly tenantId: TenantId | null;
  readonly subject: string | null;
  readonly method: string;
  readonly route: string;
  readonly status: number;
  /** Present when the request was refused, absent when it succeeded. */
  readonly denialReason?: string | undefined;
  /** Resource touched, when the route names one. */
  readonly sessionId?: SessionId | undefined;
  readonly developerId?: DeveloperId | undefined;
}

export interface AccessLog {
  record(entry: AccessRecord): Promise<void>;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** A transport-neutral request. */
export interface ApiRequest {
  readonly method: string;
  /** Path only, without query string. */
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
  /** Bearer token or equivalent, already extracted from transport headers. */
  readonly token: string | null;
  /** Parsed JSON body, or null. Never trusted — every endpoint validates. */
  readonly body: unknown;
}

export interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
  readonly headers?: Readonly<Record<string, string>> | undefined;
}

/**
 * A problem detail, in the shape of RFC 9457.
 *
 * Deliberately uniform, and deliberately vague about *why* a read was refused.
 * Distinguishing "this session does not exist" from "it exists but is not yours"
 * would let a caller enumerate another tenant's sessions by probing.
 */
export interface ProblemDetail {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string | undefined;
  /** Field-level issues, for a rejected body. */
  readonly errors?: readonly { readonly path: string; readonly message: string }[] | undefined;
}

export type Handler = (request: ApiRequest, principal: Principal) => Promise<ApiResponse>;

/** One endpoint: its shape, who may reach it, and what it does. */
export interface RouteDefinition {
  readonly method: HttpMethod;
  /** Pattern with `:name` segments, e.g. `/v1/sessions/:sessionId/report`. */
  readonly pattern: string;
  /**
   * Roles that may reach the handler. A caller needs *one* of them.
   *
   * An empty list is not "public": it is rejected when the router is built.
   * Forgetting to declare authorization must fail loudly at startup rather than
   * quietly serving evidence to anyone who asks.
   */
  readonly roles: readonly Role[];
  readonly handler: Handler;
  /** Human-readable purpose, surfaced by the route listing. */
  readonly summary: string;
}
