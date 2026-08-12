"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import {
  LayoutDashboard,
  Award,
  ShieldCheck,
  Briefcase,
  Code,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  Plus,
  ArrowLeft,
  FileText,
  Zap,
  TrendingUp,
  Settings
} from "lucide-react";

export default function DashboardPage() {
  const { userRole, developer, client, addToast } = useProfile();
  const [activeTab, setActiveTab] = useState<"overview" | "assessments" | "projects">("overview");
  const [stats, setStats] = useState<Record<string, number>>({});
  useEffect(() => {
    const load = () => fetch("/api/dashboard", { cache: "no-store" }).then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.stats) setStats(data.stats); });
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const currentName = userRole === "developer" ? developer.fullName : client.fullName;

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-14 w-full flex-1 space-y-10">
        
        {/* WELCOME BANNER & USER ROLE SUMMARY */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-10 space-y-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>لوحة التحكم الرئيسية · Scora Dashboard</span>
              </div>
              <h1 className="text-[28px] md:text-[36px] font-extrabold text-[#05291A] font-heading leading-tight">
                مرحباً بعودتك، {currentName}
              </h1>
              <p className="text-[14px] text-[#526B5E]">
                {userRole === "developer"
                  ? "تابع نقاط ثقة الجواز الرقمي، نتائج التقييمات البرمجية، وطلبات العمل الجديدة."
                  : "إدارة طلبات التوظيف، تصفح المطورين الموثقين، ومتابعة المشاريع الجارية."}
              </p>
            </div>

            {/* Quick Action Banner Button */}
            <div className="flex flex-wrap gap-3 shrink-0">
              {userRole === "developer" ? (
                <>
                  <Link
                    href="/assessments"
                    className="h-[46px] px-6 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[13px] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Code className="w-4 h-4" />
                    <span>بدء تقييم جديد</span>
                  </Link>
                  <Link
                    href="/complete-profile"
                    className="h-[46px] px-6 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] font-bold text-[13px] flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                    <span>تعديل الجواز الرقمي</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/hire-developer"
                    className="h-[46px] px-6 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[13px] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>نشر طلب توظيف جديد</span>
                  </Link>
                  <Link
                    href="/developers"
                    className="h-[46px] px-6 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] font-bold text-[13px] flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#056B38]" />
                    <span>دليل المطورين</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* METRICS CARDS (4 CARDS GRID) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1 */}
          <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3 shadow-2xs hover:border-[#056B38] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#526B5E]">
                {userRole === "developer" ? "التقييمات المكتملة" : "المشاريع النشطة"}
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
                <Code className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-[#05291A] font-heading">
              {userRole === "developer" ? (stats.assessments ?? 0) : (stats.openProjects ?? 0)}
            </div>
            <div className="text-[12px] text-[#056B38] font-bold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>أداء ممتازة هذا الشهر</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3 shadow-2xs hover:border-[#056B38] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#526B5E]">
                {userRole === "developer" ? "نقاط الثقة (Trust Score)" : "المطورون المتصلون"}
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-[#056B38] font-heading">
              {userRole === "developer" ? `${stats.trustScore ?? 0}%` : (stats.developers ?? 0)}
            </div>
            <div className="text-[12px] text-[#526B5E]">
              {userRole === "developer" ? "جواز سفر رقمي موثق" : "مطورون موثقون تشفيرياً"}
            </div>
          </div>

          {/* Card 3 */}
          <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3 shadow-2xs hover:border-[#056B38] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#526B5E]">
                {userRole === "developer" ? "رصيد الـ SP" : "طلبات المقابلات"}
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-[#05291A] font-heading">
              {userRole === "developer" ? `${stats.skillPoints ?? 0} SP` : (stats.proposals ?? 0)}
            </div>
            <div className="text-[12px] text-amber-600 font-bold">
              {userRole === "developer" ? "المستوى المتقدم (Advanced)" : "بانتظار المراجعة"}
            </div>
          </div>

          {/* Card 4 */}
          <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3 shadow-2xs hover:border-[#056B38] transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#526B5E]">
                {userRole === "developer" ? "العروض المستلمة" : "الفواتير والاشتراك"}
              </span>
              <div className="w-10 h-10 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>
            <div className="text-[28px] font-extrabold text-[#05291A] font-heading">
              {userRole === "developer" ? (stats.proposals ?? 0) : (stats.projects ?? 0)}
            </div>
            <div className="text-[12px] text-[#056B38] font-bold">
              {userRole === "developer" ? "من شركات توظيف معتمدة" : "مفعلة حتى نهاية الشهر"}
            </div>
          </div>

        </div>

        {/* DASHBOARD CONTENT TABS & TABLES */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-[#D1E3D6] pb-4">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`text-[15px] font-bold pb-2 transition-all cursor-pointer ${
                  activeTab === "overview"
                    ? "text-[#056B38] border-b-2 border-[#056B38]"
                    : "text-[#526B5E] hover:text-[#05291A]"
                }`}
              >
                نظرة عامة والأنشطة
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("assessments")}
                className={`text-[15px] font-bold pb-2 transition-all cursor-pointer ${
                  activeTab === "assessments"
                    ? "text-[#056B38] border-b-2 border-[#056B38]"
                    : "text-[#526B5E] hover:text-[#05291A]"
                }`}
              >
                {userRole === "developer" ? "سجل التقييمات البرمجية" : "متابعة طلبات التوظيف"}
              </button>
            </div>
          </div>

          {/* OVERVIEW CONTENT */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Recent Activities */}
              <div className="lg:col-span-2 rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-6 shadow-2xs">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                  <h3 className="text-[18px] font-bold text-[#05291A] font-heading">
                    آخر الأنشطة والعمليات
                  </h3>
                  <span className="text-[12px] font-bold text-[#056B38] bg-[#E8FAF0] px-3 py-1 rounded-full">
                    تحديث فوري
                  </span>
                </div>

                <div className="space-y-4">
                  {userRole === "developer" ? (
                    <>
                      <div className="flex items-start justify-between p-4 rounded-[16px] bg-neutral-50 border border-neutral-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-[#05291A]">اجتياز تقييم React.js بنجاح</div>
                            <div className="text-[12px] text-[#526B5E] mt-0.5">حصلت على +150 SP ونقاط ثقة 94%</div>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#526B5E]">منذ ساعتين</span>
                      </div>

                      <div className="flex items-start justify-between p-4 rounded-[16px] bg-neutral-50 border border-neutral-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-[#05291A]">استلام عرض توظيف جديد</div>
                            <div className="text-[12px] text-[#526B5E] mt-0.5">من شركة التقنية الذكية لمشروع Full-Stack</div>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#526B5E]">منذ يوم واحد</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between p-4 rounded-[16px] bg-neutral-50 border border-neutral-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0">
                            <Plus className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-[#05291A]">نشر مشروع Frontend Engineer</div>
                            <div className="text-[12px] text-[#526B5E] mt-0.5">تم استلام 8 عروض من مطورين موثقين</div>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#526B5E]">منذ 3 ساعات</span>
                      </div>

                      <div className="flex items-start justify-between p-4 rounded-[16px] bg-neutral-50 border border-neutral-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-[#05291A]">قبول طلب مقابلة مع مطور</div>
                            <div className="text-[12px] text-[#526B5E] mt-0.5">مع المطور محمد وائل الغنام (92% Trust Score)</div>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#526B5E]">منذ يومين</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Right Column: Quick Links & Support */}
              <div className="space-y-6">
                <div className="rounded-[24px] border border-[#D1E3D6] bg-[#E8FAF0] p-6 space-y-4">
                  <div className="flex items-center gap-2 text-[#056B38] font-bold text-[15px]">
                    <Zap className="w-5 h-5" />
                    <span>مساعدة سريعة وإرشادات</span>
                  </div>
                  <p className="text-[12px] text-[#526B5E] leading-relaxed">
                    هل تحتاج إلى مساعدة في توثيق الجواز الرقمي أو إدارة الاشتراكات؟ تواصل مباشرة مع مركز الدعم.
                  </p>
                  <Link
                    href="/support"
                    className="inline-flex items-center gap-2 text-[13px] font-bold text-[#056B38] hover:underline"
                  >
                    <span>الانتقال لمركز الدعم</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
              </div>

            </div>
          )}

          {/* ASSESSMENTS TAB */}
          {activeTab === "assessments" && (
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-6 shadow-2xs">
              <h3 className="text-[18px] font-bold text-[#05291A] font-heading">
                سجل التقييمات والاختبارات البرمجية
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-[16px] border border-[#D1E3D6] bg-white">
                  <div>
                    <div className="text-[15px] font-bold text-[#05291A]">React.js & State Management Assessment</div>
                    <div className="text-[12px] text-[#526B5E] mt-1">النتيجة: 94% · +150 SP · تم الاجتياز</div>
                  </div>
                  <span className="text-[12px] font-bold bg-[#E8FAF0] text-[#056B38] px-3 py-1 rounded-full">
                    مكتمل وموثق
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-[16px] border border-[#D1E3D6] bg-white">
                  <div>
                    <div className="text-[15px] font-bold text-[#05291A]">Node.js REST API & Database Optimization</div>
                    <div className="text-[12px] text-[#526B5E] mt-1">النتيجة: 89% · +200 SP · تم الاجتياز</div>
                  </div>
                  <span className="text-[12px] font-bold bg-[#E8FAF0] text-[#056B38] px-3 py-1 rounded-full">
                    مكتمل وموثق
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
