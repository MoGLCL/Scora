import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import type { AccountStatus, AppRole } from "@/lib/types";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const rows = await query<{
    id: number; email: string; full_name: string; role: AppRole; is_admin: 0 | 1; status: AccountStatus;
    created_at: Date; skill_points: number | null; trust_score: number | null; reports_count: number;
  }>(`SELECT u.id, u.email, u.full_name, u.role, u.is_admin, u.status, u.created_at,
             d.skill_points, d.trust_score,
             (SELECT COUNT(*) FROM support_tickets st WHERE st.reported_user_id = u.id) reports_count
      FROM users u LEFT JOIN developers d ON d.user_id = u.id ORDER BY u.id DESC`);
  return NextResponse.json(rows.map((row) => {
    const joined = new Date(row.created_at).toLocaleDateString("ar-EG");
    return { id: String(row.id), name: row.full_name, email: row.email, role: row.role, isAdmin: Boolean(row.is_admin),
      status: row.status, skillPoints: Number(row.skill_points ?? 0), trustScore: Number(row.trust_score ?? 0),
      reportsCount: Number(row.reports_count), joinDate: joined, joinedDate: joined };
  }));
}
