"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { execute, query, type SqlParam, queryOne, transaction } from "@/lib/db";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
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
      skillPoints: z.number().int().min(0).optional(),
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
  const calculatedRealTrust = row.max_score > 0 ? Math.round((row.answer_score / row.max_score) * 100) : 0;
  const trust = typeof parsed.data.trustScore === "number" ? parsed.data.trustScore : calculatedRealTrust;
  const sp = typeof parsed.data.skillPoints === "number" ? parsed.data.skillPoints : Math.round(trust * 10);

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
  trustScore: z.coerce.number().int().min(0).max(100).optional(),
  skillPoints: z.coerce.number().int().min(0).optional(),
});

export async function updateUserForAdmin(input: z.input<typeof UserUpdateSchema>) {
  const actor = await requireAdmin();
  const parsed = UserUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "بيانات المستخدم غير صالحة" };
  const { userId, role, isAdmin, status, suspensionDays, trustScore, skillPoints } = parsed.data;

  if (userId === actor.userId && (isAdmin === false || (status && status !== "active"))) {
    return { ok: false as const, error: "لا يمكنك سحب صلاحية حساب الإدارة الحالي أو تعطيله" };
  }
  if (!role && isAdmin === undefined && !status && trustScore === undefined && skillPoints === undefined) {
    return { ok: false as const, error: "لا يوجد تعديل مطلوب" };
  }

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

  if (fields.length > 0) {
    values.push(userId);
    await execute(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  if (role === "developer") {
    const existingDev = await queryOne<{ id: number }>("SELECT id FROM developers WHERE user_id = ?", [userId]);
    if (!existingDev) {
      const u = await queryOne<{ full_name: string; is_verified: number }>("SELECT full_name, is_verified FROM users WHERE id = ?", [userId]);
      await execute(
        "INSERT INTO developers (user_id, display_name, approval_status, is_verified, trust_score, skill_points) VALUES (?, ?, 'approved', ?, 50, 0)",
        [userId, u?.full_name || "مطور", u?.is_verified ? 1 : 0]
      );
    }
  } else if (role === "client") {
    const existingClient = await queryOne<{ id: number }>("SELECT id FROM clients WHERE user_id = ?", [userId]);
    if (!existingClient) {
      const u = await queryOne<{ full_name: string; is_verified: number }>("SELECT full_name, is_verified FROM users WHERE id = ?", [userId]);
      await execute(
        "INSERT INTO clients (user_id, display_name, account_type, is_verified) VALUES (?, ?, 'personal', ?)",
        [userId, u?.full_name || "صاحب عمل", u?.is_verified ? 1 : 0]
      );
    }
  }

  if (trustScore !== undefined || skillPoints !== undefined) {
    const existingDev = await queryOne<{ id: number }>("SELECT id FROM developers WHERE user_id = ?", [userId]);
    if (!existingDev) {
      const u = await queryOne<{ full_name: string }>("SELECT full_name FROM users WHERE id = ?", [userId]);
      await execute(
        "INSERT INTO developers (user_id, display_name, approval_status, is_verified, trust_score, skill_points) VALUES (?, ?, 'approved', 1, ?, ?)",
        [userId, u?.full_name || "مطور", trustScore ?? 50, skillPoints ?? 0]
      );
    } else {
      const devFields: string[] = [];
      const devValues: SqlParam[] = [];
      if (trustScore !== undefined) {
        devFields.push("trust_score = ?");
        devValues.push(trustScore);
      }
      if (skillPoints !== undefined) {
        devFields.push("skill_points = ?");
        devValues.push(skillPoints);
      }
      devValues.push(userId);
      await execute(`UPDATE developers SET ${devFields.join(", ")} WHERE user_id = ?`, devValues);
    }

    if (skillPoints !== undefined) {
      const dev = await queryOne<{ id: number }>("SELECT id FROM developers WHERE user_id = ?", [userId]);
      if (dev) {
        const countRow = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM developer_skills WHERE developer_id = ?", [dev.id]);
        const skillsCount = Number(countRow?.count || 0);
        if (skillsCount > 0) {
          await execute("UPDATE developer_skills SET sp = ? WHERE developer_id = ?", [Math.round(skillPoints / skillsCount), dev.id]);
        }
      }
    }
  }

  revalidateAdminPaths();
  return { ok: true as const };
}

/**
 * Apply a relative skill-point change after the AI confirmation token has been
 * verified by the route handler. The row is locked so a stale confirmation
 * cannot silently overwrite a newer admin update.
 */
export async function adjustSkillPointsForAdmin(input: {
  targetUserId: number;
  delta: number;
  expectedSkillPoints: number;
  reason?: string;
}) {
  const actor = await requireAdmin();
  const parsed = z.object({
    targetUserId: z.number().int().positive(),
    delta: z.number().int().min(-10_000).max(10_000).refine((value) => value !== 0),
    expectedSkillPoints: z.number().int().min(0),
    reason: z.string().trim().max(500).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "بيانات تعديل النقاط غير صالحة" };
  if (parsed.data.targetUserId === actor.userId) return { ok: false as const, error: "لا يمكن تعديل نقاط حساب الإدارة الحالي" };

  return transaction(async (conn) => {
    const [rows] = await conn.execute(
      `SELECT u.id, u.full_name, u.username, d.skill_points
       FROM users u JOIN developers d ON d.user_id=u.id
       WHERE u.id=? AND u.role='developer' FOR UPDATE`,
      [parsed.data.targetUserId]
    );
    const target = (rows as Array<{ id: number; full_name: string; username: string | null; skill_points: number }>)[0];
    if (!target) return { ok: false as const, error: "المطور المستهدف غير موجود" };
    const current = Number(target.skill_points ?? 0);
    if (current !== parsed.data.expectedSkillPoints) {
      return { ok: false as const, error: "تغيرت نقاط المطور منذ إنشاء الطلب. أعد المحاولة ببيانات محدثة." };
    }
    const next = Math.max(0, current + parsed.data.delta);
    await conn.execute("UPDATE developers SET skill_points=? WHERE user_id=?", [next, target.id]);
    await conn.execute(
      `INSERT INTO admin_audit_logs
        (actor_user_id, actor_name, action, category, target_type, target_id, details, status)
       VALUES (?, ?, ?, 'admin', 'developer', ?, ?, 'success')`,
      [
        actor.userId,
        `admin:${actor.userId}`,
        "ai_adjust_skill_points",
        String(target.id),
        JSON.stringify({ before: current, delta: parsed.data.delta, after: next, reason: parsed.data.reason ?? "SSD confirmation" }),
      ]
    );
    await conn.execute(
      "INSERT INTO notifications (user_id, body, link_url) VALUES (?, ?, ?)",
      [target.id, `تم تحديث نقاط المهارة الخاصة بك إلى ${next} SP بواسطة إدارة SCORA.`, `/profile/${target.username ?? target.id}`]
    );
    revalidateAdminPaths();
    return { ok: true as const, target: { userId: target.id, name: target.full_name, username: target.username ?? String(target.id), previous: current, next } };
  });
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

const UserFullDetailsSchema = z.object({
  userId: z.coerce.number().int().positive(),
  username: z
    .string()
    .trim()
    .min(2, "اسم المستخدم يجب أن يكون حرفين على الأقل")
    .max(50)
    .regex(/^[a-zA-Z0-9_]+$/, "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام أو _ فقط")
    .optional(),
  fullName: z.string().trim().min(2, "الاسم يجب أن يكون حرفين على الأقل").max(255).optional(),
  email: z.string().trim().email("البريد الإلكتروني غير صالح").optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  role: z.enum(["developer", "client"]).optional(),
  isAdmin: z.boolean().optional(),
  status: z.enum(["active", "suspended", "banned"]).optional(),
  suspensionDays: z.coerce.number().int().min(1).max(365).optional(),
  isVerified: z.boolean().optional(),
  jobTitle: z.string().trim().max(255).nullable().optional(),
  bio: z.string().trim().max(4000).nullable().optional(),
  companyName: z.string().trim().max(255).nullable().optional(),
  experienceYears: z.coerce.number().int().min(0).max(50).nullable().optional(),
});

export async function updateUserFullDetailsForAdmin(input: z.input<typeof UserFullDetailsSchema>) {
  const actor = await requireAdmin();
  const parsed = UserFullDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "بيانات المستخدم غير صالحة" };

  const { userId, username, fullName, email, phone, role, isAdmin, status, suspensionDays, isVerified, jobTitle, bio, companyName, experienceYears } = parsed.data;

  if (userId === actor.userId && (isAdmin === false || (status && status !== "active"))) {
    return { ok: false as const, error: "لا يمكنك سحب صلاحية حساب الإدارة الحالي أو تعطيله" };
  }

  // Check username uniqueness if changing username
  if (username) {
    const cleanUsername = username.toLowerCase();
    const existingUser = await queryOne<{ id: number }>("SELECT id FROM users WHERE username = ? AND id != ?", [cleanUsername, userId]);
    if (existingUser) {
      return { ok: false as const, error: "اسم المستخدم مأخوذ بالفعل، يرجى اختيار اسم مستخدم آخر" };
    }
  }

  // Check email uniqueness if changing email
  if (email) {
    const existing = await queryOne<{ id: number }>("SELECT id FROM users WHERE email = ? AND id != ?", [email, userId]);
    if (existing) {
      return { ok: false as const, error: "البريد الإلكتروني مستخدم بالفعل بحساب آخر" };
    }
  }

  const userFields: string[] = [];
  const userValues: SqlParam[] = [];

  if (username !== undefined) { userFields.push("username = ?"); userValues.push(username.toLowerCase()); }
  if (fullName !== undefined) { userFields.push("full_name = ?"); userValues.push(fullName); }
  if (email !== undefined) { userFields.push("email = ?"); userValues.push(email); }
  if (phone !== undefined) { userFields.push("phone = ?"); userValues.push(phone); }
  if (role !== undefined) { userFields.push("role = ?"); userValues.push(role); }
  if (isAdmin !== undefined) { userFields.push("is_admin = ?"); userValues.push(isAdmin ? 1 : 0); }
  if (status !== undefined) {
    userFields.push("status = ?");
    userValues.push(status);
    userFields.push("suspended_until = ?");
    if (status === "suspended") {
      const untilDate = new Date(Date.now() + (suspensionDays ?? 7) * 86400000);
      userValues.push(untilDate);
    } else {
      userValues.push(null);
    }
  }

  if (userFields.length > 0) {
    userValues.push(userId);
    await execute(`UPDATE users SET ${userFields.join(", ")} WHERE id = ?`, userValues);
  }

  // Update developer table if applicable
  const dev = await queryOne<{ id: number }>("SELECT id FROM developers WHERE user_id = ?", [userId]);
  if (!dev && (role === "developer" || jobTitle || bio)) {
    await execute(
      "INSERT INTO developers (user_id, display_name, job_title, bio, experience_years, approval_status, is_verified, trust_score, skill_points) VALUES (?, ?, ?, ?, ?, 'approved', ?, 50, 0)",
      [userId, fullName || "مطور", jobTitle || null, bio || null, experienceYears ?? 0, isVerified ? 1 : 0]
    );
  } else if (dev) {
    const devFields: string[] = [];
    const devValues: SqlParam[] = [];
    if (fullName !== undefined) { devFields.push("display_name = ?"); devValues.push(fullName); }
    if (isVerified !== undefined) { devFields.push("is_verified = ?"); devValues.push(isVerified ? 1 : 0); }
    if (jobTitle !== undefined) { devFields.push("job_title = ?"); devValues.push(jobTitle); }
    if (bio !== undefined) { devFields.push("bio = ?"); devValues.push(bio); }
    if (experienceYears !== undefined) { devFields.push("experience_years = ?"); devValues.push(experienceYears); }

    if (devFields.length > 0) {
      devValues.push(dev.id);
      await execute(`UPDATE developers SET ${devFields.join(", ")} WHERE id = ?`, devValues);
    }
  }

  // Update client table if applicable
  const client = await queryOne<{ id: number }>("SELECT id FROM clients WHERE user_id = ?", [userId]);
  if (client) {
    const clientFields: string[] = [];
    const clientValues: SqlParam[] = [];
    if (fullName !== undefined) { clientFields.push("display_name = ?"); clientValues.push(fullName); }
    if (companyName !== undefined) { clientFields.push("company_name = ?"); clientValues.push(companyName); }

    if (clientFields.length > 0) {
      clientValues.push(client.id);
      await execute(`UPDATE clients SET ${clientFields.join(", ")} WHERE id = ?`, clientValues);
    }
  }

  revalidateAdminPaths();
  return { ok: true as const };
}

const SetPasswordSchema = z.object({
  userId: z.coerce.number().int().positive(),
  newPassword: z.string().min(6, "كلمة المرور يجب ألا تقل عن 6 أحرف").max(100),
});

export async function setUserPasswordForAdmin(input: z.input<typeof SetPasswordSchema>) {
  await requireAdmin();
  const parsed = SetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "بيانات كلمة المرور غير صالحة" };

  const hash = await bcrypt.hash(parsed.data.newPassword, 12);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, parsed.data.userId]);

  return { ok: true as const };
}

const DirectNotificationSchema = z.object({
  userId: z.coerce.number().int().positive(),
  message: z.string().trim().min(2, "نص الإشعار يجب ألا يقل عن حرفين").max(1000),
  linkUrl: z.string().trim().max(500).nullable().optional(),
});

export async function sendAdminDirectNotification(input: z.input<typeof DirectNotificationSchema>) {
  await requireAdmin();
  const parsed = DirectNotificationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "بيانات الإشعار غير صالحة" };

  await execute("INSERT INTO notifications (user_id, body, link_url) VALUES (?, ?, ?)", [
    parsed.data.userId,
    parsed.data.message,
    parsed.data.linkUrl || null,
  ]);

  return { ok: true as const };
}

export async function toggleDeveloperVerificationForAdmin(userId: number, isVerified: boolean) {
  await requireAdmin();
  const val = isVerified ? 1 : 0;
  await execute("UPDATE users SET is_verified = ? WHERE id = ?", [val, userId]);
  await execute("UPDATE developers SET is_verified = ? WHERE user_id = ?", [val, userId]);
  await execute("UPDATE clients SET is_verified = ? WHERE user_id = ?", [val, userId]);
  revalidateAdminPaths();
  return { ok: true as const };
}

export const toggleUserVerificationForAdmin = toggleDeveloperVerificationForAdmin;


// ─── Projects & Moderation Controls ─────────────────────────────

const ProjectUpdateSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  title: z.string().trim().min(3, "عنوان المشروع يجب أن يكون 3 أحرف على الأقل").max(255).optional(),
  description: z.string().trim().max(10000).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  budgetFrom: z.coerce.number().int().nonnegative().optional(),
  budgetTo: z.coerce.number().int().nonnegative().optional(),
  deadlineDays: z.coerce.number().int().positive().nullable().optional(),
  status: z.enum(["open", "in_progress", "completed", "closed"]).optional(),
});

export async function updateProjectForAdmin(input: z.input<typeof ProjectUpdateSchema>) {
  await requireAdmin();
  const parsed = ProjectUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "بيانات المشروع غير صالحة" };

  const { projectId, title, description, category, budgetFrom, budgetTo, deadlineDays, status } = parsed.data;

  const fields: string[] = [];
  const values: SqlParam[] = [];

  if (title !== undefined) { fields.push("title = ?"); values.push(title); }
  if (description !== undefined) { fields.push("description = ?"); values.push(description); }
  if (category !== undefined) { fields.push("category = ?"); values.push(category); }
  if (budgetFrom !== undefined) { fields.push("budget_from = ?"); values.push(budgetFrom); }
  if (budgetTo !== undefined) { fields.push("budget_to = ?"); values.push(budgetTo); }
  if (deadlineDays !== undefined) { fields.push("deadline_days = ?"); values.push(deadlineDays); }
  if (status !== undefined) { fields.push("status = ?"); values.push(status); }

  if (fields.length === 0) return { ok: false as const, error: "لا يوجد تعديل مطلوب" };

  values.push(projectId);
  await execute(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, values);

  revalidateAdminPaths();
  revalidatePath(`/projects/${projectId}`);
  return { ok: true as const };
}

export async function deleteProjectForAdmin(projectId: number) {
  try {
    await requireAdmin();
    await execute("DELETE FROM projects WHERE id = ?", [projectId]);
    revalidateAdminPaths();
    return { ok: true as const };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "فشل حذف المشروع" };
  }
}

export async function deleteProposalForAdmin(proposalId: number) {
  try {
    await requireAdmin();
    await execute("DELETE FROM proposals WHERE id = ?", [proposalId]);
    revalidateAdminPaths();
    return { ok: true as const };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "فشل حذف العرض" };
  }
}

const BroadcastNotificationSchema = z.object({
  targetAudience: z.enum(["all", "developers", "clients"]),
  message: z.string().trim().min(3, "نص الإشعار يجب أن يكون 3 أحرف على الأقل").max(1000),
  linkUrl: z.string().trim().max(500).nullable().optional(),
});

export async function broadcastNotificationForAdmin(input: z.input<typeof BroadcastNotificationSchema>) {
  await requireAdmin();
  const parsed = BroadcastNotificationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "بيانات الإشعار غير صالحة" };

  const { targetAudience, message, linkUrl } = parsed.data;

  let queryStr = "SELECT id FROM users WHERE status = 'active'";
  if (targetAudience === "developers") {
    queryStr += " AND role = 'developer'";
  } else if (targetAudience === "clients") {
    queryStr += " AND role = 'client'";
  }

  const targetUsers = await query<{ id: number }>(queryStr);

  if (targetUsers.length > 0) {
    for (const u of targetUsers) {
      await execute("INSERT INTO notifications (user_id, body, link_url) VALUES (?, ?, ?)", [
        u.id,
        message,
        linkUrl || null,
      ]);
    }
  }

  return { ok: true as const, count: targetUsers.length };
}

const TicketStatusSchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  status: z.enum(["new", "reviewing", "resolved"]),
});

export async function updateSupportTicketStatusForAdmin(input: z.input<typeof TicketStatusSchema>) {
  await requireAdmin();
  const parsed = TicketStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "بيانات التذكرة غير صالحة" };

  try {
    await execute("UPDATE support_tickets SET status = ? WHERE id = ?", [parsed.data.status, parsed.data.ticketId]);
    revalidateAdminPaths();
    return { ok: true as const };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "فشل تحديث حالة التذكرة" };
  }
}

export async function deleteReviewForAdmin(reviewId: number) {
  try {
    await requireAdmin();
    await execute("DELETE FROM reviews WHERE id = ?", [reviewId]);
    revalidateAdminPaths();
    return { ok: true as const };
  } catch (e: any) {
    return { ok: false as const, error: e?.message || "فشل حذف التقييم" };
  }
}
