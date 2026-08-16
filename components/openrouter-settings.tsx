"use client";

import { useEffect, useState, useMemo } from "react";
import { setOpenRouterSettings, testOpenRouterAiConnection } from "@/lib/actions/settings";
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Key,
  Globe,
  Tag,
  Cpu,
  RefreshCw,
  Sparkles,
  Check,
  Search,
  Code2,
  Brain,
  Rocket,
} from "lucide-react";

interface FreeModelItem {
  id: string;
  name: string;
  context_length?: number;
  provider?: string;
  tag?: string;
  speed?: string;
}

interface OpenRouterSettingsState {
  apiKey: string;
  model: string;
  siteUrl: string;
  siteTitle: string;
  hasApiKey: boolean;
}

interface OpenRouterSettingsProps {
  notify: (message: string, type: "success" | "warn") => void;
}

const DEFAULT_FALLBACK_FREE_MODELS: FreeModelItem[] = [
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

const INITIAL_SETTINGS: OpenRouterSettingsState = {
  apiKey: "",
  model: "openrouter/free",
  siteUrl: "",
  siteTitle: "SCORA",
  hasApiKey: false,
};

export function OpenRouterSettings({ notify }: OpenRouterSettingsProps) {
  const [config, setConfig] = useState(INITIAL_SETTINGS);
  const [freeModels, setFreeModels] = useState<FreeModelItem[]>(DEFAULT_FALLBACK_FREE_MODELS);
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "code" | "reasoning" | "speed">("all");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingModelId, setTestingModelId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency?: number; model?: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/ai-settings", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "تعذر التحميل");
        if (!active) return;

        const loadedModel = data.model || "openrouter/free";
        const modelsList =
          Array.isArray(data.availableFreeModels) && data.availableFreeModels.length > 0
            ? data.availableFreeModels
            : DEFAULT_FALLBACK_FREE_MODELS;

        setFreeModels(modelsList);

        const isStandardFree = modelsList.some((m: FreeModelItem) => m.id === loadedModel);
        setIsCustomModel(!isStandardFree);

        setConfig((current) => ({
          ...current,
          ...data,
          model: loadedModel,
          apiKey: "",
          siteUrl: data.siteUrl || window.location.origin,
        }));
      } catch (error) {
        if (!active) return;
        setMessage({
          text: error instanceof Error ? error.message : "تعذر تحميل إعدادات OpenRouter",
          ok: false,
        });
      }
    }

    void loadSettings();
    return () => {
      active = false;
    };
  }, []);

  const filteredModels = useMemo(() => {
    return freeModels.filter((m) => {
      const matchSearch =
        !searchFilter ||
        `${m.id} ${m.name} ${m.provider || ""} ${m.tag || ""}`
          .toLowerCase()
          .includes(searchFilter.toLowerCase());

      if (!matchSearch) return false;

      if (categoryFilter === "code") {
        return m.id.includes("code") || m.id.includes("coder") || (m.tag && m.tag.includes("كود"));
      }
      if (categoryFilter === "reasoning") {
        return m.id.includes("r1") || m.id.includes("reasoning") || (m.tag && m.tag.includes("استنتاج"));
      }
      if (categoryFilter === "speed") {
        return m.id.includes("flash") || m.id.includes("mini") || (m.speed && m.speed.includes("لحظي"));
      }

      return true;
    });
  }, [freeModels, searchFilter, categoryFilter]);

  async function save(modelOverride?: string) {
    setSaving(true);
    setMessage(null);
    setTestResult(null);
    const modelToSave = modelOverride || config.model;
    try {
      const result = await setOpenRouterSettings({
        ...config,
        model: modelToSave,
      });
      if (!result.ok) {
        setMessage({ text: result.error, ok: false });
        notify(result.error, "warn");
        return;
      }

      setConfig((current) => ({ ...current, model: modelToSave, apiKey: "", hasApiKey: true }));
      setMessage({ text: `تم حفظ وتفعيل النموذج (${modelToSave}) في قاعدة البيانات بنجاح`, ok: true });
      notify("تم حفظ وتفعيل نموذج الذكاء الاصطناعي", "success");
    } finally {
      setSaving(false);
    }
  }

  async function testSpecificModel(modelId: string) {
    setTesting(true);
    setTestingModelId(modelId);
    setTestResult(null);
    try {
      const res = await testOpenRouterAiConnection(modelId);
      if (res.ok) {
        setTestResult({
          ok: true,
          model: res.model,
          message: `تم فحص النموذج (${res.model}) بنجاح في ${res.latencyMs}ms! الرد التجريبي: "${res.reply}"`,
          latency: res.latencyMs,
        });
        notify(`اتصال ناجح بالنموذج (${res.latencyMs}ms)`, "success");
      } else {
        setTestResult({
          ok: false,
          model: modelId,
          message: res.error || "فشل الاتصال بالنموذج",
        });
        notify(res.error, "warn");
      }
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        model: modelId,
        message: err instanceof Error ? err.message : "خطأ غير متوقع أثناء الفحص",
      });
    } finally {
      setTesting(false);
      setTestingModelId(null);
    }
  }

  return (
    <section className="rounded-[32px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-7 shadow-xs font-body" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold border border-[#D1E3D6] shadow-xs">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#05291A]">
                نماذج الذكاء الاصطناعي المجانية (OpenRouter Free AI)
              </h2>
            </div>
            <p className="text-xs text-[#526B5E] mt-1">
              اختر وفعّل نماذج OpenRouter المجانية 100% لتوليد وتصحيح اختبارات وتقييمات المطورين وتشغيل مساعد سكورا الذكي.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#E8FAF0] border border-[#D1E3D6] px-4 py-2 rounded-full text-xs font-black text-[#056B38] shadow-2xs">
          <Sparkles className="w-4 h-4 text-[#056B38]" />
          <span>نماذج مجانية 100% بدون رصيد (Free Tier)</span>
        </div>
      </div>

      {/* Model Selection Grid: 100% Free Interactive Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <label className="text-sm font-black text-[#05291A] flex items-center gap-2">
            <Cpu className="w-4.5 h-4.5 text-[#056B38]" />
            <span>اختر النموذج المعتمد للمنصة:</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomModel(!isCustomModel)}
              className="text-xs text-[#056B38] font-black underline cursor-pointer hover:text-[#005B27]"
            >
              {isCustomModel ? "الرجوع لقائمة الموديلات المجانية" : "إدخال اسم موديل مخصص يدوياً"}
            </button>
          </div>
        </div>

        {!isCustomModel && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#F7FAF8] p-3 rounded-2xl border border-[#D1E3D6]">
            {/* Quick Search in Free Models */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-[#526B5E]" />
              <input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="ابحث في النماذج المجانية (DeepSeek, Llama...)"
                className="h-8.5 w-full rounded-xl border border-[#D1E3D6] pr-8 pl-3 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] bg-white"
              />
            </div>

            {/* Quick Category Filters */}
            <div className="flex flex-wrap gap-1">
              {[
                { key: "all", label: "الكل", icon: Sparkles },
                { key: "code", label: "أكواد وبرمجة", icon: Code2 },
                { key: "reasoning", label: "تفكير واستنتاج (R1)", icon: Brain },
                { key: "speed", label: "فائقة السرعة", icon: Rocket },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategoryFilter(c.key as any)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      categoryFilter === c.key
                        ? "bg-[#056B38] text-white shadow-2xs"
                        : "bg-white text-[#526B5E] hover:bg-[#E8FAF0] border border-[#D1E3D6]"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!isCustomModel ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModels.map((m) => {
              const isSelected = config.model === m.id;
              const isCurrentlyTesting = testing && testingModelId === m.id;
              const isRouter = m.id === "openrouter/free";

              return (
                <div
                  key={m.id}
                  onClick={() => {
                    setConfig((prev) => ({ ...prev, model: m.id }));
                  }}
                  className={`rounded-2xl p-4.5 border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? "border-[#056B38] bg-[#E8FAF0] ring-2 ring-[#056B38]/20 shadow-sm"
                      : "border-[#D1E3D6] bg-white hover:border-[#056B38] hover:bg-[#F7FAF8]"
                  } ${isRouter ? "sm:col-span-2 lg:col-span-3 bg-linear-to-r from-[#E8FAF0] to-white" : ""}`}
                >
                  <div className="space-y-2">
                    {/* Top Row: Provider + Badge */}
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="font-extrabold text-[#526B5E]">{m.provider || "OpenRouter Free"}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-extrabold border text-[10px] ${
                          isRouter
                            ? "bg-[#056B38] text-white border-[#056B38]"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {m.tag || "مجاني 100%"}
                      </span>
                    </div>

                    {/* Model Name */}
                    <div className="text-sm font-black text-[#05291A] flex items-center gap-1.5">
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-neutral-300 shrink-0" />
                      )}
                      <span className="truncate">{m.name}</span>
                    </div>

                    {/* Slug */}
                    <div className="font-mono text-[10px] text-[#056B38] bg-white/70 px-2 py-0.5 rounded-md border border-neutral-200 w-fit dir-ltr">
                      {m.id}
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-[#526B5E] leading-relaxed font-normal">
                      {isRouter
                        ? "راوتر التوجيه التلقائي الرسمي من OpenRouter: يقوم بتوجيه طلبات الأسئلة والمساعد أوتوماتيكياً إلى أفضل النماذج المجانية المتاحة حالياً بدون توقف."
                        : `سياق الذاكرة: ${((m.context_length || 128000) / 1000).toFixed(0)}k Tokens — بدون أي رصيد مدفوع.`}
                    </p>
                  </div>

                  {/* Footer Meta & Quick Actions */}
                  <div className="pt-2 border-t border-neutral-100/80 flex items-center justify-between text-[10px] text-[#526B5E] font-bold">
                    <span className="font-mono text-[#056B38]">{m.speed || "سريع"}</span>

                    <button
                      type="button"
                      disabled={testing || (!config.hasApiKey && !config.apiKey)}
                      onClick={(e) => {
                        e.stopPropagation();
                        testSpecificModel(m.id);
                      }}
                      className="px-3 py-1 rounded-lg bg-white border border-[#D1E3D6] hover:border-[#056B38] text-[#05291A] hover:text-[#056B38] font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-40"
                    >
                      {isCurrentlyTesting ? (
                        <RefreshCw className="w-3 h-3 animate-spin text-[#056B38]" />
                      ) : (
                        <Zap className="w-3 h-3 text-amber-500" />
                      )}
                      <span>فحص الاتصال</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-5 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] space-y-2">
            <label className="text-xs font-black text-[#05291A]">اسم الموديل المخصص (Model Slug على OpenRouter):</label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig((prev) => ({ ...prev, model: e.target.value }))}
              placeholder="مثال: deepseek/deepseek-r1:free أو openrouter/free"
              className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-white px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 font-mono"
            />
          </div>
        )}
      </div>

      {/* Inputs Form */}
      <div className="grid gap-5 md:grid-cols-2 pt-2 border-t border-neutral-100">
        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-black text-[#05291A] flex items-center gap-1.5">
            <Key className="w-4 h-4 text-[#056B38]" />
            <span>OpenRouter API Key:</span>
          </label>
          <input
            type="password"
            value={config.apiKey}
            onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
            placeholder={config.hasApiKey ? "مفتاح API مشفر ومحفوظ في قاعدة البيانات" : "sk-or-v1-..."}
            className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-white px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 font-mono"
          />
          <span className="text-[11px] text-[#526B5E] block">
            يتم تشفير المفتاح بتقنية AES-256-GCM قبل حفظه بقاعدة البيانات ولا يرجع للمتصفح.
          </span>
        </div>

        {/* Site Title */}
        <div className="space-y-2">
          <label className="text-xs font-black text-[#05291A] flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-[#056B38]" />
            <span>اسم المنصة (Site Title):</span>
          </label>
          <input
            type="text"
            value={config.siteTitle}
            onChange={(e) => setConfig((prev) => ({ ...prev, siteTitle: e.target.value }))}
            placeholder="SCORA Platform"
            className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-white px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10"
          />
        </div>

        {/* Site Referer URL */}
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-black text-[#05291A] flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-[#056B38]" />
            <span>رابط الموقع (HTTP Referer):</span>
          </label>
          <input
            type="text"
            value={config.siteUrl}
            onChange={(e) => setConfig((prev) => ({ ...prev, siteUrl: e.target.value }))}
            placeholder="https://scora.alwaysdata.net"
            className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-white px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 font-mono"
          />
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div
          role="status"
          className={`rounded-2xl p-4 text-xs font-bold flex items-center gap-2 ${
            message.ok
              ? "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {message.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#056B38]" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-700" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Test Live Result Banner */}
      {testResult && (
        <div
          className={`rounded-2xl p-4 text-xs font-bold space-y-1 ${
            testResult.ok
              ? "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2 font-black">
            {testResult.ok ? (
              <Zap className="w-4 h-4 text-amber-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>
              {testResult.ok
                ? `نجح فحص الاتصال بالنموذج (${testResult.latency}ms)`
                : "فشل فحص الاتصال بالنموذج"}
            </span>
          </div>
          <p className="text-[11px] font-normal leading-relaxed">{testResult.message}</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          disabled={saving}
          type="button"
          onClick={() => save()}
          className="h-12 px-8 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
        >
          {saving ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              <span>جارٍ الحفظ في قاعدة البيانات...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>حفظ وتفعيل النموذج المختار ({config.model})</span>
            </>
          )}
        </button>

        <button
          disabled={testing || (!config.hasApiKey && !config.apiKey)}
          type="button"
          onClick={() => testSpecificModel(config.model)}
          className="h-12 px-6 rounded-full border border-[#056B38] bg-[#E8FAF0] hover:bg-[#056B38] hover:text-white text-[#056B38] text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
        >
          {testing && !testingModelId ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جارٍ فحص الاستجابة...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-amber-500" />
              <span>اختبار اتصال النموذج المختار الآن</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
