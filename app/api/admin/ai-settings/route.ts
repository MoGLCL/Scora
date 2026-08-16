import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { openRouterConfig } from "@/lib/openrouter";

interface FreeModelItem {
  id: string;
  name: string;
  context_length?: number;
  provider?: string;
  tag?: string;
  speed?: string;
}

let cachedModels: FreeModelItem[] | null = null;
let lastFetchTime = 0;

const CURATED_FREE_MODELS: FreeModelItem[] = [
  {
    id: "openrouter/free",
    name: "OpenRouter Free Router (التوجيه التلقائي للموديلات المجانية)",
    provider: "OpenRouter",
    tag: "موصى به دائمًا ",
    speed: "أعلى استقرار ووصول",
    context_length: 200000,
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1 Reasoning (تفكير واستنتاج فائق مجاني)",
    provider: "DeepSeek",
    tag: "ذكاء واستنتاج عميق ",
    speed: "دقيق (~600ms)",
    context_length: 128000,
  },
  {
    id: "deepseek/deepseek-chat:free",
    name: "DeepSeek V3 Chat (محادثة وبرمجة ذكية مجاناً)",
    provider: "DeepSeek",
    tag: "شائع ومتقدم ",
    speed: "سريع (~350ms)",
    context_length: 128000,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Meta Llama 3.3 70B Instruct (النموذج العملاق مجاناً)",
    provider: "Meta AI",
    tag: "دقة استثنائية ",
    speed: "سريع (~400ms)",
    context_length: 131072,
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Google Gemini 2.0 Flash (فائق السرعة من جوجل)",
    provider: "Google AI",
    tag: "سرعة فائقة ",
    speed: "لحظي (~200ms)",
    context_length: 1048576,
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder 32B (متخصص الأكواد البرمجية)",
    provider: "Alibaba Cloud",
    tag: "أكواد برمجية ",
    speed: "عالي الكفاءة (~350ms)",
    context_length: 131072,
  },
  {
    id: "google/gemma-2-9b-it:free",
    name: "Google Gemma 2 9B Instruct (خفيف ودقيق)",
    provider: "Google AI",
    tag: "مجاني من جوجل",
    speed: "فائق السرعة (~250ms)",
    context_length: 8192,
  },
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct:free",
    name: "NVIDIA Nemotron 70B (إنفيديا للاستنتاج)",
    provider: "NVIDIA",
    tag: "إنفيديا متقدم",
    speed: "سريع (~450ms)",
    context_length: 131072,
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B Instruct (خفيف ومتوازن)",
    provider: "Mistral AI",
    tag: "خفيف وسريع",
    speed: "لحظي (~200ms)",
    context_length: 32768,
  },
  {
    id: "cohere/north-mini-code:free",
    name: "Cohere North Mini Code (متخصص كود مجاني)",
    provider: "Cohere",
    tag: "كود وتحليل",
    speed: "سريع (~300ms)",
    context_length: 256000,
  },
];

async function fetchLiveFreeModels(): Promise<FreeModelItem[]> {
  const now = Date.now();
  if (cachedModels && now - lastFetchTime < 5 * 60 * 1000) {
    return cachedModels;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return CURATED_FREE_MODELS;

    const data = await res.json();
    if (!Array.isArray(data?.data)) return CURATED_FREE_MODELS;

    const liveFree = data.data.filter(
      (m: { id: string; pricing?: { prompt?: string } }) =>
        m.id === "openrouter/free" || m.id.endsWith(":free") || m.pricing?.prompt === "0"
    );

    if (liveFree.length === 0) return CURATED_FREE_MODELS;

    const map = new Map<string, FreeModelItem>();

    // Put our curated models first with rich Arabic descriptions
    for (const c of CURATED_FREE_MODELS) {
      map.set(c.id, c);
    }

    // Add any extra live free models returned by OpenRouter API
    for (const m of liveFree) {
      if (!map.has(m.id)) {
        let provider = "OpenRouter Free";
        let tag = "مجاني";
        let speed = "~400ms";

        if (m.id.startsWith("meta-llama/")) {
          provider = "Meta AI";
          tag = "Llama مجاني";
        } else if (m.id.startsWith("deepseek/")) {
          provider = "DeepSeek";
          tag = "DeepSeek مجاني";
        } else if (m.id.startsWith("google/")) {
          provider = "Google AI";
          tag = "Google مجاني";
        } else if (m.id.startsWith("qwen/")) {
          provider = "Qwen";
          tag = "كود وبرمجة";
        } else if (m.id.startsWith("nvidia/")) {
          provider = "NVIDIA";
          tag = "NVIDIA مجاني";
        }

        map.set(m.id, {
          id: m.id,
          name: m.name || m.id,
          context_length: m.context_length || 128000,
          provider,
          tag,
          speed,
        });
      }
    }

    const result = Array.from(map.values());
    result.sort((a, b) => (a.id === "openrouter/free" ? -1 : b.id === "openrouter/free" ? 1 : 0));

    cachedModels = result;
    lastFetchTime = now;
    return result;
  } catch {
    return CURATED_FREE_MODELS;
  }
}

export async function GET() {
  const s = await verifySession();
  if (!s?.isAdmin) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const c = await openRouterConfig();
  const availableFreeModels = await fetchLiveFreeModels();

  return NextResponse.json({
    model: c.model || "openrouter/free",
    siteUrl: c.siteUrl,
    siteTitle: c.siteTitle,
    hasApiKey: Boolean(c.apiKey),
    availableFreeModels,
  });
}
