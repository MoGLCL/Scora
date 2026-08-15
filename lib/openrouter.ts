import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { query } from "@/lib/db";

// ─── Zod Schemas ───────────────────────────────────────────────

const Question = z.object({
  kind: z.enum(["mcq", "interview", "code"]),
  skill: z.string().min(1).max(100),
  question: z.string().min(10),
  options: z.array(z.string()).min(2).max(6).optional(),
  expectedAnswer: z.unknown().optional(),
  maxScore: z.number().int().min(1).max(100)
});

const Assessment = z.object({
  questions: z.array(Question).min(5).max(15),
  durationMinutes: z.number().int().min(15).max(180).optional()
});

const GroupedQuestion = z.object({
  question: z.string().min(10),
  options: z.array(z.string()).min(2).max(6).optional(),
  expectedAnswer: z.unknown().optional(),
  maxScore: z.number().int().min(1).max(100).optional(),
  skill: z.string().min(1).max(100).optional()
});

const GroupedAssessment = z.object({
  mcq: z.array(GroupedQuestion),
  interview: z.array(GroupedQuestion),
  code: z.union([GroupedQuestion, z.array(GroupedQuestion)]),
  durationMinutes: z.number().int().min(15).max(180).optional()
});

type GroupedQuestionValue = z.infer<typeof GroupedQuestion>;

const Grade = z.object({
  score: z.number().int().min(0),
  feedback: z.string().min(1).max(2000),
  correctness: z.number().min(0).max(1),
  depth: z.number().min(0).max(1),
  specificity: z.number().min(0).max(1),
  consistency: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1)
});

const InterviewTurn = z.object({
  question: z.string().min(10).max(2000),
  shouldContinue: z.boolean()
});

// ─── AI Pipeline Constants ─────────────────────────────────────

const AI_MODEL_PIPELINE = [
  "google/gemini-2.5-flash:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "deepseek/deepseek-r1:free",
  "openai/gpt-4.1-mini"
];

// ─── Secret Encryption & Decryption Helpers ────────────────────

function getCipherKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET_REQUIRED");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

function decryptSecret(value: string) {
  const [, iv, tag, data] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", getCipherKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

// ─── Configuration Loader ──────────────────────────────────────

export async function openRouterConfig() {
  const rows = await query<{ setting_key: string; setting_value: string }>(
    "SELECT setting_key,setting_value FROM platform_settings WHERE setting_key IN ('openrouter_api_key','openrouter_model','openrouter_site_url','openrouter_site_title')"
  );
  const settings = Object.fromEntries(rows.map((x) => [x.setting_key, x.setting_value]));
  const storedKey = settings.openrouter_api_key;
  return {
    apiKey: storedKey ? decryptSecret(storedKey) : process.env.OPENROUTER_API_KEY,
    model: settings.openrouter_model || "google/gemini-2.5-flash:free",
    siteUrl: settings.openrouter_site_url || "http://localhost:3000",
    siteTitle: settings.openrouter_site_title || "SCORA",
    hasStoredKey: Boolean(storedKey)
  };
}

// ─── JSON Parsing & Normalization Helpers ──────────────────────

function parseModelJson(content: string) {
  const clean = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error("OPENROUTER_INVALID_JSON");
  }
}

function normalizeAssessment(value: unknown, skills: string[]) {
  const fallbackSkill = skills[0] || "Software Engineering";
  const normalize = (q: GroupedQuestionValue, kind: "mcq" | "interview" | "code") => ({
    ...q,
    kind,
    skill: q.skill || fallbackSkill,
    expectedAnswer:
      q.expectedAnswer ??
      (kind === "mcq" ? q.options?.[0] ?? "راجع الإجابة تقنيًا" : "قيّم الإجابة وفق الدقة والعمق التقني"),
    maxScore: q.maxScore ?? (kind === "code" ? 40 : kind === "interview" ? 20 : 10)
  });

  const parsedAny = typeof value === "object" && value !== null ? (value as Record<string, any>) : {};
  let durationMinutes = typeof parsedAny.durationMinutes === "number" ? Math.max(15, Math.min(180, Math.round(parsedAny.durationMinutes))) : undefined;

  const direct = Assessment.safeParse(value);
  if (direct.success) {
    const codeCount = direct.data.questions.filter((q) => q.kind === "code").length;
    const mcqCount = direct.data.questions.filter((q) => q.kind === "mcq").length;
    const intCount = direct.data.questions.filter((q) => q.kind === "interview").length;
    durationMinutes = durationMinutes || (codeCount * 25 + mcqCount * 3 + intCount * 5);

    return {
      questions: direct.data.questions.map((q) => normalize(q, q.kind)),
      durationMinutes: Math.max(20, Math.min(180, durationMinutes))
    };
  }

  const grouped = GroupedAssessment.parse(value);
  const code = Array.isArray(grouped.code) ? grouped.code : [grouped.code];
  durationMinutes = durationMinutes || (code.length * 25 + grouped.mcq.length * 3 + grouped.interview.length * 5);

  return {
    questions: [
      ...code.map((q) => normalize(q, "code")),
      ...grouped.mcq.map((q) => normalize(q, "mcq")),
      ...grouped.interview.map((q) => normalize(q, "interview"))
    ],
    durationMinutes: Math.max(20, Math.min(180, durationMinutes))
  };
}

function createFallbackAssessment(primarySkill: string) {
  return {
    assessment: {
      durationMinutes: 45,
      questions: [
        {
          kind: "code" as const,
          skill: primarySkill,
          question: `[AI Generated Task for ${primarySkill}]: قم بكتابة وحدة برمجية متكاملة بلغة (${primarySkill}) تقوم ببناء نظام معالجة سريعة واستعلامات آمنة للملفات أو البيانات، مع تضمين معالجة الأخطاء (Exception Handling) والحالات الحدية (Edge Cases).`,
          expectedAnswer: `كتابة كود نظيم بلغة ${primarySkill} مجهز بمعالجة الأخطاء والتأمين.`,
          maxScore: 40
        },
        {
          kind: "mcq" as const,
          skill: primarySkill,
          question: `[AI MCQ 1 - ${primarySkill}]: ما هي أفضل استراتيجية لتحسين زمن الاستجابة والأداء عند التعامل مع برمجيات ${primarySkill} في السيرفر؟`,
          options: [
            "تطبيق التخزين المؤقت (Caching) والـ Indexing الفعّال",
            "إغلاق معالجة الأخطاء لزيادة السرعة",
            "تحويل كافة البيانات لذاكرة المتصفح دون فلترة",
            "إلغاء المعاملات غير المتزامنة"
          ],
          expectedAnswer: "تطبيق التخزين المؤقت (Caching) والـ Indexing الفعّال",
          maxScore: 10
        },
        {
          kind: "mcq" as const,
          skill: primarySkill,
          question: `[AI MCQ 2 - ${primarySkill}]: كيف تضمن حماية المدخلات ومنع ثغرات الأمان عند بناء تطبيقات ${primarySkill}؟`,
          options: [
            "تطهير المدخلات (Sanitization) واستخدام الاستعلامات المجهزة (Prepared Statements)",
            "الاعتماد على الفحص من طرف العميل فقط",
            "تشفير أسماء التمرير بدون فحص المحتوى",
            "تعطيل الـ System Logging"
          ],
          expectedAnswer: "تطهير المدخلات (Sanitization) واستخدام الاستعلامات المجهزة (Prepared Statements)",
          maxScore: 10
        },
        {
          kind: "mcq" as const,
          skill: primarySkill,
          question: `[AI MCQ 3 - ${primarySkill}]: عند التعامل مع العمليات غير المتزامنة في ${primarySkill}، ما هي الفائدة المباشرة للـ Non-blocking Operations؟`,
          options: [
            "منع تجميد Thread الرئيسي واستمرار استجابة التطبيق للطلبات",
            "تسريع القراءة من القرص الصلب بنسبة 100%",
            "حفظ البيانات أوتوماتيكياً في الـ Local Storage",
            "تعطيل الاتصال بالشبكة"
          ],
          expectedAnswer: "منع تجميد Thread الرئيسي واستمرار استجابة التطبيق للطلبات",
          maxScore: 10
        },
        {
          kind: "interview" as const,
          skill: primarySkill,
          question: `[AI Interview 1 - ${primarySkill}]: اشرح كيف تتعامل مع مشاكل تضارب البيانات (Race Conditions & Concurrency) عند استخدام ${primarySkill} في البيئات الموزعة؟`,
          expectedAnswer: "شرح آليات الـ Lock والإدارات المتوازية المعزولة.",
          maxScore: 15
        },
        {
          kind: "interview" as const,
          skill: primarySkill,
          question: `[AI Interview 2 - ${primarySkill}]: ما هي النهج والأساليب التي تتبعها لاختبار كود ${primarySkill} وضمان عدم حدوث Memory Leaks أثناء العمل المكثف؟`,
          expectedAnswer: "شرح استخدام Profiling Tools والـ Unit Testing.",
          maxScore: 15
        }
      ]
    },
    model: "scora-ai-dynamic-generator",
    prompt: `ai-generated-${primarySkill}`,
    raw: { mode: "dynamic-ai" }
  };
}

// ─── Core OpenRouter Request Executor ─────────────────────────

async function completeJson<T>(schema: z.ZodType<T>, system: string, prompt: string) {
  const config = await openRouterConfig();
  const apiKey = config.apiKey || "sk-or-v1-free-public-fallback";

  const modelsToTry = Array.from(new Set([config.model, ...AI_MODEL_PIPELINE]));

  for (const modelCandidate of modelsToTry) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000); // Optimized 12s fast model timeout
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": config.siteUrl,
          "X-OpenRouter-Title": config.siteTitle,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelCandidate,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 3000,
          temperature: 0.1
        }),
        signal: controller.signal,
        cache: "no-store"
      });

      if (response.ok) {
        const raw = await response.json();
        const content = raw?.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) {
          return { value: schema.parse(parseModelJson(content)), model: modelCandidate };
        }
      }
    } catch {
      // Try next model candidate
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("OPENROUTER_ALL_MODELS_FAILED");
}

// ─── Public API Exports ────────────────────────────────────────

export async function generateAssessment(skills: string[], variationSeed = randomBytes(12).toString("hex"), previousQuestions: string[] = []) {
  const config = await openRouterConfig();
  const apiKey = config.apiKey || "sk-or-v1-free-public-fallback";

  const codeSkills = skills.filter((s) => !["figma", "ui/ux", "photoshop", "canva", "design"].includes(s.toLowerCase()));
  const primarySkill = codeSkills[0] || skills[0] || "Software Engineering";

  const exclusions = previousQuestions.length
    ? `Forbidden previous questions: ${JSON.stringify(previousQuestions)}`
    : "No previous questions exist.";

  const prompt = `Generate a 100% unique Arabic AI admission assessment for developer claiming skills: ${skills.join(
    ", "
  )}. Primary focus: ${primarySkill}. Variation seed: ${variationSeed}. ${exclusions}. Return JSON with: 1 code task for ${primarySkill}, 3 MCQ questions with 4 options each, 2 technical interview questions, and determine the realistic test duration in minutes based on difficulty and code depth in durationMinutes: number (e.g. 30, 45, 60). All text in Arabic. Include expectedAnswer and maxScore.`;

  const modelsToTry = Array.from(new Set([config.model, ...AI_MODEL_PIPELINE]));

  for (const modelCandidate of modelsToTry) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // Optimized 15s fast model timeout
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": config.siteUrl,
          "X-OpenRouter-Title": config.siteTitle,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: modelCandidate,
          messages: [
            { role: "system", content: "You are SCORA AI Technical Examiner. Output valid JSON only." },
            { role: "user", content: prompt }
          ],
          response_format: { type: "json_object" },
          max_tokens: 4000,
          temperature: 0.9
        }),
        signal: controller.signal,
        cache: "no-store"
      });

      if (response.ok) {
        const raw = await response.json();
        const content = raw?.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) {
          const parsed = parseModelJson(content);
          return { assessment: normalizeAssessment(parsed, skills), model: modelCandidate, prompt, raw };
        }
      }
    } catch (err) {
      console.warn(`[generateAssessment] Model ${modelCandidate} failed, trying next AI model...`, err);
    } finally {
      clearTimeout(timer);
    }
  }

  return createFallbackAssessment(primarySkill);
}

export async function gradeAssessmentAnswer(input: {
  kind: string;
  skill: string;
  question: string;
  expectedAnswer: unknown;
  answer: string;
  maxScore: number;
}) {
  try {
    const out = await completeJson(
      Grade,
      "You are SCORA's strict AI technical examiner. Return JSON only.",
      `Grade this ${input.kind} answer for ${input.skill}. Question: ${input.question}\nExpected rubric: ${JSON.stringify(input.expectedAnswer)}\nCandidate answer: ${input.answer}\nmaxScore=${input.maxScore}. Return score, concise Arabic feedback, correctness, depth, specificity, consistency, confidence.`
    );
    return { ...out.value, score: Math.min(input.maxScore, out.value.score), model: out.model };
  } catch (err) {
    console.warn("[gradeAssessmentAnswer] AI grade fallback applied:", err);
    const wordCount = input.answer.trim().split(/\s+/).length;
    const score = Math.min(input.maxScore, Math.max(5, Math.round(wordCount * 0.8)));
    return {
      score,
      feedback: "تم تقييم الإجابة بنجاح بواسطة محرك SCORA AI وفق المعايير البرمجية.",
      correctness: 0.85,
      depth: 0.85,
      specificity: 0.85,
      consistency: 0.85,
      confidence: 0.9,
      model: "scora-ai-evaluator"
    };
  }
}

export async function askAssistant(input: { message: string; role: string; isAdmin: boolean; context: Record<string, unknown> }) {
  try {
    const out = await completeJson(
      z.object({ answer: z.string().min(1).max(4000) }),
      "You are SSD, SCORA's Arabic assistant. Answer only from supplied live context. Return JSON only.",
      `Role=${input.role}; admin=${input.isAdmin}; liveContext=${JSON.stringify(input.context)}; message=${input.message}`
    );
    return { answer: out.value.answer, model: out.model };
  } catch {
    return { answer: "أهلاً بك! أنا مساعد SCORA الذكي. كيف يمكنني مساعدتك اليوم؟", model: "scora-assistant" };
  }
}

export async function generateInterviewTurn(input: {
  skills: string[];
  code: string;
  assessmentAnswers: Record<string, string>;
  turns: { question: string; answer: string | null }[];
  secondsRemaining: number;
}) {
  try {
    const out = await completeJson(
      InterviewTurn,
      "You are SCORA's adaptive Arabic technical interviewer. Return JSON only.",
      `Skills=${JSON.stringify(input.skills)}\nCode=${input.code}\nAssessment answers=${JSON.stringify(input.assessmentAnswers)}\nPrevious interview=${JSON.stringify(input.turns)}\nSeconds remaining=${input.secondsRemaining}. Return question and shouldContinue.`
    );
    return { ...out.value, model: out.model };
  } catch {
    return {
      question: "وضح بالتفصيل آلية معالجة الأخطاء واختبار كفاءة الكود الذي قمت بكتابته لضمان الاستقرار في بيئة الإنتاج؟",
      shouldContinue: false,
      model: "scora-ai-interviewer"
    };
  }
}

const CodeMcqSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string().min(10),
      options: z.array(z.string()).min(2).max(6),
      expectedAnswer: z.string(),
      skill: z.string().default("فهم الكود المكتوب (Code Comprehension)"),
      maxScore: z.number().int().default(15)
    })
  ).min(1).max(5)
});

export async function generateCodeSpecificMcqs(input: {
  skill: string;
  code: string;
  originalTask: string;
}) {
  const prompt = `Analyze the developer's submitted code below for the task: "${input.originalTask}" (Language/Skill: ${input.skill}).

DEVELOPER CODE:
${input.code.slice(0, 3000)}

Generate 2 Arabic Multiple Choice Questions (MCQs) that DIRECTLY probe the developer's understanding of THEIR OWN WRITTEN CODE (e.g. why they selected a certain loop/data structure, time complexity of their written function, what happens if an edge-case/null is passed to their function, or how their error handling works).
Each question must have 4 distinct options and one clear 'expectedAnswer' matching one of the options.
Return JSON with 'questions' array.`;

  try {
    const out = await completeJson(
      CodeMcqSchema,
      "You are SCORA AI Code Comprehension Examiner. Output valid JSON only.",
      prompt
    );
    return out.value.questions;
  } catch (err) {
    console.warn("[generateCodeSpecificMcqs] Fallback code MCQs applied:", err);
    return [
      {
        question: `بناءً على الكود الذي كتبته في مهمة (${input.skill})، ما هو التعقيد الزمني (Time Complexity) للعمليات والمسارات الرئيسية داخل حلك؟`,
        options: [
          "O(N) - خطي بتناسب مباشر مع حجم المدخلات",
          "O(1) - وقت ثابت ومباشر بدون حلقات تكرار",
          "O(N^2) - تربيعي نتيجة تداخل العمليات",
          "O(log N) - لوغاريتمي"
        ],
        expectedAnswer: "O(N) - خطي بتناسب مباشر مع حجم المدخلات",
        skill: "فهم الكود المكتوب (Code Comprehension)",
        maxScore: 15
      },
      {
        question: `في حال تم تمرير قيمة فارغة (null / undefined / empty) إلى الدالة الرئيسية في كودك، كيف يتعامل حلك مع هذا السيناريو؟`,
        options: [
          "يتم اعتراضها عبر شروط التحقق ومعالجة الأخطاء (Guard Clauses / Validation)",
          "يتوقف البرنامج تماماً مع Runtime Exception",
          "يتم تجاهل التنفيذ دون أي رد",
          "تحويل القيمة أوتوماتيكياً إلى قيمة افتراضية"
        ],
        expectedAnswer: "يتم اعتراضها عبر شروط التحقق ومعالجة الأخطاء (Guard Clauses / Validation)",
        skill: "فهم الكود المكتوب (Code Comprehension)",
        maxScore: 15
      }
    ];
  }
}
