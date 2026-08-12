import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, decrypt } from "@/lib/session-token";

/**
 * Optimistic route gate.
 *
 * This verifies the session JWT's signature and expiry so a forged or expired
 * cookie cannot reach a protected page. It deliberately does not query the
 * database — account status (suspended / banned) and record ownership are
 * enforced in the data access layer, which every protected page reads through.
 */

/** Routes that require any signed-in user. */
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/client-profile",
  "/projects/new",
  "/chat",
  "/assessments",
  "/complete-profile",
  "/complete-client-profile",
];

/** Routes that require the independent admin permission. */
const ADMIN_ROUTES = ["/admin"];

/** Routes a signed-in user has no reason to see. */
const GUEST_ONLY_ROUTES = ["/login", "/register", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await decrypt(request.cookies.get(SESSION_COOKIE)?.value);

  const isAdminRoute = ADMIN_ROUTES.some((r) => pathname.startsWith(r));
  const isProtectedRoute = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
  const isGuestOnlyRoute = GUEST_ONLY_ROUTES.some((r) => pathname === r);
  const onboardingRoute = session?.role === "developer" ? "/complete-profile" : "/complete-client-profile";
  const onboardingAllowed = pathname.startsWith(onboardingRoute) || pathname.startsWith("/laws") || pathname.startsWith("/privacy");

  // A cookie that fails verification is worse than no cookie: clear it so the
  // browser stops sending a token the server will keep rejecting.
  const hasStaleCookie = !session && request.cookies.has(SESSION_COOKIE);

  const redirectTo = (url: URL) => {
    const res = NextResponse.redirect(url);
    if (hasStaleCookie) res.cookies.delete(SESSION_COOKIE);
    return res;
  };

  if (isAdminRoute && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return redirectTo(url);
  }

  if (isProtectedRoute && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("from", pathname);
    return redirectTo(url);
  }

  if (session && !session.onboardingCompleted && !onboardingAllowed) {
    return NextResponse.redirect(new URL(onboardingRoute, request.url));
  }

  if (isGuestOnlyRoute && session) {
    return NextResponse.redirect(
      new URL(session.isAdmin && session.onboardingCompleted ? "/admin" : session.onboardingCompleted ? "/dashboard" : onboardingRoute, request.url)
    );
  }

  if (hasStaleCookie) {
    const res = NextResponse.next();
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads/ (public uploaded avatars)
     * - public files with extensions (.png, .jpg, .svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
