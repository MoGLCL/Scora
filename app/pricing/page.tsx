"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { SubscriptionCheckoutModal } from "@/components/subscription-checkout-modal";
import { useProfile } from "@/components/profile-provider";
import { Sparkles, Zap, Bot, Lock, Briefcase, FileText, Award, Percent, ShieldCheck } from "lucide-react";
import { DEFAULT_PLAN_LIMITS, type PlanLimits, type SubscriptionPlan } from "@/lib/ai-quota-types";
import { EgpCurrencyIcon } from "@/components/egp-currency-icon";

export default function PricingPage() {
  const { userRole } = useProfile();
  const [plans, setPlans] = useState<Record<SubscriptionPlan, PlanLimits>>(DEFAULT_PLAN_LIMITS);
  const [checkoutPlan, setCheckoutPlan] = useState<"pro" | "vip">("pro");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          if (data.plans) setPlans(data.plans);
        }
      } catch (err) {
        console.error("Failed to load plans on pricing page:", err);
      }
    }
    loadPlans();
  }, []);

  const openCheckout = (plan: "pro" | "vip") => {
    setCheckoutPlan(plan);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-16">
        {/* HERO / HEADER SECTION */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-[12px] font-bold text-[#056B38] font-mono tracking-wide">
              استراتيجية تسعير وباقات Scora
            </div>
            <h1 className="text-[36px] md:text-[44px] font-extrabold text-[#05291A] font-heading leading-tight">
              خطط شاملة لكل احتياجاتك من العروض والمشاريع والذكاء الاصطناعي
            </h1>
            <p className="text-[16px] md:text-[17px] text-[#526B5E] leading-relaxed max-w-3xl">
              Scora تمنحك القوة الكاملة: تقديم العروض، رفع وتوظيف المشاريع، إبراز معرض الأعمال، مع وكيل الذكاء الاصطناعي SSD المدمج لمساعدتك في كل خطوة.
            </p>
          </div>
        </div>

        {/* SECTION 1: خطط المطورين (Developer Plans - 3 Cards) */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
                خطط المطورين
              </h2>
              <span className="text-xs px-3 py-1 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6] font-bold">
                Developers
              </span>
            </div>
            <p className="text-[14px] text-[#526B5E] mt-1">
              Free لبناء السمعة وتقديم العروض الأولية، Pro للعمل المستمر ومشاريع المعرض، وVIP لأعلى سعة وعروض غير محدودة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-7 flex flex-col justify-between space-y-6 shadow-2xs overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#E8FAF0] border border-[#D1E3D6] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  {plans.free.badgeAr || "ابدأ مجانًا"}
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Free
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للمطور الذي يبدأ ببناء سمعته في المنصة
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading font-mono">0</span>
                  <EgpCurrencyIcon className="w-5 h-5 text-[#056B38]" />
                  <span className="text-[13px] font-bold text-[#526B5E]">/ شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات والحدود:</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>تقديم حتى <strong>{plans.free.proposalsMonthlyLimit} عروض</strong> / شهر</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>إضافة حتى <strong>{plans.free.portfolioProjectsLimit} مشاريع</strong> في المعرض</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>تجربة مجانية لـ SSD AI Agent ({plans.free.trialDays} أيام)</span>
                  </li>
                  <li className="flex items-center gap-2 text-[#526B5E]">
                    <Percent className="w-4 h-4 text-[#526B5E] shrink-0" />
                    <span>عمولة المنصة القياسية</span>
                  </li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A] space-y-1">
                  <div>سعة الذكاء الاصطناعي: {plans.free.dailyRequests} طلب/يوم ({plans.free.weeklyRequests} أسبوعياً)</div>
                  <div className="text-[11px] text-[#526B5E] font-normal">بعد {plans.free.trialDays} أيام يُطلب الترقية للاستمرار في استخدام الـ AI.</div>
                </div>
              </div>

              {userRole === "guest" ? (
                <Link
                  href="/register"
                  className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-white hover:bg-[#F7FAF8] text-[13px] font-bold text-[#056B38] transition-all flex items-center justify-center cursor-pointer"
                >
                  سجل مجاناً
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-[#F7FAF8] text-[13px] font-bold text-[#526B5E] flex items-center justify-center select-none"
                >
                  باقتك الحالية الافتراضية
                </button>
              )}
            </div>

            {/* Pro Card (Featured) */}
            <div className="rounded-[24px] border-2 border-[#056B38] bg-white p-7 flex flex-col justify-between space-y-6 shadow-sm overflow-hidden relative">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#056B38] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs">
                  {plans.pro.badgeAr || "أفضل قيمة للمطورين ⭐"}
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Pro
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للمطور المحترف الذي يريد عمق وسعة عروض وAI مستمرة
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading font-mono">
                    {plans.pro.priceEgp.developer}
                  </span>
                  <EgpCurrencyIcon className="w-5 h-5 text-[#056B38]" />
                  <span className="text-[13px] font-bold text-[#526B5E]">/ شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات والحدود:</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>تقديم حتى <strong>{plans.pro.proposalsMonthlyLimit} عرضاً</strong> / شهر</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>إضافة حتى <strong>{plans.pro.portfolioProjectsLimit} مشروعاً</strong> في المعرض</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>خصم <strong>{plans.pro.commissionDiscountPercent}%</strong> على عمولة المنصة</span>
                  </li>
                  <li className="flex items-center gap-2 font-bold text-[#056B38]">
                    <Zap className="w-4 h-4 shrink-0 text-[#056B38]" />
                    <span>SSD AI مفتوح ({plans.pro.dailyRequests} طلب/يوم · {plans.pro.weeklyRequests} أسبوعياً)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>شارة التوثيق والظهور المتقدم</span>
                  </li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A]">
                  أولوية ظهور العروض أمام العملاء + تحليلات الأداء المتقدمة
                </div>
              </div>

              <button
                type="button"
                onClick={() => openCheckout("pro")}
                className="w-full h-[46px] rounded-[14px] bg-[#056B38] hover:bg-[#04552D] text-[13px] font-black text-white transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                اختار Pro (أو استخدم كود خصم)
              </button>
            </div>

            {/* VIP Card (Clean Scora Deep Forest Emerald) */}
            <div className="rounded-[24px] border-2 border-[#05291A] bg-white p-7 flex flex-col justify-between space-y-6 shadow-sm overflow-hidden relative">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#05291A] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs">
                  {plans.vip.badgeAr || "الباقة الفائقة VIP"}
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  VIP
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للمطور الاستثنائي: عروض ومشاريع غير محدودة وأعلى سعة AI
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#05291A] font-heading font-mono">
                    {plans.vip.priceEgp.developer}
                  </span>
                  <EgpCurrencyIcon className="w-5 h-5 text-[#05291A]" />
                  <span className="text-[13px] font-bold text-[#526B5E]">/ شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات والحدود:</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span><strong>تقديم عروض غير محدود</strong> على كافة المشاريع</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span><strong>معرض أعمال غير محدود</strong> لجميع مشاريعك</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>أعلى خصم عمولة: <strong>{plans.vip.commissionDiscountPercent}% خصم</strong></span>
                  </li>
                  <li className="flex items-center gap-2 font-bold text-[#056B38]">
                    <Sparkles className="w-4 h-4 shrink-0 text-[#056B38]" />
                    <span>SSD AI فائق ({plans.vip.dailyRequests} طلب/يوم · {plans.vip.weeklyRequests} أسبوعياً)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>شارة VIP المعتمدة + دعم فني VIP فوري</span>
                  </li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A]">
                  أعلى أولوية استجابة ومراجعة مشاريع فورية + ترشيح حصري
                </div>
              </div>

              <button
                type="button"
                onClick={() => openCheckout("vip")}
                className="w-full h-[46px] rounded-[14px] bg-[#05291A] hover:bg-[#041D12] text-[13px] font-black text-white transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                اختار VIP (أو فعلها مجاناً بكود)
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 2: خطط العملاء (Client Plans - 3 Cards) */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
                خطط أصحاب الأعمال والعملاء
              </h2>
              <span className="text-xs px-3 py-1 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6] font-bold">
                Clients & Business
              </span>
            </div>
            <p className="text-[14px] text-[#526B5E] mt-1">
              نشر المشاريع والتوظيف السريع، مع فحص وتقييم المطورين وصياغة متطلباتك بالذكاء الاصطناعي.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Client Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-7 flex flex-col justify-between space-y-6 shadow-2xs overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#E8FAF0] border border-[#D1E3D6] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  {plans.free.badgeAr || "Freemium"}
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Free
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للبداية وتصفح المطورين واختبار المنصة
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading font-mono">0</span>
                  <EgpCurrencyIcon className="w-5 h-5 text-[#056B38]" />
                  <span className="text-[13px] font-bold text-[#526B5E]">/ شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات والحدود:</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>نشر حتى <strong>{plans.free.projectsMonthlyLimit} مشروع</strong> / شهر</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>تجربة مجانية لـ SSD AI Agent ({plans.free.trialDays} أيام)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>تصفح جوازات المطورين والمهارات الموثقة</span>
                  </li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A]">
                  الحدود: {plans.free.dailyRequests} طلبات AI/يوم أثناء التجربة · مشروع واحد نشط
                </div>
              </div>

              {userRole === "guest" ? (
                <Link
                  href="/register"
                  className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-white hover:bg-[#F7FAF8] text-[13px] font-bold text-[#056B38] transition-all flex items-center justify-center cursor-pointer"
                >
                  ابدأ مجانًا
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-[#F7FAF8] text-[13px] font-bold text-[#526B5E] flex items-center justify-center select-none"
                >
                  باقتك الحالية الافتراضية
                </button>
              )}
            </div>

            {/* Pro Client Card */}
            <div className="rounded-[24px] border-2 border-[#056B38] bg-white p-7 flex flex-col justify-between space-y-6 shadow-sm overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#056B38] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs">
                  {plans.pro.badgeAr || "الأكثر اختيارًا للعملاء"}
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Pro
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للتوظيف المتكرر وصياغة المشاريع بالذكاء الاصطناعي
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading font-mono">
                    {plans.pro.priceEgp.client}
                  </span>
                  <EgpCurrencyIcon className="w-5 h-5 text-[#056B38]" />
                  <span className="text-[13px] font-bold text-[#526B5E]">/ شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات والحدود:</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>نشر حتى <strong>{plans.pro.projectsMonthlyLimit} مشاريع</strong> / شهر</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>SSD AI مفتوح ({plans.pro.dailyRequests} طلب/يوم · {plans.pro.weeklyRequests} أسبوعياً)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>فلاتر متقدمة ومقارنة المطورين الموثقين</span>
                  </li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A]">
                  صياغة مسودات المشاريع التلقائية مع ترشيح مباشر للمطورين
                </div>
              </div>

              <button
                type="button"
                onClick={() => openCheckout("pro")}
                className="w-full h-[46px] rounded-[14px] bg-[#056B38] hover:bg-[#04552D] text-[13px] font-black text-white transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                اختار Pro (أو استخدم كود خصم)
              </button>
            </div>

            {/* VIP Client Card */}
            <div className="rounded-[24px] border-2 border-[#05291A] bg-white p-7 flex flex-col justify-between space-y-6 shadow-sm overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#05291A] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs">
                  {plans.vip.badgeAr || "VIP للشركات والأعمال"}
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  VIP
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للتوظيف السريع والمشاريع ذات الأولوية القصوى
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#05291A] font-heading font-mono">
                    {plans.vip.priceEgp.client}
                  </span>
                  <EgpCurrencyIcon className="w-5 h-5 text-[#05291A]" />
                  <span className="text-[13px] font-bold text-[#526B5E]">/ شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات والحدود:</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span><strong>نشر وتوظيف مشاريع غير محدود</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>SSD AI فائق ({plans.vip.dailyRequests} طلب/يوم · {plans.vip.weeklyRequests} أسبوعياً)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#056B38] shrink-0" />
                    <span>ترشيحات حصرية لأفضل 1% من المطورين المعتمدين</span>
                  </li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A]">
                  مدير حساب مخصص + دعم فوري ذو أولوية فائقة 24/7
                </div>
              </div>

              <button
                type="button"
                onClick={() => openCheckout("vip")}
                className="w-full h-[46px] rounded-[14px] bg-[#05291A] hover:bg-[#041D12] text-[13px] font-black text-white transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                اختار VIP (أو فعلها مجاناً بكود)
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 3: خطط المؤسسات الكبرى (Enterprise) · معطلة ورمادية "قريباً" */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[28px] font-extrabold text-neutral-600 font-heading">
                خطط المؤسسات الكبرى (Enterprise)
              </h2>
              <span className="text-xs px-3 py-1 rounded-full bg-neutral-200 text-neutral-700 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>قريباً في المستقبل القريب · التسجيل مغلق مؤقتاً</span>
              </span>
            </div>
            <p className="text-[14px] text-neutral-500 mt-1">
              تنبيه: خدمات المنصة للأفراد والمطورين وأصحاب الأعمال مفعلة بالكامل حالياً، وباقات المؤسسات والربط المؤسسي سيتم إطلاقها قريباً.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-65 grayscale select-none">
            {/* Startup Card */}
            <div className="rounded-[24px] border border-neutral-300 bg-neutral-100/90 p-7 flex flex-col justify-between space-y-6 shadow-none">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-neutral-200 px-3.5 py-1 text-[11px] font-bold text-neutral-600">
                  قريباً · Coming soon
                </span>
                <h3 className="text-[22px] font-extrabold text-neutral-700 font-heading">
                  Startup
                </h3>
                <p className="text-[13px] text-neutral-500">
                  لفريق صغير واحتياج محدود
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-neutral-600 font-heading font-mono">4,999</span>
                  <EgpCurrencyIcon className="w-5 h-5 text-neutral-500" />
                  <span className="text-[13px] font-bold text-neutral-500">/ شهر</span>
                </div>

                <div className="h-px bg-neutral-300 my-4" />

                <div className="text-[12px] font-bold text-neutral-600">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-neutral-600">
                  <li>Company Profile + 5 Seats</li>
                  <li>Advanced Search + Shortlists</li>
                  <li>Hiring Pipeline</li>
                </ul>
              </div>

              <button
                disabled
                className="w-full h-[46px] rounded-[14px] border border-neutral-300 bg-neutral-200 text-[13px] font-bold text-neutral-500 flex items-center justify-center cursor-not-allowed"
              >
                مغلق مؤقتاً — قريباً
              </button>
            </div>

            {/* Scale Card */}
            <div className="rounded-[24px] border border-neutral-300 bg-neutral-100/90 p-7 flex flex-col justify-between space-y-6 shadow-none">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-neutral-200 px-3.5 py-1 text-[11px] font-bold text-neutral-600">
                  قريباً · Coming soon
                </span>
                <h3 className="text-[22px] font-extrabold text-neutral-700 font-heading">
                  Scale
                </h3>
                <p className="text-[13px] text-neutral-500">
                  للشركات التقنية المتوسطة والمتوسعة
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-neutral-600 font-heading font-mono">14,999</span>
                  <EgpCurrencyIcon className="w-5 h-5 text-neutral-500" />
                  <span className="text-[13px] font-bold text-neutral-500">/ شهر</span>
                </div>

                <div className="h-px bg-neutral-300 my-4" />

                <div className="text-[12px] font-bold text-neutral-600">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-neutral-600">
                  <li>Company Profile + 20 Seats</li>
                  <li>Unlimited Searches & Contacts</li>
                  <li>Custom Assessments Integration</li>
                </ul>
              </div>

              <button
                disabled
                className="w-full h-[46px] rounded-[14px] border border-neutral-300 bg-neutral-200 text-[13px] font-bold text-neutral-500 flex items-center justify-center cursor-not-allowed"
              >
                مغلق مؤقتاً — قريباً
              </button>
            </div>

            {/* Custom Enterprise Card */}
            <div className="rounded-[24px] border border-neutral-300 bg-neutral-100/90 p-7 flex flex-col justify-between space-y-6 shadow-none">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-neutral-200 px-3.5 py-1 text-[11px] font-bold text-neutral-600">
                  قريباً · Coming soon
                </span>
                <h3 className="text-[22px] font-extrabold text-neutral-700 font-heading">
                  Enterprise
                </h3>
                <p className="text-[13px] text-neutral-500">
                  للشركات الكبرى والجامعات والجهات الحكومية
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-neutral-600 font-heading">مخصص</span>
                  <span className="text-[13px] font-bold text-neutral-500">حسب التعاقد</span>
                </div>

                <div className="h-px bg-neutral-300 my-4" />

                <div className="text-[12px] font-bold text-neutral-600">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-neutral-600">
                  <li>Unlimited Seats + SSO & SAML</li>
                  <li>Custom Benchmark Assessments</li>
                  <li>Dedicated Account Team + SLA</li>
                </ul>
              </div>

              <button
                disabled
                className="w-full h-[46px] rounded-[14px] border border-neutral-300 bg-neutral-200 text-[13px] font-bold text-neutral-500 flex items-center justify-center cursor-not-allowed"
              >
                مغلق مؤقتاً — قريباً
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Subscription Checkout & Promo Coupon Modal */}
      <SubscriptionCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        initialPlan={checkoutPlan}
        onSuccess={() => {
          setIsCheckoutOpen(false);
        }}
      />

      <SiteFooter />
    </div>
  );
}
