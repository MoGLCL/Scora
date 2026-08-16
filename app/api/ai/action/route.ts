import { NextResponse } from "next/server";
import { z } from "zod";

import { verifySkillPointsActionToken } from "@/lib/ai/assistant-action";
import { adjustSkillPointsForAdmin } from "@/lib/actions/admin";
import { verifySession } from "@/lib/dal";

export async function POST(request: Request) {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const parsed = z.object({ token: z.string().min(20).max(2_000) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });

  const action = verifySkillPointsActionToken(parsed.data.token);
  if (!action || action.actorUserId !== session.userId) {
    return NextResponse.json({ error: "ACTION_EXPIRED_OR_INVALID" }, { status: 409 });
  }

  const result = await adjustSkillPointsForAdmin({
    targetUserId: action.targetUserId,
    delta: action.delta,
    expectedSkillPoints: action.expectedSkillPoints,
    reason: "Confirmed from SSD assistant",
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, result: result.target });
}
