import { redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatClient } from "@/components/chat-client";
import { VerifiedBadge } from "@/components/verified-badge";
import { UserStatusIndicator, AvatarStatusBadge } from "@/components/user-status-indicator";
import { verifySession } from "@/lib/dal";
import { execute, query, queryOne } from "@/lib/db";
import { MessageSquare, UserCheck, ShieldCheck, Clock, ChevronRight } from "lucide-react";

interface ConversationItem {
  id: number;
  name: string;
  username: string | null;
  kind: string;
  avatar: string | null;
  last_body: string;
  last_at: Date;
  unread: number;
  last_seen_at: Date | null;
}

interface PersonDetails {
  id: number;
  name: string;
  username: string | null;
  role: string;
  kind: string;
  avatar: string | null;
  location: string | null;
  job_title: string | null;
  is_verified: number;
  last_seen_at: Date | null;
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string; user?: string }>;
}) {
  const session = await verifySession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const targetParam = (sp.with || sp.user || "").trim();

  // 1. Fetch all conversations for current user
  const conversations = await query<ConversationItem>(
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
      ORDER BY last_at DESC`,
    [
      session.userId, session.userId,
      session.userId, session.userId,
      session.userId,
      session.userId, session.userId, session.userId
    ]
  );

  // 2. Resolve requested user by username OR by ID
  let selectedUserId = 0;

  if (targetParam) {
    const isNum = /^\d+$/.test(targetParam);
    const targetUser = await queryOne<{ id: number }>(
      "SELECT id FROM users WHERE (username = ? OR id = ?) AND status = 'active' LIMIT 1",
      [targetParam, isNum ? Number(targetParam) : -1]
    );
    if (targetUser && targetUser.id !== session.userId) {
      selectedUserId = targetUser.id;
    }
  }

  // If no valid target requested, default to first conversation
  if (!selectedUserId && conversations.length > 0) {
    selectedUserId = conversations[0].id;
  }

  // 3. Fetch details of selected chat partner
  const person = selectedUserId
    ? await queryOne<PersonDetails>(
        `SELECT u.id,
                u.full_name as name,
                u.username,
                u.role,
                u.last_seen_at,
                CASE WHEN u.role='developer' THEN 'مطور' WHEN c.account_type='company' THEN 'شركة' ELSE 'عميل' END as kind,
                COALESCE(d.avatar_url, c.avatar_url) as avatar,
                COALESCE(d.location, c.location) as location,
                d.job_title,
                COALESCE(d.is_verified, c.is_verified, 0) as is_verified
           FROM users u
           LEFT JOIN developers d ON d.user_id=u.id
           LEFT JOIN clients c ON c.user_id=u.id
          WHERE u.id=? AND u.status='active'`,
        [selectedUserId]
      )
    : null;

  // Mobile master-detail: with no explicit ?with= target we show the
  // conversation list; with a target we show that thread instead.
  // Desktop (xl+) always shows both panes side by side.
  const showThreadOnMobile = Boolean(targetParam && person);

  // 4. Fetch messages between session.userId and selected partner
  const rawMessages = person
    ? await query<{
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
          LIMIT 250`,
        [session.userId, person.id, person.id, session.userId]
      )
    : [];

  // 5. Mark messages & notifications as read
  if (person) {
    await execute(
      "UPDATE messages SET is_read=1 WHERE sender_id=? AND receiver_id=?",
      [person.id, session.userId]
    );
    await execute(
      "UPDATE notifications SET is_read=1 WHERE user_id=? AND (link_url=? OR link_url=? OR link_url=? OR link_url=?) AND is_read=0",
      [
        session.userId,
        `/chat?user=${person.id}`,
        `/chat?with=${person.id}`,
        person.username ? `/chat?with=${person.username}` : "/chat",
        "/chat"
      ]
    );
  }

  // 6. Support queue count
  const supportQueueRow = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM support_tickets WHERE status = 'new'"
  );
  const queueAhead = Number(supportQueueRow?.count ?? 0);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-dvh bg-[#F7FAF8] flex flex-col font-body" dir="rtl">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1340px] flex-1 px-4 sm:px-6 py-6">
        <div className="grid gap-6 xl:grid-cols-[360px_1fr] h-[calc(100dvh-196px)] xl:h-[calc(100dvh-140px)] xl:min-h-[640px]">
          
          {/* ───────────────────────────────────────────────────────────── */}
          {/* SIDEBAR: CONVERSATIONS LIST */}
          {/* ───────────────────────────────────────────────────────────── */}
          <aside className={`flex-col rounded-[28px] border border-[#D1E3D6] bg-white shadow-xs overflow-hidden ${showThreadOnMobile ? "hidden xl:flex" : "flex"}`}>
            {/* Sidebar Header */}
            <div className="p-4 border-b border-[#D1E3D6] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38]">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <h1 className="text-xl font-extrabold text-[#05291A]">المحادثات</h1>
                </div>
                <span className="rounded-full bg-[#E8FAF0] px-3 py-1 text-xs font-black text-[#056B38] border border-[#C5E8D1]">
                  {conversations.length} نشطة
                </span>
              </div>
            </div>

            {/* Pinned Support Conversation */}
            <div className="p-2 border-b border-[#D1E3D6] bg-[#F7FAF8]">
              <Link
                href="/support"
                className="flex items-start gap-3 p-3 rounded-[20px] bg-white border border-[#C5E8D1] shadow-2xs hover:border-[#056B38] hover:shadow-xs transition-all group cursor-pointer"
              >
                <div className="relative shrink-0">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#056B38] to-[#0A8F4D] text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>

                <div className="min-w-0 flex-1 space-y-1 text-right">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-black text-xs text-[#05291A]">
                      دعم سكورا (SSD Agent)
                    </span>
                    <span className="text-[10px] font-bold bg-[#E8FAF0] text-[#056B38] px-2 py-0.5 rounded-full border border-[#C5E8D1]">
                      مثبت 📌
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-[#056B38] font-bold">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {queueAhead > 0
                        ? `يوجد ${queueAhead} طلبات دعم قيد الخدمة قبلك`
                        : "الدعم متاح فوراً للرد عليك"}
                    </span>
                  </div>

                  <p className="truncate text-[11px] text-[#526B5E]">
                    انقر لفتح محادثة وتذاكر الدعم والشكاوى
                  </p>
                </div>
              </Link>
            </div>

            {/* Conversations Scrollable List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-neutral-100">
              {conversations.length > 0 ? (
                conversations.map((c) => {
                  const isSelected = selectedUserId === c.id;
                  const chatLink = c.username ? `/chat?with=${c.username}` : `/chat?with=${c.id}`;

                  return (
                    <Link
                      href={chatLink}
                      key={c.id}
                      className={`flex items-start gap-3 p-3 rounded-[20px] transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#E8FAF0] border border-[#C5E8D1] shadow-2xs"
                          : "hover:bg-[#F7FAF8]"
                      }`}
                    >
                      {/* Avatar with Status */}
                      <div className="relative shrink-0">
                        <div className="h-12 w-12 overflow-hidden rounded-full bg-[#E8FAF0] font-black text-sm text-[#056B38] flex items-center justify-center border border-[#D1E3D6] shadow-2xs">
                          {c.avatar ? (
                            <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" />
                          ) : (
                            <span>{getInitials(c.name)}</span>
                          )}
                        </div>
                        <AvatarStatusBadge lastSeenAt={c.last_seen_at} size="md" />
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1 space-y-0.5 text-right">
                        <div className="flex items-center justify-between gap-1">
                          <b className="truncate text-sm font-extrabold text-[#05291A]">{c.name}</b>
                          {c.unread > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#056B38] px-1.5 text-[10px] font-black text-white">
                              {c.unread}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs text-[#526B5E]">
                          <span className="text-[11px] font-bold text-[#056B38] bg-white px-2 py-0.5 rounded-md border border-[#D1E3D6]/50">
                            {c.kind}
                          </span>
                          {c.last_at && (
                            <span className="text-[10px] text-[#526B5E]">
                              {new Date(c.last_at).toLocaleTimeString("ar-EG", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>

                        <p className="truncate text-xs text-[#526B5E] pt-0.5">
                          {c.last_body || "بدء محادثة جديدة..."}
                        </p>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="py-16 px-4 text-center space-y-3">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E8FAF0] text-[#056B38]">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-[#05291A]">لا توجد محادثات سابقة</p>
                  <p className="text-xs text-[#526B5E] leading-relaxed">
                    تواصل مع المطورين أو أصحاب الأعمال من صفحاتهم الشخصية لبدء محادثات جديدة.
                  </p>
                  <div className="pt-2 flex justify-center gap-2">
                    <Link
                      href="/developers"
                      className="rounded-full bg-[#056B38] px-4 py-2 text-xs font-bold text-white hover:bg-[#005B27] transition-colors"
                    >
                      تصفح المطورين
                    </Link>
                    <Link
                      href="/projects"
                      className="rounded-full border border-[#D1E3D6] bg-white px-4 py-2 text-xs font-bold text-[#05291A] hover:bg-[#E8FAF0] transition-colors"
                    >
                      تصفح المشاريع
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* ───────────────────────────────────────────────────────────── */}
          {/* MAIN CHAT WINDOW */}
          {/* ───────────────────────────────────────────────────────────── */}
          <section className={`h-full min-h-0 flex-col rounded-[28px] border border-[#D1E3D6] bg-white shadow-xs overflow-hidden ${showThreadOnMobile ? "flex" : "hidden xl:flex"}`}>
            {person ? (
              <>
                {/* Chat Partner Header */}
                <header className="flex items-center justify-between border-b border-[#D1E3D6] bg-white p-4 shrink-0">
                  <div className="flex items-center gap-3.5">
                    <Link
                      href="/chat"
                      className="flex xl:hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D1E3D6] bg-white text-[#05291A] transition-colors hover:bg-[#E8FAF0]"
                      aria-label="رجوع لقائمة المحادثات"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                    <div className="relative shrink-0">
                      <div className="h-12 w-12 overflow-hidden rounded-full bg-[#E8FAF0] font-black text-sm text-[#056B38] flex items-center justify-center border border-[#D1E3D6] shadow-2xs">
                        {person.avatar ? (
                          <img src={person.avatar} alt={person.name} className="h-full w-full object-cover" />
                        ) : (
                          <span>{getInitials(person.name)}</span>
                        )}
                      </div>
                      <AvatarStatusBadge lastSeenAt={person.last_seen_at} size="md" />
                    </div>

                    <div className="text-right space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={person.username ? `/profile/${person.username}` : "#"}
                          className="font-extrabold text-base text-[#05291A] hover:text-[#056B38] transition-colors flex items-center gap-1.5"
                        >
                          <span>{person.name}</span>
                          {Boolean(person.is_verified) && (
                            <VerifiedBadge
                              type={person.role === "developer" ? "developer" : "client"}
                              size="sm"
                            />
                          )}
                        </Link>
                        {person.username && (
                          <span className="text-xs font-mono font-bold text-[#056B38]">
                            @{person.username}
                          </span>
                        )}
                        <span className="text-neutral-300">·</span>
                        <UserStatusIndicator lastSeenAt={person.last_seen_at} size="sm" showRelativeTime={true} />
                      </div>

                      <p className="text-xs text-[#526B5E]">
                        <span className="font-bold text-[#056B38]">{person.kind}</span>
                        {person.job_title && ` · ${person.job_title}`}
                        {person.location && ` · ${person.location}`}
                      </p>
                    </div>
                  </div>

                  {/* Profile Link Action */}
                  {person.username && (
                    <Link
                      href={`/profile/${person.username}`}
                      className="rounded-full border border-[#D1E3D6] bg-[#F7FAF8] hover:bg-[#E8FAF0] px-4 py-2 text-xs font-bold text-[#05291A] transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-[#056B38]" />
                      <span className="hidden sm:inline">عرض الملف الشخصي</span>
                    </Link>
                  )}
                </header>

                {/* Messages Body */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#F7FAF8]">
                  <ChatClient
                    receiverId={person.id}
                    receiverName={person.name}
                    currentUserId={session.userId}
                    initialMessages={rawMessages.map((m) => ({
                      id: m.id,
                      body: m.body,
                      createdAt: new Date(m.created_at).toISOString(),
                      senderId: m.sender_id,
                      isRead: Boolean(m.is_read),
                    }))}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#F7FAF8] space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[#E8FAF0] text-[#056B38] border border-[#C5E8D1]">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-[#05291A]">اختر محادثة للبدء</h2>
                  <p className="text-xs text-[#526B5E] max-w-sm mx-auto leading-relaxed">
                    حدد أحد الأشخاص من القائمة الجانبية للتواصل الفوري ومشاركة تفاصيل المشاريع.
                  </p>
                </div>
              </div>
            )}
          </section>

        </div>
      </main>

      <div className="hidden xl:block">
        <SiteFooter />
      </div>
    </div>
  );
}
