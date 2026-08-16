"use server";

import { z } from "zod";
import { execute, query, queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { completeJson } from "@/lib/openrouter";

export type TicketItem = {
  id: number;
  userId: number;
  reportedUserId: number | null;
  reportedUserName?: string | null;
  reportedMessageId: number | null;
  category: string;
  subject: string;
  description: string;
  status: "new" | "reviewing" | "resolved";
  createdAt: string;
  updatedAt: string;
  lastReplyBy?: string;
  messageCount: number;
};

export type TicketMessageItem = {
  id: number;
  ticketId: number;
  senderId: number | null;
  senderName?: string;
  senderRole?: string;
  senderKind: "complainant" | "admin" | "reported" | "ssd";
  body: string;
  createdAt: string;
};

// ─── 1. Report a Chat Message ─────────────────────────────────────
const ReportSchema = z.object({
  messageId: z.coerce.number().int().positive(),
  reportedUserId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(2).max(200),
  details: z.string().trim().max(2000).optional(),
});

export async function reportChatMessage(input: {
  messageId: number;
  reportedUserId: number;
  reason: string;
  details?: string;
}) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "سجل الدخول أولاً" };

  const parsed = ReportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message || "بيانات البلاغ غير صالحة" };
  }

  // Fetch the reported message body and users
  const messageData = await queryOne<{ id: number; body: string; image_url: string | null }>(
    "SELECT id, body, image_url FROM messages WHERE id=?",
    [parsed.data.messageId]
  );

  const reportedUser = await queryOne<{ full_name: string; username: string }>(
    "SELECT full_name, username FROM users WHERE id=?",
    [parsed.data.reportedUserId]
  );

  const reportedName = reportedUser?.full_name || "مستخدم";
  const subject = `بلاغ عن رسالة مخالفة من (${reportedName}) - سبب: ${parsed.data.reason}`;
  const description = `تفاصيل البلاغ المقدم من المستخدم:
- سبب البلاغ: ${parsed.data.reason}
- نص الرسالة المبلغ عنها: "${messageData?.body || "(لا يوجد نص)"}"
${messageData?.image_url ? `- صورة مرفقة في الرسالة: ${messageData.image_url}\n` : ""}- ملاحظات المبلغ: ${parsed.data.details || "لا توجد ملاحظات إضافية"}`;

  const ticketId = await transaction(async (c) => {
    const [ticketRes] = await c.execute(
      `INSERT INTO support_tickets (user_id, reported_user_id, reported_message_id, category, subject, description, status)
       VALUES (?, ?, ?, 'report', ?, ?, 'new')`,
      [session.userId, parsed.data.reportedUserId, parsed.data.messageId, subject, description]
    );
    const newId = Number((ticketRes as { insertId: number }).insertId);

    // Initial User message in ticket
    const userMessageBody = `لقد قمت بالإبلاغ عن رسالة من (${reportedName}).\nالسبب: ${parsed.data.reason}\n${parsed.data.details ? `التفاصيل: ${parsed.data.details}` : ""}`;
    await c.execute(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_kind, body)
       VALUES (?, ?, 'complainant', ?)`,
      [newId, session.userId, userMessageBody]
    );

    // Initial Automated Response from SSD Agent
    const ssdWelcomeBody = `مرحباً بك! أنا **SSD**، وكيل الأمان والدعم الذكي في منصة سكورا 🛡️

تم استلام بلاغك بنجاح وقيد المراجعة الفورية تحت التذكرة رقم **#${newId}**.

🔍 **الإجراءات الحالية**:
1. تم توثيق الرسالة المبلغ عنها وتجميد السجل لحمايتك.
2. تم إشعار فريق الإدارة لمراجعة المخالفة واتخاذ الإجراء المناسب (تحذير، إيقاف مؤقت، أو حظر).
3. يمكنك التحدث معي هنا مباشرة إذا كنت ترغب في تقديم توضيحات إضافية أو لديك أي استفسار بخصوص هذه المشكلة.

نحن ملتزمون بتوفير بيئة عمل آمنة وموثوقة لجميع مستخدمي المنصة.`;

    await c.execute(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_kind, body)
       VALUES (?, NULL, 'ssd', ?)`,
      [newId, ssdWelcomeBody]
    );

    // Notify Admins
    await c.execute(
      `INSERT INTO notifications (user_id, body, link_url)
       SELECT id, ?, ? FROM users WHERE is_admin=1`,
      [`بلاغ جديد عن رسالة مخالفة (#${newId}) من ${reportedName}`, `/support`]
    );

    return newId;
  });

  return { ok: true as const, ticketId };
}

// ─── 2. Get User Tickets ──────────────────────────────────────────
export async function getUserTickets(): Promise<{ ok: true; tickets: TicketItem[] } | { ok: false; error: string }> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "سجل الدخول أولاً" };

  const rows = await query<{
    id: number;
    user_id: number;
    reported_user_id: number | null;
    reported_name: string | null;
    category: string;
    subject: string;
    description: string;
    status: "new" | "reviewing" | "resolved";
    created_at: Date;
    updated_at: Date;
    message_count: number;
  }>(
    `SELECT t.id, t.user_id, t.reported_user_id, u_rep.full_name AS reported_name,
            t.category, t.subject, t.description, t.status, t.created_at, t.updated_at,
            (SELECT COUNT(*) FROM ticket_messages tm WHERE tm.ticket_id = t.id) AS message_count
       FROM support_tickets t
  LEFT JOIN users u_rep ON u_rep.id = t.reported_user_id
      WHERE t.user_id = ? ${session.isAdmin ? "OR 1=1" : ""}
      ORDER BY t.updated_at DESC, t.id DESC`,
    [session.userId]
  );

  return {
    ok: true,
    tickets: rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      reportedUserId: r.reported_user_id,
      reportedUserName: r.reported_name,
      reportedMessageId: null,
      category: r.category,
      subject: r.subject,
      description: r.description,
      status: r.status,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      messageCount: Number(r.message_count || 0),
    })),
  };
}

// ─── 3. Get Ticket Details & Messages ─────────────────────────────
export async function getTicketDetails(ticketId: number): Promise<
  | {
      ok: true;
      ticket: TicketItem;
      messages: TicketMessageItem[];
    }
  | { ok: false; error: string }
> {
  const session = await verifySession();
  if (!session) return { ok: false, error: "سجل الدخول أولاً" };

  const ticket = await queryOne<{
    id: number;
    user_id: number;
    reported_user_id: number | null;
    reported_name: string | null;
    category: string;
    subject: string;
    description: string;
    status: "new" | "reviewing" | "resolved";
    created_at: Date;
    updated_at: Date;
  }>(
    `SELECT t.id, t.user_id, t.reported_user_id, u_rep.full_name AS reported_name,
            t.category, t.subject, t.description, t.status, t.created_at, t.updated_at
       FROM support_tickets t
  LEFT JOIN users u_rep ON u_rep.id = t.reported_user_id
      WHERE t.id = ?`,
    [ticketId]
  );

  if (!ticket) return { ok: false, error: "التذكرة غير موجودة" };
  if (ticket.user_id !== session.userId && !session.isAdmin) {
    return { ok: false, error: "غير مصرح لك بعرض هذه التذكرة" };
  }

  const messages = await query<{
    id: number;
    ticket_id: number;
    sender_id: number | null;
    sender_name: string | null;
    sender_role: string | null;
    sender_kind: "complainant" | "admin" | "reported" | "ssd";
    body: string;
    created_at: Date;
  }>(
    `SELECT tm.id, tm.ticket_id, tm.sender_id, u.full_name AS sender_name, u.role AS sender_role,
            tm.sender_kind, tm.body, tm.created_at
       FROM ticket_messages tm
  LEFT JOIN users u ON u.id = tm.sender_id
      WHERE tm.ticket_id = ?
      ORDER BY tm.created_at ASC, tm.id ASC`,
    [ticketId]
  );

  return {
    ok: true,
    ticket: {
      id: ticket.id,
      userId: ticket.user_id,
      reportedUserId: ticket.reported_user_id,
      reportedUserName: ticket.reported_name,
      reportedMessageId: null,
      category: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      createdAt: new Date(ticket.created_at).toISOString(),
      updatedAt: new Date(ticket.updated_at).toISOString(),
      messageCount: messages.length,
    },
    messages: messages.map((m) => ({
      id: m.id,
      ticketId: m.ticket_id,
      senderId: m.sender_id,
      senderName: m.sender_kind === "ssd" ? "SSD Support Agent" : m.sender_name || (m.sender_kind === "admin" ? "إدارة سكورا" : "أنت"),
      senderRole: m.sender_role || undefined,
      senderKind: m.sender_kind,
      body: m.body,
      createdAt: new Date(m.created_at).toISOString(),
    })),
  };
}

// ─── 4. Send Message in Ticket (User -> SSD Agent Reply) ──────────
const TicketReplySchema = z.object({
  ticketId: z.coerce.number().int().positive(),
  body: z.string().trim().min(1).max(5000),
});

export async function sendTicketReply(input: { ticketId: number; body: string }) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "سجل الدخول أولاً" };

  const parsed = TicketReplySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "الرسالة غير صالحة" };

  const ticket = await queryOne<{ id: number; user_id: number; subject: string; description: string; status: string }>(
    "SELECT id, user_id, subject, description, status FROM support_tickets WHERE id=?",
    [parsed.data.ticketId]
  );
  if (!ticket) return { ok: false as const, error: "التذكرة غير موجودة" };
  if (ticket.user_id !== session.userId && !session.isAdmin) {
    return { ok: false as const, error: "غير مصرح لك" };
  }

  // 1. Insert user message
  const senderKind = session.isAdmin && ticket.user_id !== session.userId ? "admin" : "complainant";
  await execute(
    "INSERT INTO ticket_messages (ticket_id, sender_id, sender_kind, body) VALUES (?, ?, ?, ?)",
    [parsed.data.ticketId, session.userId, senderKind, parsed.data.body]
  );
  await execute("UPDATE support_tickets SET updated_at=CURRENT_TIMESTAMP WHERE id=?", [parsed.data.ticketId]);

  // 2. If message sent by user (not admin), generate instant intelligent SSD Agent response
  if (senderKind === "complainant") {
    const previousMessages = await query<{ sender_kind: string; body: string }>(
      "SELECT sender_kind, body FROM ticket_messages WHERE ticket_id=? ORDER BY id ASC LIMIT 10",
      [parsed.data.ticketId]
    );

    let ssdReply = "";
    try {
      const prompt = `You are SSD, SCORA's Support and Resolution AI Agent.
You are assisting a platform user inside Support Ticket #${ticket.id}.
Ticket Subject: "${ticket.subject}".
Ticket Description: "${ticket.description}".
Conversation history:
${previousMessages.map((m) => `${m.sender_kind}: ${m.body}`).join("\n")}
Latest User Message: "${parsed.data.body}".

INSTRUCTIONS:
1. Respond in empathetic, professional, clear Arabic as "SSD" (وكيل الأمان والدعم الذكي).
2. Answer the user's questions, explain the relevant policy (e.g. anti-fraud, respect, intellectual property, project disputes), reassure them, and ask for any specific evidence or next steps if needed.
3. Keep the tone reassuring, authoritative yet friendly.
4. Output JSON with "reply": string.`;

      const aiRes = await completeJson(
        z.object({ reply: z.string().min(1) }),
        "You are SSD, SCORA Support AI Agent. Return valid JSON only.",
        prompt,
        { maxTokens: 800, timeoutMs: 10_000 }
      );
      ssdReply = aiRes.value.reply;
    } catch {
      // Fallback response from SSD
      ssdReply = `شكراً لتوضيحك. تم تسجيل ملاحظاتك وإضافتها إلى ملف التحقيق الخاص بالتذكرة رقم **#${ticket.id}**.

فريق الإدارة يتابع هذه الشكوى مباشرة وسيتم تطبيق الإجراءات اللازمة لضمان حقوقك وسلامة التعاملات على منصة سكورا. إذا كان لديك أي تفاصيل إضافية أو ملفات ترغب في مشاركتها، يمكنك كتابتها هنا في أي وقت.`;
    }

    // Save SSD Reply
    await execute(
      "INSERT INTO ticket_messages (ticket_id, sender_id, sender_kind, body) VALUES (?, NULL, 'ssd', ?)",
      [parsed.data.ticketId, ssdReply]
    );
  }

  return { ok: true as const };
}

// ─── 4. Request Developer Verification via Support ────────────────
export async function requestDeveloperVerificationAction(notes?: string) {
  const session = await verifySession();
  if (!session) return { ok: false as const, error: "سجل الدخول أولاً" };
  if (session.role !== "developer") {
    return { ok: false as const, error: "هذا الإجراء متاح للمطورين فقط" };
  }

  const user = await queryOne<{ full_name: string; username: string }>(
    "SELECT full_name, username FROM users WHERE id=?",
    [session.userId]
  );
  const dev = await queryOne<{ trust_score: number; skill_points: number; job_title: string | null }>(
    "SELECT trust_score, skill_points, job_title FROM developers WHERE user_id=?",
    [session.userId]
  );

  const trustScore = dev?.trust_score ?? 50;
  const skillPoints = dev?.skill_points ?? 0;
  const subject = `طلب توثيق شارة مطور موثوق (@${user?.username || session.username})`;
  const description = `تفاصيل طلب التوثيق:
- المطور: ${user?.full_name} (@${user?.username || session.username})
- المسمى المهني: ${dev?.job_title || "مطور برمجيات"}
- درجة الثقة الحالية (Trust Score): ${trustScore}%
- رصيد نقاط المهارة (SP): ${skillPoints} SP
- ملاحظات المطور: ${notes?.trim() || "لا توجد ملاحظات إضافية"}`;

  const ticketId = await transaction(async (c) => {
    const [ticketRes] = await c.execute(
      `INSERT INTO support_tickets (user_id, category, subject, description, status)
       VALUES (?, 'verification_request', ?, ?, 'new')`,
      [session.userId, subject, description]
    );
    const newId = Number((ticketRes as { insertId: number }).insertId);

    const userMessageBody = `أرغب في تقديم طلب للحصول على شارة "مطور موثوق" ومراجعة حسابي ونماذج أعمالي.\nدرجة الثقة الحالية: ${trustScore}% | رصيد SP: ${skillPoints}\n${notes ? `ملاحظات: ${notes}` : ""}`;
    await c.execute(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_kind, body)
       VALUES (?, ?, 'complainant', ?)`,
      [newId, session.userId, userMessageBody]
    );

    const ssdReply = `مرحباً ${user?.full_name || "يا بطل"}! أنا **SSD**، وكيل الدعم والاعتماد في منصة سكورا 🛡️
    
تم استلام طلب توثيق حسابك بنجاح وقيد المراجعة الفورية تحت التذكرة رقم **#${newId}**.

🔍 **معلومات المراجعة**:
- رصيدك الحالي للثقة هو **${trustScore}%**.
- ${trustScore >= 90 ? "رصيد ثقتك مؤهل للاعتماد التلقائي، وسيتم تثبيت شارتك بعد الفحص الأخير." : "إذا كان رصيد ثقتك أقل من 90%، سيقوم فريق الإدارة بمراجعة مشاريعك في المعرض وسجل تقييماتك للموافقة الاستثنائية."}
- يمكنك متابعة رد فريق الدعم هنا مباشرة.`;

    await c.execute(
      `INSERT INTO ticket_messages (ticket_id, sender_id, sender_kind, body)
       VALUES (?, NULL, 'ssd', ?)`,
      [newId, ssdReply]
    );

    return newId;
  });

  return { ok: true as const, ticketId };
}

