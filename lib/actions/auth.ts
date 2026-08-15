"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { execute, queryOne, transaction } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { verifySession } from "@/lib/dal";
import type { AppRole, UserRow } from "@/lib/types";

const BCRYPT_ROUNDS = 12;

export interface AuthState {
  ok?: boolean;
  /** Where the caller should navigate on success. */
  redirectTo?: string;
  role?: AppRole;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const RegisterSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(255),
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل")
    .regex(/[a-zA-Z]/, "لازم تحتوي على حرف")
    .regex(/[0-9]/, "لازم تحتوي على رقم"),
  role: z.enum(["developer", "client"]),
});

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "أدخل كلمة المرور"),
});

/** Landing page for a freshly authenticated user. */
function homeFor(isAdmin: boolean): string {
  return isAdmin ? "/admin" : "/dashboard";
}

export async function register(
  _prev: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const registrationSetting=await queryOne<{setting_value:string}>("SELECT setting_value FROM platform_settings WHERE setting_key='quick_registration_enabled'");
  if(registrationSetting?.setting_value==="false")return{ok:false,error:"التسجيل الجديد متوقف مؤقتًا بواسطة إدارة المنصة"};
  const parsed = RegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "developer",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { fullName, email, password, role } = parsed.data;

  const existing = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );
  if (existing) {
    return { ok: false, error: "البريد الإلكتروني مسجّل بالفعل" };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // The user row and its role-specific profile must both exist or neither.
  const userId = await transaction(async (conn) => {
    const [res] = await conn.execute(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)",
      [email, passwordHash, fullName, role]
    );
    const newId = (res as { insertId: number }).insertId;

    if (role === "developer") {
      await conn.execute(
        "INSERT INTO developers (user_id, display_name, availability) VALUES (?, ?, 'soon')",
        [newId, fullName]
      );
    } else {
      await conn.execute(
        "INSERT INTO clients (user_id, display_name) VALUES (?, ?)",
        [newId, fullName]
      );
    }
    return newId;
  });

  await createSession(userId, role, false);

  return {
    ok: true,
    role,
    redirectTo: role === "developer" ? "/complete-profile" : "/complete-client-profile",
  };
}

export async function login(
  _prev: AuthState | undefined,
  formData: FormData
): Promise<AuthState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { email, password } = parsed.data;

  const user = await queryOne<UserRow & { approval_status: string | null }>(
    "SELECT u.id, u.email, u.password_hash, u.role, u.is_admin, u.status, u.suspended_until, u.onboarding_completed_at, d.approval_status FROM users u LEFT JOIN developers d ON d.user_id=u.id WHERE u.email = ?",
    [email]
  );

  // Compare against a dummy hash when the user is missing so that a wrong
  // email and a wrong password take the same time to answer.
  const hash = user?.password_hash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    return { ok: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }

  if (user.status === "banned") {
    return { ok: false, error: "تم حظر هذا الحساب نهائيًا. راسل الدعم لمزيد من التفاصيل." };
  }

  if (user.status === "suspended") {
    const until = user.suspended_until ? new Date(user.suspended_until) : null;
    // An expired suspension lifts itself rather than needing an admin to revisit it.
    if (until && until.getTime() > Date.now()) {
      const when = until.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      return { ok: false, error: `الحساب موقوف مؤقتًا حتى ${when}.` };
    }
    await execute(
      "UPDATE users SET status = 'active', suspended_until = NULL WHERE id = ?",
      [user.id]
    );
  }

  await execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
  await createSession(user.id, user.role, Boolean(user.onboarding_completed_at), Boolean(user.is_admin), user.role!=="developer"||user.approval_status==="approved");

  const redirectTo = user.onboarding_completed_at
    ? homeFor(Boolean(user.is_admin))
    : user.role === "developer" ? "/complete-profile" : "/complete-client-profile";
  return { ok: true, role: user.role, redirectTo };
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}

/** Update the signed-in user's password. */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ ok: boolean; error?: string }> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "غير مصرح لك" };

  const strong = z
    .string()
    .min(8, "كلمة المرور 8 أحرف على الأقل")
    .regex(/[a-zA-Z]/, "لازم تحتوي على حرف")
    .regex(/[0-9]/, "لازم تحتوي على رقم")
    .safeParse(newPassword);
  if (!strong.success) {
    return { ok: false, error: strong.error.issues[0]?.message ?? "كلمة مرور ضعيفة" };
  }

  const user = await queryOne<UserRow>(
    "SELECT id, password_hash FROM users WHERE id = ?",
    [session.userId]
  );
  if (!user) return { ok: false, error: "المستخدم غير موجود" };

  const ok = await bcrypt.compare(currentPassword, user.password_hash);
  if (!ok) return { ok: false, error: "كلمة المرور الحالية غير صحيحة" };

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await execute("UPDATE users SET password_hash = ? WHERE id = ?", [hash, session.userId]);
  return { ok: true };
}
