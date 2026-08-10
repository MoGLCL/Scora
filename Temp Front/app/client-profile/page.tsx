"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import { Share2, ArrowLeft, Wifi, Check, MessageSquare } from "lucide-react";

export default function ClientProfilePage() {
  const { client, addToast } = useProfile();

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      addToast("تم نسخ رابط ملف العميل بنجاح!", "success");
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
              ملف العمـيل
            </h1>
            <p className="text-[15px] text-muted mt-1">
              اعرض خبرتك في التوظيف والمشاريع التي تعمل عليها.
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
            
            {/* 1. Hiring Summary Banner Card */}
            <div className="rounded-[32px] bg-[#006B2C] p-8 md:p-10 text-white shadow-md relative overflow-hidden">
              <div className="text-[12px] font-bold tracking-wider text-[#A3E9BE] uppercase mb-1">
                SCORA / CLIENT 01
              </div>
              <h2 className="text-[32px] md:text-[36px] font-bold font-heading mb-2">
                ملخص التوظيف
              </h2>
              <p className="text-[14px] text-emerald-100 max-w-xl leading-relaxed mb-8">
                حالة طلبات التوظيف الحالية في لمحة.
              </p>

              {/* 4 Metrics Cards Grid */}
              <div className="grid grid-cols-4 gap-3 md:gap-4">
                <div className="rounded-2xl bg-[#004021]/60 backdrop-blur-sm p-4 text-center border border-white/10">
                  <div className="text-[12px] text-emerald-200 font-medium mb-1">Completed</div>
                  <div className="text-[22px] md:text-[24px] font-bold text-white">{client.stats.completed}</div>
                </div>

                <div className="rounded-2xl bg-[#004021]/60 backdrop-blur-sm p-4 text-center border border-white/10">
                  <div className="text-[12px] text-emerald-200 font-medium mb-1">Closed</div>
                  <div className="text-[22px] md:text-[24px] font-bold text-white">{client.stats.closed}</div>
                </div>

                <div className="rounded-2xl bg-[#004021]/60 backdrop-blur-sm p-4 text-center border border-white/10">
                  <div className="text-[12px] text-emerald-200 font-medium mb-1">Pending</div>
                  <div className="text-[22px] md:text-[24px] font-bold text-white">{client.stats.pending}</div>
                </div>

                <div className="rounded-2xl bg-[#004021]/60 backdrop-blur-sm p-4 text-center border border-white/10">
                  <div className="text-[12px] text-emerald-200 font-medium mb-1">Open</div>
                  <div className="text-[22px] md:text-[24px] font-bold text-white">{client.stats.open}</div>
                </div>
              </div>
            </div>

            {/* 2. Latest Job Requests Section */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-[22px] font-bold text-ink font-heading">
                    آخر طلبات التوظيف
                  </h3>
                  <p className="text-[13px] text-muted mt-0.5">
                    طلبات مفتوحة ومغلقة ومكتملة مع مطورين موثقين.
                  </p>
                </div>
                <Link
                  href="/jobs"
                  className="text-[14px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>عرض الكل</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>

              {/* Job Request Items */}
              <div className="space-y-4">
                {client.jobRequests.map((req) => (
                  <div key={req.id} className="flex items-center justify-between p-4 md:p-5 bg-[#F7FAF8] rounded-[24px] border border-neutral-200/60">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-12 rounded-xl bg-[#006B2C] flex items-center justify-center text-white text-xs font-mono">
                        <div className="w-8 h-4 bg-white/30 rounded-sm" />
                      </div>
                      <div>
                        <h4 className="text-[16px] font-bold text-ink">{req.title}</h4>
                        <p className="text-[12px] text-muted mt-0.5">{req.subtext}</p>
                        <div className="flex gap-2 mt-2">
                          {req.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-white border border-neutral-200 px-3 py-1 text-[11px] font-bold text-neutral-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#EBF7EF] flex items-center justify-center text-[#0E6D3B]">
                      {req.statusType === "wifi" ? <Wifi className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Sidebar 1/3 width - 5 cols) */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* 1. Client Overview Card */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 text-center shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              {/* Avatar */}
              <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#EBF7EF] border-2 border-[#C5E8D1] text-[32px] font-bold text-[#0E6D3B]">
                {client.avatarUrl ? (
                  <img src={client.avatarUrl} alt={client.fullName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  getInitials(client.fullName)
                )}
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 ring-4 ring-white" />
              </div>

              <h2 className="text-[24px] font-bold text-ink font-heading mb-1">
                {client.fullName}
              </h2>
              <p className="text-[14px] font-semibold text-primary mb-1">
                {client.companyName}
              </p>

              <p className="text-[13px] text-muted mb-6">
                {client.location} · عضو منذ 2024
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/hire-developer"
                  className="w-full h-[48px] rounded-full border border-neutral-300 bg-white text-[13px] font-bold text-ink hover:bg-neutral-50 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4 text-neutral-500" />
                  <span>تواصل مع المطورين</span>
                </Link>
                <Link
                  href="/client-profile/edit"
                  className="w-full h-[48px] rounded-full bg-[#0E6D3B] hover:bg-[#005B27] text-[13px] font-bold text-white transition-all cursor-pointer shadow-xs flex items-center justify-center active:scale-95"
                >
                  تعديل الملف
                </Link>
              </div>
            </div>

            {/* 2. Recent Activity Card */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <h3 className="text-[20px] font-bold text-ink font-heading mb-1">
                آخر نشاط
              </h3>
              <p className="text-[13px] text-muted mb-6">
                تحديثات العمـيل الأخيرة على SCORA.
              </p>

              <div className="space-y-4">
                {client.recentActivity.map((act) => (
                  <div key={act.id} className="flex items-center justify-between p-3.5 bg-[#F7FAF8] rounded-[20px] border border-neutral-100">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[14px] font-bold text-ink">{act.action}</span>
                    </div>
                    <span className="text-[12px] text-muted">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Developer Reviews Card */}
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              <h3 className="text-[20px] font-bold text-ink font-heading mb-1">
                آخر تقييمات المطورين
              </h3>
              <p className="text-[13px] text-muted mb-6">
                ملاحظات من مطورين عملوا مع العمـيل.
              </p>

              <div className="space-y-4">
                {client.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-[#F7FAF8] rounded-[24px] border border-neutral-100">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-[14px] font-bold text-ink">
                        {rev.developerName} <span className="font-normal text-muted">· {rev.role}</span>
                      </h4>
                      <span className="text-[11px] font-semibold text-emerald-700">{rev.time}</span>
                    </div>
                    <p className="text-[12px] text-neutral-600">{rev.comment}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
