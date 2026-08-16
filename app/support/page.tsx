"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  TicketItem,
  TicketMessageItem,
  getUserTickets,
  getTicketDetails,
  sendTicketReply,
} from "@/lib/actions/tickets";
import { createSupportTicket } from "@/lib/actions/support";
import {
  LifeBuoy,
  PlusCircle,
  MessageSquare,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Send,
  Loader2,
  Bot,
  User,
  Shield,
  RefreshCw
} from "lucide-react";
import { CustomSelect } from "@/components/custom-select";

export default function SupportPage() {
  const { addToast } = useProfile();
  const [activeTab, setActiveTab] = useState<"my_tickets" | "new_ticket">("my_tickets");
  
  // Tickets List State
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  // Selected Ticket Conversation State
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [messages, setMessages] = useState<TicketMessageItem[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // New Ticket Form State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [description, setDescription] = useState("");
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load User Tickets
  const fetchTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    const res = await getUserTickets();
    if (res.ok) {
      setTickets(res.tickets);
      if (res.tickets.length > 0) {
        setSelectedTicketId((current) => current ?? res.tickets[0].id);
      }
    }
    setIsLoadingTickets(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchTickets(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchTickets]);

  // Load Selected Ticket Details & Messages
  const fetchTicketConversation = useCallback(async (id: number) => {
    setIsLoadingDetails(true);
    const res = await getTicketDetails(id);
    if (res.ok) {
      setSelectedTicket(res.ticket);
      setMessages(res.messages);
    }
    setIsLoadingDetails(false);
  }, []);

  useEffect(() => {
    if (!selectedTicketId) return;
    const timer = window.setTimeout(() => void fetchTicketConversation(selectedTicketId), 0);
    return () => window.clearTimeout(timer);
  }, [selectedTicketId, fetchTicketConversation]);

  // Auto-scroll inside ticket chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoadingDetails]);

  // Handle Send Reply to SSD Agent / Admin in Ticket
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim() || isSendingReply) return;

    const text = replyText.trim();
    setReplyText("");
    setIsSendingReply(true);

    // Optimistic user message
    const tempUserMsg: TicketMessageItem = {
      id: Date.now(),
      ticketId: selectedTicketId,
      senderId: null,
      senderName: "أنت",
      senderKind: "complainant",
      body: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const res = await sendTicketReply({ ticketId: selectedTicketId, body: text });
    setIsSendingReply(false);

    if (res.ok) {
      // Refresh ticket messages to get SSD Agent's intelligent reply
      void fetchTicketConversation(selectedTicketId);
    } else {
      addToast(res.error || "تعذر إرسال الرد", "warn");
    }
  };

  // Handle Create New Support Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim() || isCreatingTicket) return;

    setIsCreatingTicket(true);
    const res = await createSupportTicket({ subject, description, category });
    setIsCreatingTicket(false);

    if (res.ok) {
      addToast(`تم إنشاء التذكرة بنجاح رقم #${res.id}`, "success");
      setSubject("");
      setDescription("");
      setActiveTab("my_tickets");
      await fetchTickets();
      if (res.id) setSelectedTicketId(res.id);
    } else {
      addToast(res.error || "تعذر إنشاء التذكرة", "warn");
    }
  };

  const getStatusBadge = (status: TicketItem["status"]) => {
    switch (status) {
      case "new":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-extrabold text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            <span>جديدة / قيد التحقيق</span>
          </span>
        );
      case "reviewing":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-blue-700 border border-blue-200">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>متابعة مع SSD والإدارة</span>
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>تم الحل</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-dvh bg-[#F7FAF8] flex flex-col font-body" dir="rtl">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1340px] flex-1 px-4 sm:px-6 py-8 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-[#D1E3D6] shadow-xs">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 border border-[#C5E8D1]">
              <LifeBuoy className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-[#05291A]">مركز الدعم والتحقيق الذكي</h1>
              <p className="text-xs text-[#526B5E]">
                تواصل مباشرة مع وكيل الأمان **SSD Agent** وفريق الإدارة لمتابعة البلاغات وحل النزاعات والمشاكل التقنية.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-[#F7FAF8] p-1.5 rounded-2xl border border-[#D1E3D6] shrink-0">
            <button
              onClick={() => setActiveTab("my_tickets")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "my_tickets"
                  ? "bg-[#056B38] text-white shadow-xs"
                  : "text-[#526B5E] hover:text-[#05291A]"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>تذاكري وبلاغاتي ({tickets.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("new_ticket")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "new_ticket"
                  ? "bg-[#056B38] text-white shadow-xs"
                  : "text-[#526B5E] hover:text-[#05291A]"
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>فتح تذكرة جديدة</span>
            </button>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: MY TICKETS & SSD AGENT LIVE CHAT */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "my_tickets" && (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr] min-h-[640px]">
            
            {/* Sidebar: Tickets List */}
            <aside className="bg-white rounded-[28px] border border-[#D1E3D6] p-4 flex flex-col shadow-xs overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#D1E3D6] pb-3 mb-3 px-1">
                <span className="font-extrabold text-sm text-[#05291A]">سجل التذاكر والشكاوى</span>
                <button
                  onClick={fetchTickets}
                  className="p-1.5 text-[#526B5E] hover:text-[#056B38] hover:bg-[#E8FAF0] rounded-lg transition-colors"
                  title="تحديث"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingTickets ? "animate-spin" : ""}`} />
                </button>
              </div>

              {isLoadingTickets ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#526B5E] gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#056B38]" />
                  <span className="text-xs">جاري تحميل التذاكر...</span>
                </div>
              ) : tickets.length > 0 ? (
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {tickets.map((t) => {
                    const isSelected = t.id === selectedTicketId;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTicketId(t.id)}
                        className={`p-3.5 rounded-[20px] border transition-all cursor-pointer space-y-2 ${
                          isSelected
                            ? "bg-[#E8FAF0] border-[#056B38] shadow-2xs"
                            : "bg-[#F7FAF8] border-[#D1E3D6] hover:border-[#056B38]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-black text-[#056B38]">#{t.id}</span>
                          {getStatusBadge(t.status)}
                        </div>

                        <h3 className="text-xs font-black text-[#05291A] line-clamp-1 leading-snug">
                          {t.subject}
                        </h3>

                        <div className="flex items-center justify-between text-[10px] text-[#526B5E]">
                          <span className="flex items-center gap-1 font-bold">
                            <Bot className="w-3 h-3 text-[#056B38]" />
                            <span>SSD Support</span>
                          </span>
                          <time>{new Date(t.updatedAt).toLocaleDateString("ar-EG")}</time>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-[#05291A]">لا توجد تذاكر أو بلاغات سابقة</p>
                  <p className="text-[11px] text-[#526B5E] leading-relaxed">
                    سجل حسابك نظيف! يمكنك إنشاء تذكرة أو الإبلاغ عن أي رسالة مخالفة في الشات مباشرة.
                  </p>
                </div>
              )}
            </aside>

            {/* Main Area: Ticket Conversation & SSD Agent Assistant */}
            <section className="bg-white rounded-[28px] border border-[#D1E3D6] flex flex-col shadow-xs overflow-hidden">
              {selectedTicket ? (
                <>
                  {/* Ticket Header */}
                  <header className="p-4 border-b border-[#D1E3D6] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 text-right">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-mono font-black bg-[#E8FAF0] text-[#056B38] px-2.5 py-0.5 rounded-md border border-[#C5E8D1]">
                          تذكرة #{selectedTicket.id}
                        </span>
                        {getStatusBadge(selectedTicket.status)}
                      </div>
                      <h2 className="text-base font-extrabold text-[#05291A]">{selectedTicket.subject}</h2>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#526B5E] bg-[#F7FAF8] p-2 rounded-xl border border-[#D1E3D6] shrink-0">
                      <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                      <span>محادثة موثقة مع SSD Agent</span>
                    </div>
                  </header>

                  {/* Messages Thread */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F7FAF8]">
                    {isLoadingDetails ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-2 text-[#526B5E]">
                        <Loader2 className="w-6 h-6 animate-spin text-[#056B38]" />
                        <span className="text-xs">جاري تحميل سجل المحادثة...</span>
                      </div>
                    ) : (
                      <>
                        {messages.map((m) => {
                          const isSSD = m.senderKind === "ssd";
                          const isAdmin = m.senderKind === "admin";
                          const isMe = m.senderKind === "complainant";

                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}
                            >
                              {/* Sender Badge */}
                              <div className="flex items-center gap-1.5 px-2 mb-1 text-[11px] font-bold">
                                {isSSD ? (
                                  <span className="text-[#056B38] flex items-center gap-1 bg-[#E8FAF0] px-2 py-0.5 rounded-md border border-[#C5E8D1]">
                                    <Bot className="w-3.5 h-3.5" />
                                    <span>SSD Agent (مساعد الأمان والدعم)</span>
                                  </span>
                                ) : isAdmin ? (
                                  <span className="text-blue-700 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                    <Shield className="w-3.5 h-3.5" />
                                    <span>إدارة سكورا</span>
                                  </span>
                                ) : (
                                  <span className="text-[#526B5E] flex items-center gap-1">
                                    <User className="w-3.5 h-3.5" />
                                    <span>أنت</span>
                                  </span>
                                )}
                              </div>

                              {/* Message Box */}
                              <div
                                className={`max-w-[85%] rounded-[22px] p-4 shadow-2xs leading-relaxed text-xs ${
                                  isSSD
                                    ? "bg-white border-2 border-[#056B38]/30 text-[#05291A] rounded-tr-xs"
                                    : isAdmin
                                    ? "bg-blue-50/70 border border-blue-200 text-blue-950 rounded-tr-xs"
                                    : "bg-[#056B38] text-white rounded-tl-xs"
                                }`}
                              >
                                {isSSD ? (
                                  <MarkdownRenderer content={m.body} />
                                ) : (
                                  <p className="whitespace-pre-wrap">{m.body}</p>
                                )}
                              </div>

                              <span className="text-[10px] text-[#526B5E] px-2 mt-1">
                                {new Date(m.createdAt).toLocaleTimeString("ar-EG", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          );
                        })}

                        {isSendingReply && (
                          <div className="flex flex-col items-end animate-in fade-in">
                            <div className="flex items-center gap-2 bg-white border border-[#D1E3D6] p-3 rounded-2xl text-xs text-[#056B38] font-bold shadow-xs">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>SSD Agent يقوم بتحليل الرد وصياغة الحل...</span>
                            </div>
                          </div>
                        )}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Reply Input Bar */}
                  <form
                    onSubmit={handleSendReply}
                    className="p-3.5 bg-white border-t border-[#D1E3D6] flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="ناقش المشكلة مع SSD Agent أو أضف توضيحات إضافية..."
                      className="flex-1 h-11 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || isSendingReply}
                      className="h-11 px-5 rounded-2xl bg-[#056B38] hover:bg-[#005B27] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {isSendingReply ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>إرسال</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
                    <LifeBuoy className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-extrabold text-[#05291A]">اختر تذكرة لعرض المحادثة والردود</h3>
                  <p className="text-xs text-[#526B5E] max-w-sm leading-relaxed">
                    يمكنك متابعة تفاصيل البلاغات ومناقشة أسباب الشكاوى مباشرة مع وكيل الأمان SSD Agent.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: OPEN NEW SUPPORT TICKET FORM */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "new_ticket" && (
          <section className="max-w-2xl mx-auto bg-white rounded-[28px] border border-[#D1E3D6] p-8 shadow-xs space-y-6">
            <div className="space-y-1.5 border-b border-[#D1E3D6] pb-4">
              <div className="flex items-center gap-2 text-[#056B38] font-bold text-xs">
                <PlusCircle className="w-4 h-4" />
                <span>فتح تذكرة دعم فني أو بلاغ</span>
              </div>
              <h2 className="text-xl font-black text-[#05291A]">تواصل مع فريق الدعم وSSD Agent</h2>
              <p className="text-xs text-[#526B5E]">
                سيتم استلام تذكرتك فوراً والرد عليها آلياً بواسطة **SSD Agent** لمساعدتك قبل مراجعة الإدارة.
              </p>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#05291A]">تصنيف المشكلة</label>
                <CustomSelect
                  value={category}
                  onChange={(val) => setCategory(val)}
                  size="lg"
                  options={[
                    { value: "technical", label: "مشكلة تقنية أو برمجية في المنصة" },
                    { value: "verification_request", label: "طلب الحصول على شارة مطور موثوق" },
                    { value: "report", label: "بلاغ عن مستخدم أو نزاع في مشروع" },
                    { value: "account", label: "الحساب والصلاحيات وإعدادات الأمان" },
                    { value: "billing", label: "المدفوعات والمستحقات المالية" },
                    { value: "general", label: "استفسار عام أو اقتراح" },
                  ]}
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#05291A]">عنوان التذكرة / المشكلة</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="مثال: مشكلة في رفع ملفات المشروع أو تأخر استلام الدفعة..."
                  required
                  className="w-full h-12 rounded-2xl border border-[#D1E3D6] px-4 text-xs font-bold bg-[#F7FAF8] focus:outline-none focus:border-[#056B38]"
                />
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#05291A]">شرح وتفاصيل المشكلة</label>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اشرح المشكلة بوضوح، مع ذكر أي خطوات أو أرقام مشاريع أو حسابات ذات صلة..."
                  required
                  className="w-full rounded-2xl border border-[#D1E3D6] p-4 text-xs text-[#05291A] bg-[#F7FAF8] focus:outline-none focus:border-[#056B38] leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingTicket}
                className="w-full h-12 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isCreatingTicket ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ التذكرة والاتصال بـ SSD...</span>
                  </>
                ) : (
                  <>
                    <LifeBuoy className="w-4 h-4" />
                    <span>إنشاء التذكرة وبدء التحقيق</span>
                  </>
                )}
              </button>
            </form>
          </section>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}
