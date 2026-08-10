"use client";

import React from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ShieldCheck, Lock, Eye, Server } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-12">
        
        {/* HERO SECTION */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-12 text-center space-y-4 shadow-2xs">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
            <Lock className="w-4 h-4 text-[#056B38]" />
            <span>سياسة الخصوصية · Privacy Policy</span>
          </div>

          <h1 className="text-[32px] md:text-[44px] font-extrabold text-[#05291A] font-heading leading-tight max-w-3xl mx-auto">
            سرية وبياناتك الشخصية أولوية قصوى لدينا
          </h1>

          <p className="text-[15px] text-[#526B5E] max-w-2xl mx-auto leading-relaxed">
            نحن نلتزم بحماية بياناتك الشخصية وتشفير نتائج تقييمات الكود البرمجي بأعلى معايير الأمان والتوافق.
          </p>
        </div>

        {/* PRIVACY SECTIONS */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3 text-[#056B38]">
              <Eye className="w-6 h-6" />
              <h2 className="text-[22px] font-extrabold font-heading text-[#05291A]">
                1. البيانات التي نجمعها
              </h2>
            </div>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              نجمع البيانات الضرورية لتوثيق الجواز الرقمي (الاسم، البريد الإلكتروني، رابط GitHub، التخصص الأكاديمي، نتائج الاختبارات البرمجية) لتوليد شارات نقاط الثقة الموثقة.
            </p>
          </div>

          <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 space-y-4 shadow-2xs">
            <div className="flex items-center gap-3 text-[#056B38]">
              <Server className="w-6 h-6" />
              <h2 className="text-[22px] font-extrabold font-heading text-[#05291A]">
                2. تشفير وحماية البيانات
              </h2>
            </div>
            <p className="text-[14px] text-[#526B5E] leading-relaxed">
              يتم تشفير جميع الاتصالات والبيانات أثناء النقل والتخزين برمز تشفير SSL 256-bit، مع تطبيق بروتوكولات حماية صارمة تمنع الوصول غير المصرح به.
            </p>
          </div>

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
