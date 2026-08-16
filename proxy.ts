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
  const onboardingAllowed = pathname.startsWith(onboardingRoute) || pathname.startsWith("/laws") || pathname.startsWith("/privacy") || pathname.startsWith("/support");
  const developerAdmissionAllowed =
    pathname.startsWith("/developer-assessment") ||
    onboardingAllowed ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/api/auth/logout") ||
    (session?.isAdmin && pathname.startsWith("/admin"));

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

  // 1. Direct logout handling in middleware (fastest & most reliable across any hosting like Alwaysdata)
  if (pathname === "/logout" || pathname.startsWith("/api/auth/logout")) {
    const isSecure = process.env.NODE_ENV === "production" || request.url.startsWith("https:");
    const res = NextResponse.redirect(new URL("/login?logged_out=1", request.url), 303);
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      expires: new Date(0),
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: isSecure,
    });
    return res;
  }

  if (isGuestOnlyRoute) {
    if (request.nextUrl.searchParams.has("logged_out") || request.nextUrl.searchParams.has("logout")) {
      const isSecure = process.env.NODE_ENV === "production" || request.url.startsWith("https:");
      const res = NextResponse.next();
      res.cookies.delete(SESSION_COOKIE);
      res.cookies.set(SESSION_COOKIE, "", {
        httpOnly: true,
        expires: new Date(0),
        maxAge: 0,
        path: "/",
        sameSite: "lax",
        secure: isSecure,
      });
      return res;
    }
    if (session) {
      return NextResponse.redirect(
        new URL(session.isAdmin && session.onboardingCompleted ? "/admin" : session.onboardingCompleted ? "/dashboard" : onboardingRoute, request.url)
      );
    }
  }

  // Mandatory Username Gate: any user without a username must set one first!
  if (session && session.hasUsername === false && pathname !== "/choose-username" && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/choose-username", request.url));
  }

  if (session && session.hasUsername !== false && pathname === "/choose-username") {
    return NextResponse.redirect(
      new URL(session.isAdmin && session.onboardingCompleted ? "/admin" : session.onboardingCompleted ? "/dashboard" : onboardingRoute, request.url)
    );
  }

  if (session && !session.onboardingCompleted && !onboardingAllowed) {
    return NextResponse.redirect(new URL(onboardingRoute, request.url));
  }

  if (session?.role === "developer" && !session.isAdmin && session.onboardingCompleted && !session.developerApproved && !developerAdmissionAllowed) {
    return NextResponse.redirect(new URL("/developer-assessment/pending", request.url));
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
