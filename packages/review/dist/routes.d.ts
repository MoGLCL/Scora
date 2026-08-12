import { type Clock, type CryptoPort, type EventStore, type IdGenerator } from '@scora/trust-core';
import { type Recommendation } from '@scora/trust-scoring';
import { type RouteDefinition } from '@scora/trust-api';
import type { Ingestion } from '@scora/trust-storage';
import { ReviewDecision, ReviewState } from './contract.ts';
import type { ReviewIndex } from './queue.ts';
/**
 * The reviewer's endpoints.
 *
 * Mounted into the same authenticated, access-logged app as everything else via
 * `additionalRoutes`, so the three rules in `@scora/trust-api`'s routes file
 * apply here unchanged: tenant comes from the credential, a not-yours read is
 * indistinguishable from a not-found read, and reads are scoped by principal
 * kind and not only by role.
 *
 * Two things are specific to this layer.
 *
 * **The rationale text is hashed at the boundary and discarded.** It arrives in
 * the request, it is measured and hashed here, and what continues into the log
 * is a length and a digest. The prose belongs to the tenant's own storage under
 * their retention policy; SCORA keeps only enough to prove it existed and has
 * not changed.
 *
 * **An override is detected, never declared.** There is no "I am overriding the
 * engine" flag for a reviewer to tick. The engine compares its own position to
 * the decision and records the disagreement itself, because a reviewer who has
 * to opt in to being counted as a disagreement will under-report — and the
 * cases they quietly skip are exactly the ones Step 10 needs most.
 */
export interface ReviewRouteDependencies {
    readonly store: EventStore;
    readonly ingestion: Ingestion;
    readonly index: ReviewIndex;
    readonly clock: Clock;
    readonly crypto: CryptoPort;
    readonly ids: IdGenerator;
}
export declare function buildReviewRoutes(dependencies: ReviewRouteDependencies): readonly RouteDefinition[];
/**
 * The engine's position, expressed in the vocabulary a human decides in.
 *
 * Note what is missing: nothing maps to `REJECT`. That is not an oversight in
 * the mapping, it is the mapping's whole content — the engine has no `REJECT` to
 * project, because rejecting a person is not an output an algorithm is allowed
 * to have. Only a human's decision can land there.
 */
export declare function impliedDecision(recommendation: Recommendation | null): ReviewDecision | null;
export { ReviewState };
//# sourceMappingURL=routes.d.ts.map