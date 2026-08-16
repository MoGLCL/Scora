"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Briefcase,
  ShieldCheck,
  Sparkles,
  ExternalLink
} from "lucide-react";
import {
  soundFX,
  requestBrowserNotificationPermission,
  sendBrowserNotification
} from "@/lib/client-audio-notifications";
import { safeInternalPath } from "@/lib/safe-url";

type NotificationItem = {
  id: number;
  body: string;
  link_url?: string | null;
  is_read: 0 | 1;
  created_at: string;
};

export function NotificationsMenu({
  isOpen,
  onToggle,
  onClose,
}: {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
} = {}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [internalOpen, setInternalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const knownNotificationIds = useRef<Set<number>>(new Set());

  const isControlled = typeof isOpen === "boolean";
  const open = isControlled ? isOpen : internalOpen;

  const handleToggle = () => {
    void requestBrowserNotificationPermission();
    if (isControlled) {
      if (onToggle) onToggle();
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  const handleClose = useCallback(() => {
    if (isControlled) {
      if (onClose) onClose();
    } else {
      setInternalOpen(false);
    }
  }, [isControlled, onClose]);

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
  }, [isControlled, handleClose]);

  // Request browser desktop notification permission
  useEffect(() => {
    void requestBrowserNotificationPermission();
  }, []);

  const load = async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data: NotificationItem[] = await res.json();

      let hasNewUnread = false;
      let newestUnreadItem: NotificationItem | null = null;

      for (const item of data) {
        if (!knownNotificationIds.current.has(item.id)) {
          knownNotificationIds.current.add(item.id);
          if (!isFirstLoad.current && item.is_read === 0) {
            hasNewUnread = true;
            if (!newestUnreadItem) newestUnreadItem = item;
          }
        }
      }

      if (hasNewUnread && newestUnreadItem) {
        const isChatNotification =
          newestUnreadItem.body.includes("رسالة") || newestUnreadItem.link_url?.includes("/chat");
        const isOnChatPage = typeof window !== "undefined" && window.location.pathname.startsWith("/chat");

        if (!(isOnChatPage && isChatNotification)) {
          soundFX.playNotification();
          sendBrowserNotification(
            "إشعار جديد في سكورا ",
            newestUnreadItem.body,
            newestUnreadItem.link_url || "/dashboard"
          );
        }
      }

      isFirstLoad.current = false;
      setItems(data);
    } catch {
      // Ignore transient network errors
    }
  };

  useEffect(() => {
    let active = true;
    let t: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        await load();
      }
      if (active) t = setTimeout(poll, 15000);
    };

    void poll();
    return () => {
      active = false;
      if (t) clearTimeout(t);
    };
  }, []);

  const unread = items.filter((x) => !x.is_read).length;

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      setItems((prev) => prev.map((item) => ({ ...item, is_read: 1 })));
    } catch {
      // Ignore
    }
  };

  const handleItemClick = (n: NotificationItem) => {
    handleClose();
    void fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id })
    }).catch(() => {});

    setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: 1 } : item)));

    // Determine target URL
    let targetUrl = n.link_url;
    if (!targetUrl) {
      if (n.body.includes("رسالة")) targetUrl = "/chat";
      else if (n.body.includes("مشروع") || n.body.includes("عرض")) targetUrl = "/projects";
      else if (n.body.includes("اعتماد") || n.body.includes("تفعيل")) targetUrl = "/profile";
      else if (n.body.includes("اختبار") || n.body.includes("مراجعة")) targetUrl = "/admin";
      else targetUrl = "/dashboard";
    }
    router.push(safeInternalPath(targetUrl));
  };

  const getIcon = (body: string) => {
    if (body.includes("رسالة")) return <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (body.includes("عرض") || body.includes("مشروع")) return <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />;
    if (body.includes("اعتماد") || body.includes("قبول") || body.includes("تفعيل")) return <ShieldCheck className="w-4 h-4 text-[#056B38] shrink-0" />;
    return <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />;
  };

  return (
    <div className="relative font-body" dir="rtl" ref={menuRef}>
      <button
        aria-label="الإشعارات"
        onClick={handleToggle}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#D1E3D6] bg-white hover:bg-[#E8FAF0] transition-colors cursor-pointer shadow-2xs active:scale-95"
      >
        <Bell className="h-5 w-5 text-[#05291A]" />
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white shadow-xs animate-bounce">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop for seamless tap-away dismissal */}
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40 sm:hidden animate-in fade-in duration-150"
            onClick={handleClose}
          />

          {/* Notifications Dropdown Sheet */}
          <div className="fixed inset-x-3.5 top-[72px] sm:inset-x-auto sm:absolute sm:left-0 sm:top-13 z-50 sm:w-96 max-h-[calc(100dvh-5.5rem)] sm:max-h-[480px] flex flex-col rounded-[24px] border border-[#D1E3D6] bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 sm:zoom-in-100 slide-in-from-top-2 duration-150 font-body text-right">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[#D1E3D6]/70 shrink-0 bg-white/95 backdrop-blur-xs">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-[#05291A] text-sm sm:text-[15px]">مركز الإشعارات</span>
                {unread > 0 && (
                  <span className="text-[11px] bg-red-50 text-red-700 font-black px-2.5 py-0.5 rounded-full border border-red-200">
                    {unread} جديد
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[12px] text-[#056B38] hover:text-[#08592E] hover:underline font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>تعيين الكل كمقروء</span>
                </button>
              )}
            </div>

            {/* Scrollable Notifications List */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 space-y-1.5 divide-y divide-neutral-100 no-scrollbar">
              {items.length ? (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-right p-3 sm:p-3.5 rounded-[18px] transition-all flex items-start gap-3 cursor-pointer group pt-3 ${
                      n.is_read === 0
                        ? "bg-[#E8FAF0]/80 hover:bg-[#E8FAF0] border border-[#C5E8D1] shadow-2xs font-bold"
                        : "hover:bg-neutral-50 border border-transparent font-medium"
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-white border border-[#D1E3D6] shadow-2xs mt-0.5 shrink-0">
                      {getIcon(n.body)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-[12.5px] sm:text-[13px] text-[#05291A] leading-relaxed group-hover:text-[#056B38] transition-colors">
                        {n.body}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-[#526B5E]">
                        <time className="font-medium text-neutral-400 font-mono text-[10.5px]" dir="ltr">
                          {new Date(n.created_at).toLocaleString("ar-EG", {
                            month: "numeric",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                            hour12: true,
                          })}
                        </time>
                        <span className="inline-flex items-center gap-1 text-[#056B38] font-black text-[11px] opacity-80 group-hover:opacity-100 transition-opacity">
                          <span>انتقال</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                    {n.is_read === 0 && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0 mt-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#056B38]" />
                      </span>
                    )}
                  </button>
                ))
              ) : (
                <div className="p-10 text-center text-xs text-[#526B5E]">لا توجد إشعارات حالياً.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
