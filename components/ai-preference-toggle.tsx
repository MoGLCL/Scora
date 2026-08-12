"use client";

import { useState } from "react";
import { useProfile } from "@/components/profile-provider";
import { setUserAiAssistantEnabled } from "@/lib/actions/settings";

export function AiPreferenceToggle() {
  const { showSsdAssistant, setShowSsdAssistant, addToast } = useProfile();
  const [busy, setBusy] = useState(false);

  return <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
    <h2 className="text-[20px] font-bold text-ink font-heading mb-4 pb-3 border-b border-neutral-100">إعدادات مساعد SSD</h2>
    <div className="flex items-center justify-between gap-5 rounded-[20px] border border-neutral-200/60 bg-[#F7FAF8] p-4">
      <div>
        <div className="text-[15px] font-bold text-ink">إظهار مساعد الذكاء الاصطناعي</div>
        <div className="mt-1 text-[13px] text-muted">يتم حفظ اختيارك في حسابك ويطبق على كل أجهزتك.</div>
      </div>
      <button
        type="button"
        disabled={busy}
        aria-pressed={showSsdAssistant}
        onClick={async () => {
          const next = !showSsdAssistant;
          setBusy(true);
          const result = await setUserAiAssistantEnabled(next);
          setBusy(false);
          if (!result.ok) return addToast(result.error, "warn");
          setShowSsdAssistant(next);
          addToast(next ? "تم تشغيل مساعد SSD" : "تم إيقاف مساعد SSD", "success");
        }}
        className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-50 ${showSsdAssistant ? "bg-[#056B38]" : "bg-neutral-300"}`}
      >
        <span className={`pointer-events-none mt-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${showSsdAssistant ? "translate-x-9" : "translate-x-1"}`} />
      </button>
    </div>
  </div>;
}
