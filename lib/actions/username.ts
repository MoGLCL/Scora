"use server";

import { z } from "zod";
import { queryOne, execute } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

const UsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل")
    .max(30, "اسم المستخدم يجب ألا يتجاوز 30 حرفاً")
    .regex(/^[a-zA-Z0-9_]+$/, "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام أو _ فقط"),
});

export async function setMandatoryUsername(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData
) {
  const session = await verifySession();
  if (!session) {
    return { error: "يرجى تسجيل الدخول أولاً" };
  }

  const rawUsername = formData.get("username");
  const parsed = UsernameSchema.safeParse({ username: rawUsername });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "اسم المستخدم غير صالح" };
  }

  const cleanUsername = parsed.data.username.toLowerCase();

  // Check if username is already taken by another user
  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE username = ? AND id != ?",
    [cleanUsername, session.userId]
  );

  if (existing) {
    return { error: "اسم المستخدم مأخوذ بالفعل، يرجى اختيار اسم مستخدم آخر" };
  }

  // Update MySQL users table
  await execute("UPDATE users SET username = ? WHERE id = ?", [
    cleanUsername,
    session.userId,
  ]);

  // Refresh session cookie with hasUsername = true
  await createSession(
    session.userId,
    session.role,
    session.onboardingCompleted,
    session.isAdmin,
    session.role !== "developer" || session.developerApprovalStatus === "approved",
    true
  );

  revalidatePath("/", "layout");

  const redirectTo = session.onboardingCompleted
    ? session.isAdmin
      ? "/admin"
      : "/dashboard"
    : session.role === "developer"
    ? "/complete-profile"
    : "/complete-client-profile";

  return { ok: true, redirectTo };
}
