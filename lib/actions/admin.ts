"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { execute, query, type SqlParam } from "@/lib/db";
import { queryOne, transaction } from "@/lib/db";
import { createHash } from "node:crypto";
import { HumanReviewEventType } from "@scora/trust-core";
import { appendTrustEvent } from "@/lib/trust-events";
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
  approvalStatus?: string;
  assessmentPublicId?: string | null;
  suspendedUntil?: string | null;
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
    suspended_until: Date | null;
    skill_points: number | null; trust_score: number | null; reports_count: number; approval_status:string|null; assessment_public_id:string|null;
  }>(`SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_admin, u.status, u.created_at, u.suspended_until,
             d.skill_points, d.trust_score, d.approval_status,
             (SELECT das.public_id FROM developer_assessment_sessions das WHERE das.developer_id=d.id AND das.status='admin_review' ORDER BY das.id DESC LIMIT 1) assessment_public_id,
             (SELECT COUNT(*) FROM support_tickets st WHERE st.reported_user_id = u.id) reports_count
      FROM users u LEFT JOIN developers d ON d.user_id = u.id
      ORDER BY u.id DESC`);

  return rows.map((row) => {
    const joinedDate = new Date(row.created_at).toLocaleDateString("ar-EG");
    const suspendedUntil = row.suspended_until ? new Date(row.suspended_until).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" }) : null;
    return {
      id: String(row.id), name: row.full_name, email: row.email, phone: row.phone ?? "",
      role: row.role, isAdmin: Boolean(row.is_admin), status: row.status, skillPoints: Number(row.skill_points ?? 0),
      trustScore: Number(row.trust_score ?? 0), reportsCount: Number(row.reports_count),
      joinDate: joinedDate, joinedDate,
      approvalStatus: row.approval_status ?? undefined, assessmentPublicId: row.assessment_public_id,
      suspendedUntil,
    };
  });
}

export async function decideDeveloperAdmission(input:{assessmentPublicId:string;decision:"approved"|"rejected";reason:string}){const actor=await requireAdmin();const p=z.object({assessmentPublicId:z.string().min(10),decision:z.enum(["approved","rejected"]),reason:z.string().trim().min(10).max(1000)}).safeParse(input);if(!p.success)return{ok:false as const,error:"اكتب سبب قرار واضح (10 حروف على الأقل)"};const row=await queryOne<{id:number;developer_id:number;user_id:number;status:string;max_score:number;answer_score:number}>(`SELECT das.id,das.developer_id,d.user_id,das.status,COALESCE(SUM(q.max_score),0) max_score,COALESCE(SUM(a.score),0) answer_score FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id LEFT JOIN developer_assessment_questions q ON q.session_id=das.id LEFT JOIN developer_assessment_answers a ON a.question_id=q.id WHERE das.public_id=? GROUP BY das.id,d.user_id`,[p.data.assessmentPublicId]);if(!row||row.status!=="admin_review")return{ok:false as const,error:"الطلب غير موجود أو تمت مراجعته"};const score=row.max_score?Math.round(row.answer_score/row.max_score*100):0;const trust=p.data.decision==="approved"?Math.max(50,Math.min(90,score)):0,sp=p.data.decision==="approved"?Math.max(0,score*10):0;await transaction(async c=>{await c.execute("UPDATE developer_assessment_sessions SET status=?,score=?,trust_awarded=?,sp_awarded=?,reviewed_at=CURRENT_TIMESTAMP,reviewed_by=?,review_reason=? WHERE id=?",[p.data.decision,score,trust,sp,actor.userId,p.data.reason,row.id]);await c.execute("UPDATE developers SET approval_status=?,approved_at=?,approved_by=?,rejection_reason=?,is_verified=?,trust_score=?,skill_points=? WHERE id=?",[p.data.decision,p.data.decision==="approved"?new Date():null,p.data.decision==="approved"?actor.userId:null,p.data.decision==="rejected"?p.data.reason:null,p.data.decision==="approved"?1:0,trust,sp,row.developer_id]);await c.execute("INSERT INTO notifications(user_id,body) VALUES(?,?)",[row.user_id,p.data.decision==="approved"?"تم اعتماد حسابك كمطور ويمكنك استخدام المنصة الآن.":`تم رفض طلب اعتماد المطور: ${p.data.reason}`]);const rationaleHash=createHash("sha256").update(p.data.reason).digest("hex");await appendTrustEvent({sessionPublicId:p.data.assessmentPublicId,developerId:row.developer_id,assessmentPublicId:p.data.assessmentPublicId,type:HumanReviewEventType.REVIEW_DECISION_RECORDED,source:"HUMAN",payload:{reviewId:`review_${p.data.assessmentPublicId}`,reviewerId:`reviewer_${actor.userId}`,decision:p.data.decision==="approved"?"APPROVE":"REJECT",rationaleLength:p.data.reason.length,rationaleHash,reviewDurationMs:0}},c);await appendTrustEvent({sessionPublicId:p.data.assessmentPublicId,developerId:row.developer_id,assessmentPublicId:p.data.assessmentPublicId,type:HumanReviewEventType.RESULT_RELEASED,source:"HUMAN",payload:{reviewId:`review_${p.data.assessmentPublicId}`,releasedBy:`reviewer_${actor.userId}`,channel:"dashboard",scheduledFor:null}},c)});revalidatePath("/admin");return{ok:true as const}}

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
  if (userId === actor.userId && (isAdmin === false || (status && status !== "active"))) {
    return { ok: false as const, error: "لا يمكنك سحب صلاحية حساب الإدارة الحالي أو تعطيله" };
  }
  if (!role && isAdmin === undefined && !status) return { ok: false as const, error: "لا يوجد تعديل مطلوب" };

  const fields: string[] = [];
  const values: SqlParam[] = [];
  if (role) { fields.push("role = ?"); values.push(role); }
  if (isAdmin !== undefined) { fields.push("is_admin = ?"); values.push(isAdmin ? 1 : 0); }
  if (status) {
    fields.push("status = ?");
    values.push(status);
    fields.push("suspended_until = ?");
    if (status === "suspended") {
      const untilDate = new Date(Date.now() + (suspensionDays ?? 7) * 86400000);
      values.push(untilDate);
    } else {
      values.push(null);
    }
  }
  values.push(userId);
  const result = await execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  if (result.affectedRows !== 1) return { ok: false as const, error: "المستخدم غير موجود" };
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteUserForAdmin(targetUserId: number) {
  const actor = await requireAdmin();
  if (targetUserId === actor.userId) {
    return { ok: false as const, error: "لا يمكنك حذف حساب الإدارة الخاص بك أثناء تسجيل الدخول" };
  }

  await transaction(async (conn) => {
    // Delete developer assessment sessions
    const dev = await conn.execute("SELECT id FROM developers WHERE user_id = ?", [targetUserId]);
    const devId = (dev[0] as Array<{ id: number }>)[0]?.id;
    if (devId) {
      await conn.execute("DELETE FROM developer_assessment_sessions WHERE developer_id = ?", [devId]);
      await conn.execute("DELETE FROM developer_skills WHERE developer_id = ?", [devId]);
      await conn.execute("DELETE FROM developers WHERE id = ?", [devId]);
    }
    await conn.execute("DELETE FROM clients WHERE user_id = ?", [targetUserId]);
    await conn.execute("DELETE FROM users WHERE id = ?", [targetUserId]);
  });

  revalidatePath("/admin");
  return { ok: true as const };
}

export async function resetDeveloperAssessmentForAdmin(targetUserId: number) {
  await requireAdmin();
  const dev = await queryOne<{ id: number }>("SELECT id FROM developers WHERE user_id = ?", [targetUserId]);
  if (!dev) {
    return { ok: false as const, error: "المطور غير موجود أو لا يملك ملف مطور" };
  }

  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE developers SET approval_status = 'pending', trust_score = 0, skill_points = 0, is_verified = 0, rejection_reason = NULL WHERE id = ?`,
      [dev.id]
    );
    await conn.execute(
      `UPDATE developer_assessment_sessions SET status = 'expired' WHERE developer_id = ?`,
      [dev.id]
    );
    await conn.execute(
      `INSERT INTO notifications (user_id, body) VALUES (?, ?)`,
      [targetUserId, "تمت إعادة إتاحة تقديم اختبار تقييم المطورين لك من قِبل الإدارة. يمكنك إجراء التقييم الآن."]
    );
  });

  revalidatePath("/admin");
  revalidatePath("/developer-assessment/pending");
  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
