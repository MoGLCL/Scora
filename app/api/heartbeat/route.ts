import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { execute } from "@/lib/db";

export async function POST() {
  try {
    const session = await verifySession();
    if (session?.userId) {
      await execute("UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?", [
        session.userId,
      ]);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
