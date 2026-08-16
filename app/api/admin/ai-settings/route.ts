import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { openRouterConfig } from "@/lib/openrouter";

export interface FreeModelItem {
  id: string;
  name: string;
  context_length?: number;
  provider?: string;
  tag?: string;
  speed?: string;
}

export const CURATED_GOOGLE_MODELS: FreeModelItem[] = [
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    provider: "Google AI",
    tag: "New",
    speed: "لحظي (~140ms)",
    context_length: 1048576,
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    provider: "Google AI",
    tag: "Preview",
    speed: "متقدم (~380ms)",
    context_length: 2097152,
  },
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "Google AI",
    tag: "Stable",
    speed: "لحظي (~150ms)",
    context_length: 1048576,
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "Google AI",
    tag: "Stable",
    speed: "سريع (~180ms)",
    context_length: 1048576,
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    provider: "Google AI",
    tag: "Stable",
    speed: "فائق الخفة (~90ms)",
    context_length: 1048576,
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google AI",
    tag: "Stable",
    speed: "دقيق (~450ms)",
    context_length: 2097152,
  },
];

export const CURATED_OPENROUTER_FREE_MODELS: FreeModelItem[] = [
  {
    id: "openrouter/free",
    name: "OpenRouter Free Router",
    provider: "OpenRouter",
    tag: "توجيه تلقائي",
    speed: "أعلى استقرار",
    context_length: 200000,
  },
  {
    id: "google/gemini-2.0-flash-exp:free",
    name: "Gemini 2.0 Flash",
    provider: "Google AI",
    tag: "Free",
    speed: "لحظي (~200ms)",
    context_length: 1048576,
  },
  {
    id: "deepseek/deepseek-r1:free",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    tag: "Free",
    speed: "دقيق (~600ms)",
    context_length: 128000,
  },
  {
    id: "deepseek/deepseek-chat:free",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    tag: "Free",
    speed: "سريع (~350ms)",
    context_length: 128000,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct:free",
    name: "Llama 3.3 70B",
    provider: "Meta AI",
    tag: "Free",
    speed: "سريع (~400ms)",
    context_length: 131072,
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct:free",
    name: "Qwen 2.5 Coder 32B",
    provider: "Alibaba Cloud",
    tag: "Free",
    speed: "سريع (~350ms)",
    context_length: 131072,
  },
  {
    id: "google/gemma-2-9b-it:free",
    name: "Gemma 2 9B",
    provider: "Google AI",
    tag: "Free",
    speed: "فائق السرعة (~250ms)",
    context_length: 8192,
  },
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct:free",
    name: "NVIDIA Nemotron 70B",
    provider: "NVIDIA",
    tag: "Free",
    speed: "سريع (~450ms)",
    context_length: 131072,
  },
  {
    id: "mistralai/mistral-7b-instruct:free",
    name: "Mistral 7B",
    provider: "Mistral AI",
    tag: "Free",
    speed: "لحظي (~200ms)",
    context_length: 32768,
  },
];

let cachedOpenRouterModels: FreeModelItem[] | null = null;
let lastFetchTime = 0;

async function fetchLiveFreeModels(): Promise<FreeModelItem[]> {
  const now = Date.now();
  if (cachedOpenRouterModels && now - lastFetchTime < 5 * 60 * 1000) {
    return cachedOpenRouterModels;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return CURATED_OPENROUTER_FREE_MODELS;

    const data = await res.json();
    if (!Array.isArray(data?.data)) return CURATED_OPENROUTER_FREE_MODELS;

    const liveFree = data.data.filter(
      (m: { id: string; pricing?: { prompt?: string } }) =>
        m.id === "openrouter/free" || m.id.endsWith(":free") || m.pricing?.prompt === "0"
    );

    if (liveFree.length === 0) return CURATED_OPENROUTER_FREE_MODELS;

    const map = new Map<string, FreeModelItem>();

    for (const c of CURATED_OPENROUTER_FREE_MODELS) {
      map.set(c.id, c);
    }

    for (const m of liveFree) {
      if (!map.has(m.id)) {
        let provider = "OpenRouter";
        let tag = "Free";
        const speed = "~400ms";

        if (m.id.startsWith("meta-llama/")) {
          provider = "Meta AI";
        } else if (m.id.startsWith("deepseek/")) {
          provider = "DeepSeek";
        } else if (m.id.startsWith("google/")) {
          provider = "Google AI";
        } else if (m.id.startsWith("qwen/")) {
          provider = "Qwen";
        } else if (m.id.startsWith("nvidia/")) {
          provider = "NVIDIA";
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

    cachedOpenRouterModels = result;
    lastFetchTime = now;
    return result;
  } catch {
    return CURATED_OPENROUTER_FREE_MODELS;
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
    provider: c.provider,
    model: c.model,
    siteUrl: c.siteUrl,
    siteTitle: c.siteTitle,
    hasApiKey: c.hasStoredKey,
    // Google details
    googleModel: c.googleModel,
    hasGoogleKey: c.hasGoogleKey,
    curatedGoogleModels: CURATED_GOOGLE_MODELS,
    // OpenRouter details
    openRouterModel: c.openRouterModel,
    hasOpenRouterKey: c.hasOpenRouterKey,
    availableFreeModels,
  });
}
