"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideDeveloperAdmission } from "@/lib/actions/admin";
import { CheckCircle2, ShieldCheck, XCircle, Award, Sparkles } from "lucide-react";

export function AdmissionDecisionForm({ assessmentPublicId }: { assessmentPublicId: string }) {
  const [reason, setReason] = useState("");
  const [trustScore, setTrustScore] = useState<number>(85);
  const [skillPoints, setSkillPoints] = useState<number>(500);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    setError("");
    const r = await decideDeveloperAdmission({
      assessmentPublicId,
      decision,
      reason: reason || (decision === "approved" ? "تم الاعتماد الفني بواسطة الأدمن" : "تم الرفض بواسطة الأدمن"),
      trustScore: Number(trustScore) || 85,
      skillPoints: Number(skillPoints) || 500
    });
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs space-y-6">
      <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[#05291A]">قرار الاعتماد وتحديد النقاط والأوسمة</h2>
          <p className="text-xs text-[#526B5E]">حدد درجات التراست والـ SP لمطور التقييم واعتمد حسابه أو ارفضه.</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Trust Score Input */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-[#05291A] flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[#056B38]" />
            درجة التراست الممنوحة (Trust Score 0 - 100):
          </label>
          <input
            type="number"
            min={0}
            max={100}
            value={trustScore}
            onChange={(e) => setTrustScore(Number(e.target.value))}
            className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10"
          />
        </div>

        {/* Skill Points (SP) Input */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-[#05291A] flex items-center gap-1.5">
            <Award className="h-4 w-4 text-amber-600" />
            نقاط المهارة الممنوحة (Skill Points - SP):
          </label>
          <input
            type="number"
            min={0}
            max={10000}
            value={skillPoints}
            onChange={(e) => setSkillPoints(Number(e.target.value))}
            className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10"
          />
        </div>
      </div>

      {/* Decision Reason / Note */}
      <div className="space-y-2">
        <label className="text-xs font-extrabold text-[#05291A]">ملاحظات الأدمن وسبب القرار (اختياري / إجباري للرفض):</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="اكتب ملاحظتك التقييمية للمطور هنا..."
          rows={3}
          className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10"
        />
      </div>

      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 pt-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("approved")}
          className="flex-1 h-12 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>{busy ? "جارٍ حفظ القرار والمناقشة..." : "قبول وتفعيل حساب المطور فوراً"}</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => decide("rejected")}
          className="h-12 px-7 rounded-full border border-red-300 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          <XCircle className="h-5 w-5" />
          <span>رفض طلب الاعتماد</span>
        </button>
      </div>
    </div>
  );
}
