"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

type NotificationItem = {
  id: number;
  body: string;
  is_read: 0 | 1;
  created_at: string;
};

export function NotificationsMenu() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);

  const load = () =>
    fetch("/api/notifications", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => {});

  useEffect(() => {
    let active = true,
      t: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      await load();
      if (active) t = setTimeout(poll, 5000);
    };
    void poll();
    return () => {
      active = false;
      if (t) clearTimeout(t);
    };
  }, []);

  const unread = items.filter((x) => !x.is_read).length;

  return (
    <div className="relative">
      <button
        aria-label="الإشعارات"
        onClick={async () => {
          setOpen(!open);
          if (!open && unread) {
            await fetch("/api/notifications", { method: "PATCH" });
            await load();
          }
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#D1E3D6] bg-white hover:bg-[#E8FAF0] transition-colors cursor-pointer"
      >
        <Bell className="h-5 w-5 text-[#05291A]" />
        {unread > 0 && (
          <span className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-extrabold text-white shadow-xs">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-13 z-50 w-80 max-h-80 overflow-y-auto rounded-2xl border border-[#D1E3D6] bg-white p-3 shadow-xl space-y-1 text-right divide-y divide-neutral-100 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 px-1 border-b border-neutral-100">
            <span className="font-extrabold text-[#05291A] text-xs">مركز الإشعارات</span>
            <span className="text-[10px] text-[#526B5E] font-bold">{items.length} إشعار</span>
          </div>

          {items.length ? (
            items.map((n) => (
              <div key={n.id} className="pt-2 pb-2 px-1 text-xs text-[#05291A] font-bold leading-relaxed">
                <p>{n.body}</p>
                <time className="mt-1 block text-[10px] font-normal text-[#526B5E]">
                  {new Date(n.created_at).toLocaleString("ar-EG")}
                </time>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-xs font-bold text-[#526B5E]">لا توجد إشعارات حالياً</p>
          )}
        </div>
      )}
    </div>
  );
}
