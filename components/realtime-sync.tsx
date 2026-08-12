"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SYNC_INTERVAL_MS = 15_000;

export function RealtimeSync({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState !== "visible" || refreshing.current) return;
      refreshing.current = true;
      router.refresh();
      window.setTimeout(() => { refreshing.current = false; }, 1_000);
    };
    const timer = window.setInterval(refresh, SYNC_INTERVAL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled, router]);

  return null;
}
