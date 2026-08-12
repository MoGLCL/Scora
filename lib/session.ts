import "server-only";

import { cookies } from "next/headers";

import {
  MAX_AGE_MS,
  SESSION_COOKIE,
  decrypt,
  encrypt,
  type AppRole,
  type SessionPayload,
} from "@/lib/session-token";

export { encrypt, decrypt, SESSION_COOKIE };
export type { AppRole, SessionPayload };

export async function createSession(userId: number, role: AppRole, onboardingCompleted = false, isAdmin = false): Promise<void> {
  const token = await encrypt({ userId, role, onboardingCompleted, isAdmin });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Allow http on localhost during development; require https in production.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(Date.now() + MAX_AGE_MS),
    path: "/",
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
