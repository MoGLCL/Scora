import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { queryOne } from "@/lib/db";
import { askAssistant } from "@/lib/openrouter";
import { buildAssistantContext, sanitizePageContext } from "@/lib/ai/assistant-context";

export async function POST(request: Request) {
  const s = await verifySession();
  if (!s) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const enabled = await queryOne<{ setting_value: string }>(
    "SELECT setting_value FROM platform_settings WHERE setting_key='ai_assistant_enabled'"
  );
  if (enabled?.setting_value === "false") return NextResponse.json({ error: "AI_DISABLED" }, { status: 403 });

  const p = z
    .object({
      message: z.string().trim().min(1).max(4000),
      pathname: z.string().trim().max(300).optional(),
      pageContext: z.unknown().optional(),
    })
    .safeParse(await request.json().catch(() => null));

  if (!p.success) return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });

  try {
    const [context, totals] = await Promise.all([
      buildAssistantContext({
        userId: s.userId,
        role: s.role,
        isAdmin: s.isAdmin,
        pathname: p.data.pathname,
        page: sanitizePageContext(p.data.pageContext),
        message: p.data.message,
      }),
      s.isAdmin
        ? queryOne<{ users: number; developers: number; clients: number; pending: number; projects: number }>(
            `SELECT (SELECT COUNT(*) FROM users) users,
                    (SELECT COUNT(*) FROM users WHERE role='developer') developers,
                    (SELECT COUNT(*) FROM users WHERE role='client') clients,
                    (SELECT COUNT(*) FROM developers WHERE approval_status='admin_review') pending,
                    (SELECT COUNT(*) FROM projects) projects`
          )
        : Promise.resolve(null),
    ]);
    const result = await askAssistant({
      message: p.data.message,
      role: s.role,
      isAdmin: s.isAdmin,
      context: { platformTotals: totals, ...context },
    });

    return NextResponse.json({
      ...result,
      resultCards: [...context.developers, ...context.projects],
      adminReport: context.adminReport,
      pendingAdminAction: context.pendingAdminAction,
    });
  } catch (error) {
    console.error("[ai-chat]", error);
    const fallbackResult = await askAssistant({
      message: p.data.message,
      role: s.role,
      isAdmin: s.isAdmin,
      context: {},
    });
    return NextResponse.json({
      ...fallbackResult,
      resultCards: [],
    });
  }
}
