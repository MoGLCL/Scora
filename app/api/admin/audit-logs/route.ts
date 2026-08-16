import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const logs = await query<{
    id: number;
    actor_user_id: number | null;
    actor_name: string | null;
    action: string;
    category: string;
    target_type: string | null;
    target_id: string | null;
    details: string | null;
    ip_address: string | null;
    status: string;
    created_at: Date;
  }>(`
    SELECT id, actor_user_id, actor_name, action, category, target_type, target_id, details, ip_address, status, created_at
    FROM admin_audit_logs
    ORDER BY id DESC
    LIMIT 100
  `);

  return NextResponse.json(
    logs.map((l) => ({
      id: l.id,
      actorUserId: l.actor_user_id,
      actorName: l.actor_name || "النظام التلقائي",
      action: l.action,
      category: l.category,
      targetType: l.target_type,
      targetId: l.target_id,
      details: l.details,
      ipAddress: l.ip_address,
      status: l.status,
      createdAt: new Date(l.created_at).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }))
  );
}
