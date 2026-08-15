"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { execute, query, type SqlParam, queryOne, transaction } from "@/lib/db";
import { createHash } from "node:crypto";
import { HumanReviewEventType } from "@scora/trust-core";
import { appendTrustEvent } from "@/lib/trust-events";
import { verifySession } from "@/lib/dal";
import type { AccountStatus, AppRole } from "@/lib/types";
import type { PoolConnection } from "mysql2/promise";

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
  rejectionReason?: string | null;
}

// ─── Helper Functions ──────────────────────────────────────────

async function requireAdmin() {
  const session = await verifySession();
  if (!session?.isAdmin) throw new Error("FORBIDDEN");
  return session;
}

function revalidateAdminPaths() {
  revalidatePath("/admin");
  revalidatePath("/developer-assessment/pending");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/complete-profile");
}

async function sendNotification(conn: PoolConnection, userId: number, message: string, linkUrl?: string | null) {
  await conn.execute("INSERT INTO notifications (user_id, body, link_url) VALUES (?, ?, ?)", [userId, message, linkUrl ?? null]);
}

// ─── Public Admin Actions ──────────────────────────────────────

export async function fetchDbUsersForAdmin(): Promise<DbUserItem[]> {
  await requireAdmin();
  const rows = await query<{
    id: number; email: string; full_name: string; phone: string | null;
    role: AppRole; is_admin: 0 | 1; status: AccountStatus; created_at: Date;
    suspended_until: Date | null;
    skill_points: number | null; trust_score: number | null; reports_count: number;
    approval_status: string | null; rejection_reason: string | null; assessment_public_id: string | null;
  }>(`SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_admin, u.status, u.created_at, u.suspended_until,
             d.skill_points, d.trust_score, d.approval_status, d.rejection_reason,
             (SELECT das.public_id FROM developer_assessment_sessions das WHERE das.developer_id=d.id AND das.status='admin_review' ORDER BY das.id DESC LIMIT 1) assessment_public_id,
             (SELECT COUNT(*) FROM support_tickets st WHERE st.reported_user_id = u.id) reports_count
      FROM users u LEFT JOIN developers d ON d.user_id = u.id
      ORDER BY u.id DESC`);

  return rows.map((row) => {
    const joinedDate = new Date(row.created_at).toLocaleDateString("ar-EG");
    const suspendedUntil = row.suspended_until
      ? new Date(row.suspended_until).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })
      : null;

    return {
      id: String(row.id),
      name: row.full_name,
      email: row.email,
      phone: row.phone ?? "",
      role: row.role,
      isAdmin: Boolean(row.is_admin),
      status: row.status,
      skillPoints: Number(row.skill_points ?? 0),
      trustScore: Number(row.trust_score ?? 0),
      reportsCount: Number(row.reports_count),
      joinDate: joinedDate,
      joinedDate,
      approvalStatus: row.approval_status ?? undefined,
      rejectionReason: row.rejection_reason ?? undefined,
      assessmentPublicId: row.assessment_public_id,
      suspendedUntil,
    };
  });
}

export async function decideDeveloperAdmission(input: {
  assessmentPublicId: string;
  decision: "approved" | "rejected";
  reason: string;
  trustScore?: number;
  skillPoints?: number;
}) {
  const actor = await requireAdmin();
  const parsed = z
    .object({
      assessmentPublicId: z.string().min(10),
      decision: z.enum(["approved", "rejected"]),
      reason: z.string().trim().max(1000).optional(),
      trustScore: z.number().int().min(0).max(100).optional(),
      skillPoints: z.number().int().min(0).max(10000).optional(),
    })
    .safeParse(input);

  if (!parsed.success) return { ok: false as const, error: "بيانات القرار غير صالحة" };

  const row = await queryOne<{
    id: number;
    developer_id: number;
    user_id: number;
    status: string;
    max_score: number;
    answer_score: number;
  }>(
    `SELECT das.id, das.developer_id, d.user_id, das.status, COALESCE(SUM(q.max_score),0) max_score, COALESCE(SUM(a.score),0) answer_score 
     FROM developer_assessment_sessions das 
     JOIN developers d ON d.id=das.developer_id 
     LEFT JOIN developer_assessment_questions q ON q.session_id=das.id 
     LEFT JOIN developer_assessment_answers a ON a.question_id=q.id 
     WHERE das.public_id=? 
     GROUP BY das.id, d.user_id`,
    [parsed.data.assessmentPublicId]
  );

  if (!row) return { ok: false as const, error: "طلب التقييم غير موجود" };

  const finalReason = parsed.data.reason || (parsed.data.decision === "approved" ? "تم قبول وتفعيل حساب المطور" : "تم رفض طلب التقييم");
  const trust = parsed.data.trustScore ?? 85;
  const sp = parsed.data.skillPoints ?? 500;

  await transaction(async (c) => {
    await c.execute(
      "UPDATE developer_assessment_sessions SET status=?, score=?, trust_awarded=?, sp_awarded=?, reviewed_at=CURRENT_TIMESTAMP, reviewed_by=?, review_reason=? WHERE id=?",
      [parsed.data.decision, trust, trust, sp, actor.userId, finalReason, row.id]
    );

    await c.execute(
      "UPDATE developers SET approval_status=?, approved_at=?, approved_by=?, rejection_reason=?, is_verified=?, trust_score=?, skill_points=? WHERE id=?",
      [
        parsed.data.decision,
        parsed.data.decision === "approved" ? new Date() : null,
        parsed.data.decision === "approved" ? actor.userId : null,
        parsed.data.decision === "rejected" ? finalReason : null,
        parsed.data.decision === "approved" ? 1 : 0,
        trust,
        sp,
        row.developer_id,
      ]
    );

    const notifyBody = parsed.data.decision === "approved"
      ? "تهانينا! تم تفعيل واعتماد حسابك كمطور بنجاح. يمكنك الآن تصفح المشاريع والتقديم عليها."
      : `تمت مراجعة طلب الاعتماد: ${finalReason}`;
    const notifyLink = parsed.data.decision === "approved" ? "/profile" : "/developer-assessment/pending";

    await sendNotification(c, row.user_id, notifyBody, notifyLink);

    const rationaleHash = createHash("sha256").update(finalReason).digest("hex");
    await appendTrustEvent(
      {
        sessionPublicId: parsed.data.assessmentPublicId,
        developerId: row.developer_id,
        assessmentPublicId: parsed.data.assessmentPublicId,
        type: HumanReviewEventType.REVIEW_DECISION_RECORDED,
        source: "HUMAN",
        payload: {
          reviewId: `review_${parsed.data.assessmentPublicId}`,
          reviewerId: `reviewer_${actor.userId}`,
          decision: parsed.data.decision === "approved" ? "APPROVE" : "REJECT",
          rationaleLength: finalReason.length,
          rationaleHash,
          reviewDurationMs: 0,
        },
      },
      c
    );
  });

  revalidateAdminPaths();
  return { ok: true as const };
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
  await execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function deleteUserForAdmin(userId: number) {
  const actor = await requireAdmin();
  if (userId === actor.userId) return { ok: false as const, error: "لا يمكنك حذف حساب الإدارة الحالي" };
  await execute("DELETE FROM users WHERE id=?", [userId]);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function approveReassessmentRequestForAdmin(userId: number) {
  const actor = await requireAdmin();
  const dev = await queryOne<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM developers WHERE user_id = ?`,
    [userId]
  );
  if (!dev) return { ok: false as const, error: "المطور غير موجود" };

  await transaction(async (conn) => {
    await conn.execute(
      `UPDATE developers SET approval_status = 'reset_approved', rejection_reason = NULL WHERE id = ?`,
      [dev.id]
    );
    await conn.execute(
      `UPDATE developer_assessment_sessions SET status = 'expired' WHERE developer_id = ? AND status IN ('generating', 'in_progress')`,
      [dev.id]
    );
    await conn.execute(
      `UPDATE developer_reassessment_requests
          SET status='approved', decided_by=?, decision_reason='تمت الإتاحة مباشرة من لوحة الإدارة', decided_at=CURRENT_TIMESTAMP
        WHERE developer_id=? AND status='pending'`,
      [actor.userId, dev.id]
    );
    await sendNotification(
      conn,
      dev.user_id,
      "تمت إعادة إتاحة تقديم اختبار تقييم المطورين لك من قِبل الإدارة. اضغط على 'بدء الاختبار الآن' لإجراء الاختبار."
    );
  });

  revalidateAdminPaths();
  return { ok: true as const };
}

export const resetDeveloperAssessmentForAdmin = approveReassessmentRequestForAdmin;

export async function decideReassessmentRequestForAdmin(input: {
  requestId: number;
  decision: "approve" | "reject";
  reason?: string;
}) {
  const actor = await requireAdmin();
  const parsed = z
    .object({
      requestId: z.coerce.number().int().positive(),
      decision: z.enum(["approve", "reject"]),
      reason: z.string().trim().max(1000).optional(),
    })
    .safeParse(input);

  if (!parsed.success) return { ok: false as const, error: "بيانات طلب إعادة الاختبار غير صالحة" };

  const decided = await transaction(async (conn) => {
    const [requestRows] = await conn.execute(
      "SELECT rr.id, rr.developer_id, d.user_id, rr.status FROM developer_reassessment_requests rr JOIN developers d ON d.id=rr.developer_id WHERE rr.id=? FOR UPDATE",
      [parsed.data.requestId]
    );
    const request = (requestRows as { id: number; developer_id: number; user_id: number; status: string }[])[0];
    if (!request || request.status !== "pending") return false;

    if (parsed.data.decision === "approve") {
      await conn.execute(
        "UPDATE developers SET approval_status = 'reset_approved', rejection_reason = NULL WHERE id = ?",
        [request.developer_id]
      );
      await conn.execute(
        "UPDATE developer_assessment_sessions SET status = 'expired' WHERE developer_id = ? AND status IN ('generating', 'in_progress')",
        [request.developer_id]
      );
      await conn.execute(
        "UPDATE developer_reassessment_requests SET status='approved', decided_by=?, decision_reason=?, decided_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'",
        [actor.userId, parsed.data.reason ?? null, request.id]
      );
      await sendNotification(
        conn,
        request.user_id,
        "وافقت الإدارة على طلب إعادة تقييم مهاراتك. يمكنك الآن الضغط على 'بدء الاختبار الآن' لبدء التقييم التلقائي.",
        "/developer-assessment/pending"
      );
    } else {
      const reason = parsed.data.reason || "تم رفض طلب إعادة التقييم من قِبل الإدارة";
      await conn.execute(
        "UPDATE developer_reassessment_requests SET status='rejected', decided_by=?, decision_reason=?, decided_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'",
        [actor.userId, reason, request.id]
      );
      await sendNotification(conn, request.user_id, `تم رفض طلب إعادة تقييم المهارات: ${reason}`, "/developer-assessment/pending");
    }
    return true;
  });

  if (!decided) return { ok: false as const, error: "طلب إعادة الاختبار غير موجود أو تمت مراجعته بالفعل" };

  revalidateAdminPaths();
  return { ok: true as const };
}
