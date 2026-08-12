import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const totals = await queryOne<{ users: number; active: number; visits: number; visitors: number }>(
    `SELECT (SELECT COUNT(*) FROM users) users,
            (SELECT COUNT(*) FROM users WHERE status='active' AND last_seen_at>=NOW()-INTERVAL 15 MINUTE) active,
            (SELECT COUNT(*) FROM page_views) visits,
            (SELECT COUNT(DISTINCT COALESCE(user_id,CONCAT('guest-',id))) FROM page_views) visitors`
  );
  const daily = await query<{ day: string; visits: number }>(
    `SELECT DATE(viewed_at) day,COUNT(*) visits FROM page_views
     WHERE viewed_at>=CURDATE()-INTERVAL 6 DAY GROUP BY DATE(viewed_at) ORDER BY day`
  );
  const settingsRows = await query<{ setting_key: string; setting_value: string }>(
    "SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('ai_assistant_enabled','quick_registration_enabled')"
  );
  const settings = Object.fromEntries(settingsRows.map((row) => [row.setting_key, row.setting_value !== "false"]));
  return NextResponse.json({ totals, daily, settings });
}
