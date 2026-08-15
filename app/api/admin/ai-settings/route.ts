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

async function fetchLiveFreeModels(): Promise<FreeModelItem[]> {
  const now = Date.now();
  if (cachedModels && now - lastFetchTime < 5 * 60 * 1000) {
    return cachedModels;
  }

  const fallbackList: FreeModelItem[] = [
    {
      id: "openrouter/free",
      name: "Free Models Router (التوجيه التلقائي للموديلات المجانية)",
      provider: "OpenRouter",
      tag: "موصى به دائمًا",
      speed: "أعلى استقرار ووصول",
      context_length: 200000
    },
    {
      id: "cohere/north-mini-code:free",
      name: "Cohere North Mini Code (متخصص أكواد مجاني)",
      provider: "Cohere",
      tag: "أكواد برمجية",
      speed: "سريع (~350ms)",
      context_length: 256000
    },
    {
      id: "google/gemma-4-26b-a4b-it:free",
      name: "Google Gemma 4 26B Instruct (مجاني من جوجل)",
      provider: "Google AI",
      tag: "مجاني حديث",
      speed: "عالي الكفاءة (~450ms)",
      context_length: 262144
    },
    {
      id: "google/gemma-4-31b-it:free",
      name: "Google Gemma 4 31B (مجاني متقدم)",
      provider: "Google AI",
      tag: "أداء متقدم",
      speed: "دقيق (~550ms)",
      context_length: 262144
    },
    {
      id: "nvidia/nemotron-3.5-lightning:free",
      name: "NVIDIA Nemotron 3.5 Lightning (فائق السرعة)",
      provider: "NVIDIA",
      tag: "فائق السرعة",
      speed: "لحظي (~280ms)",
      context_length: 1000000
    },
    {
      id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      name: "NVIDIA Nemotron 3 Reasoning (تفكير واستنتاج)",
      provider: "NVIDIA",
      tag: "استنتاج ذكي",
      speed: "سريع (~480ms)",
      context_length: 256000
    },
    {
      id: "openai/gpt-oss-20b:free",
      name: "OpenAI GPT OSS 20B (مجاني مفتوح)",
      provider: "OpenAI",
      tag: "مجاني",
      speed: "سريع (~400ms)",
      context_length: 131072
    },
    {
      id: "liquid/lfm-2.5-2.6b:free",
      name: "LiquidAI LFM 2.5 (خفيف ولحظي)",
      provider: "LiquidAI",
      tag: "خفيف",
      speed: "فائق السرعة (~200ms)",
      context_length: 128000
    },
    {
      id: "poolside/laguna-s-2.1:free",
      name: "Poolside Laguna S 2.1 (هندسة وتطوير)",
      provider: "Poolside",
      tag: "مجاني",
      speed: "سريع (~420ms)",
      context_length: 262144
    },
    {
      id: "dots-studio/dots-3-note-preview:free",
      name: "Dots Studio 3 Note Preview (سياق ضخم)",
      provider: "Dots Studio",
      tag: "سياق عريض",
      speed: "سريع (~450ms)",
      context_length: 512000
    }
  ];

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      cache: "no-store",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) return fallbackList;

    const data = await res.json();
    if (!Array.isArray(data?.data)) return fallbackList;

    const liveFree = data.data.filter(
      (m: { id: string; pricing?: { prompt?: string } }) =>
        m.id === "openrouter/free" || m.id.endsWith(":free") || m.pricing?.prompt === "0"
    );

    if (liveFree.length === 0) return fallbackList;

    const mapped: FreeModelItem[] = liveFree.map((m: { id: string; name: string; context_length?: number }) => {
      let provider = "OpenRouter";
      let tag = "مجاني 100%";
      let speed = "سريع";

      if (m.id === "openrouter/free") {
        provider = "OpenRouter";
        tag = "موصى به دائمًا";
        speed = "توجيه تلقائي مستقر";
      } else if (m.id.startsWith("google/")) {
        provider = "Google AI";
        tag = "جوجل مجاني";
        speed = "~400ms";
      } else if (m.id.startsWith("nvidia/")) {
        provider = "NVIDIA";
        tag = "إنفيديا فائق السرعة";
        speed = "~300ms";
      } else if (m.id.startsWith("openai/")) {
        provider = "OpenAI";
        tag = "أوبن إيه آي مجاني";
        speed = "~400ms";
      } else if (m.id.startsWith("cohere/")) {
        provider = "Cohere";
        tag = "متخصص كود";
        speed = "~350ms";
      } else if (m.id.startsWith("poolside/")) {
        provider = "Poolside";
        tag = "مجاني برمجي";
        speed = "~400ms";
      }

      return {
        id: m.id,
        name: m.name || m.id,
        context_length: m.context_length || 128000,
        provider,
        tag,
        speed
      };
    });

    // Ensure openrouter/free is at the top
    mapped.sort((a: FreeModelItem, b: FreeModelItem) => (a.id === "openrouter/free" ? -1 : b.id === "openrouter/free" ? 1 : 0));

    cachedModels = mapped;
    lastFetchTime = now;
    return mapped;
  } catch {
    return fallbackList;
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
    availableFreeModels
  });
}
