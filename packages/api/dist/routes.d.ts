import { type CryptoPort, type EventStore, type Clock } from '@scora/trust-core';
import type { Ingestion } from '@scora/trust-storage';
import { type Principal, type RouteDefinition } from './contract.ts';
import { type PolicyStore } from './policy.ts';
/**
 * The endpoint surface.
 *
 * Three rules run through every handler here, and each has a test:
 *
 *   1. **Tenant comes from the credential, never the request.** A caller may
 *      name a session, but the tenant it is looked up under is the one their
 *      token resolved to. Reading a tenant id from a path or body is how one
 *      person's evidence ends up in another person's report.
 *
 *   2. **A not-yours read is indistinguishable from a not-found read.** Both
 *      return 404. Returning 403 for "exists but not yours" would let a caller
 *      enumerate another tenant's sessions by watching which probes change
 *      status code.
 *
 *   3. **Reads are scoped by principal kind, not only by role.** A DEVELOPER
 *      token holding READ_OWN_OUTCOME can read its own outcome and nothing
 *      else, and a SANDBOX token can write into its own session and nothing
 *      else — even if a misconfiguration granted it more roles.
 */
export interface RouteDependencies {
    readonly store: EventStore;
    readonly ingestion: Ingestion;
    readonly policies: PolicyStore;
    readonly clock: Clock;
    readonly crypto: CryptoPort;
}
export declare function buildRoutes(dependencies: RouteDependencies): readonly RouteDefinition[];
export type { Principal };
//# sourceMappingURL=routes.d.ts.map