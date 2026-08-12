"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UserCheck
} from "lucide-react";
import { startDeveloperAssessment } from "@/lib/actions/developer-assessment";

export function AdmissionStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadingTest, setLoadingTest] = useState(false);
  const router = useRouter();
  const recovering = useRef(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/developer-admission/status", { cache: "no-store" });
      if (!response.ok) {
        setError("تعذر قراءة حالة الاعتماد من السيرفر");
        return;
      }
      const data = await response.json();
      setStatus(data.status);

      if (data.assessmentUrl) {
        router.replace(data.assessmentUrl);
        return;
      }

      if (data.status === "approved") {
        router.replace("/dashboard");
        return;
      }

      if (data.needsGeneration && !recovering.current) {
        recovering.current = true;
        setLoadingTest(true);
        const result = await startDeveloperAssessment();
        if (result && !result.ok) {
          setError(result.error);
          setLoadingTest(false);
          recovering.current = false;
        }
      }
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
    }
  };

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkLoop = async () => {
      if (!active) return;
      await fetchStatus();
      if (active) timer = setTimeout(checkLoop, 6000);
    };

    void checkLoop();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  const handleManualStart = async () => {
    setLoadingTest(true);
    setError("");
    recovering.current = true;
    const result = await startDeveloperAssessment();
    if (result && !result.ok) {
      setError(result.error);
      setLoadingTest(false);
      recovering.current = false;
    }
  };

  if (status === null) {
    return (
      <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 text-center space-y-3 shadow-xs">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E8FAF0] text-[#056B38]">
          <Clock className="h-6 w-6 animate-spin" />
        </div>
        <h3 className="text-lg font-extrabold text-[#05291A]">جارٍ التحقق من حالة اعتمادك مع السيرفر...</h3>
        <p className="text-sm text-[#526B5E]">سيتم توجيهك تلقائياً فور جاهزية التقييم.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3">
            {status === "admin_review" && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="h-6 w-6" />
              </div>
            )}
            {(status === "pending" || status === "assessment_in_progress") && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]">
                <Sparkles className="h-6 w-6" />
              </div>
            )}
            {status === "rejected" && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
                <AlertTriangle className="h-6 w-6" />
              </div>
            )}

            <div>
              <h2 className="text-xl font-extrabold text-[#05291A]">
                {status === "admin_review"
                  ? "طلب اعتمادك قيد المراجعة الفنية من الإدارة"
                  : status === "pending" || status === "assessment_in_progress"
                  ? "حسابك جاهز لإجراء تقييم المهارات بالذكاء الاصطناعي"
                  : status === "rejected"
                  ? "تم رفض طلب الاعتماد السابق"
                  : `حالة الحساب: ${status}`}
              </h2>
              <p className="text-xs text-[#526B5E] mt-0.5">
                {status === "admin_review"
                  ? "تم تسليم أجوبة اختبارك بنجاح، ويقوم فريق الإدارة بمراجعة النتائج لاعتماد حسابك."
                  : status === "pending" || status === "assessment_in_progress"
                  ? "يتيح لك التقييم بناء درجة السكورا والموثوقية وتوثيق مهاراتك الفنية أوتوماتيكياً."
                  : "يمكنك التواصل مع الدعم الفني أو تقديم طلب إعادة تقييم."}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-4 py-1.5 text-xs font-extrabold shadow-xs ${
              status === "admin_review"
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : status === "rejected"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
            }`}
          >
            {status === "admin_review"
              ? "قيد مراجعة الأدمن"
              : status === "rejected"
              ? "طلب مرفوض"
              : "جاهز للاختبار"}
          </span>
        </div>

        {/* Action Controls & Error Banners */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-extrabold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" />
              <span>{error}</span>
            </div>
            <p className="text-red-700">تأكد من ضبط إعدادات OpenRouter بواسطة أدمن النظام، ثم اضغط إعادة المحاولة بالأسفل.</p>
          </div>
        )}

        {(status === "pending" || status === "assessment_in_progress") && (
          <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-extrabold text-[#05291A] text-sm flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#056B38]" />
                مستعد لإعادة التقييم التلقائي؟
              </h4>
              <p className="text-xs text-[#526B5E]">
                سيتولى الذكاء الاصطناعي صياغة أسئلة برمجية مخصصة لمهاراتك وتوليد نموذج الاختبار خلال ثوانٍ.
              </p>
            </div>

            <button
              type="button"
              disabled={loadingTest}
              onClick={handleManualStart}
              className="h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white px-8 font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 w-full md:w-auto"
            >
              {loadingTest ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>جاري إنشاء الأسئلة وتجهيز الاختبار...</span>
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5" />
                  <span>بدء الاختبار الآن</span>
                </>
              )}
            </button>
          </div>
        )}

        {status === "rejected" && (
          <div className="flex items-center justify-between rounded-2xl bg-gray-50 border border-neutral-200 p-4">
            <span className="text-xs font-bold text-gray-700">يمكنك طلب إعادة فتح الاختبار من إدارة المنصة.</span>
            <button
              type="button"
              disabled={loadingTest}
              onClick={handleManualStart}
              className="h-10 rounded-full bg-[#056B38] text-white px-6 font-bold text-xs hover:bg-[#005B27] transition-all"
            >
              تقديم طلب إعادة التقييم
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
