"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Save,
  RotateCcw,
  Loader2,
  Sparkles,
  Bot,
  Briefcase,
  FileText,
  Percent,
  Award,
  ShieldCheck,
  Headphones,
  Sliders,
} from "lucide-react";
import { DEFAULT_PLAN_LIMITS, type PlanLimits, type SubscriptionPlan } from "@/lib/ai-quota-types";
import { EgpCurrencyIcon } from "@/components/egp-currency-icon";

interface AdminPlansTabProps {
  notify: (msg: string, type: "success" | "warn") => void;
}

export function AdminPlansTab({ notify }: AdminPlansTabProps) {
  const [plans, setPlans] = useState<Record<SubscriptionPlan, PlanLimits>>(DEFAULT_PLAN_LIMITS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/admin/plans");
        if (res.ok) {
          const data = await res.json();
          if (data.plans) setPlans(data.plans);
        }
      } catch (err) {
        console.error("Failed to load plans config:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleUpdateField = (
    planKey: SubscriptionPlan,
    field: keyof PlanLimits | "devPrice" | "clientPrice",
    value: unknown
  ) => {
    setPlans((prev) => {
      const plan = { ...prev[planKey] };
      if (field === "devPrice") {
        plan.priceEgp = { ...plan.priceEgp, developer: Number(value) || 0 };
      } else if (field === "clientPrice") {
        plan.priceEgp = { ...plan.priceEgp, client: Number(value) || 0 };
      } else {
        // @ts-expect-error dynamic key assignment
        plan[field] = value;
      }
      return { ...prev, [planKey]: plan };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plans),
      });
      if (!res.ok) throw new Error("فشل حفظ إعدادات الباقات");
      notify("تم حفظ أسعار ومميزات الباقات بنجاح!", "success");
    } catch {
      notify("حدث خطأ أثناء حفظ أسعار الباقات", "warn");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("هل أنت متأكد من استعادة الأسعار والمميزات الافتراضية للباقات؟")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/plans", { method: "PUT" });
      if (!res.ok) throw new Error("فشل الاستعادة");
      const data = await res.json();
      if (data.plans) setPlans(data.plans);
      notify("تمت استعادة الإعدادات الافتراضية للباقات بنجاح", "success");
    } catch {
      notify("فشلت استعادة الإعدادات الافتراضية", "warn");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-[#526B5E] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#056B38]" />
        <p className="text-xs font-bold">جاري تحميل إعدادات وتسعير الباقات...</p>
      </div>
    );
  }

  const planKeys: SubscriptionPlan[] = ["free", "pro", "vip"];

  return (
    <div className="space-y-6 animate-in fade-in duration-200" dir="rtl">
      {/* Header Info */}
      <div className="bg-white p-6 rounded-[24px] border border-[#D1E3D6] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#056B38] to-[#04552D] text-white flex items-center justify-center shadow-xs">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-[#05291A]">
              إدارة تسعير ومميزات الباقات (Subscriptions & Limits Engine)
            </h2>
            <p className="text-xs text-[#526B5E]">
              التحكم الكامل في أسعار الاشتراكات (للمطورين والعملاء)، حدود تقديم العروض، رفع المشاريع، معرض الأعمال، وطلبات الذكاء الاصطناعي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            disabled={resetting || saving}
            className="h-11 px-4 rounded-xl border border-[#D1E3D6] hover:bg-[#F7FAF8] text-[#526B5E] hover:text-[#05291A] text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving || resetting}
            className="h-11 px-6 rounded-xl bg-[#056B38] hover:bg-[#04552D] text-white text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ كافة التغييرات</span>
          </button>
        </div>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {planKeys.map((key) => {
          const plan = plans[key];
          const isFree = key === "free";
          const isPro = key === "pro";
          const isVip = key === "vip";

          return (
            <div
              key={key}
              className={`rounded-[24px] border p-6 flex flex-col justify-between space-y-6 transition-all ${
                isVip
                  ? "bg-gradient-to-b from-[#05291A] to-[#041F14] border-[#056B38] text-white shadow-lg"
                  : isPro
                  ? "bg-white border-[#056B38] ring-2 ring-[#056B38]/20 shadow-md"
                  : "bg-white border-[#D1E3D6] shadow-2xs"
              }`}
            >
              {/* Card Header */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black px-3 py-1 rounded-full ${
                      isVip
                        ? "bg-[#056B38] text-white"
                        : isPro
                        ? "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {plan.badgeAr || plan.name}
                  </span>
                  <span className="text-xs font-mono opacity-60 uppercase">{key}</span>
                </div>

                <div>
                  <h3
                    className={`text-lg font-black ${
                      isVip ? "text-white" : "text-[#05291A]"
                    }`}
                  >
                    {plan.nameAr}
                  </h3>
                </div>

                {/* Pricing Fields */}
                <div className={`p-4 rounded-2xl space-y-3 ${isVip ? "bg-white/10" : "bg-[#F7FAF8] border border-[#D1E3D6]"}`}>
                  <div className="text-xs font-bold flex items-center gap-1.5 opacity-90">
                    <CreditCard className="w-3.5 h-3.5 text-[#056B38]" />
                    <span>تسعير الاشتراك الشهري:</span>
                  </div>

                  {/* Developer Price */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold">سعر المطور (شهرياً):</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        disabled={isFree}
                        value={plan.priceEgp.developer}
                        onChange={(e) => handleUpdateField(key, "devPrice", e.target.value)}
                        className={`w-24 h-9 px-2 text-center text-xs font-mono font-black rounded-lg border focus:outline-hidden ${
                          isVip
                            ? "bg-white/20 text-white border-white/30 focus:border-white"
                            : "bg-white text-[#05291A] border-[#D1E3D6] focus:border-[#056B38]"
                        } disabled:opacity-50`}
                      />
                      <EgpCurrencyIcon className={`w-4 h-4 ${isVip ? "text-[#E8FAF0]" : "text-[#056B38]"}`} />
                    </div>
                  </div>

                  {/* Client Price */}
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold">سعر العميل (شهرياً):</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        disabled={isFree}
                        value={plan.priceEgp.client}
                        onChange={(e) => handleUpdateField(key, "clientPrice", e.target.value)}
                        className={`w-24 h-9 px-2 text-center text-xs font-mono font-black rounded-lg border focus:outline-hidden ${
                          isVip
                            ? "bg-white/20 text-white border-white/30 focus:border-white"
                            : "bg-white text-[#05291A] border-[#D1E3D6] focus:border-[#056B38]"
                        } disabled:opacity-50`}
                      />
                      <EgpCurrencyIcon className={`w-4 h-4 ${isVip ? "text-[#E8FAF0]" : "text-[#056B38]"}`} />
                    </div>
                  </div>
                </div>

                {/* Platform Limits Form */}
                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-black opacity-80 border-b border-current/20 pb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>حدود المنصة والعمليات:</span>
                  </div>

                  {/* Proposals Limit */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 opacity-70" />
                      <span>عروض المشاريع (شهرياً):</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={plan.proposalsMonthlyLimit}
                      onChange={(e) => handleUpdateField(key, "proposalsMonthlyLimit", Number(e.target.value))}
                      className={`w-20 h-8 px-2 text-center text-xs font-bold rounded-lg border ${
                        isVip ? "bg-white/20 text-white border-white/30" : "bg-white border-[#D1E3D6] text-[#05291A]"
                      }`}
                    />
                  </div>

                  {/* Projects Posting Limit */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 opacity-70" />
                      <span>نشر المشاريع للعميل (شهرياً):</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={plan.projectsMonthlyLimit}
                      onChange={(e) => handleUpdateField(key, "projectsMonthlyLimit", Number(e.target.value))}
                      className={`w-20 h-8 px-2 text-center text-xs font-bold rounded-lg border ${
                        isVip ? "bg-white/20 text-white border-white/30" : "bg-white border-[#D1E3D6] text-[#05291A]"
                      }`}
                    />
                  </div>

                  {/* Portfolio Projects Limit */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 opacity-70" />
                      <span>مشاريع معرض الأعمال:</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={plan.portfolioProjectsLimit}
                      onChange={(e) => handleUpdateField(key, "portfolioProjectsLimit", Number(e.target.value))}
                      className={`w-20 h-8 px-2 text-center text-xs font-bold rounded-lg border ${
                        isVip ? "bg-white/20 text-white border-white/30" : "bg-white border-[#D1E3D6] text-[#05291A]"
                      }`}
                    />
                  </div>

                  {/* Commission Discount */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 opacity-70" />
                      <span>خصم عمولة المنصة:</span>
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={plan.commissionDiscountPercent}
                        onChange={(e) => handleUpdateField(key, "commissionDiscountPercent", Number(e.target.value))}
                        className={`w-16 h-8 px-2 text-center text-xs font-bold rounded-lg border ${
                          isVip ? "bg-white/20 text-white border-white/30" : "bg-white border-[#D1E3D6] text-[#05291A]"
                        }`}
                      />
                      <span className="text-[11px] font-bold">%</span>
                    </div>
                  </div>

                  {/* AI Daily Requests */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 opacity-70" />
                      <span>طلبات SSD AI (يومياً):</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={plan.dailyRequests}
                      onChange={(e) => handleUpdateField(key, "dailyRequests", Number(e.target.value))}
                      className={`w-20 h-8 px-2 text-center text-xs font-bold rounded-lg border ${
                        isVip ? "bg-white/20 text-white border-white/30" : "bg-white border-[#D1E3D6] text-[#05291A]"
                      }`}
                    />
                  </div>

                  {/* AI Weekly Requests */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 opacity-70" />
                      <span>طلبات SSD AI (أسبوعياً):</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={plan.weeklyRequests}
                      onChange={(e) => handleUpdateField(key, "weeklyRequests", Number(e.target.value))}
                      className={`w-20 h-8 px-2 text-center text-xs font-bold rounded-lg border ${
                        isVip ? "bg-white/20 text-white border-white/30" : "bg-white border-[#D1E3D6] text-[#05291A]"
                      }`}
                    />
                  </div>

                  {/* Trial Days for Free */}
                  {isFree && (
                    <div className="flex items-center justify-between text-xs">
                      <span>الفترة التجريبية المجانية (أيام):</span>
                      <input
                        type="number"
                        min={0}
                        value={plan.trialDays}
                        onChange={(e) => handleUpdateField(key, "trialDays", Number(e.target.value))}
                        className="w-20 h-8 px-2 text-center text-xs font-bold rounded-lg border bg-white border-[#D1E3D6] text-[#05291A]"
                      />
                    </div>
                  )}

                  {/* Badges & Privileges */}
                  <div className="pt-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.hasVerifiedBadge}
                        onChange={(e) => handleUpdateField(key, "hasVerifiedBadge", e.target.checked)}
                        className="rounded border-[#D1E3D6] text-[#056B38] focus:ring-[#056B38]"
                      />
                      <ShieldCheck className="w-3.5 h-3.5 text-[#056B38]" />
                      <span>شارة التوثيق والتميز (Verified)</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.hasPriorityPlacement}
                        onChange={(e) => handleUpdateField(key, "hasPriorityPlacement", e.target.checked)}
                        className="rounded border-[#D1E3D6] text-[#056B38] focus:ring-[#056B38]"
                      />
                      <Sparkles className="w-3.5 h-3.5 text-[#056B38]" />
                      <span>أولوية الظهور في نتائج البحث والعروض</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.hasDedicatedSupport}
                        onChange={(e) => handleUpdateField(key, "hasDedicatedSupport", e.target.checked)}
                        className="rounded border-[#D1E3D6] text-[#056B38] focus:ring-[#056B38]"
                      />
                      <Headphones className="w-3.5 h-3.5 text-[#056B38]" />
                      <span>دعم فني مخصص ذو أولوية فائقة</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
