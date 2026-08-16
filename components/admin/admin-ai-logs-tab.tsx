"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";

interface AiSessionItem {
  id: number;
  session_key: string;
  user_id: number;
  user_role: string;
  started_at: string;
  last_active_at: string;
  message_count: number;
  model_used: string | null;
  status: "active" | "completed" | "error";
  user_name: string;
  user_email: string;
  username: string;
  first_message_preview?: string;
}

interface AiMessageItem {
  id: number;
  session_key: string;
  user_id: number;
  sender: "user" | "assistant";
  content: string;
  model_used: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AdminAiLogsTabProps {
  notify: (msg: string, type: "success" | "warn") => void;
}

export function AdminAiLogsTab({ notify }: AdminAiLogsTabProps) {
  const [sessions, setSessions] = useState<AiSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);

  // Selected session for viewing details
  const [selectedSession, setSelectedSession] = useState<AiSessionItem | null>(null);
  const [sessionMessages, setSessionMessages] = useState<AiMessageItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        search: search.trim(),
        role: roleFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/ai-sessions?${params.toString()}`);
      if (!res.ok) throw new Error("فشل في جلب جلسات الذكاء الاصطناعي");
      const data = await res.json();

      setSessions(data.sessions || []);
      setTotalPages(data.totalPages || 1);
      setTotalSessions(data.total || 0);
    } catch {
      notify("حدث خطأ أثناء تحميل سجل محادثات الذكاء الاصطناعي", "warn");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, notify]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleOpenSessionModal = async (session: AiSessionItem) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/ai-sessions/${encodeURIComponent(session.session_key)}`);
      if (!res.ok) throw new Error("فشل في جلب رسايل الجلسة");
      const data = await res.json();
      setSessionMessages(data.messages || []);
    } catch {
      notify("تعذر جلب رسائل المحادثة", "warn");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteSession = async (sessionKey: string) => {
    try {
      const res = await fetch(`/api/admin/ai-sessions?sessionKey=${encodeURIComponent(sessionKey)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("فشل الحذف");
      notify("تم حذف جلسة المحادثة بنجاح", "success");
      if (selectedSession?.session_key === sessionKey) {
        setSelectedSession(null);
      }
      fetchSessions();
    } catch {
      notify("حدث خطأ أثناء حذف الجلسة", "warn");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-[24px] border border-[#D1E3D6] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#056B38] to-[#04552D] text-white flex items-center justify-center shadow-xs">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#05291A]">
              سجل محادثات الذكاء الاصطناعي (AI Chat Audit Trail)
            </h2>
            <p className="text-xs text-[#526B5E]">
              مراقبة وتدقيق كافة الجلسات والرسايل بين المستخدمين ووكيل SSD للتحقق من الأخطاء وجودة الردود
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-bold text-[#526B5E] bg-[#E8FAF0] px-3.5 py-2 rounded-xl border border-[#D1E3D6]">
            إجمالي الجلسات المسجلة: <span className="font-extrabold text-[#056B38]">{totalSessions}</span>
          </div>
          <button
            onClick={() => fetchSessions()}
            disabled={loading}
            className="h-10 px-3.5 rounded-xl border border-[#D1E3D6] hover:bg-[#F7FAF8] text-[#05291A] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-[20px] border border-[#D1E3D6] shadow-2xs flex flex-col lg:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-[#526B5E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ابحث باسم المستخدم، البريد، أو نص الرسالة..."
            className="w-full h-10 pr-10 pl-4 text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/20 outline-hidden bg-[#FBFEFC]"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <Filter className="w-3.5 h-3.5 text-[#526B5E] shrink-0" />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 text-xs font-bold rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden bg-white text-[#05291A]"
          >
            <option value="all">كافة الرتب</option>
            <option value="developer">مطور (Developer)</option>
            <option value="client">عميل (Client)</option>
            <option value="admin">مدير (Admin)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 px-3 text-xs font-bold rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden bg-white text-[#05291A]"
          >
            <option value="all">كافة الحالات</option>
            <option value="active">ناجحة ونشطة</option>
            <option value="error">يوجد بها أخطاء</option>
          </select>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-white rounded-[24px] border border-[#D1E3D6] shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#526B5E] gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#056B38]" />
            <p className="text-xs font-bold">جاري تحميل سجلات المحادثات...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6 text-[#526B5E] space-y-2">
            <MessageSquare className="w-12 h-12 text-[#D1E3D6]" />
            <h3 className="text-base font-extrabold text-[#05291A]">لا توجد محادثات مطابقة</h3>
            <p className="text-xs max-w-sm">لم يتم العثور على أي جلسات محادثة بالمعايير الحالية.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-[#F7FAF8] border-b border-[#D1E3D6] text-[11px] font-black text-[#526B5E]">
                  <th className="py-3.5 px-4">المستخدم</th>
                  <th className="py-3.5 px-4">الرتبة</th>
                  <th className="py-3.5 px-4">أول رسالة</th>
                  <th className="py-3.5 px-4">عدد الرسايل</th>
                  <th className="py-3.5 px-4">الموديل المستخدم</th>
                  <th className="py-3.5 px-4">التاريخ والوقت</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1E3D6]/70 text-xs">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F7FAF8]/70 transition-colors">
                    {/* User */}
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-[#05291A]">{s.user_name}</div>
                      <div className="text-[10px] text-[#526B5E] font-mono">{s.user_email || `@${s.username}`}</div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          s.user_role === "developer"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : s.user_role === "client"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-purple-50 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {s.user_role === "developer" ? "مطور" : s.user_role === "client" ? "عميل" : "مدير"}
                      </span>
                    </td>

                    {/* First Message Preview */}
                    <td className="py-3 px-4 max-w-xs">
                      <p className="truncate text-[11px] text-[#05291A]" title={s.first_message_preview}>
                        {s.first_message_preview || "بدء الجلسة..."}
                      </p>
                    </td>

                    {/* Message Count */}
                    <td className="py-3 px-4">
                      <span className="font-black text-[#056B38] bg-[#E8FAF0] px-2 py-0.5 rounded-lg border border-[#D1E3D6] text-[11px]">
                        {s.message_count} رسالة
                      </span>
                    </td>

                    {/* Model Used */}
                    <td className="py-3 px-4 font-mono text-[10px] text-[#526B5E]">
                      {s.model_used || "تلقائي"}
                    </td>

                    {/* Time */}
                    <td className="py-3 px-4 text-[10px] text-[#526B5E]">
                      {new Date(s.last_active_at).toLocaleString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {s.status === "error" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <AlertCircle className="w-3 h-3" /> خطأ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#056B38] bg-[#E8FAF0] px-2 py-0.5 rounded-full border border-[#D1E3D6]">
                          <CheckCircle2 className="w-3 h-3" /> نشطة / مكتملة
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenSessionModal(s)}
                          title="عرض تفاصيل المحادثة الكاملة"
                          className="h-8 px-2.5 rounded-lg bg-[#E8FAF0] hover:bg-[#D1E3D6] text-[#056B38] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>عرض</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSession(s.session_key)}
                          title="حذف الجلسة"
                          className="h-8 w-8 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#D1E3D6] flex items-center justify-between">
            <span className="text-xs text-[#526B5E]">
              صفحة <span className="font-extrabold text-[#05291A]">{page}</span> من {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 px-3 rounded-lg border border-[#D1E3D6] text-xs font-bold disabled:opacity-40 hover:bg-[#F7FAF8] cursor-pointer flex items-center gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-3 rounded-lg border border-[#D1E3D6] text-xs font-bold disabled:opacity-40 hover:bg-[#F7FAF8] cursor-pointer flex items-center gap-1"
              >
                <span>التالي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* FULL CONVERSATION MODAL / DRAWER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[24px] border border-[#D1E3D6] shadow-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#D1E3D6] flex items-center justify-between bg-[#F7FAF8]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#056B38] text-white flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#05291A]">
                    محادثة المستخدم: {selectedSession.user_name} ({selectedSession.user_email})
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-[#526B5E] font-mono mt-0.5">
                    <span>جلسة: {selectedSession.session_key.slice(0, 24)}...</span>
                    <span>•</span>
                    <span>الموديل: {selectedSession.model_used || "غير محدد"}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="h-8 w-8 rounded-full hover:bg-neutral-200 text-neutral-500 flex items-center justify-center cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FBFEFC]">
              {loadingMessages ? (
                <div className="py-20 flex flex-col items-center justify-center text-[#526B5E] gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#056B38]" />
                  <p className="text-xs">جاري تحميل كامل المحادثة...</p>
                </div>
              ) : sessionMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#526B5E]">لا توجد رسائل مسجلة لهذه الجلسة.</div>
              ) : (
                sessionMessages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar */}
                      <div
                        className={`h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-xs font-black shadow-xs ${
                          isUser ? "bg-[#05291A] text-white" : "bg-[#056B38] text-white"
                        }`}
                      >
                        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      {/* Bubble */}
                      <div
                        className={`max-w-[82%] p-4 rounded-2xl text-xs space-y-2 ${
                          isUser
                            ? "bg-[#056B38] text-white rounded-tr-none shadow-xs"
                            : "bg-white border border-[#D1E3D6] text-[#05291A] rounded-tl-none shadow-2xs"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 border-b border-white/20 pb-1 mb-1">
                          <span className="font-bold">{isUser ? selectedSession.user_name : "SSD AI Agent"}</span>
                          <span className="font-mono">
                            {new Date(msg.created_at).toLocaleTimeString("ar-EG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Content with Markdown */}
                        {isUser ? (
                          <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        ) : (
                          <div className="prose prose-xs max-w-none text-[#05291A]">
                            <MarkdownRenderer content={msg.content} />
                          </div>
                        )}

                        {/* Metadata badge if model or error */}
                        {msg.model_used && !isUser && (
                          <div className="pt-2 border-t border-[#D1E3D6]/60 flex items-center justify-between text-[11px] text-[#526B5E] font-mono">
                            <span>الموديل: {msg.model_used}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#D1E3D6] bg-white flex items-center justify-between">
              <button
                onClick={() => handleDeleteSession(selectedSession.session_key)}
                className="h-9 px-4 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف هذه الجلسة</span>
              </button>

              <button
                onClick={() => setSelectedSession(null)}
                className="h-9 px-6 rounded-xl bg-[#056B38] hover:bg-[#04552D] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
