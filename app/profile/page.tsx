"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import {
  CheckCircle2,
  Share2,
  ArrowLeft,
  Wifi,
  Check,
  X,
  Copy,
  ShieldCheck,
} from "lucide-react";

export default function DeveloperProfilePage() {
  const { developer, addToast } = useProfile();
  const [showPassportModal, setShowPassportModal] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      addToast("تم نسخ رابط الملف الشخصي بنجاح!", "success");
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body dir-rtl" dir="rtl">
      {/* Header / Navbar */}
      <SiteHeader />

      {/* Main Content */}
      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-12 w-full flex-1">
        {/* Page Title & Top Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[32px] md:text-[38px] font-bold text-ink font-heading leading-tight">
              الملف الشخصي
            </h1>
            <p className="text-[15px] text-muted mt-1">
              عرّف العملاء بخبرتك، ومؤشرات الثقة، وأخر التقييمات.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-6 py-2.5 text-[14px] font-semibold text-ink hover:bg-neutral-50 transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <span>مشاركة الملف</span>
              <Share2 className="w-4 h-4 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* 2 Columns Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN (2/3 width - 7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* 1. Developer Passport Banner Card */}
            <div id="passport-section" className="rounded-[32px] bg-[#006B2C] p-8 md:p-10 text-white shadow-md relative overflow-hidden">
              <div className="text-[12px] font-bold tracking-wider text-[#A3E9BE] uppercase mb-1">
                SCORA / DEVELOPER 01
              </div>
              <h2 className="text-[32px] md:text-[36px] font-bold font-heading mb-2">
                Developer Passport
              </h2>
              <p className="text-[14px] text-emerald-100 max-w-xl leading-relaxed mb-8">
                ملخص قابل للمشاركة يوضح المهارة والثقة بدون كشف تفاصيل التقييم الداخلية.
              </p>

              {/* 3 Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="rounded-2xl bg-[#004021]/60 backdrop-blur-sm p-4 text-center border border-white/10">
                  <div className="text-[12px] text-emerald-200 font-medium mb-1">Status</div>
                  <div className="text-[20px] md:text-[22px] font-bold text-white">{developer.status}</div>
                </div>

                <div className="rounded-2xl bg-[#004021]/60 backdrop-blur-sm p-4 text-center border border-white/10">
                  <div className="text-[12px] text-emerald-200 font-medium mb-1">Trust Score</div>
                  <div className="text-[20px] md:text-[22px] font-bold text-white">{developer.trustScore} / 100</div>
                </div>

                <div className="rounded-2xl bg-[#004021]/60 backdrop-blur-sm p-4 text-center border border-white/10">
                  <div className="text-[12px] text-emerald-200 font-medium mb-1">Skill Points</div>
                  <div className="text-[20px] md:text-[22px] font-bold text-white">{developer.skillPoints} SP</div>
                </div>
              </div>
            </div>

            {/* 2. Core Verified Skills Card */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[22px] font-bold text-ink font-heading">
                    المهارات الأساسية
                  </h3>
                  <p className="text-[13px] text-muted mt-0.5">
                    مهارات تم التحقق منها عبر التقييمات.
                  </p>
                </div>
                <Link
                  href="/profile/edit"
                  className="text-[14px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>تعديل المهارات</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>

              {/* Skill Badges Pills */}
              <div className="flex flex-wrap gap-3 mb-6">
                {developer.skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center justify-center rounded-full bg-[#EBF7EF] px-5 py-2.5 text-[14px] font-bold text-[#0E6D3B] hover:bg-[#D8F0E1] transition-all cursor-pointer"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="text-[12px] text-muted border-t border-neutral-100 pt-4 flex items-center gap-2">
                <span>آخر تحديث للمهارات منذ 12 يوماً</span>
                <span>•</span>
                <span>{developer.skills.length} مهارات موثّقة</span>
              </div>
            </div>

            {/* 3. Latest Assessments Section */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[22px] font-bold text-ink font-heading">
                    آخر التقييمات
                  </h3>
                  <p className="text-[13px] text-muted mt-0.5">
                    النتائج الظاهرة للعملاء فقط.
                  </p>
                </div>
                <Link
                  href="/assessments"
                  className="text-[14px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>كل التقييمات</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>

              {/* Assessment List */}
              <div className="space-y-4">
                {developer.assessments.map((assessment) => (
                  <div key={assessment.id} className="flex items-center justify-between p-5 bg-[#F7FAF8] rounded-[24px] border border-neutral-200/60">
                    <div>
                      <h4 className="text-[16px] font-bold text-ink">{assessment.title}</h4>
                      <p className="text-[13px] text-muted mt-0.5">{assessment.subtext}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-[13px] font-bold ${
                      assessment.statusType === "success" 
                        ? "bg-[#EBF7EF] text-[#0E6D3B]" 
                        : "bg-[#FFF8E1] text-[#9A6500]"
                    }`}>
                      {assessment.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Applied Job Offers & Proposals Section */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)] space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[22px] font-bold text-ink font-heading">
                    المشاريع والعروض المتقدم لها ({developer.appliedProjects?.length || 0})
                  </h3>
                  <p className="text-[13px] text-muted mt-0.5">
                    متابعة حالة العروض والوظائف التي قدمت عليها.
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="text-[14px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>استكشاف المشاريع</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {developer.appliedProjects && developer.appliedProjects.length > 0 ? (
                  developer.appliedProjects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-5 bg-[#F7FAF8] rounded-[24px] border border-neutral-200/60 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/60 pb-3">
                        <div>
                          <h4 className="text-[16px] font-bold text-ink">{proj.title}</h4>
                          <p className="text-[12px] text-muted mt-0.5">{proj.clientName} · {proj.appliedDate}</p>
                        </div>
                        {/* Explicit Offer Status Badge */}
                        <span className={`inline-flex items-center rounded-full px-3.5 py-1 text-[12px] font-bold shrink-0 ${
                          proj.status === "تم القبول والتكليف"
                            ? "bg-emerald-600 text-white"
                            : proj.status === "مفتوح لتلقي العروض"
                            ? "bg-[#EBF7EF] text-[#0E6D3B]"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          حالة العرض: {proj.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[13px]">
                        <div className="flex items-center gap-2 text-muted">
                          <span>العرض المقدم: <strong className="text-[#0E6D3B] font-bold">{proj.proposedPrice}</strong></span>
                          <span>•</span>
                          <span>المدة: <strong>{proj.deliveryDays}</strong></span>
                        </div>
                        <Link href={`/projects/${proj.id}`} className="font-bold text-[#0E6D3B] hover:underline">
                          عرض التفاصيل
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-[14px] text-muted">
                    لم تقم بالتقديم على أي مشاريع بعد.
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Sidebar 1/3 width - 5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* 1. Developer Overview Card */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 text-center shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              {/* Avatar */}
              <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#EBF7EF] border-2 border-[#C5E8D1] text-[32px] font-bold text-[#0E6D3B]">
                {developer.avatarUrl ? (
                  <img src={developer.avatarUrl} alt={developer.fullName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  getInitials(developer.fullName)
                )}
                <span className={`absolute bottom-1 right-1 h-5 w-5 rounded-full ${developer.availability === "available" ? "bg-emerald-500" : "bg-red-500"} ring-4 ring-white`} />
              </div>

              {/* Name & Checkmark */}
              <div className="flex items-center justify-center gap-2 mb-1">
                <h2 className="text-[24px] font-bold text-ink font-heading">
                  {developer.fullName}
                </h2>
                <CheckCircle2 className="w-6 h-6 text-[#0E6D3B] fill-[#EBF7EF]" />
              </div>

              <p className="text-[14px] font-semibold text-neutral-600 mb-1">
                {developer.jobTitle}
              </p>
              <div className="flex items-center justify-center gap-2 text-[13px] text-muted mb-6">
                <span>{developer.location}</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                  <span className={`h-2 w-2 rounded-full ${developer.availability === "available" ? "bg-emerald-500" : "bg-red-500"}`} />
                  {developer.availability === "available" ? "متاح للمشاريع" : "غير متاح حالياً"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPassportModal(true);
                    addToast("تم فتح معاينة الباسبور الرقمي", "info");
                  }}
                  className="w-full h-[48px] rounded-full border border-neutral-300 bg-white text-[14px] font-bold text-ink hover:bg-neutral-50 transition-all cursor-pointer active:scale-95"
                >
                  عرض الباسبور
                </button>
                <Link
                  href="/profile/edit"
                  className="w-full h-[48px] rounded-full bg-[#0E6D3B] hover:bg-[#005B27] text-[14px] font-bold text-white transition-all cursor-pointer shadow-xs flex items-center justify-center active:scale-95"
                >
                  تعديل الملف
                </Link>
              </div>
            </div>

            {/* 2. About Me Card */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <h3 className="text-[20px] font-bold text-ink font-heading mb-3">
                نبذة عن المطور
              </h3>
              <p className="text-[14px] text-neutral-600 leading-relaxed mb-6 whitespace-pre-line">
                {developer.bio}
              </p>

              <div className="border-t border-neutral-100 pt-4 text-[12px] font-bold text-[#0E6D3B]">
                الثقة مبنية على تقييمات قابلة للتحقق، وليست على عدد سنوات الخبرة فقط.
              </div>
            </div>

            {/* 3. Latest Projects Card */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[20px] font-bold text-ink font-heading">
                    آخر المشاريع
                  </h3>
                  <p className="text-[13px] text-muted mt-0.5">
                    نماذج مختارة من أعمالي الأخيرة.
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="text-[13px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>عرض الكل</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Projects List */}
              <div className="space-y-4">
                {developer.projects.map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-4 bg-[#F7FAF8] rounded-[24px] border border-neutral-200/60">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded-xl bg-[#006B2C] flex items-center justify-center text-white text-xs font-mono">
                        <div className="w-6 h-3 bg-white/30 rounded-sm" />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-ink">{project.title}</h4>
                        <p className="text-[12px] text-muted">{project.subtext}</p>
                        <div className="flex gap-1.5 mt-1">
                          {project.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-white border border-neutral-200 px-2 py-0.5 text-[10px] font-bold text-neutral-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#EBF7EF] flex items-center justify-center text-[#0E6D3B]">
                      {project.iconType === "wifi" ? <Wifi className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Passport Preview Modal */}
      {showPassportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-[32px] bg-white p-8 text-center shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPassportModal(false)}
              className="absolute top-6 left-6 text-neutral-400 hover:text-ink transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-14 h-14 rounded-full bg-[#EBF7EF] text-[#0E6D3B] flex items-center justify-center text-2xl font-bold mx-auto mb-4 border border-[#C5E8D1]">
              <ShieldCheck className="w-8 h-8 text-[#0E6D3B]" />
            </div>

            <h3 className="text-[22px] font-bold text-ink font-heading mb-1">
              SCORA Verified Passport
            </h3>
            <p className="text-[13px] text-muted mb-6">
              الجواز الرقمي الموثق تشفيرياً للمطور {developer.fullName}
            </p>

            <div className="rounded-2xl bg-[#006B2C] p-6 text-white text-right mb-6 shadow-inner">
              <div className="text-[11px] text-emerald-200 mb-1">HASH: 0x7f8a9b2c4e1d...3e91</div>
              <div className="text-[18px] font-bold mb-2">{developer.fullName}</div>
              <div className="text-[12px] opacity-90 mb-4">{developer.jobTitle}</div>
              <div className="flex justify-between items-center text-[12px] border-t border-white/20 pt-3">
                <span>Trust Score: {developer.trustScore}/100</span>
                <span className="font-bold bg-white text-[#0E6D3B] px-3 py-1 rounded-full text-[11px]">{developer.status}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowPassportModal(false);
                handleShare();
              }}
              className="w-full h-[48px] rounded-full bg-primary hover:bg-[#005B27] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>نسخ رابط الجواز التفاعلي</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
