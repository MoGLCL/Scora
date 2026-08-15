import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { execute, query } from "@/lib/db";

export async function GET() {
  const s = await verifySession();
  if (!s) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const rows = await query(
    "SELECT id, body, link_url, is_read, created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 40",
    [s.userId]
  );
  return NextResponse.json(rows);
}

export async function PATCH(request: Request) {
  const s = await verifySession();
  if (!s) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    if (body && body.id) {
      await execute("UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?", [body.id, s.userId]);
    } else {
      await execute("UPDATE notifications SET is_read=1 WHERE user_id=?", [s.userId]);
    }
  } catch {
    await execute("UPDATE notifications SET is_read=1 WHERE user_id=?", [s.userId]);
  }
  return NextResponse.json({ ok: true });
}
