import {
  DeveloperId,
  EVENT_SCHEMA_VERSION,
  EventId,
  SessionId,
  TaskId,
  TenantId,
  TrustEventType,
  unsafeEpochMs,
  type Clock,
  type CryptoPort,
  type EpochMs,
  type IdGenerator,
  type Logger,
} from '@scora/trust-core';
import { nodeCrypto, nodeIdGenerator } from '@scora/trust-core/node';
import { createIngestion, inMemoryEventStore, type Ingestion } from '@scora/trust-storage';
import { createApi, inMemoryAccessLog, type TrustApi } from './app.ts';
import {
  PrincipalKind,
  Role,
  type ApiRequest,
  type ApiResponse,
  type Authenticator,
  type Principal,
  type RouteDefinition,
} from './contract.ts';
import { inMemoryPolicyStore, type PolicyStore } from './policy.ts';

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
export function steppingClock(start = T0, stepMs = 1_000): Clock {
  let current = start;
  return {
    now(): EpochMs {
      const value = unsafeEpochMs(current);
      current += stepMs;
      return value;
    },
  };
}

export function silentLogger(): Logger {
  return { debug() {}, info() {}, warn() {}, error() {} };
}

/** Token → principal, by exact string. Sufficient for testing authorization. */
export function fakeAuthenticator(tokens: Readonly<Record<string, Principal>>): Authenticator {
  return {
    async authenticate(token) {
      if (token === null) return null;
      return tokens[token] ?? null;
    },
  };
}

export function sandboxPrincipal(
  tenantId: TenantId = TENANT,
  sessionId: SessionId = SESSION,
): Principal {
  return {
    kind: PrincipalKind.SANDBOX,
    tenantId,
    subject: `sandbox:${sessionId}`,
    roles: [Role.INGEST],
    sessionId,
  };
}

export function reviewerPrincipal(tenantId: TenantId = TENANT): Principal {
  return {
    kind: PrincipalKind.STAFF,
    tenantId,
    subject: 'staff:reviewer',
    roles: [Role.READ_REPORT, Role.READ_EVIDENCE, Role.REVIEW],
  };
}

export function adminPrincipal(tenantId: TenantId = TENANT): Principal {
  return {
    kind: PrincipalKind.STAFF,
    tenantId,
    subject: 'staff:admin',
    roles: [Role.ADMINISTER],
  };
}

export function developerPrincipal(
  tenantId: TenantId = TENANT,
  developerId: DeveloperId = DEV,
): Principal {
  return {
    kind: PrincipalKind.DEVELOPER,
    tenantId,
    subject: `dev:${developerId}`,
    roles: [Role.READ_OWN_OUTCOME],
    developerId,
  };
}

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
  request(request: Partial<ApiRequest> & { readonly path: string }): Promise<ApiResponse>;
}

/** A fully wired in-memory API. Same composition as production, no I/O. */
export function harness(
  tokens: Readonly<Record<string, Principal>>,
  additionalRoutes:
    | readonly RouteDefinition[]
    | ((parts: HarnessParts) => readonly RouteDefinition[]) = [],
): Harness {
  const clock = steppingClock();
  const crypto: CryptoPort = nodeCrypto;
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
    additionalRoutes:
      typeof additionalRoutes === 'function'
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
export function heartbeat(sequence: number, overrides: Record<string, unknown> = {}): unknown {
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
