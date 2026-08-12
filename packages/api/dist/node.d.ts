import type { IncomingMessage, ServerResponse } from 'node:http';
import { DeveloperId, SessionId, TenantId } from '@scora/trust-core';
import { PrincipalKind, Role, type ApiRequest, type ApiResponse, type Authenticator } from './contract.ts';
import type { TrustApi } from './app.ts';
/**
 * Node bindings.
 *
 * The only place in the package that knows about sockets. Everything above it
 * — routes, RBAC, the access log — is plain data, so the same behaviour can be
 * mounted behind a different server without any of it being re-implemented.
 */
/** Largest request body accepted, in bytes. */
export declare const MAX_BODY_BYTES = 1000000;
/**
 * Adapts `createApi(...).handle` to Node's `http`.
 *
 * Returns a listener, not a server: the consuming platform usually already has
 * one, and this engine is meant to be embedded rather than to own the port.
 */
export declare function nodeRequestListener(api: TrustApi): (incoming: IncomingMessage, outgoing: ServerResponse) => void;
/** Reads a Node request into the transport-neutral shape the router expects. */
export declare function toApiRequest(incoming: IncomingMessage): Promise<ApiRequest>;
export declare function writeResponse(outgoing: ServerResponse, response: ApiResponse): void;
/**
 * A credential as the platform stores it.
 *
 * The raw token is never held: only its SHA-256. A leaked credential table must
 * not be a leaked set of working tokens, and the platform has no reason to be
 * able to reproduce a token it has already issued.
 */
export interface StoredCredential {
    readonly tokenHash: string;
    readonly kind: PrincipalKind;
    readonly tenantId: TenantId;
    readonly subject: string;
    readonly roles: readonly Role[];
    readonly developerId?: DeveloperId | undefined;
    readonly sessionId?: SessionId | undefined;
    /** Epoch milliseconds after which the credential is refused. */
    readonly expiresAt?: number | undefined;
}
export declare function hashToken(token: string): string;
/**
 * Bearer-token authenticator over a set of stored credentials.
 *
 * Sufficient for a single-node deployment and for tests. A real deployment
 * swaps in its own `Authenticator` — OIDC, mTLS, whatever the platform already
 * runs — which is the reason `Authenticator` is a one-method interface.
 *
 * Comparison is constant-time over the hashes. Comparing tokens with `===`
 * leaks their prefix through timing, which is a slow but real way to guess one.
 */
export declare function bearerAuthenticator(credentials: readonly StoredCredential[], options?: {
    readonly now?: () => number;
}): Authenticator;
/**
 * Issues a credential and returns the token exactly once.
 *
 * The token is returned here and nowhere else — the stored record holds only
 * its hash, so a token that is not captured at this call is unrecoverable. That
 * is the intended behaviour, not a limitation.
 */
export declare function issueCredential(credential: Omit<StoredCredential, 'tokenHash'>): {
    readonly token: string;
    readonly stored: StoredCredential;
};
/**
 * A per-session sandbox credential.
 *
 * Scoped to one session and holding only `INGEST`, because a sandbox that
 * leaked a broader token would let whoever holds it write evidence into someone
 * else's assessment.
 */
export declare function issueSandboxCredential(tenantId: TenantId, sessionId: SessionId, expiresAt: number): {
    readonly token: string;
    readonly stored: StoredCredential;
};
export { DeveloperId, SessionId, TenantId };
//# sourceMappingURL=node.d.ts.map