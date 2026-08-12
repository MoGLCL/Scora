/**
 * @scora/trust-api — the security boundary.
 *
 * Everything the outside world can reach passes through here. The package is
 * transport-agnostic on purpose: `ApiRequest` / `ApiResponse` are plain data, so
 * the same routes, the same RBAC and the same access log run under Node's
 * `http`, under a serverless handler, or in a test with no socket at all.
 *
 * Four properties are structural rather than per-endpoint discipline:
 *
 *   - the tenant comes from the credential and never from the request,
 *   - "not yours" and "does not exist" both answer 404, so ids cannot be probed,
 *   - every outcome including a refusal is written to the access log,
 *   - the AI provider is tenant policy data with enforced invariants, not a
 *     constant in the source.
 *
 * The Node adapter lives at `@scora/trust-api/node`, the typed client at
 * `@scora/trust-api/client`.
 */
export { PrincipalKind, Role, } from "./contract.js";
export { buildRouter, resolveRoles, } from "./router.js";
export { AssistanceProviderKind, MAXIMUM_COMPLETION_CHARS, MAXIMUM_REVIEW_THRESHOLD, MINIMUM_AUDIT_RETENTION_DAYS, MINIMUM_CONFIDENCE_FLOOR, assertPolicyInvariants, defaultPolicy, inMemoryPolicyStore, permittedScopes, } from "./policy.js";
export { buildRoutes } from "./routes.js";
export { createApi, inMemoryAccessLog, } from "./app.js";
//# sourceMappingURL=index.js.map