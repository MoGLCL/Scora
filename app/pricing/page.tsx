"use client";

import React from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Check, Minus } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-16">
        
        {/* HERO / HEADER SECTION */}
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-[12px] font-bold text-[#056B38] font-mono tracking-wide">
              استراتيجية تسعير Scora
            </div>
            <h1 className="text-[36px] md:text-[44px] font-extrabold text-[#05291A] font-heading leading-tight">
              خطط واضحة لكل نوع مستخدم
            </h1>
            <p className="text-[16px] md:text-[17px] text-[#526B5E] leading-relaxed max-w-3xl">
              Scora بتبيع الثقة التقنية: مطور يثبت مستواه، عميل يلاقي الشخص الصح، وشركة توظف على دليل.
            </p>
          </div>

          {/* Callout Notice Box */}
          <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-1.5 shadow-2xs">
            <div className="text-[15px] font-bold text-[#05291A]">
              ملاحظة مهمة: الأسعار المقترحة دي افتراضات أولية لاختبار السوق، وليست حقائق أو أسعارًا مُثبتة.
            </div>
            <div className="text-[13px] text-[#526B5E]">
              الـFree مفيد فعلًا، والمدفوع بيفتح سرعة وعمق وتحكم أكبر.
            </div>
          </div>
        </div>

        {/* SECTION 1: خطط المطورين (Developer Plans - 3 Cards) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
              خطط المطورين
            </h2>
            <p className="text-[14px] text-[#526B5E] mt-1">
              Free لبناء السمعة، Pro للعمق والتحليلات، Verified لإثبات تقني أقوى.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Free Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-7 flex flex-col justify-between space-y-6 shadow-2xs overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#E8FAF0] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  ابدأ مجانًا
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Free
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للمطور اللي بيبدأ يبني سمعته
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading">0</span>
                  <span className="text-[13px] font-bold text-[#526B5E]">جنيه / شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li>Developer Profile + Passport</li>
                  <li>5 مهارات أساسية</li>
                  <li>تقييم تقني واحد / شهر</li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A]">
                  الحدود: 1 Assessment · 1 Retake / شهر
                </div>
              </div>

              <Link
                href="/register"
                className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[13px] font-bold text-[#056B38] transition-all flex items-center justify-center cursor-pointer"
              >
                ابدأ مجانًا
              </Link>
            </div>

            {/* Pro Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-7 flex flex-col justify-between space-y-6 shadow-2xs overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#E8FAF0] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  أفضل قيمة
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Pro
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للمطور اللي عايز بيانات أعمق
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading">249</span>
                  <span className="text-[13px] font-bold text-[#526B5E]">جنيه / شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li>كل مميزات Free</li>
                  <li>4 Assessments + 2 Retakes / شهر</li>
                  <li>AI Feedback + Skill Analytics</li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A]">
                  الحدود: 2 Technical Interviews / شهر
                </div>
              </div>

              <Link
                href="/register"
                className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[13px] font-bold text-[#056B38] transition-all flex items-center justify-center cursor-pointer"
              >
                اختار Pro
              </Link>
            </div>

            {/* Verified Card (Dark Green) */}
            <div className="rounded-[24px] bg-[#056B38] p-7 text-white flex flex-col justify-between space-y-6 shadow-md overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#D4F5E0] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  أعلى ثقة
                </span>
                <h3 className="text-[22px] font-extrabold text-white font-heading">
                  Verified
                </h3>
                <p className="text-[13px] text-[#D4F5E0]">
                  للمطور اللي عايز يثبت نفسه
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-white font-heading">699</span>
                  <span className="text-[13px] font-bold text-[#D4F5E0]">جنيه / تحقق</span>
                </div>

                <div className="h-px bg-white/20 my-4" />

                <div className="text-[12px] font-bold text-[#D4F5E0]">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-white">
                  <li>كل مميزات Pro</li>
                  <li>Technical Interview موثق</li>
                  <li>Verified Skills + Badge</li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#339E61] bg-[#08592E] p-3 text-[12px] font-bold text-white">
                  يشمل Advanced Report + Public Passport URL
                </div>
              </div>

              <Link
                href="/register"
                className="w-full h-[46px] rounded-[14px] bg-[#056B38] border border-white/40 hover:bg-[#08592E] text-[13px] font-bold text-white transition-all flex items-center justify-center cursor-pointer"
              >
                ابدأ التحقق
              </Link>
            </div>

          </div>
        </div>

        {/* SECTION 2: خطط العملاء (Client Plans - 2 Cards) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
              خطط العملاء
            </h2>
            <p className="text-[14px] text-[#526B5E] mt-1">
              تصفح مجاني، وPro للناس اللي بتوظف بانتظام وعايزة قرار أسرع.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Free Client Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-7 flex flex-col justify-between space-y-6 shadow-2xs overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#E8FAF0] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  Freemium
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Free
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للاكتشاف والتقييم الأولي
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading">0</span>
                  <span className="text-[13px] font-bold text-[#526B5E]">جنيه / شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li>Browse + Search Developers</li>
                  <li>View Developer Passport</li>
                  <li>حفظ 10 مطورين</li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#D1E3D6] bg-[#E8FAF0] p-3 text-[12px] font-bold text-[#05291A]">
                  الحدود: 3 Searches · 1 Contact / شهر
                </div>
              </div>

              <Link
                href="/register"
                className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[13px] font-bold text-[#056B38] transition-all flex items-center justify-center cursor-pointer"
              >
                ابدأ مجانًا
              </Link>
            </div>

            {/* Pro Client Card (Dark Green) */}
            <div className="rounded-[24px] bg-[#056B38] p-7 text-white flex flex-col justify-between space-y-6 shadow-md overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#D4F5E0] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  الأكثر اختيارًا
                </span>
                <h3 className="text-[22px] font-extrabold text-white font-heading">
                  Pro
                </h3>
                <p className="text-[13px] text-[#D4F5E0]">
                  للتوظيف المتكرر
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-white font-heading">799</span>
                  <span className="text-[13px] font-bold text-[#D4F5E0]">جنيه / شهر</span>
                </div>

                <div className="h-px bg-white/20 my-4" />

                <div className="text-[12px] font-bold text-[#D4F5E0]">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-white">
                  <li>كل مميزات Free</li>
                  <li>Filters + Comparison + Shortlists</li>
                  <li>AI Matching + Hiring History</li>
                </ul>

                {/* Limit Box */}
                <div className="rounded-[14px] border border-[#339E61] bg-[#08592E] p-3 text-[12px] font-bold text-white">
                  الحدود: 20 Searches · 5 Contacts · 3 Projects / شهر
                </div>
              </div>

              <Link
                href="/register"
                className="w-full h-[46px] rounded-[14px] bg-[#056B38] border border-white/40 hover:bg-[#08592E] text-[13px] font-bold text-white transition-all flex items-center justify-center cursor-pointer"
              >
                اختار Pro
              </Link>
            </div>

          </div>
        </div>

        {/* SECTION 3: خطط المؤسسات المتقدمة · قريباً في التحديثات القادمة */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
              خطط المؤسسات الكبرى (Enterprise) · قريباً في التحديث القادم
            </h2>
            <p className="text-[14px] text-[#526B5E] mt-1">
              تنبيه: جميع الخدمات الحالية بالمنصة متاحة ومجهزة للعملاء والمطورين، وستتوفر باقات المؤسسات الكبرى قريباً.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Startup Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-7 flex flex-col justify-between space-y-6 shadow-2xs overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#E8FAF0] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  Coming soon
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Startup
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  لفريق صغير واحتياج محدود
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading">4,999</span>
                  <span className="text-[13px] font-bold text-[#526B5E]">جنيه / شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li>Company Profile + 5 Seats</li>
                  <li>Advanced Search + Shortlists</li>
                  <li>Hiring Pipeline</li>
                </ul>
              </div>

              <Link
                href="/support"
                className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[13px] font-bold text-[#056B38] transition-all flex items-center justify-center cursor-pointer"
              >
                انضم لقائمة الانتظار
              </Link>
            </div>

            {/* Business Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-7 flex flex-col justify-between space-y-6 shadow-2xs overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#E8FAF0] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  Coming soon
                </span>
                <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  Business
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  للشركات اللي بتوظف بانتظام
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-[#056B38] font-heading">14,999</span>
                  <span className="text-[13px] font-bold text-[#526B5E]">جنيه / شهر</span>
                </div>

                <div className="h-px bg-[#D1E3D6] my-4" />

                <div className="text-[12px] font-bold text-[#526B5E]">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-[#05291A]">
                  <li>كل مميزات Startup</li>
                  <li>AI Candidate Matching</li>
                  <li>Team Collaboration + Analytics</li>
                </ul>
              </div>

              <Link
                href="/support"
                className="w-full h-[46px] rounded-[14px] border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[13px] font-bold text-[#056B38] transition-all flex items-center justify-center cursor-pointer"
              >
                اطلب عرضًا
              </Link>
            </div>

            {/* Enterprise Card (Dark Green) */}
            <div className="rounded-[24px] bg-[#056B38] p-7 text-white flex flex-col justify-between space-y-6 shadow-md overflow-hidden">
              <div className="space-y-3.5">
                <span className="inline-flex rounded-full bg-[#D4F5E0] px-3.5 py-1 text-[11px] font-bold text-[#056B38]">
                  Coming soon
                </span>
                <h3 className="text-[22px] font-extrabold text-white font-heading">
                  Enterprise
                </h3>
                <p className="text-[13px] text-[#D4F5E0]">
                  للحجم والأمان والتكاملات
                </p>

                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-[36px] font-extrabold text-white font-heading">Custom</span>
                  <span className="text-[13px] font-bold text-[#D4F5E0]">حسب الاحتياج</span>
                </div>

                <div className="h-px bg-white/20 my-4" />

                <div className="text-[12px] font-bold text-[#D4F5E0]">المميزات الأساسية</div>
                <ul className="space-y-2.5 text-[13px] text-white">
                  <li>Custom Assessments + Interviews</li>
                  <li>API + ATS + SSO + RBAC</li>
                  <li>SLA + Dedicated Support</li>
                </ul>
              </div>

              <Link
                href="/support"
                className="w-full h-[46px] rounded-[14px] bg-[#056B38] border border-white/40 hover:bg-[#08592E] text-[13px] font-bold text-white transition-all flex items-center justify-center cursor-pointer"
              >
                تواصل مع الفريق
              </Link>
            </div>

          </div>
        </div>

        {/* SECTION 4: فروقات خطط العميل (Perfect Concentric Rounded Table Outer Container) */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
              فروقات خطط العميل
            </h2>
            <p className="text-[14px] text-[#526B5E]">
              المقارنة هنا تخص العميل الفردي فقط: Free وPro.
            </p>
            <p className="text-[12px] font-bold text-[#526B5E] pt-1">
              ✓ Included   ·   محدود Limited   ·   — غير متاح   ·   Custom حسب الاتفاق
            </p>
          </div>

          {/* Table Outer Container with PERFECT concentric corners clipping */}
          <div className="rounded-[24px] border border-[#D1E3D6] bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-right border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#056B38] text-white font-bold">
                  <th className="p-4 text-right w-1/2">الميزة</th>
                  <th className="p-4 text-center w-1/4">Free</th>
                  <th className="p-4 text-center w-1/4">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1E3D6]">
                
                {/* Subsection 1 */}
                <tr className="bg-[#D4F5E0]">
                  <td colSpan={3} className="p-3 px-5 font-bold text-[#056B38]">
                    اكتشاف المطورين
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Browse Developers</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Developer Search</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Search Filters</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Skill Filters</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Experience Filters</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Trust Score Filter</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Skill Points Filter</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>

                {/* Subsection 2 */}
                <tr className="bg-[#D4F5E0]">
                  <td colSpan={3} className="p-3 px-5 font-bold text-[#056B38]">
                    Passport والمقارنة
                  </td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">View Developer Passport</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">View Verified Skills</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Developer Comparison</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Save Developers</td>
                  <td className="p-3 text-center text-[#526B5E]">10</td>
                  <td className="p-3 text-center text-[#526B5E]">50</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Shortlists</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>

                {/* Subsection 3 */}
                <tr className="bg-[#D4F5E0]">
                  <td colSpan={3} className="p-3 px-5 font-bold text-[#056B38]">
                    التوظيف والتواصل
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Contact Developers</td>
                  <td className="p-3 text-center text-[#526B5E]">1/mo</td>
                  <td className="p-3 text-center text-[#526B5E]">5/mo</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Post Projects</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#526B5E]">3</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Manage Projects</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#526B5E]">3</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">AI Developer Matching</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Developer Recommendations</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Hiring History</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Messaging</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Project Reviews</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>

              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[#526B5E]">
            الجدول ده يترجم الـentitlements المقترحة إلى حدود واضحة قابلة للتنفيذ والاختبار.
          </p>
        </div>

        {/* SECTION 5: فروقات خطط الشركات (Perfect Concentric Rounded Table Outer Container) */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
              فروقات خطط الشركات
            </h2>
            <p className="text-[14px] text-[#526B5E]">
              المقارنة هنا تخص فرق التوظيف: Startup، Business، Enterprise.
            </p>
            <p className="text-[12px] font-bold text-[#526B5E] pt-1">
              ✓ Included   ·   محدود Limited   ·   — غير متاح   ·   Custom حسب الاتفاق
            </p>
          </div>

          {/* Table Outer Container with PERFECT concentric corners clipping */}
          <div className="rounded-[24px] border border-[#D1E3D6] bg-white shadow-2xs overflow-hidden">
            <table className="w-full text-right border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#056B38] text-white font-bold">
                  <th className="p-4 text-right w-[40%]">الميزة</th>
                  <th className="p-4 text-center w-[20%]">Startup</th>
                  <th className="p-4 text-center w-[20%]">Business</th>
                  <th className="p-4 text-center w-[20%]">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D1E3D6]">
                
                {/* Category 1 */}
                <tr className="bg-[#D4F5E0]">
                  <td colSpan={4} className="p-3 px-5 font-bold text-[#056B38]">
                    الشركة والتوظيف
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Company Profile</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Team Members</td>
                  <td className="p-3 text-center text-[#526B5E]">5</td>
                  <td className="p-3 text-center text-[#526B5E]">15</td>
                  <td className="p-3 text-center text-[#05291A] font-bold">Custom</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Developer Search</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Advanced Search</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Skill + Trust Filters</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Candidate Shortlisting</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Hiring Pipeline</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Candidate Comparison</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>

                {/* Category 2 */}
                <tr className="bg-[#D4F5E0]">
                  <td colSpan={4} className="p-3 px-5 font-bold text-[#056B38]">
                    التقييمات والمقابلات
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Technical Assessments</td>
                  <td className="p-3 text-center text-[#526B5E]">10/mo</td>
                  <td className="p-3 text-center text-[#526B5E]">50/mo</td>
                  <td className="p-3 text-center text-[#05291A] font-bold">Custom</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Custom Assessments</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Technical Interviews</td>
                  <td className="p-3 text-center text-[#526B5E]">10/mo</td>
                  <td className="p-3 text-center text-[#526B5E]">50/mo</td>
                  <td className="p-3 text-center text-[#05291A] font-bold">Custom</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Interview Evaluation</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>

                {/* Category 3 */}
                <tr className="bg-[#D4F5E0]">
                  <td colSpan={4} className="p-3 px-5 font-bold text-[#056B38]">
                    الذكاء والتحليلات والتعاون
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">AI Candidate Matching</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Candidate Analytics</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Team Collaboration</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Hiring Analytics</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>

                {/* Category 4 */}
                <tr className="bg-[#D4F5E0]">
                  <td colSpan={4} className="p-3 px-5 font-bold text-[#056B38]">
                    APIs والتكاملات
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">API Access</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Developer Passport Verification API</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Recruitment API + Webhooks</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">ATS / Custom Integrations</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>

                {/* Category 5 */}
                <tr className="bg-[#D4F5E0]">
                  <td colSpan={4} className="p-3 px-5 font-bold text-[#056B38]">
                    الأمان والدعم
                  </td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">SSO</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Role-Based Access Control</td>
                  <td className="p-3 text-center text-[#B8700F] font-bold">محدود</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Audit Logs</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Dedicated Support</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-white">
                  <td className="p-3 px-5 font-bold text-[#05291A]">SLA</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>
                <tr className="bg-[#FBFEFC]">
                  <td className="p-3 px-5 font-bold text-[#05291A]">Custom Branding</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#526B5E]">—</td>
                  <td className="p-3 text-center text-[#056B38] font-bold">✓</td>
                </tr>

              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[#526B5E]">
            الجدول ده يترجم الـentitlements المقترحة إلى حدود واضحة قابلة للتنفيذ والاختبار.
          </p>
        </div>

        {/* SECTION 6: منطق التسعير (Pricing Logic Cards) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
              منطق التسعير
            </h2>
            <p className="text-[14px] text-[#526B5E] mt-1">
              كل نوع مستخدم بيدفع مقابل نتيجة مختلفة، مش مجرد access لميزات أكتر.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3.5 shadow-2xs overflow-hidden">
              <span className="inline-flex rounded-full bg-[#E8FAF0] px-3 py-1 text-[11px] font-bold text-[#056B38]">
                DEVELOPERS
              </span>
              <h3 className="text-[18px] font-bold text-[#05291A]">
                خطط المطورين: مجاني + احترافي + توثيق
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                خلّي البروفايل والـPassport الأساسيين مجانيين عشان نكبر شبكة المواهب.
              </p>
              
              <div className="pt-3 space-y-2 text-[13px] border-t border-neutral-100">
                <div className="text-[12px] font-bold text-[#056B38]">دافع الترقية</div>
                <div className="text-[#05291A]">زيادة التقييمات، AI feedback، analytics، والظهور الموثوق.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">فرضية السعر</div>
                <div className="text-[#05291A]">Pro: 199–299 جنيه/شهر · Verified: 599–899 جنيه/تحقق.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">المقياس</div>
                <div className="text-[#05291A]">Assessment completion → Verified profile views → Hire conversations.</div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3.5 shadow-2xs overflow-hidden">
              <span className="inline-flex rounded-full bg-[#E8FAF0] px-3 py-1 text-[11px] font-bold text-[#056B38]">
                INDIVIDUAL CLIENTS
              </span>
              <h3 className="text-[18px] font-bold text-[#05291A]">
                خطط العملاء: مجاني + احترافي
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                التصفح الأساسي مجاني عشان العميل يلمس قيمة Scora قبل الدفع.
              </p>
              
              <div className="pt-3 space-y-2 text-[13px] border-t border-neutral-100">
                <div className="text-[12px] font-bold text-[#056B38]">دافع الترقية</div>
                <div className="text-[#05291A]">فلترة أعمق، مقارنة، shortlists، AI matching، وتواصل أكتر.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">فرضية السعر</div>
                <div className="text-[#05291A]">Pro: 699–999 جنيه/شهر حسب عدد الـcontacts والمشاريع.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">المقياس</div>
                <div className="text-[#05291A]">Search → Passport view → Contact → Project start.</div>
              </div>
            </div>

            {/* Card 3 (Dark Green) */}
            <div className="rounded-[20px] bg-[#056B38] p-6 text-white space-y-3.5 shadow-md overflow-hidden">
              <span className="inline-flex rounded-full bg-[#D4F5E0] px-3 py-1 text-[11px] font-bold text-[#056B38]">
                COMPANIES · FUTURE
              </span>
              <h3 className="text-[18px] font-bold text-white">
                خطط الشركات: مقاعد + استخدام + Enterprise
              </h3>
              <p className="text-[13px] text-[#D4F5E0] leading-relaxed">
                الشركات بتدفع مقابل efficiency، governance، والأمان على نطاق أكبر.
              </p>
              
              <div className="pt-3 space-y-2 text-[13px] border-t border-white/20">
                <div className="text-[12px] font-bold text-[#D4F5E0]">دافع الترقية</div>
                <div className="text-white">فريق أكبر، assessments أكتر، analytics، APIs، وSSO.</div>

                <div className="text-[12px] font-bold text-[#D4F5E0] pt-1">فرضية السعر</div>
                <div className="text-white">Startup: 4,999+ · Business: 14,999+ · Enterprise: Custom.</div>

                <div className="text-[12px] font-bold text-[#D4F5E0] pt-1">إيرادات مستقبلية</div>
                <div className="text-white">Project commissions · Premium verification · APIs · Enterprise contracts.</div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 7: رحلة الترقية (Upgrade Journey) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
              رحلة الترقية
            </h2>
            <p className="text-[14px] text-[#526B5E] mt-1">
              الترقية تحصل لما المستخدم يواجه حد واضح، ويفتح capability بتأثر على نتيجة حقيقية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Developer Journey */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-[#E8FAF0] p-6 space-y-3.5 overflow-hidden">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#056B38] border border-[#D1E3D6]/60">
                DEVELOPER
              </span>
              <h3 className="text-[20px] font-extrabold text-[#056B38] font-heading">
                مجاني ← احترافي ← موثّق
              </h3>
              
              <div className="space-y-2.5 text-[13px] pt-1">
                <div className="text-[12px] font-bold text-[#056B38]">المشكلة الحالية</div>
                <div className="text-[#05291A]">التقييمات قليلة، والدليل على المهارة مش كفاية.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">الفتح الجديد</div>
                <div className="text-[#05291A]">Assessments أعمق، feedback، badge، وPassport أقوى.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">القيمة</div>
                <div className="text-[#05291A] font-bold">Trust أعلى ← ظهور أفضل ← فرص توظيف أكتر.</div>
              </div>
            </div>

            {/* Client Journey */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-[#E8FAF0] p-6 space-y-3.5 overflow-hidden">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#056B38] border border-[#D1E3D6]/60">
                CLIENT
              </span>
              <h3 className="text-[20px] font-extrabold text-[#056B38] font-heading">
                مجاني ← احترافي
              </h3>
              
              <div className="space-y-2.5 text-[13px] pt-1">
                <div className="text-[12px] font-bold text-[#056B38]">المشكلة الحالية</div>
                <div className="text-[#05291A]">وقت طويل في البحث وتواصل محدود.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">الفتح الجديد</div>
                <div className="text-[#05291A]">Filters، comparison، AI matching، وcontacts أكتر.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">القيمة</div>
                <div className="text-[#05291A] font-bold">قرار أسرع + تكلفة بحث أقل + confidence أعلى.</div>
              </div>
            </div>

            {/* Company Journey */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-[#E8FAF0] p-6 space-y-3.5 overflow-hidden">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[#056B38] border border-[#D1E3D6]/60">
                COMPANY
              </span>
              <h3 className="text-[20px] font-extrabold text-[#056B38] font-heading">
                بداية ← أعمال ← مؤسسي
              </h3>
              
              <div className="space-y-2.5 text-[13px] pt-1">
                <div className="text-[12px] font-bold text-[#056B38]">المشكلة الحالية</div>
                <div className="text-[#05291A]">التنسيق والأمان والتقارير مش كفاية مع الحجم.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">الفتح الجديد</div>
                <div className="text-[#05291A]">Seats، pipeline، APIs، SSO، SLA، وcustom integrations.</div>

                <div className="text-[12px] font-bold text-[#056B38] pt-1">القيمة</div>
                <div className="text-[#05291A] font-bold">Hiring throughput أعلى + governance أوضح.</div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 8: قرارات المنتج (Product Decisions) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[28px] font-extrabold text-[#05291A] font-heading">
              قرارات المنتج
            </h2>
            <p className="text-[14px] text-[#526B5E] mt-1">
              الفصل بين اللي قررناه، اللي بنقترحه، واللي لسه محتاج validation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Confirmed */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3.5 shadow-2xs overflow-hidden">
              <span className="inline-flex rounded-full bg-[#D4F5E0] px-3 py-1 text-[11px] font-bold text-[#056B38]">
                CONFIRMED
              </span>
              <h3 className="text-[17px] font-bold text-[#05291A]">
                المجاني مفيد فعلاً
              </h3>
              <p className="text-[13px] text-[#526B5E]">
                Trust Score وSkill Points وDeveloper Passport في قلب التجربة.
              </p>
              <p className="text-[13px] text-[#05291A] pt-3 border-t border-neutral-100">
                التحقق differentiator أساسي، والمطور مش بيتعاقب عشان بيستخدم AI. Individual clients أبسط من الشركات.
              </p>
            </div>

            {/* Proposed */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3.5 shadow-2xs overflow-hidden">
              <span className="inline-flex rounded-full bg-[#E8FAF0] px-3 py-1 text-[11px] font-bold text-[#056B38]">
                PROPOSED
              </span>
              <h3 className="text-[17px] font-bold text-[#05291A]">
                فروقات السعر
              </h3>
              <p className="text-[13px] text-[#526B5E]">
                Advanced reports، priority visibility، AI matching، وusage limits واضحة.
              </p>
              <p className="text-[13px] text-[#05291A] pt-3 border-t border-neutral-100">
                كل tier يفتح نتيجة قابلة للقياس، مش feature fragmentation. الأرقام الحالية hypotheses لاختبار conversion.
              </p>
            </div>

            {/* Future */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3.5 shadow-2xs overflow-hidden">
              <span className="inline-flex rounded-full bg-[#E8FAF0] px-3 py-1 text-[11px] font-bold text-[#056B38]">
                FUTURE
              </span>
              <h3 className="text-[17px] font-bold text-[#05291A]">
                التوسع والمنظومة
              </h3>
              <p className="text-[13px] text-[#526B5E]">
                ATS integrations، Passport verification API، webhooks، SSO، custom branding.
              </p>
              <p className="text-[13px] text-[#05291A] pt-3 border-t border-neutral-100">
                الشركات تظهر كـComing soon لحد ما نثبت core P2P. أي إضافة جديدة لازم تعزز credibility أو hiring efficiency.
              </p>
            </div>

          </div>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
