import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-token";

function logoutResponse(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, expires: new Date(0), maxAge: 0, path: "/", secure: process.env.NODE_ENV === "production", sameSite: "lax" });
  return response;
}
export async function POST(request: Request) { return logoutResponse(request); }
export async function GET(request: Request) { return logoutResponse(request); }
