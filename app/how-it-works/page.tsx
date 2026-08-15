"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  ShieldCheck,
  Code,
  Sparkles,
  Award,
  Briefcase,
  CheckCircle2,
  ArrowLeft,
  Search,
  Cpu,
  Lock,
  Zap,
} from "lucide-react";

export default function HowItWorksPage() {
  const stepsForDevelopers = [
    {
      num: "01",
      title: "إنشاء الحساب والجواز الرقمي",
      desc: "سجل حسابك كمطور وابدأ بإنشاء جواز السفر البرمجي الموثق، مع ربط مستودعات GitHub والمستندات الخاصة بك.",
      icon: Code,
    },
    {
      num: "02",
      title: "التقييم الفعلي ومحرك AI Trust Engine",
      desc: "يقوم محرك الذكاء الاصطناعي الخاص بسكورا بتركيب وتحليل جودة الكود البرمجي ومعالجة الأخطاء لمنحك نقاط مهارة SP ودرجة ثقة موثوقة.",
      icon: Cpu,
    },
    {
      num: "03",
      title: "التقديم على المشاريع وتلقي العروض",
      desc: "تصفح المشاريع المفتوحة وقدم عروضك بالأسعار والمدد الزمنية، أو استقبل طلبات توظيف مباشرة من أصحاب الشركات.",
      icon: Briefcase,
    },
    {
      num: "04",
      title: "التسليم واستلام المستحقات بأمان",
      desc: "بعد فحص الكود واجتياز معايير الجودة، يتم تحرير المستحقات المالية فورياً إلى حسابك بنسبة حماية 100%.",
      icon: ShieldCheck,
    },
  ];

  const stepsForClients = [
    {
      num: "01",
      title: "نشر تفاصيل المشروع أو البحث عن المطورين",
      desc: "اكتب متطلبات مشروعك والميزانية، أو ابحث في دليل المطورين المعتمدين والمفلترين حسب نقاط الثقة والخبرة.",
      icon: Search,
    },
    {
      num: "02",
      title: "اختيار المطور الموثوق بناءً على نتائج حقيقية",
      desc: "راجع جواز السفر البرمجي الموثق وتقييمات الأكواد الحقيقية بدلاً من الاعتماد على الكلام النظري أو السير الذاتية التقليدية.",
      icon: Award,
    },
    {
      num: "03",
      title: "إيداع المبلغ في رصيد الضمان الآمن",
      desc: "يتم احتجاز ميزانية المشروع في نظام الضمان البنكي الآمن لمنصة سكورا ولا يتم صرفها إلا بعد مراجعة وجودة التسليم.",
      icon: Lock,
    },
    {
      num: "04",
      title: "استلام الكود المراجع والاعتماد النهائي",
      desc: "استلم مشروعك مع تقرير جودة فني معتمد واعتمد تحويل المستحقات للمطور بنقرة واحدة.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="flex-1 space-y-16 md:space-y-24 py-12 md:py-20">
        
        {/* HERO SECTION */}
        <section className="mx-auto max-w-[1296px] px-6 md:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8FAF0] text-[#056B38] text-[13px] font-bold border border-[#D1E3D6]">
            <Sparkles className="w-4 h-4 text-[#056B38]" />
            <span>كيف تعمل منصة سكورا؟ — الدليل الشامل</span>
          </div>

          <h1 className="text-[34px] sm:text-[46px] md:text-[56px] font-extrabold text-[#05291A] font-heading leading-tight max-w-4xl mx-auto">
            اعرف مين فاهم الكود بجد، بدون تخمين أو مخاطرة
          </h1>

          <p className="text-[16px] md:text-[18px] text-[#526B5E] max-w-2xl mx-auto leading-relaxed">
            تجمع منصة سكورا بين تقييم الذكاء الاصطناعي للكود الحقيقي وبيئة العمل الآمنة بين المطورين والشركات للوصول لأفضل نتائج برمجية.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-[#056B38] hover:bg-[#08592E] px-8 text-[15px] font-bold text-white transition-all shadow-md active:scale-95"
            >
              <span>انضم الآن كمطور أو عميل</span>
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <Link
              href="/developers"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full border border-[#D1E3D6] bg-white px-8 text-[15px] font-bold text-[#05291A] hover:bg-[#E8FAF0] transition-all"
            >
              <span>تصفح دليل المطورين</span>
            </Link>
          </div>
        </section>

        {/* FOR DEVELOPERS WORKFLOW */}
        <section className="mx-auto max-w-[1296px] px-6 md:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-[28px] md:text-[38px] font-extrabold text-[#05291A] font-heading">
              رحلة المطور في سكورا (Developers Workflow)
            </h2>
            <p className="text-[14px] text-[#526B5E]">
              كيف ترفع من قيمتك التقنية وتثبت مهارتك بالأرقام الموثقة.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stepsForDevelopers.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="rounded-[28px] border border-[#D1E3D6] bg-[#F7FAF8] p-6 space-y-4 hover:border-[#056B38] transition-all shadow-2xs group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-[16px] bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold group-hover:bg-[#056B38] group-hover:text-white transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[24px] font-extrabold text-[#D1E3D6] font-heading">
                      {step.num}
                    </span>
                  </div>

                  <h3 className="text-[18px] font-bold text-[#05291A] font-heading">
                    {step.title}
                  </h3>

                  <p className="text-[13px] text-[#526B5E] leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FOR CLIENTS WORKFLOW */}
        <section className="bg-[#E8FAF0]/50 py-16 border-y border-[#D1E3D6]/60">
          <div className="mx-auto max-w-[1296px] px-6 md:px-8 space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-[28px] md:text-[38px] font-extrabold text-[#05291A] font-heading">
                رحلة العميل وصاحب العمل (Clients Workflow)
              </h2>
              <p className="text-[14px] text-[#526B5E]">
                كيف تضمن تنفيذ مشروعك بأعلى جودة وبدون مخاطرة مالية.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stepsForClients.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.num}
                    className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 space-y-4 hover:border-[#056B38] transition-all shadow-2xs group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-[16px] bg-[#056B38] text-white flex items-center justify-center font-bold">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[24px] font-extrabold text-[#056B38]/30 font-heading">
                        {step.num}
                      </span>
                    </div>

                    <h3 className="text-[18px] font-bold text-[#05291A] font-heading">
                      {step.title}
                    </h3>

                    <p className="text-[13px] text-[#526B5E] leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* TRUST ENGINE EXPLANATION BANNER */}
        <section className="mx-auto max-w-[1296px] px-6 md:px-8">
          <div className="rounded-[36px] bg-[#05291A] text-white p-8 md:p-14 relative overflow-hidden space-y-6">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-[12px] font-bold">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>محرك التقاط الثقة Scora AI Engine</span>
              </div>

              <h2 className="text-[30px] md:text-[40px] font-extrabold font-heading leading-tight text-white">
                تقييم الأكواد الفعلية بـ AI حقيقي وتجربة بدون كلام نظري
              </h2>

              <p className="text-[14px] md:text-[16px] text-emerald-100/90 leading-relaxed">
                يعتمد النظام على فحص البنية التحتية للأكواد وقراءة مستودعات GitHub وسرعة الاستجابة لمعالجة الأخطاء للحفاظ على درجة ثقة دقيقة (Trust Score) ونقاط مهارة حقيقية (Skill Points SP).
              </p>

              <div className="pt-2">
                <Link
                  href="/register"
                  className="inline-flex h-[48px] items-center justify-center gap-2 rounded-full bg-[#056B38] hover:bg-emerald-600 text-white font-bold text-[14px] px-6 transition-all"
                >
                  <span>جرب المنصة الآن</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
