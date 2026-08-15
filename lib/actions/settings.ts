"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { z } from "zod";
import { encryptSecret, openRouterConfig } from "@/lib/openrouter";

export async function setAiAssistantEnabled(enabled: boolean) {
  const session = await verifySession();
  if (!session?.isAdmin) return { ok: false as const, error: "FORBIDDEN" };
  await execute(
    `INSERT INTO platform_settings (setting_key, setting_value) VALUES ('ai_assistant_enabled', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [String(enabled)]
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setQuickRegistrationEnabled(enabled: boolean) {
  const session = await verifySession();
  if (!session?.isAdmin) return { ok: false as const, error: "FORBIDDEN" };
  await execute(
    `INSERT INTO platform_settings(setting_key,setting_value) VALUES('quick_registration_enabled',?)
     ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,
    [String(enabled)]
  );
  revalidatePath("/admin");
  revalidatePath("/register");
  return { ok: true as const };
}

export async function setUserAiAssistantEnabled(enabled: boolean) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "غير مصرح لك" };
  await execute(
    `INSERT INTO user_settings (user_id, setting_key, setting_value)
     VALUES (?, 'ai_assistant_enabled', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [session.userId, String(enabled)]
  );
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setOpenRouterSettings(input: {
  apiKey?: string;
  model: string;
  siteUrl: string;
  siteTitle: string;
}) {
  const session = await verifySession();
  if (!session?.isAdmin) return { ok: false as const, error: "FORBIDDEN" };

  const p = z
    .object({
      apiKey: z.string().trim().optional(),
      model: z.string().trim().min(2).max(255),
      siteUrl: z.string().url().max(500).or(z.literal("")),
      siteTitle: z.string().trim().min(1).max(255),
    })
    .safeParse(input);

  if (!p.success) return { ok: false as const, error: "إعدادات OpenRouter غير صالحة" };

  const entries: [string, string][] = [
    ["openrouter_model", p.data.model],
    ["openrouter_site_url", p.data.siteUrl],
    ["openrouter_site_title", p.data.siteTitle],
  ];

  for (const [key, value] of entries) {
    await execute(
      "INSERT INTO platform_settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
      [key, value]
    );
  }

  if (p.data.apiKey && p.data.apiKey.trim().length > 5) {
    await execute(
      "INSERT INTO platform_settings(setting_key,setting_value) VALUES('openrouter_api_key',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",
      [encryptSecret(p.data.apiKey.trim())]
    );
  }

  revalidatePath("/admin");
  return { ok: true as const };
}

export async function testOpenRouterAiConnection(targetModel?: string) {
  const session = await verifySession();
  if (!session?.isAdmin) return { ok: false as const, error: "FORBIDDEN" };

  const config = await openRouterConfig();
  const modelToTest = targetModel || config.model || "google/gemini-2.0-flash-exp:free";
  const apiKey = config.apiKey;

  if (!apiKey) {
    return { ok: false as const, error: "لم يتم حفظ OpenRouter API Key بعد" };
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": config.siteUrl || "https://scora.alwaysdata.net",
        "X-OpenRouter-Title": config.siteTitle || "SCORA",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelToTest,
        messages: [{ role: "user", content: "Say hello in Arabic in 2 words only" }],
        max_tokens: 30,
        temperature: 0.1,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        ok: false as const,
        error: `تعذر الاتصال بالموديل (HTTP ${res.status}): ${errText.slice(0, 100)}`,
        status: res.status,
      };
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "مرحباً بك";

    return {
      ok: true as const,
      latencyMs,
      model: modelToTest,
      reply: reply.trim(),
    };
  } catch (err: unknown) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "فشل الاتصال بـ OpenRouter",
    };
  } finally {
    clearTimeout(timer);
  }
}
