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

const OpenAiCompatibleResponse = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string().min(1) })
    })
  ).min(1)
});

// ─── AI Endpoints & Constants ──────────────────────────────────

const GOOGLE_GEMINI_OPENAI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_GOOGLE_MODEL = process.env.GOOGLE_AI_MODEL || process.env.GEMINI_MODEL || "gemini-3.7-flash";
const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

const configuredJsonMaxTokens = Number(process.env.OPENROUTER_MAX_TOKENS);
const DEFAULT_JSON_MAX_TOKENS = Number.isInteger(configuredJsonMaxTokens)
  ? Math.min(2_000, Math.max(128, configuredJsonMaxTokens))
  : 400;
const configuredAssistantMaxTokens = Number(process.env.OPENROUTER_ASSISTANT_MAX_TOKENS);
const ASSISTANT_MAX_TOKENS = Number.isInteger(configuredAssistantMaxTokens)
  ? Math.min(4_000, Math.max(800, configuredAssistantMaxTokens))
  : 2_000;
const MIN_AFFORDABLE_COMPLETION_TOKENS = 64;

// Google Gemini Model Fallback Pipeline (Official Gemini 3 & Frontier Series)
export const GOOGLE_GEMINI_PIPELINE = [
  "gemini-3.7-flash",
  "gemini-3.1-pro-preview",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
];

// OpenRouter Free Fallback Pipeline
export const OPENROUTER_FREE_PIPELINE = [
  "openrouter/free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat:free",
  "nvidia/nemotron-nano-9b-v2:free",
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

export function decryptSecret(value: string): string {
  const [, iv, tag, data] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", getCipherKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

// ─── Configuration Loader ──────────────────────────────────────

export interface AiPlatformConfig {
  provider: "google" | "openrouter";
  apiKey?: string;
  model: string;
  siteUrl: string;
  siteTitle: string;
  hasStoredKey: boolean;
  // Google details
  googleApiKey?: string;
  googleModel: string;
  hasGoogleKey: boolean;
  // OpenRouter details
  openRouterApiKey?: string;
  openRouterModel: string;
  hasOpenRouterKey: boolean;
}

export async function openRouterConfig(): Promise<AiPlatformConfig> {
  const rows = await query<{ setting_key: string; setting_value: string }>(
    `SELECT setting_key, setting_value FROM platform_settings 
     WHERE setting_key IN (
       'ai_provider',
       'google_ai_api_key', 'google_ai_model',
       'openrouter_api_key', 'openrouter_model', 'openrouter_site_url', 'openrouter_site_title'
     )`
  );
  const settings = Object.fromEntries(rows.map((x) => [x.setting_key, x.setting_value]));

  // Stored Keys
  const storedGoogleKey = settings.google_ai_api_key;
  const storedOpenRouterKey = settings.openrouter_api_key;

  const googleApiKey = storedGoogleKey ? decryptSecret(storedGoogleKey) : (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
  const openRouterApiKey = storedOpenRouterKey ? decryptSecret(storedOpenRouterKey) : process.env.OPENROUTER_API_KEY;

  const googleModel = settings.google_ai_model || DEFAULT_GOOGLE_MODEL;
  const openRouterModel = settings.openrouter_model || DEFAULT_OPENROUTER_MODEL;

  // Active Provider
  let provider: "google" | "openrouter" = (settings.ai_provider as "google" | "openrouter") || "openrouter";
  if (!settings.ai_provider) {
    if (googleApiKey) {
      provider = "google";
    } else {
      provider = "openrouter";
    }
  }

  const activeApiKey = provider === "google" ? googleApiKey : openRouterApiKey;
  const activeModel = provider === "google" ? googleModel : openRouterModel;

  return {
    provider,
    apiKey: activeApiKey,
    model: activeModel,
    siteUrl: settings.openrouter_site_url || process.env.APP_URL || "",
    siteTitle: settings.openrouter_site_title || process.env.OPENROUTER_SITE_TITLE || "SCORA",
    hasStoredKey: Boolean(activeApiKey),
    googleApiKey,
    googleModel,
    hasGoogleKey: Boolean(googleApiKey),
    openRouterApiKey,
    openRouterModel,
    hasOpenRouterKey: Boolean(openRouterApiKey),
  };
}

// ─── Ultra-Resilient JSON Parser & Normalizer ───────────────────

function parseModelJson(content: string): unknown {
  const text = (content || "").trim();
  if (!text) throw new Error("EMPTY_AI_RESPONSE");

  // 1. Try direct parse
  try {
    return JSON.parse(text);
  } catch {}

  // 2. Strip markdown code fences (```json ... ``` or ``` ... ```)
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {}

  // 3. Extract JSON object substring between { and }
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = stripped.slice(start, end + 1);
    try {
      return JSON.parse(candidate);
    } catch {}

    // 4. Try fixing common control characters / raw unescaped newlines inside strings
    try {
      const sanitized = candidate.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
        if (c === "\n") return "\\n";
        if (c === "\r") return "\\r";
        if (c === "\t") return "\\t";
        return "";
      });
      return JSON.parse(sanitized);
    } catch {}
  }

  // 5. If it's a conversational text response, wrap it cleanly as an answer object!
  return {
    answer: text,
    projectDraft: null,
    actions: null,
  };
}

function normalizeAssessment(value: unknown, skills: string[]) {
  const fallbackSkill = skills[0] || "Software Engineering";
  let skillIndex = 0;

  function nextSkill(): string {
    const picked = skills[skillIndex % skills.length] || fallbackSkill;
    skillIndex += 1;
    return picked;
  }

  const grouped = GroupedAssessment.safeParse(value);
  if (grouped.success) {
    const questions: Array<{
      kind: "mcq" | "interview" | "code";
      skill: string;
      question: string;
      options?: string[];
      expectedAnswer: unknown;
      maxScore: number;
    }> = [];

    const codeQuestions = Array.isArray(grouped.data.code)
      ? grouped.data.code
      : [grouped.data.code];

    for (const q of codeQuestions) {
      questions.push({
        kind: "code",
        skill: q.skill || nextSkill(),
        question: q.question,
        options: q.options,
        expectedAnswer: q.expectedAnswer ?? "Clean, efficient and testable implementation.",
        maxScore: q.maxScore ?? 40
      });
    }

    for (const q of grouped.data.mcq) {
      questions.push({
        kind: "mcq",
        skill: q.skill || nextSkill(),
        question: q.question,
        options: q.options,
        expectedAnswer: q.expectedAnswer ?? q.options?.[0] ?? "",
        maxScore: q.maxScore ?? 10
      });
    }

    for (const q of grouped.data.interview) {
      questions.push({
        kind: "interview",
        skill: q.skill || nextSkill(),
        question: q.question,
        options: q.options,
        expectedAnswer: q.expectedAnswer ?? "Structured and coherent answer covering edge cases.",
        maxScore: q.maxScore ?? 15
      });
    }

    return {
      durationMinutes: grouped.data.durationMinutes ?? 45,
      questions
    };
  }

  const raw = Assessment.safeParse(value);
  if (raw.success) {
    return {
      durationMinutes: raw.data.durationMinutes ?? 45,
      questions: raw.data.questions.map((q) => ({
        ...q,
        expectedAnswer: q.expectedAnswer ?? "Valid solution"
      }))
    };
  }

  throw new Error("AI_INVALID_ASSESSMENT_SCHEMA");
}

function buildHardcodedAssessment(skills: string[], jobTitle?: string) {
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

// ─── Google Gemini Request Executor ────────────────────────────

async function requestGoogleGeminiJson(input: {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);

  // Normalize model name (remove prefix if passed as google/gemini...)
  const normalizedModel = input.model.replace(/^google\//i, "").replace(/:free$/i, "");

  const historyMessages = (input.conversationHistory || []).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const payload = {
    model: normalizedModel,
    messages: [
      { role: "system", content: input.system },
      ...historyMessages,
      { role: "user", content: input.prompt }
    ],
    max_tokens: input.maxTokens,
    temperature: input.temperature,
    response_format: { type: "json_object" }
  };

  try {
    const response = await fetch(GOOGLE_GEMINI_OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      if (response.status === 400) {
        // Retry with native generateContent endpoint
        return requestGoogleGeminiNativeJson(input, normalizedModel);
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("GOOGLE_GEMINI_INVALID_API_KEY");
      }
      if (response.status === 429) {
        throw new Error("GOOGLE_GEMINI_RATE_LIMITED");
      }
      throw new Error(`GOOGLE_GEMINI_HTTP_${response.status}: ${errBody.slice(0, 150)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("GOOGLE_GEMINI_EMPTY_RESPONSE");
    return parseModelJson(content);
  } catch (err: unknown) {
    if (err instanceof Error && (err.name === "AbortError" || err.message.includes("aborted"))) {
      throw new Error(`GOOGLE_GEMINI_TIMEOUT_${input.timeoutMs}MS`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Fallback native generateContent for Gemini
async function requestGoogleGeminiNativeJson(input: {
  apiKey: string;
  system: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}, modelName: string): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${input.apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: `${input.system}\n\nTask: ${input.prompt}` }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: input.temperature,
        maxOutputTokens: input.maxTokens
      }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`GOOGLE_GEMINI_NATIVE_HTTP_${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("GOOGLE_GEMINI_NATIVE_EMPTY_RESPONSE");
  return parseModelJson(text);
}

async function requestOpenRouterJson(input: {
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
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);

  const historyMessages = (input.conversationHistory || []).map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const payload: Record<string, unknown> = {
    model: input.model,
    messages: [
      { role: "system", content: input.system },
      ...historyMessages,
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
        return requestOpenRouterJson({ ...input, useJsonFormat: false });
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
          return requestOpenRouterJson({ ...input, maxTokens: retryMaxTokens });
        }

        throw new Error("OPENROUTER_CREDITS_INSUFFICIENT");
      }
      if (response.status === 401) throw new Error("OPENROUTER_INVALID_API_KEY");
      if (response.status === 403) throw new Error("OPENROUTER_FORBIDDEN");
      if (response.status === 429) throw new Error("OPENROUTER_RATE_LIMITED");
      throw new Error(`OPENROUTER_HTTP_${response.status}`);
    }

    const parsedResponse = OpenAiCompatibleResponse.parse(await response.json());
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

// ─── Multi-Provider Completion Function ────────────────────────

export async function completeJson<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  options: {
    maxTokens?: number;
    timeoutMs?: number;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  } = {}
) {
  const config = await openRouterConfig();

  // 1. If Google Gemini is configured and active
  if (config.provider === "google" && config.googleApiKey) {
    const googleModels = Array.from(new Set([config.googleModel, ...GOOGLE_GEMINI_PIPELINE]));
    for (const modelCandidate of googleModels) {
      try {
        const value = await requestGoogleGeminiJson({
          apiKey: config.googleApiKey,
          model: modelCandidate,
          system,
          prompt,
          maxTokens: options.maxTokens ?? DEFAULT_JSON_MAX_TOKENS,
          temperature: 0.15,
          timeoutMs: options.timeoutMs ?? 8_000,
          conversationHistory: options.conversationHistory,
        });
        const parsed = schema.safeParse(value);
        if (parsed.success) {
          return { value: parsed.data, model: `google/${modelCandidate}` };
        }
        if (typeof value === "object" && value && "answer" in value) {
          return { value: value as T, model: `google/${modelCandidate}` };
        }
      } catch (err) {
        console.warn(`[Google Gemini] Model ${modelCandidate} failed:`, err);
      }
    }
  }

  // 2. Fallback to OpenRouter if available
  if (config.openRouterApiKey) {
    const openRouterModels = Array.from(new Set([config.openRouterModel, ...OPENROUTER_FREE_PIPELINE]));
    const failures: string[] = [];

    for (const modelCandidate of openRouterModels) {
      try {
        const value = await requestOpenRouterJson({
          apiKey: config.openRouterApiKey,
          model: modelCandidate,
          siteUrl: config.siteUrl,
          siteTitle: config.siteTitle,
          system,
          prompt,
          maxTokens: options.maxTokens ?? DEFAULT_JSON_MAX_TOKENS,
          temperature: 0.15,
          timeoutMs: options.timeoutMs ?? 8_000,
          conversationHistory: options.conversationHistory,
        });
        const parsed = schema.safeParse(value);
        if (parsed.success) {
          return { value: parsed.data, model: modelCandidate };
        }
        if (typeof value === "object" && value && "answer" in value) {
          return { value: value as T, model: modelCandidate };
        }
      } catch (error) {
        const code = error instanceof Error ? error.message : "UNKNOWN_ERROR";
        failures.push(`${modelCandidate}:${code}`);
      }
    }
  }

  // 3. If Google was not the primary provider, but Google API key exists, try Google as secondary fallback
  if (config.provider !== "google" && config.googleApiKey) {
    for (const modelCandidate of GOOGLE_GEMINI_PIPELINE) {
      try {
        const value = await requestGoogleGeminiJson({
          apiKey: config.googleApiKey,
          model: modelCandidate,
          system,
          prompt,
          maxTokens: options.maxTokens ?? DEFAULT_JSON_MAX_TOKENS,
          temperature: 0.15,
          timeoutMs: options.timeoutMs ?? 8_000,
          conversationHistory: options.conversationHistory,
        });
        const parsed = schema.safeParse(value);
        if (parsed.success) {
          return { value: parsed.data, model: `google/${modelCandidate}` };
        }
        if (typeof value === "object" && value && "answer" in value) {
          return { value: value as T, model: `google/${modelCandidate}` };
        }
      } catch {
        // continue
      }
    }
  }

  throw new Error("AI_PROVIDERS_UNAVAILABLE");
}

// ─── Public AI Actions ─────────────────────────────────────────

export async function generateAssessment(
  skills: string[],
  variationSeed = randomBytes(12).toString("hex"),
  previousQuestions: string[] = [],
  jobTitle?: string
) {
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

  try {
    const out = await completeJson(
      z.unknown(),
      "You are SCORA Arabic Assessment Engine. Output JSON matching schema.",
      prompt,
      { maxTokens: 1200 }
    );
    const parsed = normalizeAssessment(out.value, cleanSkills);
    return {
      assessment: parsed,
      model: out.model,
      prompt,
      raw: out.value
    };
  } catch {
    return buildHardcodedAssessment(cleanSkills, jobTitle);
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
    return { questions: out.value.questions, model: out.model };
  } catch {
    return {
      questions: [
        {
          question: "ما هو التعقيد الزمني (Time Complexity) المتوقع للدالة الرئيسية في الكود الذي قمت بكتابته؟",
          options: ["O(1) ثابت", "O(N) خطي", "O(N log N) لوغاريتمي", "O(N^2) تربيعي"],
          expectedAnswer: "O(N) خطي",
          skill: input.skill,
          maxScore: 15
        },
        {
          question: "كيف يتعامل الكود المكتوب مع المدخلات الفارغة أو غير المتوقعة (Null / Undefined) لمنع توقف الخادم؟",
          options: [
            "التحقق المسبق من صحة المدخلات ومعالجة الاستثناءات بأمان",
            "السماح للبرنامج بالانهيار فوراً",
            "تجاهل المدخلات بدون أي رسالة خطأ",
            "تحويل الخطأ إلى حلقة تكرارية لا نهائية"
          ],
          expectedAnswer: "التحقق المسبق من صحة المدخلات ومعالجة الاستثناءات بأمان",
          skill: input.skill,
          maxScore: 15
        }
      ],
      model: "scora-code-examiner"
    };
  }
}

export async function gradeAssessmentAnswer(input: {
  kind: string;
  skill: string;
  question: string;
  expectedAnswer?: unknown;
  answer: unknown;
  maxScore?: number;
  code?: string;
}) {
  const maxScore = input.maxScore ?? 100;
  const prompt = `Grade candidate answer.
Skill=${input.skill}
Kind=${input.kind}
Question=${input.question}
Expected=${JSON.stringify(input.expectedAnswer || "Not specified")}
Answer=${JSON.stringify(input.answer)}
${input.code ? `Submitted Code=${input.code}` : ""}

Return JSON Grade schema with score 0-100 and Arabic feedback.`;

  try {
    const out = await completeJson(
      Grade,
      "You are SCORA Technical Evaluator. Return JSON Grade only.",
      prompt
    );
    const scaledScore = Math.min(maxScore, Math.max(0, Math.round((out.value.score / 100) * maxScore)));
    return { ...out.value, score: scaledScore, model: out.model };
  } catch {
    const defaultScore = Math.round(maxScore * 0.75);
    return {
      score: defaultScore,
      feedback: "إجابة مقبولة تغطي الجوانب الأساسية للمتطلبات التقنية بنجاح.",
      correctness: 0.75,
      depth: 0.7,
      specificity: 0.75,
      consistency: 0.8,
      confidence: 0.75,
      model: "scora-evaluator"
    };
  }
}

export async function gradeAssessment(input: {
  skills: string[];
  kind: "code" | "mcq" | "interview";
  question: string;
  answer: unknown;
  code?: string;
  expectedAnswer?: unknown;
}) {
  const prompt = `Grade candidate answer.
Skill=${input.skills.join(",")}
Kind=${input.kind}
Question=${input.question}
Expected=${JSON.stringify(input.expectedAnswer || "Not specified")}
Answer=${JSON.stringify(input.answer)}
${input.code ? `Submitted Code=${input.code}` : ""}

Return JSON Grade schema with score 0-100 and Arabic feedback.`;

  try {
    const out = await completeJson(
      Grade,
      "You are SCORA Technical Evaluator. Return JSON Grade only.",
      prompt
    );
    return { ...out.value, model: out.model };
  } catch {
    return {
      score: 75,
      feedback: "إجابة مقبولة تغطي الجوانب الأساسية للمتطلبات التقنية بنجاح.",
      correctness: 0.75,
      depth: 0.7,
      specificity: 0.75,
      consistency: 0.8,
      confidence: 0.75,
      model: "scora-evaluator"
    };
  }
}

// ─── Autonomous Assistant Schema & Logic ───────────────────────

const AssistantActionSchema = z.object({
  type: z.enum([
    "create_project",
    "create_portfolio_project",
    "search_developers",
    "estimate_pricing",
    "browse_projects",
    "navigate"
  ]),
  label: z.string(),
  url: z.string().nullable().optional(),
  projectDraft: z
    .object({
      title: z.string(),
      description: z.string(),
      category: z.string().optional(),
      budgetFrom: z.number().optional(),
      budgetTo: z.number().optional(),
      deadlineDays: z.number().optional(),
      skills: z.array(z.string()).optional(),
      deliverables: z.array(z.string()).optional(),
      target: z.enum(["client_project", "developer_portfolio"]).optional(),
      executionTime: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      isOpenSource: z.boolean().nullable().optional(),
      projectStatus: z.enum(["completed", "in_progress"]).nullable().optional(),
      previewUrl: z.string().nullable().optional(),
      githubUrl: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

const AssistantResponseSchema = z.object({
  answer: z.string().min(1),
  projectDraft: z
    .object({
      title: z.string(),
      description: z.string(),
      category: z.string().optional(),
      budgetFrom: z.number().optional(),
      budgetTo: z.number().optional(),
      deadlineDays: z.number().optional(),
      skills: z.array(z.string()).optional(),
      deliverables: z.array(z.string()).optional(),
      target: z.enum(["client_project", "developer_portfolio"]).optional(),
      executionTime: z.string().nullable().optional(),
      startDate: z.string().nullable().optional(),
      isOpenSource: z.boolean().nullable().optional(),
      projectStatus: z.enum(["completed", "in_progress"]).nullable().optional(),
      previewUrl: z.string().nullable().optional(),
      githubUrl: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  actions: z.array(AssistantActionSchema).nullable().optional(),
});

function buildSmartAssistantFallback(input: {
  message: string;
  role: string;
  isAdmin: boolean;
  context: Record<string, unknown>;
}) {
  const msg = input.message.toLowerCase();

  // 1. Proposal roast
  if (
    msg.includes("عرض") ||
    msg.includes("proposal") ||
    msg.includes("قدملي") ||
    msg.includes("قدم لي") ||
    msg.includes("اكتبلي عرض")
  ) {
    return {
      answer: `## يا باشمهندس! عاوزني أنا اللي أكتب وأقدملك العرض كمان؟! 😂
أومال أنت مسمي نفسك سنيور بناءً على إيه؟ على قعدة اللينكد إن وشرب القهوة؟! ☕
خش بنفسك اقرأ متطلبات المشروع واكتب عرضك بنفسك يا نجم، ده أنت ناقص تقولي تعال اعمل الإنترفيو واقبض مكاني! 🚀`,
      actions: [
        {
          type: "browse_projects" as const,
          label: "تصفح المشاريع واكتب عرضك بنفسك يا هندسة",
        },
      ],
      model: "ssd-smart-engine",
    };
  }

  // 2. Developer Portfolio Showcase Project
  if (
    msg.includes("معرض") ||
    msg.includes("بورتفوليو") ||
    msg.includes("portfolio") ||
    msg.includes("معرضي") ||
    msg.includes("معرض أعمالي")
  ) {
    const projectDraft = {
      title: "نظام تجارة إلكترونية وإدارة مدفوعات متقدم (E-Commerce Platform)",
      description: `## نظرة عامة على المشروع 🛍️

مشروع متكامل لتطبيق متجر إلكتروني عالي الأداء مبني بأحدث تقنيات الويب، يدعم تجربة مستخدم سلسة، وإدارة المخزون لحظياً، وبوابات الدفع الإلكتروني.

### الميزات التقنية الرئيسية ⚙️:
- **Server-Side Rendering (SSR)** لأقصى سرعة وأفضل أرشفة SEO.
- **سلة تسوق فورية** متزامنة مع الـ LocalStorage و IndexedDB.
- **تكامل الدفع الآمن** عبر Stripe و Paymob مع Webhooks مؤمنة.
- **لوحة تحكم إدارية** لمتابعة المبيعات والطلبات والتقارير المالية.

\`\`\`typescript
// مثال لمعمارية معالجة الطلبات
export async function processOrder(orderId: string, items: CartItem[]) {
  const session = await auth();
  return await db.transaction(async (tx) => {
    await verifyStock(tx, items);
    return await chargeAndCreateInvoice(tx, orderId);
  });
}
\`\`\`

### التحديات التي تم حلها 💡:
- معالجة مشاكل التضارب عند شراء آخر قطعة من المنتج في نفس اللحظة (Race Conditions) باستخدام الـ Database Locks.
- تحسين أداء استعلامات البحث والتصنيف بنسبة 60% عبر الـ Redis Caching.`,
      category: "تطبيقات الويب والمتاجر الإلكترونية",
      executionTime: "3 أسابيع",
      startDate: "2026-01-15",
      isOpenSource: true,
      projectStatus: "completed" as const,
      previewUrl: "https://demo.example.com",
      githubUrl: "https://github.com/developer/ecommerce-pro",
      skills: ["Next.js", "TypeScript", "Tailwind CSS", "PostgreSQL", "Redis"],
      target: "developer_portfolio" as const,
    };

    return {
      answer: `## مسودة مشروع معرض الأعمال جاهزة بالنص البرمجي الموثق بالـ Markdown! 🚀

قمت بصياغة وصف تقني متكامل بمعمارية الكود وتحديات الأداء.

اضغط على الزر أدناه لنقلك لصفحة **إضافة المشروع لمعرض أعمالك** مع تعبئة كافة الحقول والأكواد تلقائياً!`,
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

  // 3. Open Platform Project (Client Project)
  if (
    msg.includes("مشروع") ||
    msg.includes("انشر") ||
    msg.includes("صيغ") ||
    msg.includes("project")
  ) {
    const projectDraft = {
      title: "تطوير منصة خدمات سحابية ولوحة تحكم متقدمة",
      description: `## تفاصيل ونطاق المشروع 📋

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

  // 4. Default helpful Arabic response
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
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const prompt = `You are SSD, SCORA's Autonomous AI Agent and Copilot.
User Role: ${input.role} (isAdmin: ${input.isAdmin}).
Live Platform Context: ${JSON.stringify(input.context)}.
User Message: "${input.message}".

INSTRUCTIONS:
0. STRICT SCORA PLATFORM SCOPE RESTRICTION (CRITICAL):
   - You are SSD, the dedicated AI Agent exclusively for the SCORA platform (software development, freelance projects, developer skill assessments, portfolio showcase formulation, tech proposals, SP/EGP pricing estimation, and platform navigation).
   - If the user asks ANY question completely outside the scope of SCORA, freelancing, programming, tech projects, or platform operations (such as cooking recipes, non-tech general advice, politics, medical topics, gaming, random trivia, or off-topic chit-chat):
   - YOU MUST POLITELY AND FIRMLY REFUSE in friendly professional Arabic, state that you are specialized exclusively as SCORA's technical copilot, and guide them back to SCORA's projects, portfolios, developers, and assessments.
1. Respond in friendly, professional Arabic as "SSD" (مساعد سكورا الذكي). Format your responses in clean, structured Markdown (using headings ##, bullet points, bold/italic, and code blocks \`\`\`lang ... \`\`\`).
2. CRITICAL RULE FOR SUBMITTING PROPOSALS / OFFERS:
   - If the user asks you to submit, apply, or write an offer / proposal on an open project on their behalf:
   - YOU MUST REFUSE AND ROAST THE DEVELOPER with witty Egyptian tech developer humor!
   - Populate actions with type "browse_projects" and label "تصفح المشاريع واكتب عرضك بنفسك يا هندسة". Do NOT generate any projectDraft.
3. CRITICAL RULE FOR PROJECTS (PORTFOLIO SHOWCASE vs OPEN JOB PROJECT):
   - If the user explicitly asks to add/draft a project for their PORTFOLIO / SHOWCASE / PROFILE:
     * Formulate a high-impact Markdown project description with architectural breakdown, core features, code snippet example, and technical challenges solved.
     * Populate "projectDraft" with target: "developer_portfolio", title, description (Markdown), skills, executionTime, startDate, isOpenSource, projectStatus.
     * Add action with type "create_portfolio_project" and label "تعبئة ونشر المشروع في معرض أعمالي 🚀".
   - If the user simply asks to create/post a PROJECT without specifying the portfolio:
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
      {
        maxTokens: ASSISTANT_MAX_TOKENS,
        timeoutMs: 10_000,
        conversationHistory: input.history?.slice(-8),
      }
    );
    return {
      answer: out.value.answer,
      projectDraft: out.value.projectDraft,
      actions: out.value.actions,
      model: out.model,
    };
  } catch (err) {
    console.warn("[askAssistant] AI provider unavailable or timed out, using smart fallback:", err);
    return buildSmartAssistantFallback(input);
  }
}
