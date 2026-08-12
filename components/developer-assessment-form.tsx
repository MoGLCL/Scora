"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Code2, Mic, MicOff, Send, Volume2, Lock, ArrowRight, SkipForward } from "lucide-react";
import { submitAndFinalizeAssessment } from "@/lib/actions/developer-assessment";

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

// Full Skill-to-Language Auto-Detector for ALL platform skills
function detectLanguage(code: string, claimedSkill: string): string {
  const codeTrimmed = code.trim();
  const s = claimedSkill.toLowerCase();

  // Inspection overrides based on code signatures
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

  const handleEditorMount = (_editor: unknown, monaco: any) => {
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
  questions,
  initialAnswers,
  initialRemaining
}: {
  publicId: string;
  questions: Question[];
  initialAnswers: Record<string, string>;
  initialRemaining: number;
}) {
  // Preserve natural question sequence (MCQ, Code, Essay) as generated by AI/DB
  const ordered = useMemo(() => [...questions], [questions]);

  const [answers, setAnswers] = useState(initialAnswers),
    [index, setIndex] = useState(0),
    [remaining, setRemaining] = useState(initialRemaining),
    [phase, setPhase] = useState<"assessment" | "interview" | "complete">("assessment"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(true),
    [rounds, setRounds] = useState<Round[]>([]),
    [recording, setRecording] = useState(false),
    [transcript, setTranscript] = useState("");

  const recorder = useRef<MediaRecorder | null>(null),
    chunks = useRef<Blob[]>([]),
    recognition = useRef<SpeechRecognitionLike | null>(null),
    latestAudio = useRef<Blob | null>(null);

  const current = ordered[index];

  const save = useCallback(
    async (payload = answers) => {
      if (phase !== "assessment") return;
      setSaved(false);
      const response = await fetch(`/api/developer-assessment/${publicId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentQuestionId: current?.publicId ?? null,
          answers: Object.fromEntries(
            Object.entries(payload).map(([id, value]) => {
              const q = ordered.find((item) => item.publicId === id);
              return [id, { value, type: q?.kind === "code" ? "code" : q?.kind === "mcq" ? "mcq" : "text", clientState: { questionIndex: index } }];
            })
          )
        })
      });
      const data = await response.json();
      if (data.expired) {
        setRemaining(0);
        setPhase("complete");
      } else if (response.ok) {
        setRemaining(data.remainingSeconds);
        setSaved(true);
      }
    },
    [answers, current?.publicId, index, ordered, phase, publicId]
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
    const form = new FormData();
    form.set("roundId", round.public_id);
    form.set("transcript", transcript.trim());
    form.set("audio", latestAudio.current, "answer.webm");
    const response = await fetch(`/api/developer-assessment/${publicId}/interview`, { method: "POST", body: form }),
      data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(data.error || "تعذر حفظ الإجابة الصوتية");
      return;
    }
    setRounds((state) =>
      state.map((item) => (item.public_id === round.public_id ? { ...item, response_transcript: transcript } : item)).concat(data.round ? [data.round] : [])
    );
    setTranscript("");
    latestAudio.current = null;
    if (data.complete) {
      await submitAndFinalizeAssessment(publicId);
      setPhase("complete");
    } else setRemaining(data.remainingSeconds);
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
  const finishAssessment = () => {
    setError("");
    setBusy(true);

    // Save draft answers to DB asynchronously
    void save();

    // Finalize assessment session in DB for Admin review
    void submitAndFinalizeAssessment(publicId);

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

    // UNCONDITIONALLY SWITCH UI TO INTERVIEW PHASE INSTANTLY
    setPhase("interview");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (phase === "complete")
    return (
      <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-10 text-center shadow-xs space-y-4">
        <div className="h-14 w-14 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center mx-auto border border-[#D1E3D6]">
          <Code2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#05291A]">انتهت جلسة التقييم والمقابلة بنجاح</h2>
        <p className="text-sm text-[#526B5E]">تم حفظ الكود البرمجي والإجابات الصوتية وإرسالها لمراجعة الأدمن الاعتمادية.</p>
      </section>
    );

  return (
    <div className="space-y-5">
      {/* Fixed Normal Header Bar (Non-Sticky) */}
      <div className="flex items-center justify-between rounded-2xl border border-[#D1E3D6] bg-white p-4 shadow-xs">
        <div className="font-bold text-[#05291A]">
          {phase === "assessment" ? `السؤال ${index + 1} من ${ordered.length}` : `المقابلة الصوتية المباشرة · الجولة ${rounds.length}`}
        </div>
        <div className={`font-mono text-xl font-extrabold ${remaining < 120 ? "text-red-600 animate-pulse" : "text-[#056B38]"}`}>{clock(remaining)}</div>
        <div className="text-xs text-[#526B5E] font-bold">{saved ? "تم حفظ الحالة" : "جارٍ الحفظ..."}</div>
      </div>

      {/* Phase 1: Assessment (Coding, MCQ, Written) */}
      {phase === "assessment" && current && (
        <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs space-y-6">
          <div className="text-xs font-bold text-[#056B38] bg-[#E8FAF0] border border-[#D1E3D6] px-3.5 py-1.5 rounded-full inline-block">
            {current.kind === "code" ? "مهمة برمجية تطبيقية" : current.kind === "mcq" ? "اختيار من متعدد" : "سؤال مقالي كتابي"} · {current.skill}
          </div>
          <h2 className="text-lg font-extrabold text-[#05291A] leading-8 whitespace-pre-wrap">{current.text}</h2>

          {/* VS Code Monaco Editor for Code Questions */}
          {current.kind === "code" ? (
            <div className="mt-5">
              <VsCodeEditorContainer
                path={`assessment://${publicId}/${current.publicId}`}
                claimedSkill={current.skill}
                value={answers[current.publicId] || ""}
                onChange={(value) => setAnswer(value || "")}
              />
            </div>
          ) : current.options ? (
            <div className="mt-5 grid gap-3">
              {current.options.map((option) => (
                <label
                  key={option}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-all ${
                    answers[current.publicId] === option ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] font-extrabold shadow-xs" : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-[#F7FAF8]"
                  }`}
                >
                  <input type="radio" checked={answers[current.publicId] === option} onChange={() => setAnswer(option)} />
                  <span className="text-sm">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <textarea
                value={answers[current.publicId] || ""}
                onChange={(e) => setAnswer(e.target.value)}
                className="min-h-48 w-full rounded-2xl border border-[#D1E3D6] p-4 text-sm text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10"
                placeholder="اكتب الإجابة الفنية والتحليلية هنا..."
              />
            </div>
          )}

          {/* Control Bar: Previous, Next, and ALWAYS VISIBLE Submit Button */}
          <div className="mt-8 flex flex-wrap justify-between items-center gap-3 border-t border-neutral-100 pt-5">
            <button
              type="button"
              disabled={index === 0}
              onClick={handlePrev}
              className="rounded-full border border-[#D1E3D6] bg-white px-6 py-2.5 text-xs font-extrabold text-[#05291A] hover:bg-[#F7FAF8] disabled:opacity-40 cursor-pointer"
            >
              السابق
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {index < ordered.length - 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1.5 rounded-full border border-neutral-300 bg-neutral-900 hover:bg-black px-6 py-2.5 text-xs font-extrabold text-white shadow-xs cursor-pointer"
                >
                  السؤال التالي <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                </button>
              )}

              <button
                type="button"
                onClick={finishAssessment}
                className="rounded-full bg-[#056B38] hover:bg-[#005B27] px-8 py-2.5 text-xs font-extrabold text-white shadow-md cursor-pointer transition-all"
              >
                تسليم الاختبار وبدء المقابلة الصوتية
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Phase 2: Strictly Voice-Only AI Interview (No Text Editing Allowed) */}
      {phase === "interview" && (
        <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-[#056B38]" />
              <h3 className="font-extrabold text-[#05291A] text-base">المقابلة التقنية الصوتية المباشرة (Voice Only)</h3>
            </div>
            <span className="rounded-full bg-red-100 text-red-700 text-xs font-extrabold px-3 py-1 flex items-center gap-1 border border-red-200">
              <Lock className="h-3.5 w-3.5" /> مرحلة صوتية حصراً
            </span>
          </div>

          <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] p-4 text-xs font-bold text-[#056B38]">
            ملاحظة: هذه المرحلة مخصصة للإجابة الصوتية المباشرة عبر الميكروفون فقط، ولا يمكن كتابة أو تعديل النصوص لوحة المفاتيح.
          </div>

          <h2 className="text-xl font-extrabold text-[#05291A] leading-9">{rounds.at(-1)?.question_text}</h2>

          {/* Voice Transcript Display Box (Read-Only) */}
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-4 min-h-28 text-xs text-[#05291A] font-bold leading-relaxed">
            <div className="text-[11px] text-[#526B5E] mb-2 font-normal">النص المنقول من صوتك تلقائياً:</div>
            {transcript ? (
              <span className="text-[#05291A]">{transcript}</span>
            ) : (
              <span className="text-gray-400 font-normal">اضغط على &quot;بدء الإجابة الصوتية&quot; وتحدث عبر الميكروفون...</span>
            )}
          </div>

          {/* Voice Controls & Temporary Local Skip Button */}
          <div className="flex flex-wrap gap-3 pt-2 items-center">
            {!recording ? (
              <button
                type="button"
                onClick={startVoice}
                className="flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 px-7 py-3 text-xs font-extrabold text-white shadow-md transition-all cursor-pointer"
              >
                <Mic className="h-5 w-5" /> بدء الإجابة الصوتية
              </button>
            ) : (
              <button
                type="button"
                onClick={stopVoice}
                className="flex items-center gap-2 rounded-full bg-gray-900 hover:bg-black px-7 py-3 text-xs font-extrabold text-white shadow-md transition-all animate-pulse cursor-pointer"
              >
                <MicOff className="h-5 w-5" /> إيقاف التسجيل
              </button>
            )}

            <button
              type="button"
              disabled={busy || recording || !transcript.trim()}
              onClick={sendVoice}
              className="flex items-center gap-2 rounded-full bg-[#056B38] hover:bg-[#005B27] px-7 py-3 text-xs font-extrabold text-white shadow-md disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
              {busy ? "جارٍ تحليل وتسجيل الصوت..." : "إرسال الإجابة الصوتية للـ AI"}
            </button>

            {/* Temporary Local Skip Button */}
            <button
              type="button"
              onClick={skipInterview}
              className="flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-100 hover:bg-neutral-200 px-6 py-3 text-xs font-extrabold text-neutral-800 shadow-xs transition-all cursor-pointer"
            >
              <SkipForward className="h-4 w-4 text-neutral-600" />
              تخطي المقابلة الصوتية وإنهاء التقييم (اختبار لوكال)
            </button>
          </div>
        </section>
      )}

      {error && <p role="alert" className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-700">{error}</p>}
    </div>
  );
}
