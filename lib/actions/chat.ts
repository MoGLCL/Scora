"use server";

import { z } from "zod";
import { queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";

const MessageSchema = z
  .object({
    receiverId: z.coerce.number().int().positive(),
    body: z.string().trim().max(5000).optional().default(""),
    imageUrl: z.string().trim().max(1000).optional().nullable(),
  })
  .refine((data) => (data.body && data.body.length > 0) || Boolean(data.imageUrl), {
    message: "الرسالة لا يمكن أن تكون فارغة",
  });

export async function sendMessage(input: { receiverId: number | string; body?: string; imageUrl?: string | null }) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "سجل الدخول أولاً" };
  const parsed = MessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message || "رسالة غير صالحة" };
  if (parsed.data.receiverId === session.userId) return { ok: false as const, error: "لا يمكنك مراسلة نفسك" };

  if (parsed.data.imageUrl) {
    const media = await queryOne<{ id: number }>(
      "SELECT id FROM media WHERE owner_type='chat' AND owner_id=? AND url=?",
      [session.userId, parsed.data.imageUrl]
    );
    if (!media) return { ok: false as const, error: "الصورة المرفقة غير صالحة" };
  }

  const receiver = await queryOne<{ id: number; role: string }>(
    "SELECT u.id, u.role FROM users u WHERE u.id=? AND u.status='active'",
    [parsed.data.receiverId]
  );
  if (!receiver) return { ok: false as const, error: "المستخدم غير متاح" };

  const sender = await queryOne<{ full_name: string }>("SELECT full_name FROM users WHERE id=?", [session.userId]);
  const senderName = sender?.full_name || "مستخدم";
  const bodyText = parsed.data.body || (parsed.data.imageUrl ? "صورة مرفقة" : "");
  const imageUrl = parsed.data.imageUrl || null;

  const message = await transaction(async (c) => {
    const [inserted] = await c.execute(
      "INSERT INTO messages(sender_id, receiver_id, body, image_url) VALUES(?,?,?,?)",
      [session.userId, receiver.id, bodyText, imageUrl]
    );

    const notificationBody = `لديك رسالة جديدة من "${senderName}": ${bodyText.slice(0, 50)}${bodyText.length > 50 ? "..." : ""}`;
    const notificationLink = `/chat?user=${session.userId}`;

    await c.execute("INSERT INTO notifications(user_id, body, link_url) VALUES(?,?,?)", [
      receiver.id,
      notificationBody,
      notificationLink,
    ]);

    return {
      id: Number((inserted as { insertId: number }).insertId),
      body: bodyText,
      imageUrl,
      createdAt: new Date().toISOString(),
      senderId: session.userId,
    };
  });

  return { ok: true as const, message };
}
