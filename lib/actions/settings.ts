"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function setAiAssistantEnabled(enabled: boolean) {
  const session = await verifySession();
  if (!session?.isAdmin) return { ok: false as const, error: "FORBIDDEN" };
  await execute(`INSERT INTO platform_settings (setting_key, setting_value) VALUES ('ai_assistant_enabled', ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`, [String(enabled)]);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setQuickRegistrationEnabled(enabled:boolean){const session=await verifySession();if(!session?.isAdmin)return{ok:false as const,error:"FORBIDDEN"};await execute(`INSERT INTO platform_settings(setting_key,setting_value) VALUES('quick_registration_enabled',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)`,[String(enabled)]);revalidatePath("/admin");revalidatePath("/register");return{ok:true as const}}

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
