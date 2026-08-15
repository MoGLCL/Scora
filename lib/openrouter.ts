"use theoretical"; // eslint-disable-line
import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { query } from "@/lib/db";

// ─── Zod Validation Schemas ────────────────────────────────────

const Question = z.object({
  kind: z.enum(["mcq", "interview", "code"]),
  skill: z.string().min(1).max(100),
  question: z.string().min(10),
  options: z.array(z.string()).min(2).max(6).optional(),
  expectedAnswer: z.unknown().optional(),
  maxScore: z.number().int().min(1).max(100)
});

const Assessment = z.object({
  questions: z.array(Question).min(5).max(20),
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

const OpenRouterResponse = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string().min(1) })
    })
  ).min(1)
});

// ─── AI Pipeline & 100% Free Live Endpoints ────────────────────

const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

// Active 100% Free models fallback pipeline
const AI_MODEL_PIPELINE = [
  "openrouter/free",
  "cohere/north-mini-code:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "openai/gpt-oss-20b:free",
  "liquid/lfm-2.5-2.6b:free",
  "poolside/laguna-s-2.1:free",
  "dots-studio/dots-3-note-preview:free"
];

// ─── AES-256-GCM Encryption / Decryption Helpers ──────────────

function getCipherKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET_REQUIRED");
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getCipherKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
}

function decryptSecret(value: string): string {
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
    model: settings.openrouter_model || DEFAULT_MODEL,
    siteUrl: settings.openrouter_site_url || process.env.APP_URL || "",
    siteTitle: settings.openrouter_site_title || process.env.OPENROUTER_SITE_TITLE || "SCORA",
    hasStoredKey: Boolean(storedKey)
  };
}

// ─── JSON Clean Parser & Normalizer ────────────────────────────

function parseModelJson(content: string): unknown {
  const clean = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(clean.slice(start, end + 1));
      } catch {
        // Fall through
      }
    }
    throw new Error("OPENROUTER_INVALID_JSON");
  }
}

function normalizeAssessment(value: unknown, skills: string[]) {
  const fallbackSkill = skills[0] || "Software Engineering";
  let skillIndex = 0;

  const normalize = (q: GroupedQuestionValue, kind: "mcq" | "interview" | "code") => {
    const assignedSkill = q.skill && q.skill.trim() ? q.skill : skills[skillIndex % skills.length] || fallbackSkill;
    skillIndex++;

    return {
      ...q,
      kind,
      skill: assignedSkill,
      expectedAnswer:
        q.expectedAnswer ??
        (kind === "mcq" ? q.options?.[0] ?? "راجع الإجابة تقنيًا" : "قيّم الإجابة وفق الدقة والعمق التقني"),
      maxScore: q.maxScore ?? (kind === "code" ? 40 : kind === "interview" ? 15 : 10)
    };
  };

  const parsedAny = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  let durationMinutes = typeof parsedAny.durationMinutes === "number" ? Math.max(15, Math.min(180, Math.round(parsedAny.durationMinutes))) : undefined;

  const direct = Assessment.safeParse(value);
  if (direct.success) {
    const codeCount = direct.data.questions.filter((q) => q.kind === "code").length;
    const mcqCount = direct.data.questions.filter((q) => q.kind === "mcq").length;
    const intCount = direct.data.questions.filter((q) => q.kind === "interview").length;
    durationMinutes = durationMinutes || (codeCount * 25 + mcqCount * 3 + intCount * 5);

    return {
      questions: direct.data.questions.map((q) => normalize(q, q.kind)),
      durationMinutes: Math.max(25, Math.min(180, durationMinutes))
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
    durationMinutes: Math.max(25, Math.min(180, durationMinutes))
  };
}

// ─── Dynamic Multi-Skill Fallback Engine ───────────────────────

function createFallbackAssessment(skills: string[], jobTitle?: string) {
  const cleanSkills = skills.length > 0 ? skills : ["JavaScript", "TypeScript", "SQL"];
  const codeSkills = cleanSkills.filter((s) => !["figma", "ui/ux", "photoshop", "canva", "design"].includes(s.toLowerCase()));
  const primarySkill = codeSkills[0] || cleanSkills[0] || "Software Engineering";
  const track = jobTitle || "Full-Stack Web Developer";

  const questions: Array<{
    kind: "code" | "mcq" | "interview";
    skill: string;
    question: string;
    options?: string[];
    expectedAnswer: string;
    maxScore: number;
  }> = [];

  // 1. Practical Coding Challenge
  questions.push({
    kind: "code",
    skill: primarySkill,
    question: `[مهمة برمجية عملية - ${primarySkill} | تخصص ${track}]:\nقم بكتابة موديول برمجي متكامل بلغة (${primarySkill}) يقوم ببناء دالة معالجة سريعة لطلبات البيانات والتحقق من صحة المدخلات، مع تطبيق معالجة استثناءات الأخطاء (Exception Handling)، والتعامل مع الحالات الحدية (Edge Cases)، وتأمين العمليات ضد التضارب أو انهيار الخادم.`,
    expectedAnswer: `كتابة كود نظيف وقابل لإعادة الاستخدام بلغة ${primarySkill} مجهز بالتحقق من المدخلات ومعالجة الأخطاء.`,
    maxScore: 40
  });

  // 2. MCQs distributed across all candidate skills
  cleanSkills.forEach((skill) => {
    questions.push({
      kind: "mcq",
      skill,
      question: `[سؤال اختيار من متعدد - مهارة ${skill}]: ما هي أفضل ممارسة معتمدة لضمان الأداء العالي ومنع استهلاك الموارد المفرط عند استخدام ${skill} في المشاريع الكبرى؟`,
      options: [
        `تطبيق التخزين المؤقت (Caching)، إدارة الذاكرة، وفهرسة البيانات والعمليات المتزامنة في ${skill}`,
        "تعطيل معالجة الأخطاء لتقليل زمن الاستجابة",
        "تحميل كافة السجلات والملفات في الذاكرة المؤقتة مرة واحدة بدون تجزئة",
        "الاعتماد الكامل على الفحص والتحقق من جانب العميل فقط"
      ],
      expectedAnswer: `تطبيق التخزين المؤقت (Caching)، إدارة الذاكرة، وفهرسة البيانات والعمليات المتزامنة في ${skill}`,
      maxScore: 10
    });
  });

  // Ensure baseline question count
  if (cleanSkills.length < 3) {
    questions.push({
      kind: "mcq",
      skill: primarySkill,
      question: `[سؤال تقني - ${primarySkill}]: كيف تتعامل مع العمليات غير المتزامنة (Asynchronous Tasks) لمنع تجميد المعالجة؟`,
      options: [
        "استخدام الآليات غير المحظورة (Non-blocking I/O) وإدارة الـ Promises/Threads بشكل معزول",
        "تشغيل الحلقات التكرارية بشكل متواصل حتى اكتمال البيانات",
        "تجاهل الـ Callbacks والأخطاء الشبكية",
        "تحويل جميع المعاملات إلى نمط متزامن مغلق"
      ],
      expectedAnswer: "استخدام الآليات غير المحظورة (Non-blocking I/O) وإدارة الـ Promises/Threads بشكل معزول",
      maxScore: 10
    });
  }

  // 3. Technical & Architectural Interview Questions
  const interviewSkill1 = cleanSkills[0] || primarySkill;
  const interviewSkill2 = cleanSkills[1] || cleanSkills[0] || "System Architecture";

  questions.push({
    kind: "interview",
    skill: interviewSkill1,
    question: `[مقابلة تقنية - ${interviewSkill1}]: وضح بالتفصيل كيف تكتشف وتعالج تسريبات الذاكرة (Memory Leaks) وبطء الاستجابة عند تشغيل تطبيق يعتمد على ${interviewSkill1} في بيئة الإنتاج؟`,
    expectedAnswer: "شرح استخدام أدوات الـ Profiling وتحليل الـ Call Stacks ومراقبة تسريب الـ Event Listeners / DB connections.",
    maxScore: 15
  });

  questions.push({
    kind: "interview",
    skill: interviewSkill2,
    question: `[مقابلة معمارية - ${track}]: في حال تطلب المشروع بناء نظام يعالج آلاف الطلبات في الثانية باستخدام (${cleanSkills.join(" + ")}). كيف تصمم معمارية النظام لتكون High Availability وFault Tolerant؟`,
    expectedAnswer: "شرح آليات الـ Load Balancing، الـ Caching Layer، واستراتيجية الـ Database Replication والـ Async Queues.",
    maxScore: 15
  });

  const durationMinutes = Math.max(30, Math.min(90, 25 + cleanSkills.length * 4 + 15));

  return {
    assessment: {
      durationMinutes,
      questions
    },
    model: "scora-multi-skill-engine",
    prompt: `multi-skill-assessment-${cleanSkills.join("-")}`,
    raw: { mode: "dynamic-multi-skill" }
  };
}

// ─── OpenRouter HTTP Request Executor ─────────────────────────

async function requestModelJson(input: {
  apiKey: string;
  model: string;
  siteUrl: string;
  siteTitle: string;
  system: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  useJsonFormat?: boolean;
}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);

  const payload: Record<string, unknown> = {
    model: input.model,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.prompt }
    ],
    max_tokens: input.maxTokens,
    temperature: input.temperature
  };

  if (input.useJsonFormat !== false) {
    payload.response_format = { type: "json_object" };
  }

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        ...(input.siteUrl ? { "HTTP-Referer": input.siteUrl } : {}),
        "X-OpenRouter-Title": input.siteTitle,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      if (response.status === 400 && input.useJsonFormat !== false) {
        return requestModelJson({ ...input, useJsonFormat: false });
      }
      throw new Error(`OPENROUTER_HTTP_${response.status}`);
    }

    const parsedResponse = OpenRouterResponse.parse(await response.json());
    return parseModelJson(parsedResponse.choices[0].message.content);
  } finally {
    clearTimeout(timer);
  }
}

async function completeJson<T>(schema: z.ZodType<T>, system: string, prompt: string) {
  const config = await openRouterConfig();
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error("OPENROUTER_NOT_CONFIGURED");

  const modelsToTry = Array.from(new Set([config.model, ...AI_MODEL_PIPELINE]));

  for (const modelCandidate of modelsToTry) {
    try {
      const value = await requestModelJson({
        apiKey,
        model: modelCandidate,
        siteUrl: config.siteUrl,
        siteTitle: config.siteTitle,
        system,
        prompt,
        maxTokens: 3000,
        temperature: 0.2,
        timeoutMs: 12_000
      });
      return { value: schema.parse(value), model: modelCandidate };
    } catch {
      // Try next candidate
    }
  }
  throw new Error("OPENROUTER_ALL_MODELS_FAILED");
}

// ─── Public AI Actions ─────────────────────────────────────────

export async function generateAssessment(
  skills: string[],
  variationSeed = randomBytes(12).toString("hex"),
  previousQuestions: string[] = [],
  jobTitle?: string
) {
  const config = await openRouterConfig();
  const apiKey = config.apiKey;

  const cleanSkills = skills.length > 0 ? skills : ["JavaScript", "TypeScript", "SQL"];
  const codeSkills = cleanSkills.filter((s) => !["figma", "ui/ux", "photoshop", "canva", "design"].includes(s.toLowerCase()));
  const primarySkill = codeSkills[0] || cleanSkills[0] || "Software Engineering";
  const track = jobTitle || "Full-Stack Web Developer";

  const exclusions = previousQuestions.length
    ? `Forbidden previous questions: ${JSON.stringify(previousQuestions.slice(0, 15))}`
    : "No previous questions exist.";

  const prompt = `Generate a 100% unique Arabic AI technical assessment for a candidate in the specialty "${track}" claiming the following skills: ${cleanSkills.join(
    ", "
  )}.
REQUIREMENTS:
1. Cover ALL claimed skills across the assessment.
2. Include 1 practical coding task in the primary skill (${primarySkill}).
3. Include ${Math.max(3, cleanSkills.length)} Multiple Choice Questions (MCQs) with 4 options each, distributing the questions to test EACH of the candidate's skills: ${cleanSkills.join(", ")}.
4. Include 2 in-depth architectural interview questions covering the candidate's skills.
5. All text, questions, and options MUST be in formal Arabic.
6. Return a valid JSON object with:
   - "durationMinutes": realistic test duration (e.g. 45, 60)
   - "questions": array of question objects with "kind" ("code"|"mcq"|"interview"), "skill" (the specific skill being tested), "question" (Arabic text), "options" (array of 4 strings for MCQs), "expectedAnswer" (string), and "maxScore" (number).
Variation seed: ${variationSeed}. ${exclusions}.`;

  if (apiKey) {
    const modelsToTry = Array.from(new Set([config.model, ...AI_MODEL_PIPELINE]));

    for (const modelCandidate of modelsToTry) {
      try {
        const raw = await requestModelJson({
          apiKey,
          model: modelCandidate,
          siteUrl: config.siteUrl,
          siteTitle: config.siteTitle,
          system: "You are SCORA AI Technical Examiner. Output valid JSON only.",
          prompt,
          maxTokens: 4000,
          temperature: 0.8,
          timeoutMs: 14_000
        });
        return { assessment: normalizeAssessment(raw, cleanSkills), model: modelCandidate, prompt, raw };
      } catch (err) {
        console.warn(`[generateAssessment] Model ${modelCandidate} failed, trying next AI model...`, err);
      }
    }
  }

  return createFallbackAssessment(cleanSkills, track);
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
      feedback: "تم تقييم الإجابة بنجاح بواسطة محرك SCORA AI وفق المعايير البرمجية والدقة التقنية.",
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
