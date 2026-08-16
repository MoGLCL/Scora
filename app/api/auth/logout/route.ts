import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-token";

function logoutResponse(request: Request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");

  let targetUrl: string;
  if (host) {
    targetUrl = `${proto}://${host}/`;
  } else {
    try {
      targetUrl = new URL("/", request.url).toString();
    } catch {
      targetUrl = "/";
    }
  }

  const response = NextResponse.redirect(targetUrl, 303);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    expires: new Date(0),
    maxAge: 0,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return response;
}

export async function POST(request: Request) {
  return logoutResponse(request);
}

export async function GET(request: Request) {
  return logoutResponse(request);
}
