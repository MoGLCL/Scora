"use client";

import { useEffect, useState, useMemo } from "react";
import {
  setGoogleAiSettings,
  setOpenRouterSettings,
  setActiveAiProvider,
  testGoogleAiConnection,
  testOpenRouterAiConnection,
} from "@/lib/actions/settings";
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Key,
  Cpu,
  RefreshCw,
  Sparkles,
  Check,
  Search,
  Rocket,
  ExternalLink,
  Layers,
  ShieldCheck,
} from "lucide-react";

interface FreeModelItem {
  id: string;
  name: string;
  context_length?: number;
  provider?: string;
  tag?: string;
  speed?: string;
}

interface OpenRouterSettingsProps {
  notify: (message: string, type: "success" | "warn") => void;
}

export function OpenRouterSettings({ notify }: OpenRouterSettingsProps) {
  // Provider Selection
  const [activeProvider, setActiveProvider] = useState<"google" | "openrouter">("google");

  // Google Gemini State
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [googleModel, setGoogleModel] = useState("gemini-3.7-flash");
  const [hasGoogleKey, setHasGoogleKey] = useState(false);
  const [googleModels, setGoogleModels] = useState<FreeModelItem[]>([]);

  // OpenRouter State
  const [openRouterApiKey, setOpenRouterApiKey] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState("openrouter/free");
  const [openRouterSiteUrl, setOpenRouterSiteUrl] = useState("");
  const [openRouterSiteTitle, setOpenRouterSiteTitle] = useState("");
  const [hasOpenRouterKey, setHasOpenRouterKey] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<FreeModelItem[]>([]);

  // Active Tab in the Settings View: "google" | "openrouter"
  const [currentTab, setCurrentTab] = useState<"google" | "openrouter">("google");

  // Testing & Saving States
  const [isTestingGoogle, setIsTestingGoogle] = useState(false);
  const [isTestingOpenRouter, setIsTestingOpenRouter] = useState(false);
  const [isSavingGoogle, setIsSavingGoogle] = useState(false);
  const [isSavingOpenRouter, setIsSavingOpenRouter] = useState(false);
  const [isSwitchingActive, setIsSwitchingActive] = useState(false);

  const [googleTestResult, setGoogleTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    model?: string;
    reply?: string;
    error?: string;
  } | null>(null);

  const [openRouterTestResult, setOpenRouterTestResult] = useState<{
    ok: boolean;
    latencyMs?: number;
    model?: string;
    reply?: string;
    error?: string;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/ai-settings");
      if (res.ok) {
        const data = await res.json();
        if (data.provider) {
          setActiveProvider(data.provider);
          setCurrentTab(data.provider);
        }

        // Google
        if (data.googleModel) setGoogleModel(data.googleModel);
        setHasGoogleKey(Boolean(data.hasGoogleKey));
        if (Array.isArray(data.curatedGoogleModels)) setGoogleModels(data.curatedGoogleModels);

        // OpenRouter
        if (data.openRouterModel) setOpenRouterModel(data.openRouterModel);
        setHasOpenRouterKey(Boolean(data.hasOpenRouterKey));
        if (data.siteUrl) setOpenRouterSiteUrl(data.siteUrl);
        if (data.siteTitle) setOpenRouterSiteTitle(data.siteTitle);
        if (Array.isArray(data.availableFreeModels)) setOpenRouterModels(data.availableFreeModels);
      }
    } catch {
      notify("تعذر جلب إعدادات الذكاء الاصطناعي", "warn");
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const filteredOpenRouterModels = useMemo(() => {
    return openRouterModels.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.provider && m.provider.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSearch;
    });
  }, [openRouterModels, searchQuery]);

  // Handle Switching Active Provider
  const handleSwitchActiveProvider = async (target: "google" | "openrouter") => {
    setIsSwitchingActive(true);
    try {
      const res = await setActiveAiProvider(target);
      if (res.ok) {
        setActiveProvider(target);
        notify(
          target === "google"
            ? "تم تفعيل Google Gemini كمزود الذكاء الاصطناعي النشط للمنصة!"
            : "تم تفعيل OpenRouter كمزود الذكاء الاصطناعي النشط للمنصة!",
          "success"
        );
      } else {
        notify("فشل تبديل المزود النشط", "warn");
      }
    } catch {
      notify("حدث خطأ أثناء التبديل", "warn");
    } finally {
      setIsSwitchingActive(false);
    }
  };

  // Test Google Gemini
  const handleTestGoogle = async () => {
    setIsTestingGoogle(true);
    setGoogleTestResult(null);

    try {
      const res = await testGoogleAiConnection(googleModel, googleApiKey.trim() || undefined);
      if (res.ok) {
        setGoogleTestResult({
          ok: true,
          latencyMs: res.latencyMs,
          model: res.model,
          reply: res.reply,
        });
        notify(`تم الاتصال بـ Google Gemini بنجاح! (${res.latencyMs}ms)`, "success");
      } else {
        setGoogleTestResult({
          ok: false,
          error: res.error || "فشل الاتصال بـ Google Gemini",
        });
        notify(res.error || "فشل الاتصال بـ Google Gemini", "warn");
      }
    } catch {
      setGoogleTestResult({ ok: false, error: "تعذر إرسال طلب الاختبار" });
      notify("تعذر إجراء الاختبار", "warn");
    } finally {
      setIsTestingGoogle(false);
    }
  };

  // Test OpenRouter
  const handleTestOpenRouter = async () => {
    setIsTestingOpenRouter(true);
    setOpenRouterTestResult(null);

    try {
      const res = await testOpenRouterAiConnection(openRouterModel);
      if (res.ok) {
        setOpenRouterTestResult({
          ok: true,
          latencyMs: res.latencyMs,
          model: res.model,
          reply: res.reply,
        });
        notify(`تم الاتصال بـ OpenRouter بنجاح! (${res.latencyMs}ms)`, "success");
      } else {
        setOpenRouterTestResult({
          ok: false,
          error: res.error || "فشل الاتصال بـ OpenRouter",
        });
        notify(res.error || "فشل الاتصال بـ OpenRouter", "warn");
      }
    } catch {
      setOpenRouterTestResult({ ok: false, error: "تعذر إرسال طلب الاختبار" });
      notify("تعذر إجراء الاختبار", "warn");
    } finally {
      setIsTestingOpenRouter(false);
    }
  };

  // Save Google Settings
  const handleSaveGoogle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGoogle(true);

    try {
      const res = await setGoogleAiSettings({
        apiKey: googleApiKey.trim() || undefined,
        model: googleModel,
        setAsActive: activeProvider === "google",
      });

      if (res.ok) {
        notify("تم حفظ إعدادات Google Gemini بنجاح!", "success");
        setGoogleApiKey("");
        fetchSettings();
      } else {
        notify(res.error || "حدث خطأ أثناء الحفظ", "warn");
      }
    } catch {
      notify("حدث خطأ أثناء الحفظ", "warn");
    } finally {
      setIsSavingGoogle(false);
    }
  };

  // Save OpenRouter Settings
  const handleSaveOpenRouter = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOpenRouter(true);

    try {
      const res = await setOpenRouterSettings({
        apiKey: openRouterApiKey.trim() || undefined,
        model: openRouterModel,
        siteUrl: openRouterSiteUrl.trim(),
        siteTitle: openRouterSiteTitle.trim() || "SCORA",
        setAsActive: activeProvider === "openrouter",
      });

      if (res.ok) {
        notify("تم حفظ إعدادات OpenRouter بنجاح!", "success");
        setOpenRouterApiKey("");
        fetchSettings();
      } else {
        notify(res.error || "حدث خطأ أثناء الحفظ", "warn");
      }
    } catch {
      notify("حدث خطأ أثناء الحفظ", "warn");
    } finally {
      setIsSavingOpenRouter(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner: Master Provider Selector & Status */}
      <div className="bg-white p-6 rounded-[24px] border border-[#D1E3D6] shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#056B38] to-[#04552D] text-white flex items-center justify-center shadow-xs">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#05291A]">
                إدارة مزودات الذكاء الاصطناعي (AI Providers Engine)
              </h2>
              <p className="text-xs text-[#526B5E]">
                يمكنك تكوين كلا المزودين وتحديد أي منهما يعمل كمزود أساسي لمعالجة طلبات المنصة
              </p>
            </div>
          </div>

          {/* Active Provider Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#526B5E]">المزود النشط للمنصة:</span>
            <span className="text-xs px-3.5 py-1.5 rounded-full font-black bg-[#056B38] text-white flex items-center gap-1.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>{activeProvider === "google" ? "Google Gemini (مفعل)" : "OpenRouter (مفعل)"}</span>
            </span>
          </div>
        </div>

        {/* 2 Provider Cards with Switch and Tab Select */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Card 1: Google Gemini */}
          <div
            onClick={() => setCurrentTab("google")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
              currentTab === "google"
                ? "border-[#056B38] bg-gradient-to-br from-[#E8FAF0] to-white ring-2 ring-[#056B38]/30 shadow-xs"
                : "border-[#D1E3D6] bg-white hover:border-[#056B38]/50"
            }`}
          >
            {activeProvider === "google" && (
              <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-[#056B38] text-white text-[10px] font-black shadow-xs flex items-center gap-1">
                <Check className="w-3 h-3" /> المزود الرئيسي النشط
              </span>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#05291A]">Google Gemini AI</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6] font-mono">
                  DIRECT API
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                  موصى به
                </span>
              </div>
              <p className="text-xs text-[#526B5E] leading-relaxed">
                موديلات Gemini 3.7 Flash و 3.1 Pro فائقة السرعة مع نافذة سياق ضخمة (حتى 2 مليون توكن) ودعم كامل للـ JSON.
              </p>
              <div className="text-[11px] text-[#056B38] font-bold font-mono">
                الموديل المختار: {googleModel}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D1E3D6] flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#526B5E] font-mono">
                {hasGoogleKey ? "مفتاح API محفوظ" : "بحاجة لمفتاح API"}
              </span>

              {activeProvider !== "google" ? (
                <button
                  type="button"
                  disabled={isSwitchingActive}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwitchActiveProvider("google");
                  }}
                  className="h-8 px-3 rounded-xl bg-[#056B38] hover:bg-[#04552D] text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>تفعيل كالمزود النشط</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-[#056B38] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-[#056B38]" /> مفعل حالياً
                </span>
              )}
            </div>
          </div>

          {/* Card 2: OpenRouter */}
          <div
            onClick={() => setCurrentTab("openrouter")}
            className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
              currentTab === "openrouter"
                ? "border-[#056B38] bg-gradient-to-br from-[#E8FAF0] to-white ring-2 ring-[#056B38]/30 shadow-xs"
                : "border-[#D1E3D6] bg-white hover:border-[#056B38]/50"
            }`}
          >
            {activeProvider === "openrouter" && (
              <span className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-[#056B38] text-white text-[10px] font-black shadow-xs flex items-center gap-1">
                <Check className="w-3 h-3" /> المزود الرئيسي النشط
              </span>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-[#05291A]">OpenRouter AI</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6] font-mono">
                  MULTI-MODEL
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]">
                  موديلات مجانية
                </span>
              </div>
              <p className="text-xs text-[#526B5E] leading-relaxed">
                بوابة التوجيه التلقائي للموديلات العالمية مثل DeepSeek R1 و Llama 3.3 و Qwen Coder مع التبديل التلقائي.
              </p>
              <div className="text-[11px] text-[#056B38] font-bold font-mono">
                الموديل المختار: {openRouterModel}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#D1E3D6] flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#526B5E] font-mono">
                {hasOpenRouterKey ? "مفتاح API محفوظ" : "مفتاح اختياري"}
              </span>

              {activeProvider !== "openrouter" ? (
                <button
                  type="button"
                  disabled={isSwitchingActive}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSwitchActiveProvider("openrouter");
                  }}
                  className="h-8 px-3 rounded-xl bg-[#056B38] hover:bg-[#04552D] text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>تفعيل كالمزود النشط</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-[#056B38] flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-[#056B38]" /> مفعل حالياً
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#D1E3D6] pb-2">
        <button
          type="button"
          onClick={() => setCurrentTab("google")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            currentTab === "google"
              ? "bg-[#056B38] text-white shadow-xs"
              : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>إعدادات وموديلات Google Gemini</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab("openrouter")}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
            currentTab === "openrouter"
              ? "bg-[#056B38] text-white shadow-xs"
              : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>إعدادات وموديلات OpenRouter</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: GOOGLE GEMINI CONFIGURATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentTab === "google" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveGoogle} className="space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-[#D1E3D6] shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D1E3D6]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#05291A]">Google Gemini API Key</h3>
                    <p className="text-[11px] text-[#526B5E]">المفتاح الخاص بحسابك في Google AI Studio</p>
                  </div>
                </div>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#056B38] hover:text-[#04552D] font-bold flex items-center gap-1 cursor-pointer bg-[#E8FAF0] px-3 py-1.5 rounded-xl border border-[#D1E3D6]"
                >
                  <span>استخراج مفتاح Google مجاني من AI Studio</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Google API Key Input */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#05291A] flex items-center justify-between">
                  <span>Google Gemini API Key</span>
                  <span className="text-[11px] font-normal text-[#526B5E]">
                    {hasGoogleKey ? "يوجد مفتاح مشفر ومحفوظ مسبقاً (اتركه فارغاً للإبقاء عليه)" : "لم يتم إدخال مفتاح بعد"}
                  </span>
                </label>
                <input
                  type="password"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  placeholder={hasGoogleKey ? "••••••••••••••••••••••••••••••••" : "AIzaSy..."}
                  className="w-full h-11 px-4 font-mono text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/20 outline-hidden bg-[#FBFEFC]"
                />
                <p className="text-[11px] text-[#526B5E]">
                  يتم تشفير المفتاح في قاعدة البيانات بـ AES-256-GCM ولا يمكن لأحد قراءته.
                </p>
              </div>

              {/* Gemini Models Selection Grid */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#05291A] flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#056B38]" />
                    <span>اختر موديل Google Gemini الذي ترغب في استخدامه:</span>
                  </label>
                  <span className="text-xs text-[#056B38] font-mono font-bold">{googleModel}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {googleModels.map((m) => {
                    const isSelected = googleModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setGoogleModel(m.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? "border-[#056B38] bg-[#E8FAF0] ring-2 ring-[#056B38]/20 shadow-xs"
                            : "border-[#D1E3D6] bg-white hover:border-[#056B38]/40 hover:bg-[#F7FAF8]"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3 left-3 h-5 w-5 rounded-full bg-[#056B38] text-white flex items-center justify-center text-xs shadow-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <div className="space-y-1.5">
                          <span className="text-xs font-extrabold text-[#05291A] leading-tight block">
                            {m.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#526B5E] block">{m.id}</span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#D1E3D6] flex items-center justify-between text-[10px]">
                          <span className="text-[#056B38] font-bold">{m.speed}</span>
                          <span className="text-[#526B5E] font-mono">
                            {((m.context_length || 1048576) / 1024).toFixed(0)}k سياق
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Test Results for Google */}
            {googleTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed animate-in fade-in duration-150 ${
                  googleTestResult.ok
                    ? "bg-[#E8FAF0] border-[#D1E3D6] text-[#05291A]"
                    : "bg-red-50 border-red-300 text-red-950"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {googleTestResult.ok ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0" />
                      <span>تم الاتصال بـ Google Gemini بنجاح ({googleTestResult.latencyMs}ms) — الموديل: {googleTestResult.model}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>فشل اختبار الاتصال بـ Google Gemini:</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] mt-1 text-[#05291A] bg-white/80 p-2.5 rounded-xl border border-[#D1E3D6] font-mono">
                  {googleTestResult.reply || googleTestResult.error}
                </div>
              </div>
            )}

            {/* Action Buttons for Google */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#D1E3D6] shadow-2xs">
              <button
                type="button"
                onClick={handleTestGoogle}
                disabled={isTestingGoogle || isSavingGoogle}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border border-[#056B38] text-[#056B38] hover:bg-[#E8FAF0] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTestingGoogle ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                <span>اختبار اتصال Google Gemini الآن</span>
              </button>

              <button
                type="submit"
                disabled={isSavingGoogle || isTestingGoogle}
                className="w-full sm:w-auto h-11 px-8 rounded-xl bg-[#056B38] hover:bg-[#04552D] text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingGoogle ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>حفظ إعدادات Google Gemini</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: OPENROUTER CONFIGURATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {currentTab === "openrouter" && (
        <div className="space-y-6">
          <form onSubmit={handleSaveOpenRouter} className="space-y-6">
            <div className="bg-white p-6 rounded-[24px] border border-[#D1E3D6] shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D1E3D6]">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#05291A]">OpenRouter API Key</h3>
                    <p className="text-[11px] text-[#526B5E]">المفتاح الخاص بحسابك في OpenRouter (اختياري للموديلات المجانية)</p>
                  </div>
                </div>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#056B38] hover:text-[#04552D] font-bold flex items-center gap-1 cursor-pointer bg-[#E8FAF0] px-3 py-1.5 rounded-xl border border-[#D1E3D6]"
                >
                  <span>إنشاء مفتاح OpenRouter</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* OpenRouter API Key */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#05291A] flex items-center justify-between">
                  <span>OpenRouter API Key</span>
                  <span className="text-[11px] font-normal text-[#526B5E]">
                    {hasOpenRouterKey ? "يوجد مفتاح مشفر ومحفوظ مسبقاً" : "مفتاح اختياري للموديلات المجانية"}
                  </span>
                </label>
                <input
                  type="password"
                  value={openRouterApiKey}
                  onChange={(e) => setOpenRouterApiKey(e.target.value)}
                  placeholder={hasOpenRouterKey ? "••••••••••••••••••••••••••••••••" : "sk-or-v1-..."}
                  className="w-full h-11 px-4 font-mono text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/20 outline-hidden bg-[#FBFEFC]"
                />
              </div>

              {/* Site URL & Title */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#05291A]">رابط المنصة (HTTP-Referer)</label>
                  <input
                    type="text"
                    value={openRouterSiteUrl}
                    onChange={(e) => setOpenRouterSiteUrl(e.target.value)}
                    placeholder="https://scora.alwaysdata.net"
                    className="w-full h-10 px-3.5 text-xs font-mono rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[#05291A]">اسم المنصة (X-Title)</label>
                  <input
                    type="text"
                    value={openRouterSiteTitle}
                    onChange={(e) => setOpenRouterSiteTitle(e.target.value)}
                    placeholder="SCORA Platform"
                    className="w-full h-10 px-3.5 text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden"
                  />
                </div>
              </div>

              {/* OpenRouter Models Filter & Selection */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#05291A] flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#056B38]" />
                    <span>اختر موديل OpenRouter الافتراضي:</span>
                  </label>
                  <span className="text-xs text-[#056B38] font-mono font-bold">{openRouterModel}</span>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#526B5E]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث عن موديل (DeepSeek, Llama, Qwen...)"
                    className="w-full h-9 pr-9 pl-3 text-xs rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden"
                  />
                </div>

                {/* Models Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto p-1">
                  {filteredOpenRouterModels.map((m) => {
                    const isSelected = openRouterModel === m.id;
                    return (
                      <div
                        key={m.id}
                        onClick={() => setOpenRouterModel(m.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative ${
                          isSelected
                            ? "border-[#056B38] bg-[#E8FAF0] ring-2 ring-[#056B38]/20 shadow-xs"
                            : "border-[#D1E3D6] bg-white hover:border-[#056B38]/40 hover:bg-[#F7FAF8]"
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-3 left-3 h-5 w-5 rounded-full bg-[#056B38] text-white flex items-center justify-center text-xs shadow-xs">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                        <div className="space-y-1">
                          <span className="text-xs font-extrabold text-[#05291A] leading-tight block truncate pr-5">
                            {m.name}
                          </span>
                          <span className="text-[10px] font-mono text-[#526B5E] block truncate">{m.id}</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-[#D1E3D6] flex items-center justify-between text-[10px]">
                          <span className="text-[#056B38] font-bold">{m.speed || "سريع"}</span>
                          <span className="text-[#526B5E] font-mono">
                            {((m.context_length || 128000) / 1024).toFixed(0)}k سياق
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Test Results for OpenRouter */}
            {openRouterTestResult && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed animate-in fade-in duration-150 ${
                  openRouterTestResult.ok
                    ? "bg-[#E8FAF0] border-[#D1E3D6] text-[#05291A]"
                    : "bg-red-50 border-red-300 text-red-950"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {openRouterTestResult.ok ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0" />
                      <span>تم الاتصال بـ OpenRouter بنجاح ({openRouterTestResult.latencyMs}ms) — الموديل: {openRouterTestResult.model}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>فشل اختبار الاتصال بـ OpenRouter:</span>
                    </>
                  )}
                </div>
                <div className="text-[11px] mt-1 text-[#05291A] bg-white/80 p-2.5 rounded-xl border border-[#D1E3D6] font-mono">
                  {openRouterTestResult.reply || openRouterTestResult.error}
                </div>
              </div>
            )}

            {/* Action Buttons for OpenRouter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#D1E3D6] shadow-2xs">
              <button
                type="button"
                onClick={handleTestOpenRouter}
                disabled={isTestingOpenRouter || isSavingOpenRouter}
                className="w-full sm:w-auto h-11 px-5 rounded-xl border border-[#056B38] text-[#056B38] hover:bg-[#E8FAF0] text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isTestingOpenRouter ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                <span>اختبار اتصال OpenRouter الآن</span>
              </button>

              <button
                type="submit"
                disabled={isSavingOpenRouter || isTestingOpenRouter}
                className="w-full sm:w-auto h-11 px-8 rounded-xl bg-[#056B38] hover:bg-[#04552D] text-white text-xs font-black shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingOpenRouter ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>حفظ إعدادات OpenRouter</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
