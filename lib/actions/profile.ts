"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { execute, query, queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export interface ActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const PhoneSchema = z.string().trim().transform((v) =>
  v.replace(/[\s\-()]/g, "").replace(/^(?:\+?20|0020)/, "").replace(/^0+/, "")
).refine((v) => /^1[0-25]\d{8}$/.test(v), "رقم الهاتف المصري غير صالح")
  .transform((v) => `0${v}`);

// ─── Developer profile ────────────────────────────────────────────────────

const DeveloperProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(255),
  jobTitle: z.string().trim().max(255).optional().or(z.literal("")),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  location: z.string().trim().max(255).optional().or(z.literal("")),
  availability: z.enum(["available", "busy", "soon"]),
  github: z.string().trim().url().max(500).optional().or(z.literal("")),
  linkedin: z.string().trim().url().max(500).optional().or(z.literal("")),
  website: z.string().trim().url().max(500).optional().or(z.literal("")),
  phone: PhoneSchema,
});

export async function updateDeveloperProfile(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await verifySession();
  if (!session) return { error: "غير مصرح لك" };
  if (session.role !== "developer") return { error: "هذا الإجراء متاح للمطورين فقط" };

  const parsed = DeveloperProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    jobTitle: formData.get("jobTitle") ?? "",
    bio: formData.get("bio") ?? "",
    location: formData.get("location") ?? "",
    availability: formData.get("availability") ?? "soon",
    github: formData.get("github") ?? "",
    linkedin: formData.get("linkedin") ?? "",
    website: formData.get("website") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  await execute(
    `UPDATE developers SET
       display_name = ?, job_title = ?, bio = ?, location = ?, phone = ?, availability = ?,
       github_url = ?, linkedin_url = ?, portfolio_url = ?
     WHERE user_id = ?`,
    [
      d.displayName, d.jobTitle || null, d.bio || null, d.location || null, d.phone,
      d.availability, d.github || null, d.linkedin || null, d.website || null,
      session.userId,
    ]
  );
  await execute("UPDATE users SET full_name = ?, phone = ? WHERE id = ?", [
    d.displayName, d.phone,
    session.userId,
  ]);

  revalidatePath("/profile");
  revalidatePath("/developers");
  return { ok: true };
}

/** Replace a developer's skill set with the given skill slugs. */
export async function setDeveloperSkills(slugs: string[]): Promise<ActionState> {
  const session = await verifySession();
  if (!session) return { error: "غير مصرح لك" };
  if (session.role !== "developer") return { error: "هذا الإجراء متاح للمطورين فقط" };

  const dev = await queryOne<{ id: number }>(
    "SELECT id FROM developers WHERE user_id = ?",
    [session.userId]
  );
  if (!dev) return { error: "الملف الشخصي غير موجود" };

  if (slugs.length === 0) {
    await execute("DELETE FROM developer_skills WHERE developer_id = ?", [dev.id]);
    revalidatePath("/profile");
    return { ok: true };
  }

  const placeholders = slugs.map(() => "?").join(",");
  const skills = await query<{ id: number }>(
    `SELECT id FROM skills WHERE slug IN (${placeholders}) OR name IN (${placeholders})`,
    [...slugs, ...slugs]
  );

  await transaction(async (conn) => {
    await conn.execute("DELETE FROM developer_skills WHERE developer_id = ?", [dev.id]);
    for (const s of skills) {
      await conn.execute(
        "INSERT INTO developer_skills (developer_id, skill_id) VALUES (?, ?)",
        [dev.id, s.id]
      );
    }
  });

  revalidatePath("/profile");
  revalidatePath("/developers");
  return { ok: true };
}

// ─── Client profile ───────────────────────────────────────────────────────

const ClientProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(255),
  companyName: z.string().trim().max(255).optional().or(z.literal("")),
  website: z.string().trim().url().max(500).optional().or(z.literal("")),
  location: z.string().trim().max(255).optional().or(z.literal("")),
  phone: PhoneSchema,
});

export async function updateClientProfile(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await verifySession();
  if (!session) return { error: "غير مصرح لك" };
  if (session.role !== "client") return { error: "هذا الإجراء متاح للعملاء فقط" };

  const parsed = ClientProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    companyName: formData.get("companyName") ?? "",
    website: formData.get("website") ?? "",
    location: formData.get("location") ?? "",
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const c = parsed.data;

  await execute(
    `UPDATE clients SET display_name = ?, company_name = ?, website = ?, location = ?, phone = ?
     WHERE user_id = ?`,
    [c.displayName, c.companyName || null, c.website || null, c.location || null, c.phone, session.userId]
  );
  await execute("UPDATE users SET full_name = ?, phone = ? WHERE id = ?", [c.displayName, c.phone, session.userId]);

  revalidatePath("/client-profile");
  return { ok: true };
}

// ─── Projects ─────────────────────────────────────────────────────────────

const ProjectSchema = z.object({
  title: z.string().trim().min(5, "العنوان قصير جدًا").max(255),
  category: z.string().trim().max(100).optional().or(z.literal("")),
  description: z.string().trim().min(20, "الوصف قصير جدًا").max(10000),
  budgetFrom: z.coerce.number().int().nonnegative(),
  budgetTo: z.coerce.number().int().nonnegative(),
  deadlineDays: z.coerce.number().int().positive().max(365),
  skills: z.array(z.string()).default([]),
});

export async function createProject(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await verifySession();
  if (!session) return { error: "غير مصرح لك" };
  if (session.role !== "client") {
    return { error: "نشر المشاريع متاح لحسابات العملاء فقط" };
  }

  const parsed = ProjectSchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category") ?? "",
    description: formData.get("description"),
    budgetFrom: formData.get("budgetFrom"),
    budgetTo: formData.get("budgetTo"),
    deadlineDays: formData.get("deadlineDays"),
    skills: formData.getAll("skills").map(String),
  });
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const p = parsed.data;

  if (p.budgetTo < p.budgetFrom) {
    return { error: "الحد الأعلى للميزانية أقل من الحد الأدنى" };
  }

  const client = await queryOne<{ id: number }>(
    "SELECT id FROM clients WHERE user_id = ?",
    [session.userId]
  );
  if (!client) return { error: "حساب العميل غير موجود" };

  await execute(
    `INSERT INTO projects
       (client_id, title, category, description, budget_from, budget_to, deadline_days, skills_json)
     VALUES (?,?,?,?,?,?,?,?)`,
    [client.id, p.title, p.category || null, p.description, p.budgetFrom, p.budgetTo,
     p.deadlineDays, JSON.stringify(p.skills)]
  );

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─── Proposals ────────────────────────────────────────────────────────────

const ProposalSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  amount: z.coerce.number().int().positive("أدخل قيمة مقترحة صحيحة"),
  deliveryDays: z.coerce.number().int().positive().max(365),
  coverLetter: z.string().trim().min(20, "اكتب تفاصيل ما تستطيع تنفيذه").max(5000),
});

/** Shape the project-detail feed renders. */
export interface ProposalFeedItem {
  id: string;
  devName: string;
  role: string;
  trustScore: number;
  proposedPrice: string;
  deliveryDays: string;
  deliverablesText: string;
  timeAgo: string;
}

export async function submitProposal(input: {
  projectId: string | number;
  amount: number;
  deliveryDays: number;
  coverLetter: string;
}): Promise<
  { ok: true; proposal: ProposalFeedItem } | { ok: false; error: string }
> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "سجّل الدخول أولًا لتقديم عرض" };
  if (session.role !== "developer") {
    return { ok: false, error: "تقديم العروض متاح لحسابات المطورين فقط" };
  }

  const parsed = ProposalSchema.safeParse(input);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "بيانات العرض غير صحيحة" };
  }
  const p = parsed.data;

  const dev = await queryOne<{
    id: number;
    display_name: string;
    job_title: string | null;
    trust_score: number;
  }>(
    "SELECT id, display_name, job_title, trust_score FROM developers WHERE user_id = ?",
    [session.userId]
  );
  if (!dev) return { ok: false, error: "الملف الشخصي غير موجود" };

  const project = await queryOne<{ id: number; status: string }>(
    "SELECT id, status FROM projects WHERE id = ?",
    [p.projectId]
  );
  if (!project) return { ok: false, error: "المشروع غير موجود" };
  if (project.status !== "open") {
    return { ok: false, error: "هذا المشروع لم يعد مفتوحًا لتلقي العروض" };
  }

  // The unique key on (project_id, developer_id) turns a re-submission into an
  // update rather than a duplicate row.
  const result = await execute(
    `INSERT INTO proposals (project_id, developer_id, price, delivery_days, cover_text)
     VALUES (?,?,?,?,?)
     ON DUPLICATE KEY UPDATE price=VALUES(price), delivery_days=VALUES(delivery_days),
                             cover_text=VALUES(cover_text), status='pending'`,
    [p.projectId, dev.id, p.amount, p.deliveryDays, p.coverLetter]
  );

  revalidatePath(`/projects/${p.projectId}`);
  revalidatePath("/projects");

  return {
    ok: true,
    proposal: {
      id: String(result.insertId || `${p.projectId}-${dev.id}`),
      devName: dev.display_name,
      role: dev.job_title ?? "",
      trustScore: dev.trust_score,
      proposedPrice: `${p.amount.toLocaleString("ar-EG")} ج.م`,
      deliveryDays: `${p.deliveryDays} يوماً`,
      deliverablesText: p.coverLetter,
      timeAgo: "الآن",
    },
  };
}
