"use server";

import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_IMAGES = 8;
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "portfolio");
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ProjectSchema = z.object({
  title: z.string().trim().min(3, "عنوان المشروع يجب أن يكون 3 أحرف على الأقل").max(255),
  description: z.string().trim().max(10000).optional().default(""),
  previewUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  githubUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  isOpenSource: z.boolean().default(false),
  projectStatus: z.enum(["completed", "in_progress"]).default("completed"),
  executionTime: z.string().trim().max(100).optional().default(""),
  startDate: z.string().trim().max(100).optional().default(""),
  technologies: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
});

const ReviewSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default(""),
});

export interface PortfolioActionResult {
  ok: boolean;
  error?: string;
  projectId?: number;
}

export async function createPortfolioProject(formData: FormData): Promise<PortfolioActionResult> {
  const session = await verifySession();
  if (!session || session.role !== "developer") return { ok: false, error: "إضافة المشاريع متاحة للمطورين فقط" };

  const developer = await queryOne<{ id: number }>("SELECT id FROM developers WHERE user_id = ?", [session.userId]);
  if (!developer) return { ok: false, error: "ملف المطور غير موجود" };

  const technologies = formData.getAll("technologies").map(String).map((value) => value.trim()).filter(Boolean);
  const rawIsOpenSource = formData.get("isOpenSource");
  const isOpenSource = rawIsOpenSource === "true" || rawIsOpenSource === "1" || rawIsOpenSource === "on";

  const parsed = ProjectSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    previewUrl: formData.get("previewUrl") ?? "",
    githubUrl: formData.get("githubUrl") ?? "",
    isOpenSource,
    projectStatus: formData.get("projectStatus") ?? "completed",
    executionTime: formData.get("executionTime") ?? "",
    startDate: formData.get("startDate") ?? "",
    technologies,
  });
  if (!parsed.success) {
    const firstErr = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || "راجع البيانات المدخلة للمشروع";
    return { ok: false, error: firstErr };
  }

  const files = formData.getAll("images").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return { ok: false, error: "أضف صورة واحدة على الأقل للمشروع" };
  if (files.length > MAX_IMAGES) return { ok: false, error: `الحد الأقصى للصور هو ${MAX_IMAGES}` };
  if (files.some((file) => file.size > MAX_IMAGE_BYTES || !IMAGE_TYPES.has(file.type))) {
    return { ok: false, error: "استخدم صور JPG أو PNG أو WebP بحجم لا يتجاوز 6 ميجابايت للصورة" };
  }

  const savedFiles: string[] = [];
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    for (const file of files) savedFiles.push(await saveWatermarkedImage(file));

    const projectId = await transaction(async (conn) => {
      const [projectResult] = await conn.execute(
        `INSERT INTO developer_projects (
          developer_id, title, description, preview_url, github_url,
          is_open_source, project_status, execution_time, start_date, technologies_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          developer.id,
          parsed.data.title,
          parsed.data.description || null,
          parsed.data.previewUrl || null,
          parsed.data.githubUrl || null,
          parsed.data.isOpenSource ? 1 : 0,
          parsed.data.projectStatus,
          parsed.data.executionTime || null,
          parsed.data.startDate || null,
          JSON.stringify(parsed.data.technologies),
        ]
      );
      const id = Number((projectResult as { insertId: number }).insertId);
      for (const [index, url] of savedFiles.entries()) {
        await conn.execute(
          "INSERT INTO developer_project_images (project_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?)",
          [id, url, parsed.data.title, index]
        );
      }
      return id;
    });

    revalidatePath(`/developers/${developer.id}`);
    revalidatePath(`/profile/${session.userId}`);
    revalidatePath(`/portfolio/${projectId}`);
    return { ok: true, projectId };
  } catch (error) {
    await Promise.all(savedFiles.map((url) => unlink(path.join(process.cwd(), "public", url)).catch(() => undefined)));
    console.error("[portfolio:create]", error);
    return { ok: false, error: "تعذر حفظ المشروع. حاول مرة أخرى" };
  }
}

export async function savePortfolioReview(input: {
  projectId: number | string;
  rating: number | string;
  comment?: string;
}): Promise<PortfolioActionResult> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "سجل الدخول لإضافة تقييم" };
  const parsed = ReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "التقييم يجب أن يكون بين نجمة و5 نجوم" };

  const project = await queryOne<{ id: number; title: string; developer_id: number; developer_user_id: number }>(
    `SELECT dp.id, dp.title, dp.developer_id, d.user_id AS developer_user_id
     FROM developer_projects dp JOIN developers d ON d.id = dp.developer_id
     WHERE dp.id = ?`,
    [parsed.data.projectId]
  );
  if (!project) return { ok: false, error: "المشروع غير موجود" };
  if (project.developer_user_id === session.userId) return { ok: false, error: "لا يمكنك تقييم مشروعك" };

  const existingReview = await queryOne<{ rating: number }>(
    "SELECT rating FROM developer_project_reviews WHERE project_id = ? AND reviewer_user_id = ?",
    [parsed.data.projectId, session.userId]
  );

  const setting = await queryOne<{ setting_value: string }>(
    "SELECT setting_value FROM platform_settings WHERE setting_key = 'sp_per_project_star'"
  );
  const spPerStar = setting ? parseInt(setting.setting_value, 10) || 5 : 5;

  const newRating = Number(parsed.data.rating);
  const oldRating = existingReview ? Number(existingReview.rating) : 0;
  const spDiff = (newRating - oldRating) * spPerStar;

  await transaction(async (c) => {
    await c.execute(
      `INSERT INTO developer_project_reviews (project_id, reviewer_user_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP`,
      [parsed.data.projectId, session.userId, newRating, parsed.data.comment || null]
    );

    if (spDiff !== 0) {
      await c.execute(
        "UPDATE developers SET skill_points = GREATEST(0, skill_points + ?) WHERE id = ?",
        [spDiff, project.developer_id]
      );
    }

    const reviewer = await queryOne<{ full_name: string }>("SELECT full_name FROM users WHERE id = ?", [session.userId]);
    const reviewerName = reviewer?.full_name || "مستخدم";

    await c.execute(
      "INSERT INTO notifications (user_id, body, link_url) VALUES (?, ?, ?)",
      [
        project.developer_user_id,
        `قيم ${reviewerName} مشروعك "${project.title}" بـ ${newRating} نجوم (+${newRating * spPerStar} SP).`,
        `/portfolio/${parsed.data.projectId}`
      ]
    );
  });

  revalidatePath(`/portfolio/${parsed.data.projectId}`);
  revalidatePath(`/profile`);
  revalidatePath(`/developers`);
  return { ok: true, projectId: parsed.data.projectId };
}

async function saveWatermarkedImage(file: File): Promise<string> {
  const input = Buffer.from(await file.arrayBuffer());
  const image = sharp(input, { failOn: "error" });
  const metadata = await image.metadata();
  const width = Math.max(1, metadata.width ?? 1200);
  const height = Math.max(1, metadata.height ?? 800);
  const fontSize = Math.max(22, Math.round(Math.min(width, height) * 0.06));
  const watermark = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${width - 28}" y="${height - 28}" text-anchor="end" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="2" fill="white" fill-opacity="0.72" stroke="#05291A" stroke-opacity="0.45" stroke-width="2">Scora</text>
    </svg>`
  );
  const output = await image.composite([{ input: watermark }]).toFormat(file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpeg", { quality: 88 }).toBuffer();
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(UPLOAD_DIR, filename), output);
  return `/uploads/portfolio/${filename}`;
}
