import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/session-token";

async function logoutResponse(request: Request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
  } catch {
    // Ignore if cookies() cannot be accessed
  }

  const isSecure = process.env.NODE_ENV === "production" || request.url.startsWith("https:");
  const response = NextResponse.redirect(new URL("/login?logged_out=1", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: isSecure,
  });

  return response;
}

export async function POST(request: Request) {
  return logoutResponse(request);
}

export async function GET(request: Request) {
  return logoutResponse(request);
}
