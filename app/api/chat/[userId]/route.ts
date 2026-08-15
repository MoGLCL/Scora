import { NextResponse } from "next/server";
import { execute, query, queryOne } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { typingStore } from "@/lib/chat-typing-store";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { userId } = await params;
  const otherUserId = Number(userId);
  if (!Number.isInteger(otherUserId) || otherUserId <= 0 || otherUserId === session.userId) {
    return NextResponse.json({ error: "INVALID_USER" }, { status: 400 });
  }

  const receiver = await queryOne<{ id: number }>(
    `SELECT u.id
       FROM users u
       LEFT JOIN developers d ON d.user_id=u.id
      WHERE u.id=? AND u.role<>? AND u.status='active'
        AND u.onboarding_completed_at IS NOT NULL
        AND (u.role='client' OR d.approval_status='approved')`,
    [otherUserId, session.role]
  );
  if (!receiver) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // Mark all unread incoming messages from other user as read
  await execute(
    "UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=? AND is_read=0",
    [otherUserId, session.userId]
  );

  // Also automatically mark all notifications for this conversation as read
  await execute(
    "UPDATE notifications SET is_read=1 WHERE user_id=? AND (link_url=? OR link_url=? OR link_url=?) AND is_read=0",
    [session.userId, `/chat?user=${otherUserId}`, `/chat?with=${otherUserId}`, "/chat"]
  );

  const messages = await query<{
    id: number;
    body: string;
    created_at: Date;
    sender_id: number;
    is_read: number;
  }>(
    `SELECT id, body, created_at, sender_id, is_read
       FROM messages
      WHERE (sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?)
      ORDER BY created_at ASC, id ASC
      LIMIT 200`,
    [session.userId, otherUserId, otherUserId, session.userId]
  );

  // Check if other user is currently typing
  const lastTyping = typingStore.get(`${otherUserId}_${session.userId}`);
  const isTyping = Boolean(lastTyping && Date.now() - lastTyping < 3500);

  return NextResponse.json({
    currentUserId: session.userId,
    isTyping,
    messages: messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: new Date(message.created_at).toISOString(),
      senderId: message.sender_id,
      isRead: Boolean(message.is_read),
    })),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { userId } = await params;
  const otherUserId = Number(userId);
  if (!Number.isInteger(otherUserId) || otherUserId <= 0) {
    return NextResponse.json({ error: "INVALID_USER" }, { status: 400 });
  }

  const payload = await request.json().catch(() => ({}));
  if (payload.typing) {
    typingStore.set(`${session.userId}_${otherUserId}`, Date.now());
  } else {
    typingStore.delete(`${session.userId}_${otherUserId}`);
  }

  return NextResponse.json({ ok: true });
}
