"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  XCircle
} from "lucide-react";
import {
  requestReassessmentByDeveloper,
  startDeveloperAssessment
} from "@/lib/actions/developer-assessment";

export function AdmissionStatus() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reassessmentReason, setReassessmentReason] = useState<string | null>(null);
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
        return;
      }
      const data = await response.json();
      const currentStatus = data.status || "pending";
      setStatus(currentStatus);
      if (data.reassessmentReason) {
        setReassessmentReason(data.reassessmentReason);
      }

      if (data.assessmentUrl) {
        window.location.href = data.assessmentUrl;
        return;
      }

      if (currentStatus === "approved") {
        window.location.href = "/profile";
        return;
      }
    } catch {
      // Ignore background loop network glitches silently
    }
  };

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkLoop = async () => {
      if (!active) return;
      await fetchStatus();
      if (active) timer = setTimeout(checkLoop, 3000); // 3s polling
    };

    void checkLoop();

    const fallbackTimer = setTimeout(() => {
      if (active && status === null) {
        setStatus("pending");
      }
    }, 1500);

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleManualStart = async () => {
    setLoadingTest(true);
    setError("");
    recovering.current = true;
    try {
      const result = await startDeveloperAssessment();
      if (result && result.ok && result.assessmentUrl) {
        window.location.href = result.assessmentUrl;
      } else if (result && !result.ok) {
        setError(result.error);
        setLoadingTest(false);
        recovering.current = false;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء إنشاء الاختبار");
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
      setError("");
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
                <XCircle className="h-6 w-6" />
              </div>
            )}

            <div>
              <h2 className="text-xl font-extrabold text-[#05291A]">
                {status === "admin_review"
                  ? "طلب اعتمادك قيد المراجعة الفنية من الإدارة"
                  : status === "reset_requested"
                  ? "تم إرسال طلب إعادة الاختبار إلى الإدارة (بانتظار الموافقة)"
                  : status === "reset_approved"
                  ? "وافقت الإدارة على طلب إعادة الاختبار! يمكنك البدء الآن"
                  : status === "rejected"
                  ? "تم رفض طلب إعادة الاختبار / الاعتماد من قِبل الأدمن"
                  : "طلب الاعتماد مفعل - يمكنك بدء الاختبار الآن"}
              </h2>
              <p className="text-xs text-[#526B5E] mt-0.5">
                {status === "admin_review"
                  ? "تم تسليم أجوبة اختبارك بنجاح، ويقوم فريق الإدارة بمراجعة النتائج لاعتماد حسابك."
                  : status === "reset_requested"
                  ? "سيقوم الأدمن بمراجعة طلبك وإتاحة إعادة الاختبار لك قريباً."
                  : status === "reset_approved"
                  ? "تم منحك الصلاحية من الأدمن. اضغط على زر 'بدء الاختبار الآن' أدناه."
                  : status === "rejected"
                  ? "نأسف، لقد قمت الإدارة بمراجعة طلبك ورفضه. يمكنك تقديم طلب جديد للتوضيح للإدارة إذا أردت."
                  : "اضغط على زر بدء الاختبار أدناه للتقييم البرمجي."}
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
                : status === "reset_approved"
                ? "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
                : "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
            }`}
          >
            {status === "admin_review"
              ? "قيد مراجعة الأدمن"
              : status === "reset_requested"
              ? "بانتظار موافقة الأدمن"
              : status === "reset_approved"
              ? "تمت موافقة الأدمن (صلاحية مفعلة)"
              : status === "rejected"
              ? "تم الرفض بواسطة الأدمن ❌"
              : "صلاحية مفعلة"}
          </span>
        </div>

        {/* AI Generation Loading Banner & Apology Note */}
        {loadingTest && (
          <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] p-4 text-xs font-bold text-[#056B38] space-y-2 animate-pulse">
            <div className="flex items-center gap-2 font-extrabold">
              <Clock className="h-5 w-5 text-[#056B38] animate-spin shrink-0" />
              <span>جاري إنشاء وتوليد أسئلة الاختبار البرمجي بالذكاء الاصطناعي...</span>
            </div>
            <p className="text-[11px] text-[#526B5E] leading-relaxed font-normal">
              نعتذر، قد تستغرق عملية توليد الأسئلة وتجهيز الاختبار بالذكاء الاصطناعي بضع ثوانٍ إضافية. جاري تجهيز اختبارك وسيتم رفع سرعة واستجابة الخدمة قريباً!
            </p>
          </div>
        )}

        {/* Rejection Notice Banner */}
        {status === "rejected" && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-900 font-bold space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-extrabold">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>إشعار الإدارة: تم رفض الطلب</span>
            </div>
            <p className="text-red-800 leading-relaxed font-normal">
              {reassessmentReason || "قام الأدمن بمراجعة طلب الاعتماد الخاص بك وقرر عدم منح صلاحية إعادة الاختبار حالياً."}
            </p>
          </div>
        )}

        {/* Error Banners */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-extrabold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Action Controls Box */}
        <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-[#05291A] text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#056B38]" />
                خيارات تقييم المهارات والاختبار
              </h4>
              <p className="text-xs text-[#526B5E] mt-1">
                {status === "reset_approved"
                  ? "تم منحك الصلاحية بنجاح من الإدارة، يمكنك البدء الآن."
                  : status === "rejected"
                  ? "الاختبار مغلق بسبب رفض الإدارة للطلب السابق. يمكنك تقديم طلب جديد للتوضيح."
                  : status === "reset_requested"
                  ? "طلبك قيد مراجعة الأدمن في لوحة التحكم."
                  : "اضغط على زر بدء الاختبار أدناه."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
              {/* Primary Start Test Button - RENDERED WHEN ADMIN APPROVES OR PENDING INITIAL */}
              {(status === "reset_approved" || status === "pending") && (
                <button
                  type="button"
                  disabled={loadingTest}
                  onClick={handleManualStart}
                  className="h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white px-7 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial"
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
              )}

              {/* Request Re-test Button */}
              {status !== "reset_requested" && status !== "reset_approved" && (
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(true)}
                  className="h-11 rounded-full border border-[#056B38] bg-[#E8FAF0] text-[#056B38] hover:bg-[#056B38] hover:text-white px-6 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xs flex-1 sm:flex-initial cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>طلب إعادة الاختبار من الإدارة</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {status === "reset_requested" && (
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-900 font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-700 shrink-0" />
            <span>تم إرسال طلبك للإدارة. سيزول هذا التنبيه ويظهر زر "بدء الاختبار الآن" أوتوماتيكياً فور موافقة الأدمن.</span>
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
                className="text-gray-400 hover:text-black cursor-pointer"
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
                className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {requestSubmitting ? "جاري الإرسال..." : "إرسال الطلب للإدارة"}
              </button>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
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
