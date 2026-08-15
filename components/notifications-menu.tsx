"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  MessageSquare,
  Briefcase,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Volume2
} from "lucide-react";
import {
  soundFX,
  requestBrowserNotificationPermission,
  sendBrowserNotification
} from "@/lib/client-audio-notifications";

type NotificationItem = {
  id: number;
  body: string;
  link_url?: string | null;
  is_read: 0 | 1;
  created_at: string;
};

export function NotificationsMenu() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const isFirstLoad = useRef(true);
  const knownNotificationIds = useRef<Set<number>>(new Set());

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
            "إشعار جديد في سكورا 🔔",
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
      await load();
      if (active) t = setTimeout(poll, 3500); // 3.5s live polling
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

  const handleItemClick = async (n: NotificationItem) => {
    setOpen(false);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id })
      });
      setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: 1 } : item)));
    } catch {
      // Ignore
    }

    // Determine target URL
    let targetUrl = n.link_url;
    if (!targetUrl) {
      if (n.body.includes("رسالة")) targetUrl = "/chat";
      else if (n.body.includes("مشروع") || n.body.includes("عرض")) targetUrl = "/projects";
      else if (n.body.includes("اعتماد") || n.body.includes("تفعيل")) targetUrl = "/profile";
      else if (n.body.includes("اختبار") || n.body.includes("مراجعة")) targetUrl = "/admin";
      else targetUrl = "/dashboard";
    }

    router.push(targetUrl);
  };

  const getIcon = (body: string) => {
    if (body.includes("رسالة")) return <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (body.includes("عرض") || body.includes("مشروع")) return <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />;
    if (body.includes("اعتماد") || body.includes("قبول") || body.includes("تفعيل")) return <ShieldCheck className="w-4 h-4 text-[#056B38] shrink-0" />;
    return <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />;
  };

  return (
    <div className="relative font-body" dir="rtl">
      <button
        aria-label="الإشعارات"
        onClick={() => {
          void requestBrowserNotificationPermission();
          setOpen(!open);
        }}
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
        <div className="absolute left-0 top-13 z-50 w-84 sm:w-96 max-h-[420px] overflow-y-auto rounded-[24px] border border-[#D1E3D6] bg-white p-3.5 shadow-2xl space-y-1 text-right divide-y divide-neutral-100 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2.5 px-2 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#05291A] text-sm">مركز الإشعارات</span>
              {unread > 0 && (
                <span className="text-[10px] bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                  {unread} جديد
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-[#056B38] hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>تعيين الكل كمقروء</span>
              </button>
            )}
          </div>

          <div className="pt-1 divide-y divide-neutral-100">
            {items.length ? (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-right p-3 rounded-2xl transition-all flex items-start gap-3 cursor-pointer my-1 group ${
                    n.is_read === 0
                      ? "bg-[#E8FAF0]/70 hover:bg-[#E8FAF0] border border-[#D1E3D6]/60 font-bold"
                      : "hover:bg-neutral-50 border border-transparent font-medium"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-white border border-[#D1E3D6] shadow-2xs mt-0.5">
                    {getIcon(n.body)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#05291A] leading-relaxed group-hover:text-[#056B38] transition-colors">
                      {n.body}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-[#526B5E]">
                      <time>{new Date(n.created_at).toLocaleString("ar-EG")}</time>
                      <span className="inline-flex items-center gap-0.5 text-[#056B38] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>انتقال</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                  {n.is_read === 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#056B38] shrink-0 mt-2" />
                  )}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-[#526B5E]">لا توجد إشعارات حالياً.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
