import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { getAiSessionMessages } from "@/lib/ai-chat-logger";

export async function GET(
  _request: Request,
  props: { params: Promise<{ sessionKey: string }> }
) {
  const session = await verifySession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { sessionKey } = await props.params;
  if (!sessionKey) {
    return NextResponse.json({ error: "SESSION_KEY_REQUIRED" }, { status: 400 });
  }

  try {
    const messages = await getAiSessionMessages(sessionKey);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[api/admin/ai-sessions/[sessionKey]] Error fetching session messages:", error);
    return NextResponse.json({ error: "FAILED_TO_FETCH_MESSAGES" }, { status: 500 });
  }
}
