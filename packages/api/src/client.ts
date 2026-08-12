import type { DeveloperId, SessionId, TrustEvent } from '@scora/trust-core';
import type { ProblemDetail } from './contract.ts';

/**
 * Typed client for the Trust API.
 *
 * Thin on purpose. It adds the bearer header, parses problem details, and does
 * nothing else — no retry policy, no caching, no client-side filtering of what
 * came back. A client that quietly retried an ingest would double-count events;
 * a client that cached a report would show a reviewer a stale score after a
 * human review had already overridden it.
 *
 * Runs anywhere `fetch` exists: Node 22+, browsers, and the sandbox itself.
 */

export interface TrustClientOptions {
  readonly baseUrl: string;
  /** Bearer token. Sandbox tokens are per-session; staff tokens are per-person. */
  readonly token: string;
  /** Injected for tests and for runtimes with a non-global fetch. */
  readonly fetch?: typeof globalThis.fetch | undefined;
}

/**
 * A failed call.
 *
 * Carries the problem detail rather than a bare message so a caller can branch
 * on `status` — and, for a rejected policy write, read the per-field
 * `errors` back out.
 */
export class TrustApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title);
    this.name = 'TrustApiError';
    this.status = problem.status;
    this.problem = problem;
  }
}

export interface IngestResponse {
  readonly accepted: number;
  readonly duplicates: number;
  readonly rejected: readonly { readonly eventId: string; readonly code: string }[];
  readonly withheld: readonly { readonly type: string; readonly scope: string }[];
  readonly gaps: readonly number[];
  readonly chainPosition: number | null;
}

export interface IntegrityResponse {
  readonly sessionId: string;
  readonly intact: boolean;
  readonly eventsChecked: number;
  readonly headHash: string | null;
  readonly violations: readonly { readonly code: string; readonly detail: string }[];
  /** Lost telemetry. Lowers Confidence; categorically not tampering. */
  readonly missingSequences: readonly number[];
}

export interface DeveloperOutcome {
  readonly sessionId: string;
  readonly summary: string;
  readonly recommendation: string;
  readonly confidence: number;
}

export function createTrustClient(options: TrustClientOptions) {
  const doFetch = options.fetch ?? globalThis.fetch;
  const base = options.baseUrl.replace(/\/+$/, '');

  return {
    /**
     * Submits a batch of events for one session.
     *
     * The response is the whole outcome, not just a status: a batch can be
     * partly rejected or partly withheld for consent, and a caller that
     * discards this cannot tell that half its evidence never landed.
     */
    async ingest(
      sessionId: SessionId,
      events: readonly unknown[],
      clockOffsetMs?: number,
    ): Promise<IngestResponse> {
      return await call<IngestResponse>('POST', `/v1/sessions/${sessionId}/events`, {
        events,
        ...(clockOffsetMs === undefined ? {} : { clockOffsetMs }),
      });
    },

    async report(sessionId: SessionId): Promise<unknown> {
      return await call('GET', `/v1/sessions/${sessionId}/report`);
    },

    /** The rendered report, for a human reviewer. */
    async reportText(sessionId: SessionId): Promise<string> {
      return await callText('GET', `/v1/sessions/${sessionId}/report.txt`);
    },

    async events(
      sessionId: SessionId,
      page: { readonly limit?: number; readonly cursor?: string } = {},
    ): Promise<{ readonly events: readonly TrustEvent[]; readonly nextCursor: string | null }> {
      const query = new URLSearchParams();
      if (page.limit !== undefined) query.set('limit', String(page.limit));
      if (page.cursor !== undefined) query.set('cursor', page.cursor);
      const suffix = query.size === 0 ? '' : `?${query.toString()}`;
      return await call('GET', `/v1/sessions/${sessionId}/events${suffix}`);
    },

    async integrity(sessionId: SessionId): Promise<IntegrityResponse> {
      return await call<IntegrityResponse>('GET', `/v1/sessions/${sessionId}/integrity`);
    },

    async sessions(developerId: DeveloperId, limit?: number): Promise<unknown> {
      const suffix = limit === undefined ? '' : `?limit=${String(limit)}`;
      return await call('GET', `/v1/developers/${developerId}/sessions${suffix}`);
    },

    /** The summary a developer is entitled to see about their own session. */
    async ownOutcome(sessionId: SessionId): Promise<DeveloperOutcome> {
      return await call<DeveloperOutcome>('GET', `/v1/me/outcome/${sessionId}`);
    },

    async policy(): Promise<unknown> {
      return await call('GET', '/v1/policy');
    },

    /**
     * Replaces tenant policy.
     *
     * Throws `TrustApiError` with status 422 and per-field `errors` when the
     * proposed policy would weaken a guarantee — that is a rejection to show
     * the administrator, not an error to swallow.
     */
    async savePolicy(policy: unknown): Promise<unknown> {
      return await call('PUT', '/v1/policy', policy);
    },

    async permittedScopes(): Promise<{ readonly scopes: readonly string[] }> {
      return await call('GET', '/v1/policy/scopes');
    },
  };

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    return JSON.parse(await callText(method, path, body)) as T;
  }

  async function callText(method: string, path: string, body?: unknown): Promise<string> {
    const response = await doFetch(`${base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${options.token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    const text = await response.text();
    if (response.ok) return text;

    throw new TrustApiError(toProblem(text, response.status));
  }
}

export type TrustClient = ReturnType<typeof createTrustClient>;

/** A non-JSON error body still becomes a problem detail, never an unhandled parse throw. */
function toProblem(text: string, status: number): ProblemDetail {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'object' && parsed !== null && 'status' in parsed) {
      return parsed as ProblemDetail;
    }
  } catch {
    // fall through
  }
  return { type: 'about:blank', title: 'Request failed', status, detail: text.slice(0, 200) };
}
