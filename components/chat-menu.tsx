"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, ArrowLeft, ShieldCheck, Clock } from "lucide-react";
import { useFloatingChat } from "@/components/floating-chat-provider";
import { AvatarStatusBadge } from "@/components/user-status-indicator";

export type ChatMenuItem = {
  id: number;
  name: string;
  username: string | null;
  kind: string;
  avatar: string | null;
  lastBody: string;
  lastAt: string;
  unread: number;
  lastSeenAt?: string | null;
};

export function ChatMenu({
  isOpen,
  onToggle,
  onClose,
}: {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
} = {}) {
  const { openFloatingChat } = useFloatingChat();
  const [conversations, setConversations] = useState<ChatMenuItem[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [queueAhead, setQueueAhead] = useState(0);
  const [internalOpen, setInternalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isControlled = typeof isOpen === "boolean";
  const open = isControlled ? isOpen : internalOpen;

  const handleToggle = () => {
    if (isControlled) {
      if (onToggle) onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
    if (!open) void loadRecentChats();
  };

  const handleClose = () => {
    if (isControlled) {
      if (onClose) onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const loadRecentChats = async () => {
    try {
      const res = await fetch("/api/chat/recent", { cache: "no-store" });
      if (!res.ok) return;
      const data: { conversations: ChatMenuItem[]; totalUnread: number; queueAhead?: number } =
        await res.json();
      setConversations(data.conversations || []);
      setTotalUnread(data.totalUnread || 0);
      setQueueAhead(Number(data.queueAhead) || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        await loadRecentChats();
      }
      if (active) timer = setTimeout(poll, 12000);
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Close on click outside when uncontrolled
  useEffect(() => {
    if (isControlled) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isControlled]);

  const handleOpenConversation = (item: ChatMenuItem) => {
    handleClose();
    // Optimistically decrement unread
    setConversations((prev) =>
      prev.map((c) => (c.id === item.id ? { ...c, unread: 0 } : c))
    );

    const targetUrl = item.username ? `/chat?with=${item.username}` : `/chat?with=${item.id}`;

    // If already on /chat page, navigate there
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/chat")) {
      window.location.href = targetUrl;
    } else {
      // Otherwise open in Floating Chat Box!
      openFloatingChat({
        id: item.id,
        name: item.name,
        username: item.username,
        avatar: item.avatar,
        kind: item.kind,
      });
    }
  };

  const formatChatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return "الآن";
      if (diffMin < 60) return `منذ ${diffMin} د`;
      if (diffHours < 24) return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
      if (diffDays === 1) return "أمس";
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return date.toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative" ref={menuRef} dir="rtl">
      {/* Navbar Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border transition-all cursor-pointer shadow-2xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#056B38]/20 ${
          open
            ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38]"
            : "border-[#D1E3D6] bg-white hover:bg-[#E8FAF0] text-[#05291A] hover:border-[#056B38] hover:text-[#056B38]"
        }`}
        title="المحادثات والرسائل"
        aria-label="المحادثات والرسائل"
      >
        <MessageSquare className="h-5 w-5" />

        {/* Unread Badge Counter */}
        {totalUnread > 0 && (
          <span className="absolute -top-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#056B38] px-1 text-[10px] font-black text-white shadow-xs animate-in zoom-in-75">
            {totalUnread > 99 ? "+99" : totalUnread}
          </span>
        )}
      </button>

      {/* Dropdown Menu Popover */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-[340px] sm:w-[380px] rounded-[24px] border border-[#D1E3D6] bg-white p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 font-body">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D1E3D6]/70 px-2 pb-3 mb-2">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[14px] text-[#05291A]">المحادثات</span>
              {totalUnread > 0 && (
                <span className="rounded-full bg-[#E8FAF0] px-2 py-0.5 text-[10px] font-black text-[#056B38] border border-[#C5E8D1]">
                  {totalUnread} غير مقروءة
                </span>
              )}
            </div>

            <Link
              href="/chat"
              onClick={handleClose}
              className="text-xs font-bold text-[#056B38] hover:underline flex items-center gap-1"
            >
              <span>فتح الشات</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Pinned Support Chat */}
          <div className="mb-2">
            <Link
              href="/support"
              onClick={handleClose}
              className="flex items-start gap-3 p-2.5 rounded-[18px] bg-[#E8FAF0]/80 hover:bg-[#D8F5E5] border border-[#C5E8D1] transition-all cursor-pointer group"
            >
              <div className="relative shrink-0">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-[#056B38] to-[#0A8F4D] text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>

              <div className="flex-1 min-w-0 space-y-0.5 text-right">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-extrabold text-[13px] text-[#05291A]">
                    دعم سكورا (SSD Agent)
                  </span>
                  <span className="text-[10px] font-bold bg-white text-[#056B38] px-2 py-0.5 rounded-full border border-[#C5E8D1]">
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
              </div>
            </Link>
          </div>

          {/* Conversations List */}
          <div className="max-h-[340px] overflow-y-auto space-y-1 divide-y divide-neutral-100 no-scrollbar">
            {conversations.length > 0 ? (
              conversations.map((item) => {
                const hasUnread = item.unread > 0;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleOpenConversation(item)}
                    className={`flex items-start gap-3 p-2.5 rounded-[16px] transition-all cursor-pointer group ${
                      hasUnread
                        ? "bg-[#E8FAF0]/60 hover:bg-[#E8FAF0]"
                        : "hover:bg-[#F7FAF8]"
                    }`}
                  >
                    {/* User Avatar */}
                    <div className="relative shrink-0">
                      <div className="h-11 w-11 overflow-hidden rounded-full bg-[#E8FAF0] text-[#056B38] font-black text-xs flex items-center justify-center border border-[#D1E3D6] shadow-2xs">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{getInitials(item.name || "Scora")}</span>
                        )}
                      </div>
                      <AvatarStatusBadge lastSeenAt={item.lastSeenAt} size="sm" />
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-0.5 text-right">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`truncate text-[13px] ${
                              hasUnread ? "font-black text-[#05291A]" : "font-bold text-[#05291A]"
                            }`}
                          >
                            {item.name}
                          </span>
                          <span className="text-[10px] bg-neutral-100 text-[#526B5E] px-1.5 py-0.2 rounded-md font-bold shrink-0">
                            {item.kind}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#526B5E] font-medium shrink-0">
                          {formatChatTime(item.lastAt)}
                        </span>
                      </div>

                      <p className="truncate text-[11px] text-[#526B5E]">
                        {item.lastBody || "بدء محادثة جديدة..."}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 px-4 text-center space-y-2">
                <p className="text-xs font-bold text-[#05291A]">لا توجد رسائل سابقة</p>
                <p className="text-[11px] text-[#526B5E]">
                  تواصل مع المطورين والعملاء مباشرة من ملفاتهم الشخصية.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
