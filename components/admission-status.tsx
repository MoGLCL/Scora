"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X
} from "lucide-react";
import {
  requestReassessmentByDeveloper,
  startDeveloperAssessment
} from "@/lib/actions/developer-assessment";

export function AdmissionStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadingTest, setLoadingTest] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);

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
        window.location.href = data.assessmentUrl;
        return;
      }

      if (data.status === "approved") {
        router.replace("/dashboard");
        return;
      }

      if (
        (data.status === "reset_approved" || data.needsGeneration) &&
        !recovering.current
      ) {
        recovering.current = true;
        setLoadingTest(true);
        const result = await startDeveloperAssessment();
        if (result && result.ok && result.assessmentUrl) {
          window.location.href = result.assessmentUrl;
        } else if (result && !result.ok) {
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
    if (result && result.ok && result.assessmentUrl) {
      window.location.href = result.assessmentUrl;
    } else if (result && !result.ok) {
      setError(result.error);
      setLoadingTest(false);
      recovering.current = false;
    }
  };

  const handleSendReassessmentRequest = async () => {
    setRequestSubmitting(true);
    setError("");
    const res = await requestReassessmentByDeveloper(requestReason);
    setRequestSubmitting(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      setRequestModalOpen(false);
      setStatus("reset_requested");
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
      {/* Main Status Card */}
      <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3">
            {status === "admin_review" && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="h-6 w-6" />
              </div>
            )}
            {status === "reset_requested" && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-800 border border-sky-200">
                <Send className="h-6 w-6" />
              </div>
            )}
            {(status === "pending" || status === "assessment_in_progress" || status === "reset_approved") && (
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
                  : status === "reset_requested"
                  ? "تم إرسال طلب إعادة الاختبار إلى الإدارة (بانتظار الموافقة)"
                  : status === "reset_approved"
                  ? "وافقت الإدارة على طلب إعادة الاختبار! جاهز للبدء"
                  : status === "pending" || status === "assessment_in_progress"
                  ? "حسابك جاهز لإجراء تقييم المهارات بالذكاء الاصطناعي"
                  : status === "rejected"
                  ? "تم رفض طلب الاعتماد السابق"
                  : `حالة الحساب: ${status}`}
              </h2>
              <p className="text-xs text-[#526B5E] mt-0.5">
                {status === "admin_review"
                  ? "تم تسليم أجوبة اختبارك بنجاح، ويقوم فريق الإدارة بمراجعة النتائج لاعتماد حسابك."
                  : status === "reset_requested"
                  ? "سيقوم الأدمن بمراجعة طلبك وإتاحة إعادة الاختبار لك قريباً."
                  : status === "reset_approved" || status === "pending" || status === "assessment_in_progress"
                  ? "اضغط على زر 'بدء الاختبار الآن' وسيتم توليد اختبارك ونقلك إليه مباشرة."
                  : "يمكنك تقديم طلب إعادة إجراء الاختبار للإدارة لمراجعته."}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-4 py-1.5 text-xs font-extrabold shadow-xs ${
              status === "admin_review"
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : status === "reset_requested"
                ? "bg-sky-100 text-sky-900 border border-sky-300"
                : status === "rejected"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
            }`}
          >
            {status === "admin_review"
              ? "قيد مراجعة الأدمن"
              : status === "reset_requested"
              ? "بانتظار موافقة الأدمن"
              : status === "reset_approved"
              ? "تمت موافقة الإدارة"
              : status === "rejected"
              ? "طلب مرفوض"
              : "جاهز للاختبار"}
          </span>
        </div>

        {/* Error Banners */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-extrabold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" />
              <span>{error}</span>
            </div>
            <p className="text-red-700">تأكد من ضبط إعدادات OpenRouter بواسطة أدمن النظام، ثم اضغط إعادة المحاولة بالأسفل.</p>
          </div>
        )}

        {/* Always Visible Action Control Box */}
        <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-[#05291A] text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#056B38]" />
                خيارات تقييم المهارات والاختبار
              </h4>
              <p className="text-xs text-[#526B5E] mt-1">
                يمكنك بدء نموذج الاختبار فوراً أو تقديم طلب رسمي للإدارة لإتاحة فرصة جديدة لإجراء التقييم.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
              {/* Primary Start Test Button */}
              <button
                type="button"
                disabled={loadingTest}
                onClick={handleManualStart}
                className="h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white px-7 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 flex-1 sm:flex-initial"
              >
                {loadingTest ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>جاري التوليد والدخول...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-5 w-5" />
                    <span>بدء الاختبار الآن</span>
                  </>
                )}
              </button>

              {/* Always Visible Request Re-test Button */}
              <button
                type="button"
                onClick={() => setRequestModalOpen(true)}
                className="h-11 rounded-full border border-[#056B38] bg-[#E8FAF0] text-[#056B38] hover:bg-[#056B38] hover:text-white px-6 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xs flex-1 sm:flex-initial"
              >
                <RotateCcw className="h-4 w-4" />
                <span>طلب إعادة الاختبار من الإدارة</span>
              </button>
            </div>
          </div>
        </div>

        {status === "reset_requested" && (
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-900 font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-700 shrink-0" />
            <span>طلب إعادة الاختبار الخاص بك قيد مراجعة الأدمن حالياً. ستصلك تنبيه فور الموافقة.</span>
          </div>
        )}
      </div>

      {/* Modal: Developer Request Re-assessment Form */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-extrabold text-[#05291A] flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-[#056B38]" />
                طلب إعادة إجراء اختبار التقييم
              </h3>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#526B5E] leading-relaxed">
                اكتب توضيحاً للإدارة بسبب طلب إعادة الاختبار (مثلاً: إضافة مهارات جديدة، حدوث عطل تقني، إلخ):
              </p>

              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="اكتب التوضيح هنا (اختياري)..."
                rows={3}
                className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={requestSubmitting}
                onClick={handleSendReassessmentRequest}
                className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {requestSubmitting ? "جاري الإرسال..." : "إرسال الطلب للإدارة"}
              </button>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
