import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { getAiChatSessions, deleteAiSession } from "@/lib/ai-chat-logger";

export async function GET(request: Request) {
  const session = await verifySession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const limit = Number(searchParams.get("limit") || "20");
  const search = searchParams.get("search") || "";
  const role = searchParams.get("role") || "all";
  const status = searchParams.get("status") || "all";

  try {
    const data = await getAiChatSessions({
      page,
      limit,
      search,
      role,
      status,
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("[api/admin/ai-sessions] Error fetching AI sessions:", error);
    return NextResponse.json({ error: "FAILED_TO_FETCH_SESSIONS" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await verifySession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const sessionKey = searchParams.get("sessionKey");

  if (!sessionKey) {
    return NextResponse.json({ error: "SESSION_KEY_REQUIRED" }, { status: 400 });
  }

  try {
    await deleteAiSession(sessionKey);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/admin/ai-sessions] Error deleting session:", error);
    return NextResponse.json({ error: "FAILED_TO_DELETE_SESSION" }, { status: 500 });
  }
}
