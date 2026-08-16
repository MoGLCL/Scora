"use client";

import { useEffect, useRef } from "react";
import { useProfile } from "@/components/profile-provider";

export function UserHeartbeat() {
  const { userRole } = useProfile();
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    if (userRole === "guest") return;

    const ping = () => {
      const now = Date.now();
      // Throttle pings to at least 25s apart
      if (now - lastPingRef.current < 25000) return;
      lastPingRef.current = now;

      fetch("/api/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      }).catch(() => {});
    };

    // Initial ping on load
    ping();

    // Regular interval every 45s
    const interval = setInterval(ping, 45000);

    // Ping on focus or visible state change
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        ping();
      }
    };

    window.addEventListener("focus", ping);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", ping);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [userRole]);

  return null;
}
