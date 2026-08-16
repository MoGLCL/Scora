"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { revalidatePath } from "next/cache";

import { execute, queryOne } from "@/lib/db";
import { verifySession } from "@/lib/dal";

const MAX_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 5 * 1024 * 1024);

/** Only real raster image types — no SVG, which can carry script. */
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export interface UploadResult {
  ok: boolean;
  url?: string;
  error?: string;
}

/**
 * Persist an uploaded avatar to disk and record it in `media`, then point the
 * caller's profile row at the new URL.
 *
 * Files land in public/uploads so Next serves them statically. The filename is
 * a random UUID, never the client-supplied name, so a crafted name cannot
 * escape the directory or overwrite an existing file.
 */
export async function uploadAvatar(formData: FormData): Promise<UploadResult> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "غير مصرح لك" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "لم يتم اختيار ملف" };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `حجم الصورة أكبر من الحد المسموح (${Math.round(MAX_BYTES / 1024 / 1024)} ميجابايت)`,
    };
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return { ok: false, error: "صيغة غير مدعومة. استخدم JPG أو PNG أو WebP." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Verify the magic bytes rather than trusting the declared MIME type.
  const sniffed = sniffImageType(bytes);
  if (sniffed !== file.type) {
    return { ok: false, error: "محتوى الملف لا يطابق صيغته" };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  const url = `/uploads/${filename}`;

  const isDeveloper = session.role === "developer";
  const table = isDeveloper ? "developers" : "clients";
  const profile = await queryOne<{ id: number }>(
    `SELECT id FROM ${table} WHERE user_id = ?`,
    [session.userId]
  );
  if (!profile) return { ok: false, error: "الملف الشخصي غير موجود" };

  await execute(
    `INSERT INTO media (owner_type, owner_id, mime_type, size_bytes, url)
     VALUES (?, ?, ?, ?, ?)`,
    [isDeveloper ? "developer" : "client", profile.id, file.type, file.size, url]
  );
  await execute(`UPDATE ${table} SET avatar_url = ? WHERE id = ?`, [url, profile.id]);

  revalidatePath("/profile");
  revalidatePath("/client-profile");
  revalidatePath("/dashboard");

  return { ok: true, url };
}

export async function uploadChatImage(formData: FormData): Promise<UploadResult> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "غير مصرح لك" };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "لم يتم اختيار ملف" };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      error: `حجم الصورة أكبر من الحد المسموح (${Math.round(MAX_BYTES / 1024 / 1024)} ميجابايت)`,
    };
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return { ok: false, error: "صيغة غير مدعومة. استخدم JPG أو PNG أو WebP أو GIF." };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);
  if (sniffed !== file.type) {
    return { ok: false, error: "محتوى الملف لا يطابق صيغته" };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const filename = `chat_${randomUUID()}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  const url = `/uploads/${filename}`;

  await execute(
    `INSERT INTO media (owner_type, owner_id, mime_type, size_bytes, url)
     VALUES (?, ?, ?, ?, ?)`,
    ["chat", session.userId, file.type, file.size, url]
  );

  return { ok: true, url };
}

export async function removeAvatar(): Promise<UploadResult> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "غير مصرح لك" };

  const table = session.role === "developer" ? "developers" : "clients";
  await execute(`UPDATE ${table} SET avatar_url = NULL WHERE user_id = ?`, [
    session.userId,
  ]);
  revalidatePath("/profile");
  revalidatePath("/client-profile");
  return { ok: true };
}

/** Identify an image by its magic bytes. Returns null if unrecognised. */
function sniffImageType(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (buf.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
