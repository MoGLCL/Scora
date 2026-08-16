import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const conversations = await query<{
      id: number;
      name: string;
      username: string | null;
      kind: string;
      avatar: string | null;
      last_body: string;
      last_at: Date;
      unread: number;
      last_seen_at: Date | null;
    }>(
      `SELECT u.id,
              u.full_name as name,
              u.username,
              u.last_seen_at,
              CASE WHEN u.role='developer' THEN 'مطور' WHEN c.account_type='company' THEN 'شركة' ELSE 'عميل' END as kind,
              COALESCE(d.avatar_url, c.avatar_url) as avatar,
              (SELECT m2.body FROM messages m2 WHERE (m2.sender_id=? AND m2.receiver_id=u.id) OR (m2.sender_id=u.id AND m2.receiver_id=?) ORDER BY m2.created_at DESC LIMIT 1) as last_body,
              (SELECT m3.created_at FROM messages m3 WHERE (m3.sender_id=? AND m3.receiver_id=u.id) OR (m3.sender_id=u.id AND m3.receiver_id=?) ORDER BY m3.created_at DESC LIMIT 1) as last_at,
              (SELECT COUNT(*) FROM messages mr WHERE mr.sender_id=u.id AND mr.receiver_id=? AND mr.is_read=0) as unread
         FROM users u
         LEFT JOIN developers d ON d.user_id=u.id
         LEFT JOIN clients c ON c.user_id=u.id
        WHERE u.id IN (SELECT IF(sender_id=?, receiver_id, sender_id) FROM messages WHERE sender_id=? OR receiver_id=?)
        ORDER BY last_at DESC
        LIMIT 8`,
      [
        session.userId, session.userId,
        session.userId, session.userId,
        session.userId,
        session.userId, session.userId, session.userId
      ]
    );

    const supportQueueRow = await queryOne<{ count: number }>(
      "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'new'"
    );
    const queueAhead = Number(supportQueueRow?.count ?? 0);

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        name: c.name,
        username: c.username,
        kind: c.kind,
        avatar: c.avatar,
        lastBody: c.last_body || "",
        lastAt: c.last_at ? new Date(c.last_at).toISOString() : new Date().toISOString(),
        unread: Number(c.unread) || 0,
        lastSeenAt: c.last_seen_at ? new Date(c.last_seen_at).toISOString() : null,
      })),
      totalUnread: conversations.reduce((acc, c) => acc + (Number(c.unread) || 0), 0),
      queueAhead,
    });
  } catch (error) {
    console.error("[api-chat-recent]", error);
    return NextResponse.json({ conversations: [], totalUnread: 0, queueAhead: 0 });
  }
}
