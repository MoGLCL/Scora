"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  Fingerprint,
  Layers,
  Clock,
  BarChart3,
  Check
} from "lucide-react";
import { startAiTrustReview, type AiReviewReport } from "@/lib/actions/trust-agent";

export function AdminAiReviewCard({
  assessmentPublicId,
  initialReport,
  snapshotHash,
  snapshotLockedAt,
}: {
  assessmentPublicId: string;
  initialReport: AiReviewReport | null;
  snapshotHash: string | null;
  snapshotLockedAt: Date | string | null;
}) {
  const [report, setReport] = useState<AiReviewReport | null>(initialReport);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleRunAiReview = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await startAiTrustReview(assessmentPublicId);
      if (!res.ok) {
        setError(res.error || "تعذر إكمال فحص الذكاء الاصطناعي");
      } else if (res.report) {
        setReport(res.report);
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الفحص");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. IMMUTABLE EVIDENCE SNAPSHOT LOCK CARD */}
      <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-7 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-[#05291A]">حزمة الأدلة البرمجية المقفلة (Evidence Snapshot)</h3>
                <span className="bg-[#E8FAF0] text-[#056B38] text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-[#D1E3D6] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Immutable Locked</span>
                </span>
              </div>
              <p className="text-xs text-[#526B5E] mt-0.5">
                تم قفل الكود والأسئلة والتسجيل الصوتي وسلسلة الأحداث المشفرة، ولا يمكن تعديلها بعد إنهاء الاختبار.
              </p>
            </div>
          </div>

          <div className="text-left font-mono dir-ltr">
            <span className="text-[10px] text-neutral-400 block font-sans">SHA-256 Snapshot Hash</span>
            <span className="text-xs font-bold text-[#05291A] bg-[#F7FAF8] px-2.5 py-1 rounded-lg border border-[#D1E3D6] block truncate max-w-[220px]">
              {snapshotHash ? `${snapshotHash.slice(0, 16)}...${snapshotHash.slice(-8)}` : "GEN-LOCKED-001"}
            </span>
          </div>
        </div>

        {/* Snapshot Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3">
            <div className="text-[11px] text-[#526B5E] font-medium">حالة التعديل</div>
            <div className="text-xs font-extrabold text-[#056B38] mt-0.5">مقفلة ومشفرة 🔒</div>
          </div>
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3">
            <div className="text-[11px] text-[#526B5E] font-medium">وقت التوثيق</div>
            <div className="text-xs font-extrabold text-[#05291A] mt-0.5">
              {snapshotLockedAt ? new Date(snapshotLockedAt).toLocaleTimeString("ar-EG") : "مكتمل"}
            </div>
          </div>
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3">
            <div className="text-[11px] text-[#526B5E] font-medium">الموثوقية</div>
            <div className="text-xs font-extrabold text-[#05291A] mt-0.5">100% SHA-256 Chain</div>
          </div>
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3">
            <div className="text-[11px] text-[#526B5E] font-medium">صلاحية الفحص</div>
            <div className="text-xs font-extrabold text-[#056B38] mt-0.5">متاحة للأدمن فقط ⚡</div>
          </div>
        </div>
      </div>

      {/* 2. POST-ASSESSMENT TRUST INTELLIGENCE AGENT CONTROL */}
      <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Agent Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-[#05291A]">وكيل الذكاء الاصطناعي للأدلة (SCORA Trust Intelligence Agent)</h2>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Post-Assessment Review
                </span>
              </div>
              <p className="text-xs text-[#526B5E] mt-0.5">
                يقوم الوكيل الذكي بفحص حزمة الأدلة المقفلة وتدقيق الكود والمقابلة لتوليد تقرير موثوق بالأدلة للمراجع البشري.
              </p>
            </div>
          </div>

          {/* Trigger Button */}
          <div>
            <button
              type="button"
              disabled={loading}
              onClick={handleRunAiReview}
              className="h-11 px-6 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>جارٍ تشغيل فحص الوكيل الذكي للأدلة...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{report ? "إعادة تشغيل فحص الذكاء الاصطناعي" : "تشغيل فحص الذكاء الاصطناعي (Start AI Review)"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* If Report is NOT Generated Yet */}
        {!report && !loading && (
          <div className="rounded-2xl bg-[#F7FAF8] border border-dashed border-[#D1E3D6] p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center mx-auto border border-[#D1E3D6]">
              <Fingerprint className="w-6 h-6" />
            </div>
            <h4 className="text-base font-extrabold text-[#05291A]">الوكيل الذكي بانتظار إشارة البدء من الأدمن</h4>
            <p className="text-xs text-[#526B5E] max-w-md mx-auto leading-relaxed">
              وفق معمارية SCORA، لا يتم التقييم التلقائي أثناء الاختبار لمنع أي تأثير، اضغط على زر &quot;تشغيل فحص الذكاء الاصطناعي&quot; أعلاه لبدء تحليل حزمة الأدلة.
            </p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-8 text-center space-y-4 animate-pulse">
            <div className="w-12 h-12 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 animate-spin text-[#056B38]" />
            </div>
            <h4 className="text-base font-extrabold text-[#05291A]">جارٍ تدقيق الكود البرمجي وسلسلة الأحداث والمقابلة الصوتية...</h4>
            <p className="text-xs text-[#526B5E]">
              يقوم وكيل SCORA Trust Agent بربط الأدلة عبر 9 طبقات أمان وتوليد درجات الثقة والمخاطر.
            </p>
          </div>
        )}

        {/* 3. GENERATED EVIDENCE-GROUNDED REPORT */}
        {report && !loading && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Top Scores Triple Gauge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Trust Score */}
              <div className="rounded-2xl bg-[#E8FAF0] border border-[#CDE5D6] p-5 text-right space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#056B38]">درجة الثقة (Trust Score)</span>
                  <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                </div>
                <div className="text-3xl font-black text-[#056B38] font-mono">{report.trustScore}%</div>
                <p className="text-[11px] text-[#526B5E]">توصية مبنية على دقة الأداء والأدلة</p>
              </div>

              {/* Risk Score */}
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-right space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">مؤشر المخاطر (Risk Score)</span>
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                </div>
                <div className="text-3xl font-black text-amber-800 font-mono">{report.riskScore}%</div>
                <p className="text-[11px] text-amber-700">تقييم تماسك وتطابق الحلول</p>
              </div>

              {/* Confidence Score */}
              <div className="rounded-2xl bg-sky-50 border border-sky-200 p-5 text-right space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900">نسبة اليقين (Confidence)</span>
                  <BarChart3 className="w-4 h-4 text-sky-700" />
                </div>
                <div className="text-3xl font-black text-sky-800 font-mono">{report.confidenceScore}%</div>
                <p className="text-[11px] text-sky-700">كفاية واكتمال حزمة الأدلة</p>
              </div>

            </div>

            {/* AI Attribution & Code Provenance Box */}
            <div className="rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
                <h4 className="text-sm font-extrabold text-[#05291A] flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-[#056B38]" />
                  <span>تحليل مصدر الكود وفهم المطور (AI Attribution & Understanding)</span>
                </h4>
                <span className="text-xs font-bold px-3 py-0.5 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#CDE5D6]">
                  {report.aiAttribution.assessment === "verified_authentic"
                    ? "أصالة موثقة (Verified Authentic)"
                    : report.aiAttribution.assessment === "assisted_with_understanding"
                    ? "مساعدة مشروعة مع فهم كامل (Assisted with Understanding)"
                    : "بانتظار توضيح إضافي"}
                </span>
              </div>
              <p className="text-xs text-[#05291A] font-medium leading-relaxed">
                {report.aiAttribution.explanation}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {report.aiAttribution.signals.map((sig, sIdx) => (
                  <span key={sIdx} className="text-[11px] font-bold bg-white text-[#526B5E] px-3 py-1 rounded-xl border border-[#D1E3D6] flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-[#056B38]" />
                    <span>{sig}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Grounded Claims Table (With Evidence IDs & Layers) */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-[#05291A] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#056B38]" />
                <span>النتائج المدعومة بالأدلة المشفرة (Evidence-Grounded Claims)</span>
              </h4>
              <div className="overflow-x-auto rounded-2xl border border-[#D1E3D6]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#E8FAF0] text-[#056B38] font-bold border-b border-[#D1E3D6]">
                    <tr>
                      <th className="p-3">الأدلة والادعاء (Claim)</th>
                      <th className="p-3">الطبقة (Layer)</th>
                      <th className="p-3">معرف الدليل (Evidence ID)</th>
                      <th className="p-3">نسبة الثقة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {report.groundedClaims.map((claim, cIdx) => (
                      <tr key={cIdx} className="hover:bg-neutral-50">
                        <td className="p-3 font-bold text-[#05291A]">
                          <div>{claim.claim}</div>
                          <div className="text-[10px] text-[#526B5E] font-normal mt-0.5">{claim.reason}</div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-[#056B38]">{claim.layer}</td>
                        <td className="p-3 font-mono text-[10px] text-neutral-400">
                          {claim.evidenceIds.join(", ")}
                        </td>
                        <td className="p-3 font-bold text-[#05291A] font-mono">
                          {Math.round(claim.confidence * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Skill Confidence Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-extrabold text-[#05291A] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#056B38]" />
                <span>مستوى الثقة في المهارات البرمجية (Skill Confidence)</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(report.skillConfidence).map(([skill, conf]) => (
                  <div key={skill} className="rounded-2xl border border-[#D1E3D6] bg-white p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#05291A]">
                      <span>{skill}</span>
                      <span className="font-mono text-[#056B38]">{Math.round(conf * 100)}%</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#056B38] h-full rounded-full" style={{ width: `${Math.round(conf * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supporting Factors & Summary Note */}
            <div className="rounded-2xl bg-[#E8FAF0] border border-[#CDE5D6] p-4 space-y-2">
              <span className="text-xs font-extrabold text-[#056B38] block">خلاصة تقرير الذكاء الاصطناعي للمراجع البشري:</span>
              <p className="text-xs text-[#05291A] font-medium leading-relaxed">{report.summaryHeadline}</p>
              <div className="text-[11px] text-[#526B5E] pt-1">
                تنبيه: قرار الاعتماد النهائي وتحديد نقاط السكورا والـ SP المعتمدة يقع على عاتق الأدمن في نموذج المراجعة أدناه (Layer 10).
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
