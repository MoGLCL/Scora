"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, Info } from "lucide-react";

export function DemoNoticeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem("scora_demo_notice_seen");
      if (!dismissed) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem("scora_demo_notice_seen", "true");
    } catch {
      // Ignore
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-2xl space-y-5 dir-rtl" dir="rtl">
        {/* Top Decorative Background Glow */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#E8FAF0] blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6] shrink-0">
            <Sparkles className="h-6 w-6" />
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-black p-1 rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="إغلاق التنبيه"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8FAF0] px-3 py-1 text-[11px] font-extrabold text-[#056B38] border border-[#D1E3D6]">
            <Info className="h-3.5 w-3.5" />
            <span>نسخة تجريبية (Demo Version)</span>
          </div>
          <h3 className="text-xl font-extrabold text-[#05291A]">مرحباً بك في منصة سكورا (SCORA)</h3>
          <p className="text-xs text-[#526B5E] leading-relaxed font-bold">
            يرجى العلم أن المنصة حالياً في مرحلة العرض التجريبي والتقييم البرمجي التطويري (Demo Mode). بعض الخدمات وخوادم الذكاء الاصطناعي قد تخضع لتحديثات وتحسينات مستمرة لرفع السرعة والدقة.
          </p>
        </div>

        <div className="pt-2 relative z-10">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center cursor-pointer"
          >
            أتفهم ذلك، استمرار للمنصة
          </button>
        </div>
      </div>
    </div>
  );
}
