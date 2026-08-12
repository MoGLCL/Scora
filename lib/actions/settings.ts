"use server";

import { revalidatePath } from "next/cache";
import { execute } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { z } from "zod";
import { encryptSecret } from "@/lib/openrouter";

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

export async function setOpenRouterSettings(input:{apiKey?:string;model:string;siteUrl:string;siteTitle:string}){const session=await verifySession();if(!session?.isAdmin)return{ok:false as const,error:"FORBIDDEN"};const p=z.object({apiKey:z.string().trim().optional(),model:z.string().trim().min(2).max(255),siteUrl:z.string().url().max(500),siteTitle:z.string().trim().min(1).max(255)}).safeParse(input);if(!p.success)return{ok:false as const,error:"إعدادات OpenRouter غير صالحة"};const entries:[[string,string],[string,string],[string,string]]=[["openrouter_model",p.data.model],["openrouter_site_url",p.data.siteUrl],["openrouter_site_title",p.data.siteTitle]];for(const [key,value] of entries)await execute("INSERT INTO platform_settings(setting_key,setting_value) VALUES(?,?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",[key,value]);if(p.data.apiKey)await execute("INSERT INTO platform_settings(setting_key,setting_value) VALUES('openrouter_api_key',?) ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)",[encryptSecret(p.data.apiKey)]);revalidatePath("/admin");return{ok:true as const}}
