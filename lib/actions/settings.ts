"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function setAiAssistantEnabled(enabled: boolean) {
  const session = await verifySession();
  if (!session || session.role !== "admin") return { ok: false as const, error: "FORBIDDEN" };
  await execute(`INSERT INTO platform_settings (setting_key, setting_value) VALUES ('ai_assistant_enabled', ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`, [String(enabled)]);
  revalidatePath("/", "layout");
  return { ok: true as const };
}
