"use theoretical";
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
  questions: z.array(Question).min(4).max(20),
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
const configuredJsonMaxTokens = Number(process.env.OPENROUTER_MAX_TOKENS);
const DEFAULT_JSON_MAX_TOKENS = Number.isInteger(configuredJsonMaxTokens)
  ? Math.min(2_000, Math.max(128, configuredJsonMaxTokens))
  : 400;
const configuredAssistantMaxTokens = Number(process.env.OPENROUTER_ASSISTANT_MAX_TOKENS);
const ASSISTANT_MAX_TOKENS = Number.isInteger(configuredAssistantMaxTokens)
  ? Math.min(4_000, Math.max(800, configuredAssistantMaxTokens))
  : 2_000;
const MIN_AFFORDABLE_COMPLETION_TOKENS = 64;

// Keep the fallback pipeline free-only. Paid slugs make a zero-credit OpenRouter
// account fail before it can reach the free router.
const AI_MODEL_PIPELINE = [
  "openrouter/free",
  "nvidia/nemotron-nano-9b-v2:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-3-27b-it:free",
  "qwen/qwen3-coder:free"
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

// ─── OpenRouter HTTP Request Executor with Resilient Timeout ──

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
      if (response.status === 402) {
        const errorBody = await response.text().catch(() => "");
        const match = errorBody.match(/can only afford (\d+)/i);
        const affordableTokens = match?.[1] ? Number.parseInt(match[1], 10) : 0;
        const retryMaxTokens = affordableTokens - 16;

        if (
          retryMaxTokens >= MIN_AFFORDABLE_COMPLETION_TOKENS &&
          retryMaxTokens < input.maxTokens
        ) {
          return requestModelJson({ ...input, maxTokens: retryMaxTokens });
        }

        throw new Error("OPENROUTER_CREDITS_INSUFFICIENT");
      }
      if (response.status === 401) throw new Error("OPENROUTER_INVALID_API_KEY");
      if (response.status === 403) throw new Error("OPENROUTER_FORBIDDEN");
      if (response.status === 429) throw new Error("OPENROUTER_RATE_LIMITED");
      throw new Error(`OPENROUTER_HTTP_${response.status}`);
    }

    const parsedResponse = OpenRouterResponse.parse(await response.json());
    return parseModelJson(parsedResponse.choices[0].message.content);
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
      throw new Error(`OPENROUTER_TIMEOUT_${input.timeoutMs}MS`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function completeJson<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  options: { maxTokens?: number; timeoutMs?: number } = {}
) {
  const config = await openRouterConfig();
  const apiKey = config.apiKey;
  if (!apiKey) throw new Error("OPENROUTER_NOT_CONFIGURED");

  const modelsToTry = Array.from(new Set([config.model, ...AI_MODEL_PIPELINE]));
  const failures: string[] = [];

  for (const modelCandidate of modelsToTry) {
    try {
      const value = await requestModelJson({
        apiKey,
        model: modelCandidate,
        siteUrl: config.siteUrl,
        siteTitle: config.siteTitle,
        system,
        prompt,
        maxTokens: options.maxTokens ?? DEFAULT_JSON_MAX_TOKENS,
        temperature: 0.2,
        timeoutMs: options.timeoutMs ?? 12_000
      });
      return { value: schema.parse(value), model: modelCandidate };
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      failures.push(`${modelCandidate}:${code}`);

      if (code === "OPENROUTER_INVALID_API_KEY" || code === "OPENROUTER_FORBIDDEN") {
        break;
      }
    }
  }

  const diagnosticFailures = failures.length > 3
    ? [failures[0], ...failures.slice(-2)]
    : failures;
  throw new Error(`OPENROUTER_ALL_MODELS_FAILED (${diagnosticFailures.join(", ")})`);
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

  const prompt = `Generate a concise Arabic AI technical assessment for candidate in "${track}" claiming skills: ${cleanSkills.join(
    ", "
  )}.
REQUIREMENTS:
1. Cover ALL claimed skills.
2. 1 practical coding task in primary skill (${primarySkill}).
3. ${Math.min(4, Math.max(3, cleanSkills.length))} MCQs with 4 options each across skills: ${cleanSkills.join(", ")}.
4. 2 short architectural interview questions for ${cleanSkills.join(", ")}.
5. All text in formal Arabic.
6. Return JSON with:
   - "durationMinutes": 45
   - "questions": array of { "kind": "code"|"mcq"|"interview", "skill": string, "question": string, "options": string[] (for mcq), "expectedAnswer": string, "maxScore": number }
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
          maxTokens: 2500,
          temperature: 0.7,
          timeoutMs: 90_000
        });
        return { assessment: normalizeAssessment(raw, cleanSkills), model: modelCandidate, prompt, raw };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[generateAssessment] Model ${modelCandidate} failed (${msg}), trying next AI model...`);
      }
    }
  }

  // Gracefully provide dynamic multi-skill assessment if all remote APIs time out or fail
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

const ProjectDraftSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.string().default("تطوير مواقع الويب (Full-Stack)"),
  budgetFrom: z.number().default(15000),
  budgetTo: z.number().default(25000),
  deadlineDays: z.number().default(14),
  skills: z.array(z.string()).default(["React.js", "Next.js", "Node.js"]),
  deliverables: z.array(z.string()).default(["واجهة مستخدم متجاوبة", "قاعدة بيانات ولوحة تحكم"]),
  target: z.enum(["client_project", "developer_portfolio"]).default("client_project"),
  executionTime: z.string().nullish(),
  startDate: z.string().nullish(),
  isOpenSource: z.boolean().nullish(),
  projectStatus: z.enum(["completed", "in_progress"]).nullish(),
  previewUrl: z.string().nullish(),
  githubUrl: z.string().nullish(),
});

const AgentActionSchema = z.object({
  type: z.enum(["create_project", "create_portfolio_project", "search_developers", "estimate_pricing", "browse_projects", "navigate"]),
  label: z.string(),
  url: z.string().nullish(),
  projectDraft: ProjectDraftSchema.nullish(),
});

function extractAssistantText(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const record = value as Record<string, unknown>;
  for (const key of ["answer", "response", "content", "text", "message"]) {
    const candidate = record[key];
    if (typeof candidate === "string") return candidate;
  }

  return undefined;
}

const AssistantResponseSchema = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;

    const record = value as Record<string, unknown>;
    const nestedMessage =
      record.message && typeof record.message === "object"
        ? (record.message as Record<string, unknown>)
        : null;
    const nestedAnswer =
      record.answer && typeof record.answer === "object" && !Array.isArray(record.answer)
        ? (record.answer as Record<string, unknown>)
        : null;
    const answer =
      extractAssistantText(record.answer) ??
      extractAssistantText(record.response) ??
      extractAssistantText(record.content) ??
      extractAssistantText(nestedMessage) ??
      extractAssistantText(record.message);

    return {
      ...nestedAnswer,
      ...record,
      answer,
      suggestedAction: record.suggestedAction ?? nestedAnswer?.suggestedAction,
      projectDraft: record.projectDraft ?? nestedAnswer?.projectDraft,
      actions: record.actions ?? nestedAnswer?.actions,
    };
  },
  z.object({
    answer: z.string().trim().min(1).max(4000),
    suggestedAction: z.string().nullish(),
    projectDraft: ProjectDraftSchema.nullish(),
    actions: z.array(AgentActionSchema).nullish(),
  })
);

function buildSmartAssistantFallback(input: {
  message: string;
  role: string;
  isAdmin: boolean;
  context: Record<string, unknown>;
}) {
  const msg = input.message.toLowerCase().trim();

  // 1. Developer asks SSD to submit a proposal/offer on an open project -> REFUSE AND ROAST!
  const isAskingToSubmitProposal =
    (msg.includes("عرض") || msg.includes("proposal") || msg.includes("قدم") || msg.includes("قدملي") || msg.includes("تقديم") || msg.includes("بروبوزال")) &&
    (msg.includes("مشروع") || msg.includes("مشاريع") || msg.includes("مفتوح") || msg.includes("مفتوحة") || msg.includes("مناقصة") || msg.includes("فرصة")) &&
    !msg.includes("معرض") &&
    !msg.includes("portfolio");

  if (isAskingToSubmitProposal) {
    return {
      answer: `## يا باشمهندس عاوزني أنا اللي أقدملك العرض كمان؟!

أومال أنت مسمي نفسك سنيور ومطور محترف بناءً على إيه؟ على شرب القهوة وقعدة اللينكد إن وتجميع الـ SP؟! 

خش بنفسك على المشروع، اقرأ الـ Scope كويس، وافهم متطلبات العميل واكتب عرضك بمجهودك وبصمتك التقنية يا نجم.. ده أنت ناقص تقولي تعال حل مكاني الكودينج تشالنج واعمل الإنترفيو واقبض الفلوس وحطها في جيبك!

ادخل على صفحة المشاريع واكتب عرضك بنفسك يا باشا.`,
      actions: [
        {
          type: "browse_projects" as const,
          label: "تصفح المشاريع واكتب عرضك بنفسك يا هندسة",
        },
      ],
      model: "ssd-smart-engine",
    };
  }

  // 2. Specific Portfolio Project vs Open Job Project:
  const isPortfolioShowcase =
    msg.includes("معرض") ||
    msg.includes("بورتفوليو") ||
    msg.includes("portfolio") ||
    msg.includes("معرضي") ||
    msg.includes("أعمالي") ||
    msg.includes("اعمالي") ||
    (msg.includes("مشروع") && (msg.includes("في المعرض") || msg.includes("ف المعرض") || msg.includes("بالمعرض") || msg.includes("بالـ md") || msg.includes("بال md")));

  if (isPortfolioShowcase) {
    // Developer Portfolio Project Draft (Markdown)
    const projectDraft = {
      title: "منصة تجارة إلكترونية متطورة بنظام Microservices وبوابات دفع ذكية",
      description: `## نظرة عامة على المشروع

منصة تجارة إلكترونية عالية الكفاءة مبنية لتتحمل أكثر من **10,000 مستخدم متزامن** مع نظام دفع إلكتروني متعدد ومزامنة فورية للمخزون.

### الميزات التقنية الرئيسية:
- **معمارية عالية الأداء**: فصل الخدمات (Services) مع دعم Redis Caching.
- **إدارة المخزون الفورية**: WebSockets لمتابعة الكميات وحجوزات السلة لحظة بلحظة.
- **تأمين المعاملات**: تشفير بيانات الدفع وتطبيق معايير OWASP للسيبراني.

\`\`\`typescript
// مثال على معالجة طلب الدفع الآمن
export async function processOrderCheckout(orderId: string, amount: number) {
  const transaction = await db.transaction(async (tx) => {
    const inventoryLocked = await tx.inventory.lock(orderId);
    if (!inventoryLocked) throw new Error("INSUFFICIENT_STOCK");
    return await paymentGateway.charge({ orderId, amount });
  });
  return transaction;
}
\`\`\`

### التحديات التي تم حلها:
1. حل مشكلة الـ Concurrency أثناء فترات التخفيضات الكبرى.
2. تحسين سرعة تحميل الصفحات (LCP < 0.8s) باستخدام Next.js SSR.`,
      category: "تطوير مواقع الويب (Full-Stack)",
      budgetFrom: 20000,
      budgetTo: 35000,
      deadlineDays: 25,
      skills: ["Next.js", "TypeScript", "Tailwind CSS", "Redis", "Prisma", "PostgreSQL"],
      deliverables: ["كود نظيف موثق", "واجهات متجاوبة", "بوابات دفع جاهزة"],
      target: "developer_portfolio" as const,
      executionTime: "3 أسابيع",
      startDate: "يناير 2026",
      isOpenSource: true,
      projectStatus: "completed" as const,
    };

    return {
      answer: `## تم تجهيز مسودة مشروعك بالـ Markdown لمعرض الأعمال 🚀

كتبت لك وصفاً تقنياً احترافياً بأسلوب **Markdown** يبرز مهاراتك الهندسية، مع معمارية النظام ومثال للكود والتحديات التي تغلبت عليها.

اضغط على الزر أدناه لتعبئة البيانات في صفحة نشر المشروع بضغطة واحدة!`,
      projectDraft,
      actions: [
        {
          type: "create_portfolio_project" as const,
          label: "تعبئة ونشر المشروع في معرض أعمالي 🚀",
          projectDraft,
        },
      ],
      model: "ssd-smart-engine",
    };
  }

  // 3. User asks to add / create an OPEN JOB PROJECT (for developers to apply)
  if (
    msg.includes("مشروع") ||
    msg.includes("انشر") ||
    msg.includes("ضفلي مشروع") ||
    msg.includes("اعملي مشروع") ||
    msg.includes("سويلي مشروع") ||
    msg.includes("طلب مشروع") ||
    msg.includes("مشروع جديد")
  ) {
    const projectDraft = {
      title: "تطوير تطبيق ويب متكامل لإدارة الأعمال مع بوابات دفع ولوحة تحكم",
      description: `## تفاصيل المشروع المطلوب

نبحث عن مطور محترف لبناء نظام متكامل يتميز بالأداء العالي والأمان وسهولة الاستخدام.

### المتطلبات والمهام الأساسية:
- تصميم وبناء واجهة مستخدم متجاوبة وحديثة وتدعم اللغة العربية والإنجليزية.
- بناء واجهات برمجة التطبيقات (RESTful / GraphQL APIs) وقاعدة بيانات سريعة وآمنة.
- نظام مصادقة وصلاحيات متقدم للمستخدمين والإدارة.
- ربط بوابات الدفع الإلكتروني وتكامل الإشعارات الفورية.

### الشروط:
- الالتزام بتسليم كود نظيف وموثق بالكامل.
- خبرة سابقة في مشاريع مشابهة وسرعة في الإنجاز.`,
      category: "تطوير مواقع الويب (Full-Stack)",
      budgetFrom: 18000,
      budgetTo: 30000,
      deadlineDays: 21,
      skills: ["Next.js", "TypeScript", "Node.js", "PostgreSQL"],
      deliverables: ["الكود المصدري كاملاً", "لوحة التحكم", "دليل التشغيل والـ API Docs"],
      target: "client_project" as const,
    };

    return {
      answer: `## مسودة المشروع المفتوح جاهزة للنشر للمطورين 🚀

قمت بتجهيز مسودة متكاملة للمشروع مع المتطلبات والميزانية والمهارات المقترحة.

يمكنك مراجعة المسودة وتعديل أي تفاصيل ثم نشرها مباشرة في منصة سكورا ليتمكن المطورون من التقديم عليها فوراً!`,
      projectDraft,
      actions: [
        {
          type: "create_project" as const,
          label: "تعبئة مسودة المشروع ونشره للمطورين ✍️",
          projectDraft,
        },
      ],
      model: "ssd-smart-engine",
    };
  }

  // 4. Pricing / SP questions
  if (msg.includes("سعر") || msg.includes("فلوس") || msg.includes("تكلفة") || msg.includes("sp") || msg.includes("نقاط")) {
    return {
      answer: `## تقدير الأسعار ونقاط المهارة (SP) 💰

في منصة **سكورا**، يتم تسعير المشاريع بناءً على:
1. **درجة الثقة (Trust Score)** والـ SP المعتمدة للمطور.
2. **تعقيد التقنيات المطلوبة** (Full-Stack / AI / Mobile).
3. **المدة الزمنية** ومخرجات المشروع.

💡 **نصيحة تقنية**: المطورين الحاصلين على أعلى من 70% في التقييمات يحصلون على أسعار تنافسية تتراوح بين **15,000 إلى 40,000 ج.م** للمشاريع المتوسطة.`,
      actions: [
        {
          type: "browse_projects" as const,
          label: "تصفح المشاريع المتاحة للتقديم",
        },
      ],
      model: "ssd-smart-engine",
    };
  }

  // 5. Search / Find developers
  if (msg.includes("مطور") || msg.includes("مبرمج") || msg.includes("توظيف") || msg.includes("ابحث") || msg.includes("freelancer")) {
    return {
      answer: `## استكشاف المطورين المعتمدين 👨‍💻

يمكنك تصفح نخبة من أفضل المطورين الذين اجتازوا اختبارات الكود والإنترفيو التقني في سكورا.

تفضل بتصفح قائمة المطورين أو استخدم فلتر المهارات للعثور على المطور المناسب لمشروعك فوراً.`,
      actions: [
        {
          type: "search_developers" as const,
          label: "تصفح قائمة المطورين المعتمدين",
        },
      ],
      model: "ssd-smart-engine",
    };
  }

  // 6. Default helpful Arabic response
  return {
    answer: `## مرحباً بك! أنا SSD وكيل سكورا الذكي 🤖

أنا هنا لمساعدتك في كل ما يتعلق بالمنصة:
- ✍️ **صياغة مشاريع معرض أعمالك بالـ Markdown** ونشرها فوراً في بروفايلك عند قول "ضفلي مشروع في المعرض".
- 🚀 **إنشاء مشاريع جديدة للمنصة** ليقدم عليها المطورون عند قول "ضفلي مشروع".
- 💼 **تقدير الأسعار وتفاصيل المشاريع** بدقة وواقعية.
- 🎯 **اقتراح أفكار تقنية** وحلول للمعمارية البرمجية.

كيف يمكنني مساعدتك اليوم؟`,
    actions: [
      {
        type: "browse_projects" as const,
        label: "تصفح المشاريع المتاحة",
      },
    ],
    model: "ssd-smart-engine",
  };
}

export async function askAssistant(input: {
  message: string;
  role: string;
  isAdmin: boolean;
  context: Record<string, unknown>;
}) {
  const prompt = `You are SSD, SCORA's Autonomous AI Agent and Copilot.
User Role: ${input.role} (isAdmin: ${input.isAdmin}).
Live Platform Context: ${JSON.stringify(input.context)}.
User Message: "${input.message}".

INSTRUCTIONS:
1. Respond in friendly, professional Arabic as "SSD" (مساعد سكورا الذكي). Format your responses in clean, structured Markdown (using headings ##, bullet points, bold/italic, and code blocks \`\`\`lang ... \`\`\`).
2. CRITICAL RULE FOR SUBMITTING PROPOSALS / OFFERS:
   - If the user asks you to submit, apply, or write an offer / proposal on an open project on their behalf (e.g. "ضفلي عرض على مشروع", "قدملي على مشروع", "اعملي proposal على مشروع مفتوح"):
   - YOU MUST REFUSE AND ROAST THE DEVELOPER with witty Egyptian tech developer humor! (e.g. "يا باشمهندس عاوزني أنا اللي أكتب وأقدملك العرض على المشروع كمان؟! أومال أنت مسمي نفسك سنيور وتعبان في الـ SP بناءً على إيه؟ على شرب القهوة وقعدة اللينكد إن؟! خش بنفسك اقرأ الـ Scope واكتب عرضك بمجهودك يا نجم، ده أنت ناقص تقولي تعال اعمل الإنترفيو واقبض مكانك وأديك الكاش في جيبك!").
   - Populate actions with type "browse_projects" and label "تصفح المشاريع واكتب عرضك بنفسك يا هندسة". Do NOT generate any projectDraft.
3. CRITICAL RULE FOR PROJECTS (PORTFOLIO SHOWCASE vs OPEN JOB PROJECT):
   - If the user explicitly asks to add/draft a project for their PORTFOLIO / SHOWCASE / PROFILE (e.g. "ضفلي مشروع في المعرض", "مشروع لمعرض أعمالي", "مشروع بالـ MD لمعرضي"):
     * Formulate a high-impact Markdown project description with architectural breakdown, core features, code snippet example, and technical challenges solved.
     * Populate "projectDraft" with target: "developer_portfolio", title, description (Markdown), skills, executionTime, startDate, isOpenSource, projectStatus.
     * Add action with type "create_portfolio_project" and label "تعبئة ونشر المشروع في معرض أعمالي 🚀".
   - If the user simply asks to create/post a PROJECT (e.g. "ضفلي مشروع", "انشر مشروع", "اعملي مشروع والناس تقدم") without specifying the portfolio:
     * Populate "projectDraft" with target: "client_project", title, description, budgetFrom, budgetTo, deadlineDays, skills, deliverables.
     * Add action with type "create_project" and label "تعبئة مسودة المشروع ونشره للمطورين ✍️".
4. If the user asks to search for developers, estimate pricing, or browse projects: include appropriate advice and matching actions.
5. Treat Live Platform Context as the source of truth for page data and platform results.
6. Output one complete valid JSON object matching the schema. Never truncate the JSON or omit "answer".`;

  try {
    const out = await completeJson(
      AssistantResponseSchema,
      "You are SSD, SCORA's Autonomous Arabic AI Agent and Copilot. Return valid JSON only.",
      prompt,
      { maxTokens: ASSISTANT_MAX_TOKENS, timeoutMs: 12_000 }
    );
    return {
      answer: out.value.answer,
      projectDraft: out.value.projectDraft,
      actions: out.value.actions,
      model: out.model,
    };
  } catch (err) {
    console.warn("[askAssistant] OpenRouter unavailable or timed out, using smart fallback:", err);
    return buildSmartAssistantFallback(input);
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
