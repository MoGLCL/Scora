"use client";

import { useState } from "react";
import { requestDeveloperVerificationAction } from "@/lib/actions/tickets";
import { useProfile } from "@/components/profile-provider";
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

export function RequestVerificationButton({
  trustScore,
}: {
  trustScore: number;
}) {
  const { addToast } = useProfile();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRequest = async () => {
    setLoading(true);
    try {
      const res = await requestDeveloperVerificationAction();
      if (res.ok) {
        setSubmitted(true);
        addToast("تم إرسال طلب التوثيق إلى فريق الإدارة بنجاح", "success");
      } else {
        addToast(res.error || "تعذر إرسال الطلب", "warn");
      }
    } catch {
      addToast("حدث خطأ أثناء إرسال طلب التوثيق", "warn");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#E8FAF0] border border-[#C5E8D1] text-[#056B38] text-xs font-bold">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>طلب التوثيق قيد المراجعة</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#D1E3D6] hover:border-[#056B38] hover:bg-[#F7FAF8] text-[#05291A] text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#056B38]" />
      ) : (
        <ShieldCheck className="w-3.5 h-3.5 text-[#056B38]" />
      )}
      <span>{trustScore >= 90 ? "تفعيل الشارة الموثقة" : "طلب شارة مطور موثوق"}</span>
    </button>
  );
}
