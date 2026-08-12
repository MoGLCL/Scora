"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { execute, query, type SqlParam } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import type { AccountStatus, AppRole } from "@/lib/types";

export interface DbUserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AppRole;
  isAdmin: boolean;
  skillPoints: number;
  trustScore: number;
  status: AccountStatus;
  reportsCount: number;
  joinDate: string;
  joinedDate: string;
}

async function requireAdmin() {
  const session = await verifySession();
  if (!session?.isAdmin) throw new Error("FORBIDDEN");
  return session;
}

export async function fetchDbUsersForAdmin(): Promise<DbUserItem[]> {
  await requireAdmin();
  const rows = await query<{
    id: number; email: string; full_name: string; phone: string | null;
    role: AppRole; is_admin: 0 | 1; status: AccountStatus; created_at: Date;
    skill_points: number | null; trust_score: number | null; reports_count: number;
  }>(`SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_admin, u.status, u.created_at,
             d.skill_points, d.trust_score,
             (SELECT COUNT(*) FROM support_tickets st WHERE st.reported_user_id = u.id) reports_count
      FROM users u LEFT JOIN developers d ON d.user_id = u.id
      ORDER BY u.id DESC`);

  return rows.map((row) => {
    const joinedDate = new Date(row.created_at).toLocaleDateString("ar-EG");
    return {
      id: String(row.id), name: row.full_name, email: row.email, phone: row.phone ?? "",
      role: row.role, isAdmin: Boolean(row.is_admin), status: row.status, skillPoints: Number(row.skill_points ?? 0),
      trustScore: Number(row.trust_score ?? 0), reportsCount: Number(row.reports_count),
      joinDate: joinedDate, joinedDate,
    };
  });
}

const UserUpdateSchema = z.object({
  userId: z.coerce.number().int().positive(),
  role: z.enum(["developer", "client"]).optional(),
  isAdmin: z.boolean().optional(),
  status: z.enum(["active", "suspended", "banned"]).optional(),
  suspensionDays: z.coerce.number().int().min(1).max(365).optional(),
});

export async function updateUserForAdmin(input: z.input<typeof UserUpdateSchema>) {
  const actor = await requireAdmin();
  const parsed = UserUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "بيانات المستخدم غير صالحة" };
  const { userId, role, isAdmin, status, suspensionDays } = parsed.data;
  if (userId === actor.userId && (isAdmin === false || status && status !== "active")) {
    return { ok: false as const, error: "لا يمكنك سحب صلاحية حساب الإدارة الحالي أو تعطيله" };
  }
  if (!role && isAdmin === undefined && !status) return { ok: false as const, error: "لا يوجد تعديل مطلوب" };

  const fields: string[] = [];
  const values: SqlParam[] = [];
  if (role) { fields.push("role = ?"); values.push(role); }
  if (isAdmin !== undefined) { fields.push("is_admin = ?"); values.push(isAdmin ? 1 : 0); }
  if (status) { fields.push("status = ?"); values.push(status);fields.push("suspended_until = ?");values.push(status==="suspended"?new Date(Date.now()+(suspensionDays??7)*86400000):null); }
  values.push(userId);
  const result = await execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  if (result.affectedRows !== 1) return { ok: false as const, error: "المستخدم غير موجود" };
  revalidatePath("/admin");
  return { ok: true as const };
}
