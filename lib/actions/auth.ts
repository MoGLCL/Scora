"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { execute, queryOne, transaction } from "@/lib/db";
import { createSession } from "@/lib/session";
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
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "اسم المستخدم 3 أحرف على الأقل")
    .max(30, "اسم المستخدم 30 حرفاً كحد أقصى")
    .regex(/^[a-z0-9_]+$/, "اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام أو _ فقط"),
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
  const registrationSetting = await queryOne<{ setting_value: string }>(
    "SELECT setting_value FROM platform_settings WHERE setting_key='quick_registration_enabled'"
  );
  if (registrationSetting?.setting_value === "false") {
    return { ok: false, error: "التسجيل الجديد متوقف مؤقتًا بواسطة إدارة المنصة" };
  }
  const parsed = RegisterSchema.safeParse({
    fullName: formData.get("fullName"),
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") ?? "developer",
  });

  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { fullName, username, email, password, role } = parsed.data;

  const existingEmail = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE email = ?",
    [email]
  );
  if (existingEmail) {
    return { ok: false, error: "البريد الإلكتروني مسجّل بالفعل" };
  }

  const existingUsername = await queryOne<{ id: number }>(
    "SELECT id FROM users WHERE username = ?",
    [username]
  );
  if (existingUsername) {
    return { ok: false, error: "اسم المستخدم مأخوذ بالفعل، يرجى اختيار اسم مستخدم آخر" };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // The user row and its role-specific profile must both exist or neither.
  const userId = await transaction(async (conn) => {
    const [res] = await conn.execute(
      "INSERT INTO users (email, password_hash, full_name, username, role) VALUES (?, ?, ?, ?, ?)",
      [email, passwordHash, fullName, username, role]
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

  await createSession(userId, role, false, false, role !== "developer", true);

  const redirectTo = role === "developer" ? "/complete-profile" : "/complete-client-profile";

  return {
    ok: true,
    role,
    redirectTo,
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
    "SELECT u.id, u.username, u.email, u.password_hash, u.role, u.is_admin, u.status, u.suspended_until, u.onboarding_completed_at, d.approval_status FROM users u LEFT JOIN developers d ON d.user_id=u.id WHERE u.email = ?",
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

  const hasUser = Boolean(user.username && user.username.trim().length > 0);
  const isDeveloperApproved = user.role === "developer" && user.approval_status === "approved";
  const isOnboardingDone = Boolean(user.onboarding_completed_at) || isDeveloperApproved;

  await execute("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
  await createSession(
    user.id,
    user.role,
    isOnboardingDone,
    Boolean(user.is_admin),
    user.role !== "developer" || isDeveloperApproved,
    hasUser
  );

  const redirectTo = !hasUser
    ? "/choose-username"
    : isOnboardingDone
    ? homeFor(Boolean(user.is_admin))
    : user.role === "developer"
    ? "/complete-profile"
    : "/complete-client-profile";
  return { ok: true, role: user.role, redirectTo };
}
