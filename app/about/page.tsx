"use client";

import React from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShieldCheck, Target, Users, Award, Sparkles, ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-16">
        
        {/* HERO SECTION */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-14 text-center space-y-6 shadow-2xs">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
            <Sparkles className="w-4 h-4 text-[#056B38]" />
            <span>عن المنصة · About Scora</span>
          </div>

          <h1 className="text-[34px] md:text-[48px] font-extrabold text-[#05291A] font-heading leading-tight max-w-3xl mx-auto">
            سكورا — اعرف مين فاهم الكود بجد
          </h1>

          <p className="text-[16px] text-[#526B5E] max-w-2xl mx-auto leading-relaxed">
            أول منصة توظيف تقني قائمة على الجواز الرقمي الموثق وتقييمات جودة الكود البرمجي الفعلية بدلاً من السير الذاتية التقليدية.
          </p>
        </div>

        {/* FEATURES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <h3 className="text-[20px] font-bold text-[#05291A] font-heading">
              رؤيتنا
            </h3>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              إلغاء التقييمات الشفهية والتحيز التقليدي في التوظيف التقني، وتوفير بيئة اختبار موضوعية تعتمد على جودة الكود ونقاط الثقة.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-[20px] font-bold text-[#05291A] font-heading">
              الجواز الرقمي (Passport)
            </h3>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              وثيقة برمجية تشفيرية تعبر عن المهارات الحقيقية للمطور، موثقة بنقاط SP واختبارات برمجة فعلية.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-[20px] font-bold text-[#05291A] font-heading">
              مجتمع الشركات والمطورين
            </h3>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              توفير قناة تواصل وتوظيف مباشرة بين أفضل الكفاءات البرمجية والشركات التقنية الباحثة عن الجودة.
            </p>
          </div>

        </div>

        {/* CTA BANNER */}
        <div className="rounded-[28px] bg-[#056B38] text-white p-8 md:p-12 text-center space-y-6 shadow-md">
          <h2 className="text-[28px] md:text-[36px] font-extrabold font-heading">
            جاهز للانضمام ونيل جوازك البرمجي الموثق؟
          </h2>
          <p className="text-[15px] text-[#D4F5E0] max-w-xl mx-auto">
            سجل الآن مجاناً وابدأ في إجراء التقييمات البرمجية لتصل أفكارك وكودك لأكبر الشركات.
          </p>
          <div className="pt-2">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#056B38] hover:bg-neutral-100 px-8 py-3.5 text-[14px] font-bold transition-all shadow-sm"
            >
              <span>أكمل جوازك الرقمي الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
