/**
 * Session token signing / verification.
 *
 * Kept free of `next/headers` and `server-only` on purpose: `proxy.ts` runs in
 * the Edge runtime where cookies come off the request, not from
 * `cookies()`. Both the Node server and the proxy import from here so there is
 * exactly one definition of what a valid session looks like.
 */
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "scora_session";

export type AppRole = "developer" | "client" | "admin";

export interface SessionPayload {
  userId: number;
  role: AppRole;
  [key: string]: unknown;
}

const MAX_AGE_DAYS = Number(process.env.SESSION_MAX_AGE_DAYS ?? 7);
export const MAX_AGE_MS = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

function getKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // Refusing to run on a weak/absent secret is deliberate: a default
    // fallback would mean every deployment shares a forgeable signing key.
    throw new Error(
      "SESSION_SECRET is missing or too short (need ≥32 chars). Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\""
    );
  }
  return new TextEncoder().encode(secret);
}

/** Sign a session JWT. Keep the payload minimal — no PII. */
export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(getKey());
}

/**
 * Verify a session JWT. Returns null for anything that is not a well-formed,
 * unexpired token signed with our key — expired, tampered, and absent all
 * collapse to "not signed in".
 */
export async function decrypt(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ["HS256"] });
    const userId = Number(payload.userId);
    const role = payload.role;
    if (!Number.isInteger(userId) || userId <= 0) return null;
    if (role !== "developer" && role !== "client" && role !== "admin") return null;
    return { userId, role };
  } catch {
    return null;
  }
}
