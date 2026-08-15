"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import {
  Code2,
  Mic,
  MicOff,
  Send,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  submitAndFinalizeAssessment,
  cancelDeveloperAssessment,
  saveDeveloperAssessmentStateAction,
  submitCodeAndGenerateNextQuestionsAction
} from "@/lib/actions/developer-assessment";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] w-full items-center justify-center bg-[#1e1e1e] text-emerald-400 font-mono text-sm border border-neutral-800 rounded-2xl" dir="ltr">
      <div className="flex items-center gap-2">
        <Code2 className="h-5 w-5 animate-spin text-[#056B38]" />
        <span>Loading VS Code IDE...</span>
      </div>
    </div>
  )
});

type Question = { publicId: string; kind: string; skill: string; text: string; options: string[] | null };
type Round = { public_id: string; question_text: string; response_transcript: string | null; audio_url: string | null };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

// Skill-to-Language Auto-Detector for Monaco IDE
function detectLanguage(code: string, claimedSkill: string): string {
  const codeTrimmed = code.trim();
  const s = claimedSkill.toLowerCase();

  if (codeTrimmed.startsWith("fn ") || codeTrimmed.includes("let mut ") || codeTrimmed.includes("impl ") || codeTrimmed.includes("println!")) {
    return "rust";
  }
  if (codeTrimmed.startsWith("def ") || codeTrimmed.includes("import ") || codeTrimmed.includes("self.") || codeTrimmed.includes("print(")) {
    return "python";
  }
  if (codeTrimmed.includes("interface ") || codeTrimmed.includes(": string") || codeTrimmed.includes(": number") || codeTrimmed.includes("type ")) {
    return "typescript";
  }
  if (codeTrimmed.includes("function ") || codeTrimmed.includes("const ") || codeTrimmed.includes("let ") || codeTrimmed.includes("console.log")) {
    return "javascript";
  }
  if (codeTrimmed.includes("#include") || codeTrimmed.includes("std::")) {
    return "cpp";
  }
  if (codeTrimmed.includes("public class ") || codeTrimmed.includes("System.out.")) {
    return "java";
  }
  if (codeTrimmed.includes("package main") || codeTrimmed.includes("func main")) {
    return "go";
  }
  if (codeTrimmed.startsWith("<?php") || codeTrimmed.includes("<?php")) {
    return "php";
  }
  if (codeTrimmed.includes("SELECT ") || codeTrimmed.includes("FROM ") || codeTrimmed.includes("WHERE ")) {
    return "sql";
  }

  // Platform Skills Mapping
  if (s.includes("rust")) return "rust";
  if (s.includes("python") || s.includes("pytorch") || s.includes("tensorflow") || s.includes("fastapi") || s.includes("django")) return "python";
  if (s.includes("typescript")) return "typescript";
  if (s.includes("javascript") || s.includes("node") || s.includes("react") || s.includes("next") || s.includes("vue") || s.includes("express")) return "javascript";
  if (s.includes("c++")) return "cpp";
  if (s.includes("c#") || s.includes("csharp")) return "csharp";
  if (s.includes("java")) return "java";
  if (s.includes("go") || s.includes("golang")) return "go";
  if (s.includes("php")) return "php";
  if (s.includes("sql") || s.includes("postgres") || s.includes("mysql") || s.includes("mongodb") || s.includes("redis")) return "sql";
  if (s.includes("html")) return "html";
  if (s.includes("css") || s.includes("tailwind")) return "css";
  if (s.includes("docker") || s.includes("kubernetes")) return "dockerfile";
  if (s.includes("bash") || s.includes("shell") || s.includes("aws") || s.includes("git")) return "shell";
  if (s.includes("ruby")) return "ruby";
  if (s.includes("swift")) return "swift";
  if (s.includes("kotlin")) return "kotlin";

  return "javascript";
}

function VsCodeEditorContainer({
  path,
  claimedSkill,
  value,
  onChange
}: {
  path: string;
  claimedSkill: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const activeLanguage = useMemo(() => detectLanguage(value, claimedSkill), [value, claimedSkill]);

  const handleEditorMount: OnMount = (_editor, monaco) => {
    try {
      if (monaco?.languages?.typescript?.javascriptDefaults) {
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ES2020,
          allowNonTsExtensions: true,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          module: monaco.languages.typescript.ModuleKind.CommonJS,
          noEmit: true
        });
      }
      if (monaco?.languages?.typescript?.typescriptDefaults) {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ES2020,
          allowNonTsExtensions: true,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          module: monaco.languages.typescript.ModuleKind.CommonJS,
          noEmit: true
        });
      }
    } catch {
      // Ignore
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#1e1e1e] shadow-lg min-h-[520px]" dir="ltr">
      <MonacoEditor
        path={path}
        height="520px"
        theme="vs-dark"
        defaultLanguage={activeLanguage}
        language={activeLanguage}
        defaultValue={value || "// Write your solution code here..."}
        value={value}
        onChange={(val) => onChange(val || "")}
        onMount={handleEditorMount}
        options={{
          automaticLayout: true,
          fontSize: 14,
          fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          renderLineHighlight: "all",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          formatOnPaste: true,
          formatOnType: true,
          tabSize: 2,
          wordWrap: "on",
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          snippetSuggestions: "top",
          wordBasedSuggestions: "allDocuments"
        }}
      />
    </div>
  );
}

function clock(seconds: number) {
  const safe = Math.max(0, seconds),
    m = Math.floor(safe / 60),
    s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function DeveloperAssessmentForm({
  publicId,
  questions: initialQuestions,
  initialAnswers,
  initialRemaining
}: {
  publicId: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
  initialRemaining: number;
}) {
  const router = useRouter();
  const [questionsList, setQuestionsList] = useState<Question[]>(initialQuestions);
  const ordered = useMemo(() => [...questionsList], [questionsList]);

  const [answers, setAnswers] = useState(initialAnswers),
    [index, setIndex] = useState(0),
    [remaining, setRemaining] = useState(initialRemaining),
    [phase, setPhase] = useState<"assessment" | "interview" | "complete">("assessment"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [generatingMcqs, setGeneratingMcqs] = useState(false),
    [saved, setSaved] = useState(true),
    [rounds, setRounds] = useState<Round[]>([]),
    [recording, setRecording] = useState(false),
    [transcript, setTranscript] = useState(""),
    [showCancelModal, setShowCancelModal] = useState(false),
    [cancelling, setCancelling] = useState(false),
    [cancelError, setCancelError] = useState("");

  const recorder = useRef<MediaRecorder | null>(null),
    chunks = useRef<Blob[]>([]),
    recognition = useRef<SpeechRecognitionLike | null>(null),
    latestAudio = useRef<Blob | null>(null);

  const current = ordered[index];

  // Robust, Safe Background State Saver using Next.js Server Action
  const save = useCallback(
    async (payload = answers) => {
      if (phase !== "assessment" || !publicId || publicId === "pending" || !publicId.startsWith("assess_")) return;
      setSaved(false);
      try {
        const formattedAnswers = Object.fromEntries(
          Object.entries(payload).map(([id, value]) => {
            const q = ordered.find((item) => item.publicId === id);
            return [
              id,
              {
                value: String(value || ""),
                type: (q?.kind === "code" ? "code" : q?.kind === "mcq" ? "mcq" : "text") as "code" | "mcq" | "text",
                clientState: { questionIndex: index }
              }
            ];
          })
        );

        const res = await saveDeveloperAssessmentStateAction({
          publicId,
          currentQuestionId: current?.publicId ?? null,
          answers: formattedAnswers
        });

        if (res && res.ok) {
          if (res.expired) {
            setRemaining(0);
            setPhase("complete");
          } else {
            if (typeof res.remainingSeconds === "number") {
              setRemaining(res.remainingSeconds);
            }
            setSaved(true);
          }
        }
      } catch (err) {
        console.warn("[developer-assessment:save]", err);
      }
    },
    [answers, current, index, ordered, phase, publicId]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void save();
    }, 700);
    return () => clearTimeout(timer);
  }, [answers, index, save]);

  useEffect(() => {
    const timer = setInterval(
      () =>
        setRemaining((value) => {
          if (value <= 1) {
            if (phase === "assessment") void save();
            void submitAndFinalizeAssessment(publicId);
            queueMicrotask(() => setPhase("complete"));
            return 0;
          }
          return value - 1;
        }),
      1000
    );
    return () => clearInterval(timer);
  }, [phase, publicId, save]);

  const setAnswer = (value: string) => {
    if (!current || remaining <= 0) return;
    setError("");
    setSaved(false);
    setAnswers((state) => ({ ...state, [current.publicId]: value }));
  };

  // Submit Code Challenge and Generate Targeted AI Code-Comprehension MCQs
  const handleCodeSubmitAndProceed = async () => {
    if (!current || current.kind !== "code") return;
    const currentCode = answers[current.publicId] || "";
    if (currentCode.trim().length < 20) {
      setError("يرجى كتابة حل برمجي مناسب ومكتمل قبل تسليم الكود والانتقال لأسئلة الفهم.");
      return;
    }

    setGeneratingMcqs(true);
    setError("");
    try {
      const res = await submitCodeAndGenerateNextQuestionsAction({
        publicId,
        code: currentCode
      });

      if (res && res.ok) {
        setQuestionsList(res.questions);
        setAnswers((prev) => ({ ...prev, ...res.answers }));
        if (typeof res.remainingSeconds === "number") {
          setRemaining(res.remainingSeconds);
        }
        // Advance to next question (the first comprehension MCQ)
        setIndex((i) => Math.min(i + 1, res.questions.length - 1));
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        setError("تعذر الانتقال، يرجى المحاولة مرة أخرى.");
      }
    } catch {
      setError("حدث خطأ أثناء معالجة الكود وتوليد الأسئلة.");
    } finally {
      setGeneratingMcqs(false);
    }
  };

  const handleNext = () => {
    setError("");
    if (index < ordered.length - 1) {
      setIndex((i) => i + 1);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const handlePrev = () => {
    setError("");
    if (index > 0) {
      setIndex((i) => i - 1);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  // One-time Cancel Assessment Handler
  const handleCancelAssessment = async () => {
    setCancelling(true);
    setCancelError("");
    try {
      const res = await cancelDeveloperAssessment(publicId);
      if (!res.ok) {
        setCancelError(res.error || "تعذر إلغاء الاختبار");
        setCancelling(false);
      } else {
        setShowCancelModal(false);
        router.push("/developer-assessment/pending");
        router.refresh();
      }
    } catch {
      setCancelError("حدث خطأ غير متوقع أثناء إلغاء الاختبار");
      setCancelling(false);
    }
  };

  async function startVoice() {
    setError("");
    const SpeechCtor =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike }).webkitSpeechRecognition;
    if (!SpeechCtor) {
      setError("المتصفح لا يدعم تحويل الصوت إلى نص. يمكنك استخدام زر تخطي المقابلة الصوتية أدناه للاختبار المحلي.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      latestAudio.current = null;
      const media = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm" });
      recorder.current = media;
      media.ondataavailable = (e) => {
        if (e.data.size) chunks.current.push(e.data);
      };
      media.onstop = () => {
        latestAudio.current = new Blob(chunks.current, { type: media.mimeType });
        stream.getTracks().forEach((track) => track.stop());
      };
      const speech = new SpeechCtor();
      recognition.current = speech;
      speech.lang = "ar-EG";
      speech.continuous = true;
      speech.interimResults = true;
      let finalText = "";
      speech.onresult = (event) => {
        let interim = "";
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i],
            text = result[0].transcript;
          if (result.isFinal) finalText += `${text} `;
          else interim += text;
        }
        setTranscript(`${finalText}${interim}`.trim());
      };
      speech.onerror = (e) => setError(`تعذر التعرف على الصوت: ${e.error}`);
      media.start(500);
      speech.start();
      setRecording(true);
    } catch {
      setError("تعذر الوصول للميكروفون. يمكنك استخدام زر تخطي المقابلة الصوتية أدناه للاختبار المحلي.");
    }
  }

  function stopVoice() {
    recognition.current?.stop();
    recorder.current?.stop();
    setRecording(false);
  }

  async function sendVoice() {
    const round = rounds.at(-1);
    if (!round || !transcript.trim() || !latestAudio.current) {
      setError("سجل إجابة صوتية كاملة باستخدام الميكروفون أولاً أو استخدم زر تخطي المقابلة الصوتية للاختبار المحلي.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.set("roundId", round.public_id);
      form.set("transcript", transcript.trim());
      form.set("audio", latestAudio.current, "answer.webm");
      const response = await fetch(`/api/developer-assessment/${publicId}/interview`, { method: "POST", body: form });
      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("application/json")) {
        const data = await response.json();
        setRounds((state) =>
          state.map((item) => (item.public_id === round.public_id ? { ...item, response_transcript: transcript } : item)).concat(data.round ? [data.round] : [])
        );
        setTranscript("");
        latestAudio.current = null;
        if (data.complete) {
          await submitAndFinalizeAssessment(publicId);
          setPhase("complete");
        } else if (typeof data.remainingSeconds === "number") {
          setRemaining(data.remainingSeconds);
        }
      } else {
        setError("تعذر حفظ الإجابة الصوتية، يمكنك المتابعة أو التخطي");
      }
    } catch {
      setError("حدث خطأ أثناء إرسال التسجيل الصوتي");
    } finally {
      setBusy(false);
    }
  }

  // Skip Voice Interview helper - Finalizes assessment in DB and sends directly to Admin queue
  async function skipInterview() {
    setBusy(true);
    setError("");
    try {
      await submitAndFinalizeAssessment(publicId);
    } catch {
      // Ignore
    } finally {
      setBusy(false);
      setPhase("complete");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  // Submission & Direct Finalize to Admin Review Queue
  const finishAssessment = async () => {
    setError("");
    setBusy(true);

    // Save draft answers to DB asynchronously
    try {
      await save();
      await submitAndFinalizeAssessment(publicId);
    } catch (err) {
      console.warn("[finishAssessment]", err);
    }

    // Provide initial default interview question if rounds array is empty
    setRounds((prev) =>
      prev.length > 0
        ? prev
        : [
            {
              public_id: `int_${Date.now()}`,
              question_text: "وضح بالتفصيل آلية اختبار كفاءة الكود الذي قمت بكتابته والأساليب البرمجية المتبعة للحفاظ على جودة وأمان النظام؟",
              response_transcript: null,
              audio_url: null
            }
          ]
    );

    // Switch to voice interview or complete phase
    setPhase("interview");
    setBusy(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (phase === "complete")
    return (
      <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-10 text-center shadow-xs space-y-4 font-body" dir="rtl">
        <div className="h-14 w-14 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center mx-auto border border-[#D1E3D6]">
          <CheckCircle2 className="h-7 w-7 text-[#056B38]" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#05291A]">تم تسليم التقييم البرمجي بنجاح</h2>
        <p className="text-sm text-[#526B5E] max-w-lg mx-auto leading-relaxed">
          تم قفل وتوثيق حزمة الأدلة البرمجية الخاصة بك وتجهيزها للمراجعة والاعتماد. سيتم إشعارك فور اكتمال المراجعة.
        </p>
      </section>
    );

  return (
    <div className="space-y-5 font-body" dir="rtl">
      
      {/* Fixed Normal Header Bar (Non-Sticky) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D1E3D6] bg-white p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="font-bold text-[#05291A]">
            {phase === "assessment" ? `السؤال ${index + 1} من ${ordered.length}` : `المقابلة الصوتية المباشرة · الجولة ${rounds.length}`}
          </div>
          <div className="text-xs text-[#526B5E] font-medium hidden sm:inline-block">({saved ? "تم الحفظ تلقائياً" : "جارٍ الحفظ..."})</div>
        </div>

        {/* Timer & One-Time Cancel Button */}
        <div className="flex items-center gap-3">
          <div className={`font-mono text-xl font-extrabold flex items-center gap-1.5 ${remaining < 120 ? "text-red-600 animate-pulse" : "text-[#056B38]"}`} dir="ltr">
            <Clock className="w-4 h-4" />
            <span>{clock(remaining)}</span>
          </div>

          {/* One-Time Cancel Button */}
          {phase === "assessment" && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
              title="إلغاء الاختبار والخروج (متاح لمرة واحدة فقط)"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>إلغاء الاختبار</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Analyzing / MCQ Generation Loading Overlay */}
      {generatingMcqs && (
        <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-10 text-center shadow-md space-y-4 animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center mx-auto border border-[#D1E3D6]">
            <Sparkles className="w-7 h-7 animate-spin text-[#056B38]" />
          </div>
          <h3 className="text-lg font-extrabold text-[#05291A]">جارٍ تحليل كودك وتوليد أسئلة الفهم المباشرة لحلك البرمجي...</h3>
          <p className="text-xs text-[#526B5E] max-w-md mx-auto leading-relaxed">
            يقوم محرك الذكاء الاصطناعي بدراسة المتغيرات والتعقيد الزمني والأمان في كودك لتوليد أسئلة اختيار من متعدد مخصصة لحلك.
          </p>
        </div>
      )}

      {/* Phase 1: Assessment (Coding, MCQ, Written) */}
      {phase === "assessment" && current && !generatingMcqs && (
        <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs space-y-6">
          
          {/* Question Category Badge */}
          <div className="flex flex-wrap items-center gap-2">
            {current.kind === "code" ? (
              <span className="text-xs font-bold text-[#056B38] bg-[#E8FAF0] border border-[#D1E3D6] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>مهمة برمجية تطبيقية (Sandbox Task)</span>
              </span>
            ) : current.skill?.includes("Code Comprehension") || current.skill?.includes("فهم الكود") ? (
              <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>سؤال فحص الكود المكتوب (Code Comprehension MCQ)</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-[#056B38] bg-[#E8FAF0] border border-[#D1E3D6] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>سؤال تقني في لغة البرمجة (Language Depth) · {current.skill}</span>
              </span>
            )}
          </div>
          
          <h2 className="text-lg font-extrabold text-[#05291A] leading-8 whitespace-pre-wrap text-right">
            {current.text}
          </h2>

          {/* Multiple Choice Options */}
          {current.kind === "mcq" && current.options && (
            <div className="space-y-3 pt-2">
              {current.options.map((opt, optIdx) => {
                const isSelected = answers[current.publicId] === opt;
                return (
                  <button
                    key={optIdx}
                    type="button"
                    onClick={() => setAnswer(opt)}
                    className={`w-full text-right p-4 rounded-2xl border text-sm font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] shadow-xs"
                        : "border-[#D1E3D6] bg-[#F7FAF8] text-[#05291A] hover:bg-white hover:border-[#056B38]"
                    }`}
                  >
                    <span>{opt}</span>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-[#056B38] bg-[#056B38] text-white" : "border-neutral-300 bg-white"
                      }`}
                    >
                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Code Question in VS Code IDE Monaco Editor (Strictly LTR for code) */}
          {current.kind === "code" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#526B5E] px-1">
                <span className="font-bold">محرر الكود البرمجي (VS Code Sandbox)</span>
                <span className="font-mono text-[11px] dir-ltr text-left">Auto-Complete & Syntax Check: Active</span>
              </div>
              
              <VsCodeEditorContainer
                path={`question-${current.publicId}.ts`}
                claimedSkill={current.skill}
                value={answers[current.publicId] || ""}
                onChange={(val) => setAnswer(val)}
              />
            </div>
          )}

          {/* Written / Essay Question */}
          {current.kind !== "mcq" && current.kind !== "code" && (
            <textarea
              value={answers[current.publicId] || ""}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="اكتب إجابتك التقنية بالتفصيل هنا..."
              rows={8}
              className="w-full rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-4 text-sm text-[#05291A] focus:bg-white focus:border-[#056B38] focus:outline-none transition-all leading-relaxed text-right"
              dir="rtl"
            />
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Navigation Controls in Proper Arabic RTL */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100" dir="rtl">
            
            {/* Right button in RTL: Previous Question */}
            <button
              type="button"
              disabled={index === 0}
              onClick={handlePrev}
              className="h-11 px-5 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-xs hover:bg-neutral-50 disabled:opacity-30 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السؤال السابق</span>
            </button>

            {/* If on Question 0 (Code Challenge), offer instant code submit & next question generation */}
            {current.kind === "code" ? (
              <button
                type="button"
                disabled={generatingMcqs}
                onClick={handleCodeSubmitAndProceed}
                className="h-11 px-7 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>تسليم الكود والانتقال لأسئلة الفهم واللغة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : index < ordered.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-11 px-6 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>السؤال التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={finishAssessment}
                className="h-11 px-7 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>إنهاء التقييم والمتابعة للمقابلة</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* Phase 2: Voice Interview (Explanation of implementation) */}
      {phase === "interview" && (
        <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs space-y-6">
          <div className="text-xs font-bold text-[#056B38] bg-[#E8FAF0] border border-[#D1E3D6] px-3.5 py-1.5 rounded-full inline-block">
            مرحلة المقابلة والتوضيح التقني (Audio Interview)
          </div>

          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-5 space-y-3">
            <h3 className="font-extrabold text-[#05291A] text-base">
              {rounds.at(-1)?.question_text || "وضح بالتفصيل آلية عمل الكود الذي كتبته وأهم القرارات الهندسية التي اتخذتها؟"}
            </h3>
            <p className="text-xs text-[#526B5E]">
              قم بتسجيل إجابة صوتية تشرح فيها طريقة حلك للتحقق من فهمك العميق للمشروع.
            </p>
          </div>

          {/* Voice Recorder Controls */}
          <div className="flex flex-col items-center justify-center p-6 rounded-2xl border border-dashed border-[#D1E3D6] bg-[#F7FAF8] space-y-4 text-center">
            {recording ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={stopVoice}
                  className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg animate-pulse cursor-pointer mx-auto"
                  title="إيقاف التسجيل"
                >
                  <MicOff className="h-7 w-7" />
                </button>
                <p className="text-xs font-bold text-red-600">جاري تسجيل صوتك... انقر لإيقاف التسجيل</p>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={startVoice}
                  className="h-16 w-16 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white flex items-center justify-center shadow-lg transition-all cursor-pointer mx-auto"
                  title="بدء التسجيل"
                >
                  <Mic className="h-7 w-7" />
                </button>
                <p className="text-xs font-bold text-[#05291A]">انقر على الميكروفون لبدء تسجيل إجابتك الصوتية</p>
              </div>
            )}

            {transcript && (
              <div className="w-full text-right p-4 rounded-xl bg-white border border-[#D1E3D6] text-xs text-[#05291A] font-medium leading-relaxed">
                <span className="font-bold text-[#056B38] block mb-1">النص المحول تلقائياً من الصوت:</span>
                {transcript}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-neutral-100" dir="rtl">
            <button
              type="button"
              disabled={busy}
              onClick={skipInterview}
              className="h-11 px-5 rounded-full border border-neutral-300 bg-white text-[#526B5E] font-bold text-xs hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer"
            >
              <SkipForward className="w-4 h-4" />
              <span>تخطي وإرسال للاعتماد المباشر</span>
            </button>

            <button
              type="button"
              disabled={busy || !transcript.trim()}
              onClick={sendVoice}
              className="h-11 px-8 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {busy ? (
                <span>جاري الإرسال...</span>
              ) : (
                <>
                  <span>إرسال الإجابة الصوتية والمتابعة</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </section>
      )}

      {/* ONE-TIME ASSESSMENT CANCELLATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#05291A]">تأكيد إلغاء الاختبار</h3>
                <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">فرصة متاحة لمرة واحدة فقط</span>
              </div>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 leading-relaxed space-y-2">
              <p className="font-bold">⚠️ تنبيه هام:</p>
              <p>
                يمكنك إلغاء جلسة الاختبار الحالية والرجوع لتعديل بياناتك لمرة واحدة فقط طوال فترة حسابك.
                إذا قمت بالإلغاء الآن، ستفقد هذه الميزة ولن تتمكن من إلغاء أي اختبار لاحقاً.
              </p>
            </div>

            {cancelError && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-bold text-red-700">
                {cancelError}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => setShowCancelModal(false)}
                className="flex-1 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-xs hover:bg-neutral-50 cursor-pointer"
              >
                تراجع والاستمرار
              </button>

              <button
                type="button"
                disabled={cancelling}
                onClick={handleCancelAssessment}
                className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {cancelling ? (
                  <span>جارٍ الإلغاء...</span>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>تأكيد الإلغاء والخروج</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
