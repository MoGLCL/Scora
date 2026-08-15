"use server";

import { z } from "zod";
import { queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";

const MessageSchema = z.object({
  receiverId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1).max(5000),
});

export async function sendMessage(input: { receiverId: number | string; body: string }) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "سجل الدخول أولاً" };
  const parsed = MessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "رسالة غير صالحة" };
  if (parsed.data.receiverId === session.userId) return { ok: false as const, error: "لا يمكنك مراسلة نفسك" };

  const receiver = await queryOne<{ id: number; role: "developer" | "client" }>(
    "SELECT u.id, u.role FROM users u LEFT JOIN developers d ON d.user_id=u.id WHERE u.id=? AND u.status='active' AND u.onboarding_completed_at IS NOT NULL AND (u.role='client' OR d.approval_status='approved')",
    [parsed.data.receiverId]
  );
  if (!receiver) return { ok: false as const, error: "المستخدم غير متاح" };
  if (session.role === receiver.role) return { ok: false as const, error: "المحادثات متاحة بين المطور والعميل فقط" };

  const sender = await queryOne<{ full_name: string }>("SELECT full_name FROM users WHERE id=?", [session.userId]);
  const senderName = sender?.full_name || "مستخدم";

  const message = await transaction(async (c) => {
    const [inserted] = await c.execute("INSERT INTO messages(sender_id,receiver_id,body) VALUES(?,?,?)", [
      session.userId,
      receiver.id,
      parsed.data.body,
    ]);

    const notificationBody = `لديك رسالة جديدة من "${senderName}": ${parsed.data.body.slice(0, 50)}${parsed.data.body.length > 50 ? "..." : ""}`;
    const notificationLink = `/chat?user=${session.userId}`;

    await c.execute("INSERT INTO notifications(user_id, body, link_url) VALUES(?,?,?)", [
      receiver.id,
      notificationBody,
      notificationLink,
    ]);

    return {
      id: Number((inserted as { insertId: number }).insertId),
      body: parsed.data.body,
      createdAt: new Date().toISOString(),
      senderId: session.userId,
    };
  });

  return { ok: true as const, message };
}

export async function markConversationRead(otherUserId: number) {
  const session = await verifySession();
  if (!session) return;
  const { execute } = await import("@/lib/db");
  await execute("UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=?", [otherUserId, session.userId]);
  await execute(
    "UPDATE notifications SET is_read=1 WHERE user_id=? AND (link_url=? OR link_url=? OR link_url=?) AND is_read=0",
    [session.userId, `/chat?user=${otherUserId}`, `/chat?with=${otherUserId}`, "/chat"]
  );
}
