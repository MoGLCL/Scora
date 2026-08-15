"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { execute, queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { createSession } from "@/lib/session";

export interface ActionState {
  ok?: boolean;
  projectId?: number;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const PhoneSchema = z.string().trim().transform((v) =>
  v.replace(/[\s\-()]/g, "").replace(/^(?:\+?20|0020)/, "").replace(/^0+/, "")
).refine((v) => /^1[0-25]\d{8}$/.test(v), "رقم الهاتف المصري غير صالح")
  .transform((v) => `0${v}`);
const UsernameSchema = z.string().trim().toLowerCase().min(2).max(30).regex(/^[a-z0-9_]+$/, "اسم المستخدم يقبل حروف إنجليزية وأرقام وشرطة سفلية فقط");

// ─── Developer profile ────────────────────────────────────────────────────

const DeveloperProfileSchema = z.object({
  displayName: z.string().trim().min(2, "اكتب الاسم الكامل").max(255),
  jobTitle: z.string().trim().max(255).optional().or(z.literal("")),
  bio: z.string().trim().max(5000).optional().or(z.literal("")),
  location: z.string().trim().max(255).optional().or(z.literal("")),
  availability: z.enum(["available", "busy", "soon"]).optional().default("available"),
  github: z.string().trim().max(500).optional().or(z.literal("")),
  linkedin: z.string().trim().max(500).optional().or(z.literal("")),
  website: z.string().trim().max(500).optional().or(z.literal("")),
  phone: PhoneSchema,
  username: UsernameSchema,
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
    availability: formData.get("availability") ?? "available",
    github: formData.get("github") ?? "",
    linkedin: formData.get("linkedin") ?? "",
    website: formData.get("website") ?? "",
    phone: formData.get("phone") ?? "",
    username: formData.get("username") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const taken = await queryOne<{ id: number }>("SELECT id FROM users WHERE username = ? AND id <> ?", [d.username, session.userId]);
  if (taken) return { error: "اسم المستخدم مستخدم بالفعل" };

  await execute(
    `UPDATE developers SET
       display_name = ?, job_title = ?, bio = ?, location = ?, phone = ?, availability = ?,
       github_url = ?, linkedin_url = ?, portfolio_url = ?
     WHERE user_id = ?`,
    [
      d.displayName, d.jobTitle || "Full-Stack Web Developer", d.bio || null, d.location || null, d.phone,
      d.availability, d.github || null, d.linkedin || null, d.website || null,
      session.userId,
    ]
  );
  await execute("UPDATE developers SET approval_status = CASE WHEN approval_status='approved' THEN 'approved' ELSE 'profile_incomplete' END WHERE user_id = ?", [session.userId]);
  await execute("UPDATE users SET full_name = ?, username = ?, phone = ?, onboarding_completed_at = CURRENT_TIMESTAMP WHERE id = ?", [
    d.displayName, d.username, d.phone,
    session.userId,
  ]);
  await createSession(session.userId, "developer", true, session.isAdmin, session.developerApprovalStatus==="approved");

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

  await transaction(async (conn) => {
    await conn.execute("DELETE FROM developer_skills WHERE developer_id = ?", [dev.id]);
    for (const rawName of slugs) {
      const name = rawName.trim();
      if (!name) continue;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skill";
      const [skillRows] = await conn.execute("SELECT id FROM skills WHERE slug = ? OR name = ? LIMIT 1", [slug, name]);
      let skillId: number;
      if ((skillRows as { id: number }[]).length > 0) {
        skillId = (skillRows as { id: number }[])[0].id;
      } else {
        const [insertRes] = await conn.execute("INSERT INTO skills (name, slug, category) VALUES (?, ?, 'general')", [name, slug]);
        skillId = Number((insertRes as { insertId: number }).insertId);
      }
      await conn.execute(
        "INSERT INTO developer_skills (developer_id, skill_id) VALUES (?, ?)",
        [dev.id, skillId]
      );
    }
  });

  revalidatePath("/profile");
  revalidatePath("/developers");
  revalidatePath("/developer-assessment/pending");
  return { ok: true };
}

// ─── Client profile ───────────────────────────────────────────────────────

const ClientProfileSchema = z.object({
  accountType: z.enum(["personal", "company"]),
  displayName: z.string().trim().max(255).min(2, "اكتب الاسم الكامل"),
  companyName: z.string().trim().max(255).optional().or(z.literal("")),
  website: z.string().trim().max(500).optional().or(z.literal("")),
  location: z.string().trim().max(255).optional().or(z.literal("")),
  phone: PhoneSchema,
  username: UsernameSchema,
});

export async function updateClientProfile(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await verifySession();
  if (!session) return { error: "غير مصرح لك" };
  if (session.role !== "client") return { error: "هذا الإجراء متاح للعملاء فقط" };

  const parsed = ClientProfileSchema.safeParse({
    accountType: formData.get("accountType"),
    displayName: formData.get("displayName"),
    companyName: formData.get("companyName") ?? "",
    website: formData.get("website") ?? "",
    location: formData.get("location") ?? "",
    phone: formData.get("phone") ?? "",
    username: formData.get("username") ?? "",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const taken = await queryOne<{ id: number }>("SELECT id FROM users WHERE username = ? AND id <> ?", [d.username, session.userId]);
  if (taken) return { error: "اسم المستخدم مستخدم بالفعل" };

  await execute(
    `UPDATE clients SET
       display_name = ?, account_type = ?, company_name = ?,
       website = ?, location = ?, phone = ?
     WHERE user_id = ?`,
    [
      d.displayName, d.accountType, d.companyName || null,
      d.website || null, d.location || null, d.phone,
      session.userId,
    ]
  );
  await execute("UPDATE users SET full_name = ?, username = ?, phone = ?, onboarding_completed_at = CURRENT_TIMESTAMP WHERE id = ?", [
    d.displayName, d.username, d.phone,
    session.userId,
  ]);
  await createSession(session.userId, "client", true, session.isAdmin, true);

  revalidatePath("/profile");
  revalidatePath("/client-profile");
  return { ok: true };
}

// ─── Project management (clients only) ───────────────────────────────────

const CreateProjectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(8, "عنوان المشروع قصير جدًا (اكتب 8 أحرف على الأقل لشرح فكرة المشروع بوضوح)")
      .max(255, "عنوان المشروع طويل جدًا"),
    description: z
      .string()
      .trim()
      .min(30, "تفاصيل المشروع غير كافية (اكتب 30 حرفاً على الأقل لشرح نطاق العمل والمخرجات المطلوبة)"),
    category: z.string().trim().max(100).optional().or(z.literal("")),
    budgetFrom: z
      .coerce
      .number()
      .min(1250, "الحد الأدنى لميزانية أي مشروع في المنصة هو 1,250 ج.م لضمان الجودة البرمجية"),
    budgetTo: z
      .coerce
      .number()
      .min(1250, "الحد الأقصى للميزانية يجب أن يكون 1,250 ج.م على الأقل"),
    deadlineDays: z
      .coerce
      .number()
      .int()
      .min(3, "أقل مدة تسليم مسموحة للمشروع هي 3 أيام"),
    skills: z.array(z.string().trim().min(1)).optional().default([]),
  })
  .refine((data) => data.budgetTo >= data.budgetFrom, {
    message: "الحد الأقصى للميزانية يجب أن يكون أكبر من أو يساوي الحد الأدنى للميزانية",
    path: ["budgetTo"],
  });

export async function createProject(
  _prev: ActionState | undefined,
  formData: FormData
): Promise<ActionState> {
  const session = await verifySession();
  if (!session) return { error: "غير مصرح لك" };
  if (session.role !== "client") return { error: "نشر المشاريع متاح للعملاء فقط" };

  const client = await queryOne<{ id: number }>(
    "SELECT id FROM clients WHERE user_id = ?",
    [session.userId]
  );
  if (!client) return { error: "الملف الشخصي غير موجود" };

  const rawSkills = formData.getAll("skills").map(String).filter(Boolean);
  const parsed = CreateProjectSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category") ?? "",
    budgetFrom: formData.get("budgetFrom"),
    budgetTo: formData.get("budgetTo"),
    deadlineDays: formData.get("deadlineDays") || undefined,
    skills: rawSkills,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const p = parsed.data;

  const projectId = await transaction(async (conn) => {
    const [res] = await conn.execute(
      `INSERT INTO projects (
         client_id, title, description, category,
         budget_from, budget_to, deadline_days, status, skills_json
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      [
        client.id,
        p.title,
        p.description,
        p.category || null,
        p.budgetFrom,
        p.budgetTo,
        p.deadlineDays ?? null,
        JSON.stringify(p.skills),
      ]
    );
    const newId = (res as { insertId: number }).insertId;

    // Register any new skills into skills table for discovery
    if (p.skills.length > 0) {
      for (const skillName of p.skills) {
        const skill = await queryOne<{ id: number }>(
          "SELECT id FROM skills WHERE name = ? OR slug = ?",
          [skillName, skillName.toLowerCase()]
        );
        if (!skill) {
          await conn.execute(
            "INSERT INTO skills (name, slug) VALUES (?, ?)",
            [skillName, skillName.toLowerCase()]
          );
        }
      }
    }

    // Send confirmation notification to client
    await conn.execute(
      "INSERT INTO notifications (user_id, body, link_url) VALUES (?, ?, ?)",
      [
        session.userId,
        `تم نشر مشروعك بنجاح: "${p.title}". يمكنك الآن متابعة عروض المطورين.`,
        `/projects/${newId}`
      ]
    );

    return newId;
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { ok: true, projectId };
}

// ─── Proposals (developers only) ──────────────────────────────────────────

function isValidMeaningfulText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 20) return false;
  // Disallow long sequences of repeated character like "ثسششسيبليصللسيبليلل"
  if (/(.)\1{4,}/.test(trimmed)) return false;
  // Check if string contains at least 3 space-separated words
  const words = trimmed.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length < 3) return false;
  return true;
}

const SubmitProposalSchema = z.object({
  projectId: z.coerce.number().int().positive("معرّف المشروع غير صالح"),
  amount: z.coerce.number().min(1250, "أقل سعر لتقديم أي خدمة أو عرض برمجي في المنصة هو 1,250 ج.م"),
  deliveryDays: z.coerce.number().int().min(1, "مدة التسليم يجب أن تكون يوماً واحداً على الأقل"),
  coverLetter: z
    .string()
    .trim()
    .min(25, "تفاصيل خطة العمل قصيرة جدًا (اكتب 25 حرفاً على الأقل لتوضيح ما ستقدمه بالتفصيل والتقنيات المقترحة)"),
});

export async function submitProposal(input: {
  projectId: number | string;
  amount: number | string;
  deliveryDays: number | string;
  coverLetter: string;
}) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "غير مصرح لك" };
  if (session.role !== "developer") {
    return { ok: false as const, error: "تقديم العروض متاح للمطورين المعتمدين فقط" };
  }

  const dev = await queryOne<{ id: number; display_name: string; job_title: string | null; trust_score: number | null; approval_status: string }>(
    "SELECT id, display_name, job_title, trust_score, approval_status FROM developers WHERE user_id = ?",
    [session.userId]
  );
  if (!dev) return { ok: false as const, error: "الملف الشخصي للمطور غير موجود" };

  const parsed = SubmitProposalSchema.safeParse(input);
  if (!parsed.success) {
    const firstErr = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { ok: false as const, error: firstErr ?? "بيانات العرض غير صالحة" };
  }
  const { projectId, amount, deliveryDays, coverLetter } = parsed.data;

  if (!isValidMeaningfulText(coverLetter)) {
    return {
      ok: false as const,
      error:
        "يرجى كتابة خطة عمل واضحة ومفهومة تتضمن الكلمات والتقنيات المقترحة للتنفيذ (تجنب النصوص العشوائية أو غير المفهومة).",
    };
  }

  const project = await queryOne<{
    id: number;
    status: string;
    budget_from: number;
    budget_to: number;
    client_user_id: number;
    title: string;
  }>(
    `SELECT p.id, p.status, p.budget_from, p.budget_to, c.user_id client_user_id, p.title
     FROM projects p JOIN clients c ON c.id = p.client_id
     WHERE p.id = ?`,
    [projectId]
  );
  if (!project) return { ok: false as const, error: "المشروع غير موجود" };
  if (project.status !== "open") return { ok: false as const, error: "المشروع مغلق لتلقي العروض" };

  // DISALLOW BIDDING ON OWN PROJECT
  if (project.client_user_id === session.userId) {
    return {
      ok: false as const,
      error: "لا يمكنك تقديم عرض على مشروع قمت بنشره بنفسك.",
    };
  }

  // SCORA FAIR-PRICING PROTECTION:
  // Minimum bid cannot drop below 50% of project min budget (with 1,250 EGP floor)
  const budgetFrom = Number(project.budget_from || 0);
  const minAllowedPrice = Math.max(1250, Math.floor(budgetFrom * 0.5));
  if (amount < minAllowedPrice) {
    return {
      ok: false as const,
      error: `العرض المالي المقترح (${amount.toLocaleString("ar-EG")} ج.م) أقل من الحد الأدنى المقبول لهذا المشروع (${minAllowedPrice.toLocaleString("ar-EG")} ج.م). تلتزم منصة سكورا بمعايير التسعير العادل (1,250 ج.م كحد أدنى) لحماية قيمة المطورين وجودة التنفيذ.`,
    };
  }

  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM proposals WHERE project_id = ? AND developer_id = ?",
    [projectId, dev.id]
  );
  if (existing) {
    return {
      ok: false as const,
      error: "لقد تقدمت بعرض على هذا المشروع مسبقاً، ولا يمكنك إرسال أكثر من عرض لنفس المشروع.",
    };
  }

  const proposalId = await transaction(async (conn) => {
    const [res] = await conn.execute(
      `INSERT INTO proposals (
         project_id, developer_id, price, delivery_days,
         cover_text, status
       ) VALUES (?, ?, ?, ?, ?, 'pending')`,
      [projectId, dev.id, amount, deliveryDays, coverLetter]
    );
    const newId = (res as { insertId: number }).insertId;

    // 1. Send notification to project owner with link_url to proposals
    await conn.execute(
      "INSERT INTO notifications (user_id, body, link_url) VALUES (?, ?, ?)",
      [
        project.client_user_id,
        `تلقيت عرضًا جديدًا بقيمة ${amount.toLocaleString("ar-EG")} ج.م من المطور "${dev.display_name}" على مشروعك "${project.title}".`,
        `/projects/${projectId}/proposals`
      ]
    );

    // 2. Also notify platform Admins
    await conn.execute(
      "INSERT INTO notifications (user_id, body, link_url) SELECT id, ?, ? FROM users WHERE is_admin = 1 AND id <> ? AND status = 'active'",
      [
        `تم تقديم عرض جديد بقيمة ${amount.toLocaleString("ar-EG")} ج.م من المطور "${dev.display_name}" على مشروع: "${project.title}".`,
        `/projects/${projectId}/proposals`,
        project.client_user_id
      ]
    );

    // 3. Confirmation notification to developer
    await conn.execute(
      "INSERT INTO notifications (user_id, body, link_url) VALUES (?, ?, ?)",
      [
        session.userId,
        `تم إرسال عرضك بنجاح على مشروع "${project.title}". سيصلك إشعار فور مراجعة العميل لعرضك.`,
        `/projects/${projectId}`
      ]
    );

    return newId;
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");

  return {
    ok: true as const,
    proposal: {
      id: String(proposalId),
      developerUserId: session.userId,
      devName: dev.display_name,
      role: dev.job_title ?? "Full-Stack Developer",
      trustScore: Number(dev.trust_score ?? 85),
      proposedPrice: `${amount.toLocaleString("ar-EG")} ج.م`,
      deliveryDays: `${deliveryDays} يوم`,
      deliverablesText: coverLetter,
      timeAgo: "الآن",
    }
  };
}
