"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Code,
  CheckCircle2,
  Clock,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Play
} from "lucide-react";

export default function AssessmentsPage() {
  const [activeTab, setActiveTab] = useState<"all" | "web" | "backend" | "ai">("all");

  const assessments = [
    {
      id: "1",
      title: "React.js & State Management Assessment",
      category: "web",
      duration: "45 دقيقة",
      skillPoints: "150 SP",
      difficulty: "متوسط (Intermediate)",
      description: "اختبار عملي لبناء مكونات تفاعلية، إدارة الـ Context والحالة وتطوير أداء مكونات الواجهة.",
      status: "م متاح الآن",
    },
    {
      id: "2",
      title: "Node.js REST API & Database Optimization",
      category: "backend",
      duration: "60 دقيقة",
      skillPoints: "200 SP",
      difficulty: "متقدم (Advanced)",
      description: "تقييم أداء قواعد البيانات وسرعة استجابة السيرفر وتصميم الـ Endpoints الآمنة.",
      status: "م متاح الآن",
    },
    {
      id: "3",
      title: "Python Data Structures & Algorithm Assessment",
      category: "ai",
      duration: "30 دقيقة",
      skillPoints: "100 SP",
      difficulty: "أساسي (Fundamentals)",
      description: "حل مشكلات برمجة الهياكل والخوارزميات الأساسية في بيئة تشغيل آمنة.",
      status: "م متاح الآن",
    },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-12">
        
        {/* HERO SECTION */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-12 text-center space-y-4 shadow-2xs">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
            <Code className="w-4 h-4 text-[#056B38]" />
            <span>التقييمات البرمجية · Scora Assessments</span>
          </div>

          <h1 className="text-[32px] md:text-[44px] font-extrabold text-[#05291A] font-heading leading-tight max-w-3xl mx-auto">
            أثبت خبرتك البرمجية واجمع نقاط الـ SP والجواز الموثق
          </h1>

          <p className="text-[15px] text-[#526B5E] max-w-2xl mx-auto leading-relaxed">
            اختبارات كود عملية تعتمد على بيئة تشغيل آمنة لتوليد نقاط ثقة موثوقة في ملفك الشخصي.
          </p>
        </div>

        {/* ASSESSMENTS LIST */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-extrabold text-[#05291A] font-heading">
              الاختبارات البرمجية المتاحة ({assessments.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {assessments.map((item) => (
              <div
                key={item.id}
                className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-4 hover:border-[#056B38] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#056B38] bg-[#E8FAF0] px-3 py-1 rounded-full">
                      {item.skillPoints}
                    </span>
                    <span className="text-[12px] text-[#526B5E] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{item.duration}</span>
                    </span>
                  </div>

                  <h3 className="text-[18px] font-bold text-[#05291A] font-heading">
                    {item.title}
                  </h3>

                  <p className="text-[13px] text-[#526B5E] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#D1E3D6]/60">
                  <button
                    type="button"
                    onClick={() => alert("جاري فتح بيئة الاختبارات البرمجية...")}
                    className="w-full h-[44px] rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>بدء الاختبار الآن</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
