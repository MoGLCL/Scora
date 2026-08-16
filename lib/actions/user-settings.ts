"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { execute, query, queryOne } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export interface UserSessionItem {
  id: number;
  deviceName: string;
  browser: string;
  ipAddress: string;
  location: string;
  isCurrent: boolean;
  status: "active" | "logged_out" | "revoked";
  createdAt: string;
  lastActiveAt: string;
}

export interface UserSettingsFullData {
  user: {
    id: number;
    fullName: string;
    username: string;
    email: string;
    phone: string;
    role: "developer" | "client";
    isAdmin: boolean;
    is2faEnabled: boolean;
    avatarUrl: string | null;
    createdAt: string;
  };
  devProfile?: {
    jobTitle: string;
    bio: string;
    location: string;
    availability: "available" | "busy";
    github: string;
    linkedin: string;
    website: string;
    skills: string[];
  } | null;
  clientData?: {
    accountType: "personal" | "company";
    companyName: string | null;
    taxId: string | null;
    industry: string | null;
    companySize: string | null;
    website: string | null;
    location: string | null;
  } | null;
  aiPreferences: {
    enabled: boolean;
    mode: "creative" | "balanced" | "strict";
    tone: "egyptian_friendly" | "formal_arabic" | "technical_english";
    autoSuggest: boolean;
  };
  sessions: UserSessionItem[];
}

// ─── 1. Get User Full Settings ────────────────────────────────────
export async function getUserSettingsData(): Promise<
  { ok: true; data: UserSettingsFullData } | { ok: false; error: string }
> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "سجل الدخول أولاً" };

  const user = await queryOne<{
    id: number;
    full_name: string;
    username: string | null;
    email: string;
    phone: string | null;
    role: "developer" | "client";
    is_admin: number;
    is_2fa_enabled: number;
    created_at: Date;
  }>("SELECT id, full_name, username, email, phone, role, is_admin, is_2fa_enabled, created_at FROM users WHERE id=?", [
    session.userId,
  ]);

  if (!user) return { ok: false, error: "المستخدم غير موجود" };

  let devProfile = null;
  let clientData = null;
  let avatarUrl: string | null = null;

  if (user.role === "developer") {
    const d = await queryOne<{
      display_name: string;
      job_title: string | null;
      bio: string | null;
      location: string | null;
      availability: "available" | "busy";
      avatar_url: string | null;
      github_url: string | null;
      linkedin_url: string | null;
      portfolio_url: string | null;
    }>("SELECT display_name, job_title, bio, location, availability, avatar_url, github_url, linkedin_url, portfolio_url FROM developers WHERE user_id=?", [
      session.userId,
    ]);

    const devSkills = (
      await query<{ name: string }>(
        `SELECT s.name FROM developer_skills ds JOIN skills s ON s.id = ds.skill_id
         JOIN developers d ON d.id = ds.developer_id WHERE d.user_id = ?`,
        [session.userId]
      )
    ).map((s) => s.name);

    if (d) {
      avatarUrl = d.avatar_url;
      devProfile = {
        jobTitle: d.job_title || "",
        bio: d.bio || "",
        location: d.location || "القاهرة",
        availability: d.availability || "available",
        github: d.github_url || "",
        linkedin: d.linkedin_url || "",
        website: d.portfolio_url || "",
        skills: devSkills,
      };
    }
  } else {
    const c = await queryOne<{
      display_name: string;
      account_type: "personal" | "company";
      company_name: string | null;
      tax_id: string | null;
      industry: string | null;
      company_size: string | null;
      website: string | null;
      location: string | null;
      avatar_url: string | null;
    }>("SELECT display_name, account_type, company_name, tax_id, industry, company_size, website, location, avatar_url FROM clients WHERE user_id=?", [
      session.userId,
    ]);
    if (c) {
      avatarUrl = c.avatar_url;
      clientData = {
        accountType: c.account_type || "personal",
        companyName: c.company_name,
        taxId: c.tax_id,
        industry: c.industry,
        companySize: c.company_size,
        website: c.website,
        location: c.location || "القاهرة",
      };
    }
  }

  // User Settings (AI preferences)
  const settingsRows = await query<{ setting_key: string; setting_value: string }>(
    "SELECT setting_key, setting_value FROM user_settings WHERE user_id=?",
    [session.userId]
  );
  const settingsMap = new Map(settingsRows.map((r) => [r.setting_key, r.setting_value]));

  const aiPreferences = {
    enabled: settingsMap.get("ai_assistant_enabled") !== "false",
    mode: (settingsMap.get("ai_mode_preference") || "balanced") as "creative" | "balanced" | "strict",
    tone: (settingsMap.get("ai_tone_preference") || "egyptian_friendly") as
      | "egyptian_friendly"
      | "formal_arabic"
      | "technical_english",
    autoSuggest: settingsMap.get("ai_auto_suggest") !== "false",
  };

  // User Login Sessions
  const sessionRows = await query<{
    id: number;
    device_name: string;
    browser: string;
    ip_address: string;
    location: string;
    is_current: number;
    status: "active" | "logged_out" | "revoked";
    created_at: Date;
    last_active_at: Date;
  }>(
    "SELECT id, device_name, browser, ip_address, location, is_current, status, created_at, last_active_at FROM user_login_sessions WHERE user_id=? ORDER BY is_current DESC, last_active_at DESC LIMIT 20",
    [session.userId]
  );

  return {
    ok: true,
    data: {
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username || "",
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        isAdmin: Boolean(user.is_admin),
        is2faEnabled: Boolean(user.is_2fa_enabled),
        avatarUrl,
        createdAt: new Date(user.created_at).toISOString(),
      },
      devProfile,
      clientData,
      aiPreferences,
      sessions: sessionRows.map((s) => ({
        id: s.id,
        deviceName: s.device_name,
        browser: s.browser,
        ipAddress: s.ip_address,
        location: s.location,
        isCurrent: Boolean(s.is_current),
        status: s.status,
        createdAt: new Date(s.created_at).toISOString(),
        lastActiveAt: new Date(s.last_active_at).toISOString(),
      })),
    },
  };
}

// ─── 2. Change Password ───────────────────────────────────────────
const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
    newPassword: z.string().min(8, "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف"),
    confirmPassword: z.string().min(1, "تأكيد كلمة المرور مطلوب"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "كلمة المرور وتأكيدها غير متطابقين",
    path: ["confirmPassword"],
  });

export async function changeUserPassword(input: z.infer<typeof PasswordSchema>) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "سجل الدخول أولاً" };

  const parsed = PasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "بيانات غير صالحة" };
  }

  const user = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id=?", [
    session.userId,
  ]);
  if (!user) return { ok: false as const, error: "المستخدم غير موجود" };

  const isValid = await bcrypt.compare(parsed.data.currentPassword, user.password_hash);
  if (!isValid) return { ok: false as const, error: "كلمة المرور الحالية غير صحيحة" };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await execute("UPDATE users SET password_hash=? WHERE id=?", [newHash, session.userId]);

  return { ok: true as const };
}

// ─── 3. Toggle Two-Factor Authentication (2FA) ────────────────────
export async function toggleTwoFactorAuth(input: { enabled: boolean; code?: string }) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "سجل الدخول أولاً" };

  if (input.enabled) {
    if (!input.code || input.code.trim().length !== 6) {
      return { ok: false as const, error: "رمز التحقق يجب أن يتكون من 6 أرقام" };
    }
    await execute("UPDATE users SET is_2fa_enabled=1, two_factor_secret='SCORA-SEC-2026-PRO' WHERE id=?", [
      session.userId,
    ]);
  } else {
    await execute("UPDATE users SET is_2fa_enabled=0, two_factor_secret=NULL WHERE id=?", [session.userId]);
  }

  revalidatePath("/settings");
  return { ok: true as const };
}

// ─── 4. Revoke Active Sessions ────────────────────────────────────
export async function revokeUserSession(sessionId: number) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "غير مصرح لك" };

  await execute("UPDATE user_login_sessions SET status='revoked' WHERE id=? AND user_id=? AND is_current=0", [
    sessionId,
    session.userId,
  ]);

  revalidatePath("/settings");
  return { ok: true as const };
}

export async function revokeAllOtherSessions() {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "غير مصرح لك" };

  await execute("UPDATE user_login_sessions SET status='logged_out' WHERE user_id=? AND is_current=0", [
    session.userId,
  ]);

  revalidatePath("/settings");
  return { ok: true as const };
}

// ─── 5. Save AI Preferences ───────────────────────────────────────
export async function saveUserAiPreferences(input: {
  enabled: boolean;
  mode: "creative" | "balanced" | "strict";
  tone: "egyptian_friendly" | "formal_arabic" | "technical_english";
  autoSuggest: boolean;
}) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "غير مصرح لك" };

  const settings: [string, string][] = [
    ["ai_assistant_enabled", String(input.enabled)],
    ["ai_mode_preference", input.mode],
    ["ai_tone_preference", input.tone],
    ["ai_auto_suggest", String(input.autoSuggest)],
  ];

  for (const [k, v] of settings) {
    await execute(
      `INSERT INTO user_settings (user_id, setting_key, setting_value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,
      [session.userId, k, v]
    );
  }

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: true as const };
}

// ─── 6. Save Client Company Settings ──────────────────────────────
export async function saveClientCompanySettings(input: {
  accountType: "personal" | "company";
  companyName?: string;
  taxId?: string;
  industry?: string;
  companySize?: string;
  website?: string;
}) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "غير مصرح لك" };

  await execute(
    `UPDATE clients
        SET account_type = ?,
            company_name = ?,
            tax_id = ?,
            industry = ?,
            company_size = ?,
            website = ?
      WHERE user_id = ?`,
    [
      input.accountType,
      input.accountType === "company" ? input.companyName || null : null,
      input.accountType === "company" ? input.taxId || null : null,
      input.accountType === "company" ? input.industry || null : null,
      input.accountType === "company" ? input.companySize || null : null,
      input.website || null,
      session.userId,
    ]
  );

  revalidatePath("/settings");
  revalidatePath("/complete-client-profile");
  return { ok: true as const };
}
