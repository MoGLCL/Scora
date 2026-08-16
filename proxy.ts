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
  "/choose-username",
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
  const onboardingAllowed =
    pathname.startsWith(onboardingRoute) ||
    pathname.startsWith("/laws") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/support") ||
    pathname.startsWith("/api/");
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

  // 1. Unauthenticated users on admin or protected routes
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

  // 2. Direct logout handling in middleware (fastest & most reliable across any hosting like Alwaysdata)
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

  // 3. Guest-only routes (/login, /register, /reset-password)
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
      if (session.hasUsername === false) {
        return NextResponse.redirect(new URL("/choose-username", request.url));
      }
      const isDevApproved = session.role === "developer" && session.developerApproved;
      const isCompleted = session.onboardingCompleted || isDevApproved;
      return NextResponse.redirect(
        new URL(
          session.isAdmin && isCompleted
            ? "/admin"
            : isCompleted
            ? "/dashboard"
            : onboardingRoute,
          request.url
        )
      );
    }
  }

  // 4. Mandatory Username Gate: any user without a username must set one first!
  if (session && session.hasUsername === false) {
    if (
      pathname !== "/choose-username" &&
      !pathname.startsWith("/api/") &&
      !pathname.startsWith("/laws") &&
      !pathname.startsWith("/privacy") &&
      !pathname.startsWith("/support")
    ) {
      return NextResponse.redirect(new URL("/choose-username", request.url));
    }
    return NextResponse.next();
  }

  const isDevApproved = session?.role === "developer" && session.developerApproved;
  const isOnboardingDone = session?.onboardingCompleted || isDevApproved;

  // 5. If user already has a username, do not let them stay on /choose-username
  if (session && session.hasUsername !== false && pathname === "/choose-username") {
    return NextResponse.redirect(
      new URL(
        session.isAdmin && isOnboardingDone
          ? "/admin"
          : isOnboardingDone
          ? "/dashboard"
          : onboardingRoute,
        request.url
      )
    );
  }

  // 6. Onboarding Gate: If user has not completed onboarding, force them to onboardingRoute
  if (session && !isOnboardingDone && !onboardingAllowed) {
    return NextResponse.redirect(new URL(onboardingRoute, request.url));
  }

  // 7. Developer Admission Gate
  if (session?.role === "developer" && !session.isAdmin && isOnboardingDone && !session.developerApproved && !developerAdmissionAllowed) {
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
