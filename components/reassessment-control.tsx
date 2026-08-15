"use client";

import { useEffect, useState } from "react";
import { Clock, PlayCircle, RotateCcw, Send } from "lucide-react";
import { requestReassessmentByDeveloper, startDeveloperAssessment } from "@/lib/actions/developer-assessment";

type ReassessmentStatus = "pending" | "approved" | "rejected" | null;

export function ReassessmentControl({ approvalStatus, initialRequestStatus }: { approvalStatus: string; initialRequestStatus: ReassessmentStatus }) {
  const [currentApprovalStatus, setCurrentApprovalStatus] = useState(approvalStatus);
  const [requestStatus, setRequestStatus] = useState<ReassessmentStatus>(initialRequestStatus);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      try {
        const response = await fetch("/api/developer-admission/status", { cache: "no-store" });
        if (response.ok && active) {
          const data = await response.json();
          setCurrentApprovalStatus(data.status ?? approvalStatus);
          setRequestStatus(data.reassessmentStatus ?? null);
        }
      } finally {
        if (active) timer = setTimeout(poll, 5000);
      }
    };
    timer = setTimeout(poll, 5000);
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [approvalStatus]);

  const requestRetest = async () => {
    setBusy(true); setMessage("");
    const result = await requestReassessmentByDeveloper(reason);
    if (result.ok) { setRequestStatus("pending"); setReason(""); setMessage("تم إرسال طلب إعادة الاختبار للإدارة."); }
    else setMessage(result.error);
    setBusy(false);
  };

  const startRetest = async () => {
    setBusy(true); setMessage("");
    const result = await startDeveloperAssessment();
    if (result.ok && result.assessmentUrl) window.location.href = result.assessmentUrl;
    else { setMessage(result.ok ? "تعذر فتح الاختبار" : result.error); setBusy(false); }
  };

  const canRequest = ["approved", "rejected"].includes(currentApprovalStatus) && requestStatus !== "pending";
  const canStart = currentApprovalStatus === "reset_approved";

  return <section className="mt-6 rounded-[24px] border border-[#D1E3D6] bg-white p-6 shadow-xs">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="flex items-center gap-2 text-lg font-extrabold text-[#05291A]"><RotateCcw className="h-5 w-5 text-[#056B38]"/>إعادة اختبار Trust Engine</h2><p className="mt-1 text-sm text-[#526B5E]">يمكنك طلب اختبار جديد، ولن يبدأ إلا بعد موافقة الإدارة. نتيجتك الحالية تظل محفوظة حتى مراجعة الاختبار الجديد.</p></div>
      {requestStatus==="pending"&&<span className="flex items-center gap-1 rounded-full bg-amber-100 px-4 py-2 text-xs font-bold text-amber-900"><Clock className="h-4 w-4"/>قيد مراجعة الأدمن</span>}
      {canStart&&<button type="button" disabled={busy} onClick={startRetest} className="flex h-11 items-center gap-2 rounded-full bg-[#056B38] px-6 text-sm font-extrabold text-white disabled:opacity-50"><PlayCircle className="h-5 w-5"/>{busy?"جارٍ إنشاء الاختبار...":"بدء الاختبار الجديد"}</button>}
    </div>
    {canRequest&&<div className="mt-5 flex flex-col gap-3 md:flex-row"><textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000} rows={2} placeholder="اكتب سبب طلب إعادة الاختبار (اختياري)" className="min-h-20 flex-1 rounded-2xl border border-[#D1E3D6] p-3 text-sm outline-none focus:border-[#056B38]"/><button type="button" disabled={busy} onClick={requestRetest} className="flex items-center justify-center gap-2 rounded-2xl border border-[#056B38] bg-[#E8FAF0] px-6 font-extrabold text-[#056B38] disabled:opacity-50"><Send className="h-4 w-4"/>{busy?"جارٍ الإرسال...":"إرسال الطلب"}</button></div>}
    {requestStatus==="rejected"&&<p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">تم رفض آخر طلب إعادة اختبار. يمكنك إرسال طلب جديد مع توضيح السبب.</p>}
    {message&&<p role="status" className="mt-4 rounded-xl bg-[#F7FAF8] p-3 text-sm font-bold text-[#05291A]">{message}</p>}
  </section>;
}
