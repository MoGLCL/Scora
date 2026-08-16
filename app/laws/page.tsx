"use client";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShieldCheck, Scale, FileText, CheckCircle2, Lock } from "lucide-react";

export default function LawsPage() {
  return (
    <div className="min-h-dvh bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-4 sm:px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-12">
        
        {/* HERO SECTION */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-12 text-center space-y-4 shadow-2xs">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
            <Scale className="w-4 h-4 text-[#056B38]" />
            <span>القوانين واللائحة التنظيمية · Scora Governance</span>
          </div>

          <h1 className="text-[32px] md:text-[44px] font-extrabold text-[#05291A] font-heading leading-tight max-w-3xl mx-auto">
            قوانين وشروط استخدام منصة Scora
          </h1>

          <p className="text-[15px] text-[#526B5E] max-w-2xl mx-auto leading-relaxed">
            الأسس الحاكمة لضمان حقوق المطورين والعملاء، وحماية تقييمات الكود وجدية بيئة العمل الرقمية.
          </p>
        </div>

        {/* ARTICLES CONTENT */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Article 1 */}
          <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3 text-[#056B38]">
              <ShieldCheck className="w-6 h-6" />
              <h2 className="text-[22px] font-extrabold font-heading text-[#05291A]">
                المادة الأولى: مصداقية التقييمات والجواز الرقمي (Passport)
              </h2>
            </div>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              تعتمد منصة Scora حظراً تاماً على أي محاولات لتوليد التقييمات الآلية أو تزييف نتائج الكود. يتعهد المطور بتقديم حلوله البرمجية ذاتياً، وتملك المنصة الحق في تعليق أي حساب يثبت تلاعبه بنقاط الثقة (Trust Score).
            </p>
          </div>

          {/* Article 2 */}
          <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3 text-[#056B38]">
              <Lock className="w-6 h-6" />
              <h2 className="text-[22px] font-extrabold font-heading text-[#05291A]">
                المادة الثانية: حماية الشفرات البرمجية والملكية الفكرية
              </h2>
            </div>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              تظل الشفرات البرمجية والمشاريع المنجزة مملوكة بالكامل للعميل أو المطور وفقاً لعقد التوظيف المحدد. تلتزم Scora بعدم مشاركة الكود المرفوع في بيئة الاختبارات مع أي أطراف خارجية.
            </p>
          </div>

          {/* Article 3 */}
          <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3 text-[#056B38]">
              <FileText className="w-6 h-6" />
              <h2 className="text-[22px] font-extrabold font-heading text-[#05291A]">
                المادة الثالثة: الالتزام بالتعاقد والمدفوعات
              </h2>
            </div>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              يتم حفظ مستحقات المطورين في نظام إيداع آمن لحين إنجاز واستلام المستخرجات البرمجية المتفق عليها في طلب الشغل، مع ضمان 14 يوماً لاسترجاع اشتراكات الباقات المدفوعة.
            </p>
          </div>

          {/* Article 4: Data Collection of Code Evaluations & Interviews */}
          <div className="rounded-[24px] border border-[#D1E3D6] bg-[#E8FAF0]/50 p-8 space-y-4 shadow-2xs border-l-4 border-l-[#056B38]">
            <div className="flex items-center gap-3 text-[#056B38]">
              <CheckCircle2 className="w-6 h-6" />
              <h2 className="text-[22px] font-extrabold font-heading text-[#05291A]">
                المادة الرابعة: الشروط وسياسة جمع ومعالجة بيانات التقييمات والمقابلات لضمان مصداقية التوظيف
              </h2>
            </div>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              يقر ويوافق كافة مستخدمي المنصة عند التسجيل على أن Scora تقوم بتوثيق وجمع نتائج الاختبارات الفنية، والتقييمات البرمجية الآلية، وتفريغ جلسات المقابلات البرمجية، والأداء التقني المنجز داخل المنصة. يتم حفظ هذه البيانات في سجلك المعتمد (Verified Skill Passport) كإثبات موثق برمجياً لحفظ مصداقية التوظيف، وتوفير أدلة أداء حقيقية للشركات وأصحاب الأعمال في حال رغبتهم في التعاقد والتوظيف المباشر.
            </p>
          </div>

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
