import { NextResponse } from "next/server";
import { z } from "zod";
import { verifySession } from "@/lib/dal";
import { queryOne } from "@/lib/db";
import { askAssistant } from "@/lib/openrouter";
import { buildAssistantContext, sanitizePageContext } from "@/lib/ai/assistant-context";
import { checkAiQuota, logAiUsage } from "@/lib/ai-quota";
import { logAiChatMessage } from "@/lib/ai-chat-logger";

export async function POST(request: Request) {
  const s = await verifySession();
  if (!s) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const enabled = await queryOne<{ setting_value: string }>(
    "SELECT setting_value FROM platform_settings WHERE setting_key='ai_assistant_enabled'"
  );
  if (enabled?.setting_value === "false") return NextResponse.json({ error: "AI_DISABLED" }, { status: 403 });

  // Check user subscription & daily/weekly quotas (unless admin)
  if (!s.isAdmin) {
    const quotaCheck = await checkAiQuota(s.userId);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: "QUOTA_EXCEEDED",
          message: quotaCheck.message,
          reason: quotaCheck.reason,
          quota: quotaCheck.details,
        },
        { status: 429 }
      );
    }
  }

  const p = z
    .object({
      sessionId: z.string().trim().max(100).optional(),
      message: z.string().trim().min(1).max(4000),
      pathname: z.string().trim().max(300).optional(),
      pageContext: z.unknown().optional(),
      history: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().max(4000),
          })
        )
        .max(20)
        .optional(),
    })
    .safeParse(await request.json().catch(() => null));

  if (!p.success) return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });

  // Compute or use persistent session key
  const sessionKey = p.data.sessionId || `session_${s.userId}_${Math.floor(Date.now() / (10 * 60 * 1000))}`;

  // Log incoming user message
  await logAiChatMessage({
    sessionKey,
    userId: s.userId,
    userRole: s.role,
    sender: "user",
    content: p.data.message,
    metadata: {
      pathname: p.data.pathname,
      pageContext: p.data.pageContext,
    },
  });

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
      history: p.data.history,
    });

    // Log AI usage for non-admins
    if (!s.isAdmin) {
      await logAiUsage(s.userId);
    }

    // Log AI assistant response
    await logAiChatMessage({
      sessionKey,
      userId: s.userId,
      userRole: s.role,
      sender: "assistant",
      content: result.answer || "",
      modelUsed: result.model || null,
      metadata: {
        projectDraft: result.projectDraft,
        actions: result.actions,
      },
    });

    return NextResponse.json({
      ...result,
      sessionId: sessionKey,
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
      history: p.data.history,
    });

    if (!s.isAdmin) {
      await logAiUsage(s.userId);
    }

    // Log fallback response
    await logAiChatMessage({
      sessionKey,
      userId: s.userId,
      userRole: s.role,
      sender: "assistant",
      content: fallbackResult.answer || "",
      modelUsed: fallbackResult.model || "fallback",
      isError: true,
      metadata: {
        error: error instanceof Error ? error.message : "AI_ERROR",
      },
    });

    return NextResponse.json({
      ...fallbackResult,
      sessionId: sessionKey,
      resultCards: [],
    });
  }
}

