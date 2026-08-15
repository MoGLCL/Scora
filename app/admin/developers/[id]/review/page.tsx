import { notFound } from "next/navigation";
import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { AdmissionDecisionForm } from "@/components/admission-decision-form";
import { AdminAiReviewCard } from "@/components/admin-ai-review-card";
import { readJsonValue } from "@/lib/json-value";
import {
  Code2,
  Lock,
  ShieldCheck,
  Cpu,
  Fingerprint,
  Mic,
  FileCode,
  ArrowRight,
  Sparkles,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink
} from "lucide-react";

const eventLabels: Record<string, string> = {
  ASSESSMENT_STARTED: "بدأ المطور الاختبار",
  ASSESSMENT_SUBMITTED: "سلّم المطور الاختبار (قفل حزمة الأدلة)",
  ASSESSMENT_EVALUATED: "تم فحص الأدلة بالذكاء الاصطناعي",
  INTERVIEW_ANSWER_RECEIVED: "تم استلام إجابة المقابلة الصوتية",
  INTERVIEW_ANSWER_SCORED: "تم فحص التوضيح الصوتي",
  REVIEW_DECISION_RECORDED: "سجل الأدمن قرار الاعتماد النهائي",
  RESULT_RELEASED: "تم إرسال النتيجة للمطور وتفعيل الجواز"
};

const sourceLabels: Record<string, string> = {
  SERVER: "سيرفر التوثيق",
  AI_SERVICE: "وكيل AI للأدلة",
  SANDBOX: "بيئة الكود (Sandbox)",
  HUMAN: "المراجع البشري (الأدمن)"
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await queryOne<{
    id: number;
    public_id: string;
    status: string;
    model: string | null;
    display_name: string;
    email: string;
    username: string | null;
    evidence_snapshot_hash: string | null;
    snapshot_locked_at: Date | null;
    ai_review_report_json: unknown;
    ai_reviewed_at: Date | null;
    submitted_at: Date | null;
    reviewed_at: Date | null;
  }>(
    `SELECT das.id, das.public_id, das.status, das.model, d.display_name, u.email, u.username,
            das.evidence_snapshot_hash, das.snapshot_locked_at, das.ai_review_report_json,
            das.ai_reviewed_at, das.submitted_at, das.reviewed_at
     FROM developer_assessment_sessions das
     JOIN developers d ON d.id = das.developer_id
     JOIN users u ON u.id = d.user_id
     WHERE das.public_id = ?`,
    [id]
  );

  if (!session) notFound();

  const questions = await query<{
    id: number;
    kind: string;
    skill: string;
    question_text: string;
    answer_text: string | null;
    score: number | null;
    feedback: string | null;
    max_score: number;
  }>(
    `SELECT q.id, q.kind, q.skill, q.question_text, q.max_score, a.answer_text, a.score, a.feedback
     FROM developer_assessment_questions q
     LEFT JOIN developer_assessment_answers a ON a.question_id = q.id
     WHERE q.session_id = ?
     ORDER BY q.position`,
    [session.id]
  );

  const events = await query<{
    event_id: string;
    event_type: string;
    source: string;
    created_at: Date;
    event_hash: string;
  }>(
    "SELECT event_id, event_type, source, created_at, event_hash FROM trust_events WHERE session_public_id = ? ORDER BY chain_position",
    [id]
  );

  const interviews = await query<{
    public_id: string;
    question_text: string;
    response_transcript: string | null;
    audio_url: string | null;
    asked_at: Date;
    answered_at: Date | null;
  }>(
    "SELECT public_id, question_text, response_transcript, audio_url, asked_at, answered_at FROM developer_interview_rounds WHERE session_id = ? ORDER BY position",
    [session.id]
  );

  const initialReport = readJsonValue<any>(session.ai_review_report_json);

  return (
    <main dir="rtl" className="mx-auto max-w-5xl space-y-6 px-6 py-10 font-body">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <Link href="/admin" className="text-xs font-bold text-[#056B38] hover:underline inline-flex items-center gap-1">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة إلى لوحة تحكم الإدارة</span>
          </Link>
          <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-[#05291A]">
            مراجعة واعتماد المطور: {session.display_name}
          </h1>
          <p className="text-xs text-[#526B5E] mt-1 font-medium">
            @{session.username || "dev"} · {session.email} · الجلسة: <span className="font-mono text-[#05291A]">{session.public_id}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3.5 py-1 text-xs font-extrabold border ${
              session.status === "approved"
                ? "bg-[#E8FAF0] text-[#056B38] border-[#CDE5D6]"
                : session.status === "rejected"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-amber-50 text-amber-900 border-amber-300"
            }`}
          >
            {session.status === "approved"
              ? "معتمد وموثق ✓"
              : session.status === "rejected"
              ? "مرفوض ❌"
              : "بانتظار قرار الأدمن (Admin Review)"}
          </span>
        </div>
      </div>

      {/* 1. Post-Assessment Trust Intelligence Agent & Snapshot Lock Card */}
      <AdminAiReviewCard
        assessmentPublicId={session.public_id}
        initialReport={initialReport}
        snapshotHash={session.evidence_snapshot_hash}
        snapshotLockedAt={session.snapshot_locked_at}
        candidateName={session.display_name}
      />

      {/* 2. Questions & Candidate Answers (Sandbox IDE & Text) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
          <FileCode className="w-5 h-5 text-[#056B38]" />
          <h2 className="text-lg font-extrabold text-[#05291A]">
            إجابات المهام البرمجية والأسئلة ({questions.length})
          </h2>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <article key={q.id} className="rounded-2xl border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#056B38] bg-[#E8FAF0] border border-[#D1E3D6] px-3 py-1 rounded-full">
                  {q.kind === "code" ? "كود برمجى (Sandbox)" : q.kind === "mcq" ? "اختيار من متعدد" : "سؤال مقالي"} · {q.skill}
                </span>
                {q.score !== null && (
                  <span className="text-xs font-bold font-mono text-[#05291A]">
                    الدرجة: {q.score} / {q.max_score}
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-[#05291A] text-sm leading-relaxed whitespace-pre-wrap">
                {i + 1}. {q.question_text}
              </h3>

              <div className="overflow-hidden rounded-2xl">
                <pre
                  className={`p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap rounded-2xl ${
                    q.kind === "code"
                      ? "bg-[#0f172a] text-[#d1fae5] border border-slate-800"
                      : "bg-[#F7FAF8] text-[#05291A] border border-[#D1E3D6]"
                  }`}
                  dir={q.kind === "code" ? "ltr" : "rtl"}
                >
                  {q.answer_text || "لم تتم الإجابة"}
                </pre>
              </div>

              {q.feedback && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-medium">
                  <span className="font-bold block mb-0.5">تحليل الإجابة:</span>
                  {q.feedback}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>

      {/* 3. Audio Interview & Speech-to-Text Transcript */}
      <div className="rounded-2xl border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Mic className="w-5 h-5 text-[#056B38]" />
          <h2 className="text-lg font-extrabold text-[#05291A]">
            المقابلة والتوضيح الصوتي ({interviews.length} جولات)
          </h2>
        </div>

        {interviews.length > 0 ? (
          <div className="space-y-4">
            {interviews.map((round, i) => (
              <article key={round.public_id} className="rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-5 space-y-3">
                <div className="font-extrabold text-sm text-[#05291A]">
                  سؤال المقابلة {i + 1}: {round.question_text}
                </div>

                <div className="bg-white p-4 rounded-xl border border-[#D1E3D6] text-xs text-[#05291A] font-medium leading-relaxed">
                  <span className="font-bold text-[#056B38] block mb-1">النص المحول تلقائياً (Transcript):</span>
                  {round.response_transcript || "لم يتم تسجيل إجابة صوتية"}
                </div>

                {round.audio_url && (
                  <div className="pt-1">
                    <span className="text-[11px] text-[#526B5E] font-bold block mb-1">التسجيل الصوتي الأصلي:</span>
                    <audio controls preload="metadata" className="w-full h-10" src={round.audio_url} />
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[#526B5E]">لا توجد جولات مقابلة صوتية مسجلة لهذه الجلسة.</p>
        )}
      </div>

      {/* 4. SHA-256 Event Hash Chain Audit Log */}
      <div className="rounded-2xl border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Lock className="w-5 h-5 text-[#056B38]" />
          <h2 className="text-lg font-extrabold text-[#05291A]">
            سجل التدقيق وسلسلة الأحداث المشفرة ({events.length} أحداث)
          </h2>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto overscroll-contain">
          {events.map((event, i) => (
            <div key={i} className="rounded-xl bg-[#F7FAF8] border border-[#D1E3D6] p-3 text-xs flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-[#05291A]">
                  {eventLabels[event.event_type] || event.event_type}
                </span>
                <span className="text-[#526B5E] mr-2">· المصدر: {sourceLabels[event.source] || event.source}</span>
                <div className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                  {new Date(event.created_at).toLocaleString("ar-EG")}
                </div>
              </div>
              <div className="font-mono text-[10px] text-neutral-400 truncate max-w-[200px]" dir="ltr">
                {event.event_hash}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Authoritative Human Review Decision Form (Layer 10) */}
      <AdmissionDecisionForm assessmentPublicId={session.public_id} />

    </main>
  );
}
