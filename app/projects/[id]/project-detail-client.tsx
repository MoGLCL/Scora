"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { submitProposal } from "@/lib/actions/profile";
import {
  Briefcase,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Send,
  ArrowRight,
  Code,
  FileText,
  User,
  Calendar,
  Sparkles,
  MessageSquare
} from "lucide-react";

export interface ProposalComment {
  id: string;
  devName: string;
  role: string;
  trustScore: number;
  proposedPrice: string;
  deliveryDays: string;
  deliverablesText: string;
  timeAgo: string;
}

export interface ProjectDetail {
  id: string;
  title: string;
  clientName: string;
  clientLocation: string;
  clientRating: string;
  clientProjectsCount: number;
  budgetRange: string;
  postedDate: string;
  deadline: string;
  tags: string[];
  description: string;
  deliverables: string[];
}

export function ProjectDetailClient({
  project,
  initialProposals,
}: {
  project: ProjectDetail;
  initialProposals: ProposalComment[];
}) {
  const { developer, userRole, addToast } = useProfile();

  // Proposal Form State
  const [proposedPrice, setProposedPrice] = useState("20000");
  const [deliveryDays, setDeliveryDays] = useState("14");
  const [proposalCover, setProposalCover] = useState(
    "أستطيع تنفيذ وتطوير الواجهات المتجاوبة وربط الـ APIs مع اختبارات أوتوماتيكية سريعة لتسليم لوحة التحكم كاملة."
  );
  const [attachPassport, setAttachPassport] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial Public Proposal Comments Feed
  const [proposalsFeed, setProposalsFeed] = useState<ProposalComment[]>(initialProposals);

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedPrice || !proposalCover.trim()) {
      addToast("يرجى كتابة تفاصيل ما تستطيع تنفيذه والقيمة المقترحة إجباريًا", "warn");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitProposal({
        projectId: project.id,
        amount: Number(proposedPrice),
        deliveryDays: Number(deliveryDays),
        coverLetter: proposalCover.trim(),
      });

      if (!res.ok) {
        addToast(res.error ?? "تعذّر إرسال العرض", "warn");
        return;
      }

      setProposalsFeed([res.proposal, ...proposalsFeed]);
      addToast("تمت إضافة عرضك بنجاح في قائمة تعليقات العروض المتقدمة!", "success");
      setProposalCover("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-14 w-full flex-1 space-y-10">
        
        {/* BREADCRUMB & TOP HEADER */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#526B5E]">
            <Link href="/projects" className="hover:text-[#056B38] transition-colors flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              <span>العودة لقائمة المشاريع</span>
            </Link>
            <span>/</span>
            <span className="text-[#056B38]">تفاصيل المشروع والعروض المتقدمة</span>
          </div>

          {/* PROJECT TITLE CARD */}
          <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-10 space-y-6 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>مفتوح لتلقي العروض · Open for Proposals</span>
                  </span>
                  <span className="text-[12px] font-bold text-[#526B5E] bg-white/80 px-3 py-1 rounded-full border border-[#D1E3D6]">
                    {project.clientName}
                  </span>
                </div>

                <h1 className="text-[26px] md:text-[36px] font-extrabold text-[#05291A] font-heading leading-tight">
                  {project.title}
                </h1>
              </div>

              {/* Budget & Time Details */}
              <div className="bg-white p-5 rounded-[20px] border border-[#D1E3D6] text-right md:text-left shrink-0 space-y-1.5">
                <div className="text-[12px] font-bold text-[#526B5E]">الميزانية التقديرية</div>
                <div className="text-[22px] font-extrabold text-[#056B38] font-heading">{project.budgetRange}</div>
                <div className="text-[12px] text-[#526B5E] flex items-center gap-1 justify-end">
                  <Clock className="w-3.5 h-3.5 text-[#056B38]" />
                  <span>زمن التسليم المطلوب: {project.deadline}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT (PROJECT DETAILS + ADD PROPOSAL FORM & PUBLIC PROPOSALS FEED) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Project Scope, Proposal Form & Public Proposal Comments */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Project Scope & Description */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-6 shadow-2xs">
              <h2 className="text-[20px] font-bold text-[#05291A] font-heading pb-3 border-b border-neutral-100">
                تفاصيل المشروع ونطاق العمل
              </h2>

              <p className="text-[14px] text-[#526B5E] leading-relaxed">
                {project.description}
              </p>

              {/* Deliverables List */}
              <div className="space-y-3 pt-2">
                <h3 className="text-[15px] font-bold text-[#05291A]">المخرجات المطلوب تسليمها:</h3>
                <div className="space-y-2">
                  {project.deliverables.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-[13px] text-[#526B5E]">
                      <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-2 pt-2">
                <h3 className="text-[13px] font-bold text-[#05291A]">التقنيات المطلوبة للمشروع:</h3>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-[#E8FAF0] text-[12px] font-bold text-[#056B38]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ADD PROPOSAL FORM (FORM FOR DEVELOPER TO SUBMIT PROPOSAL COMMENT) */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-6 shadow-2xs">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  إضافة عرض وتأكيد خطة العمل (Submit Proposal Comment)
                </h2>
                <p className="text-[13px] text-[#526B5E] mt-1">
                  اكتب ما تستطيع تنفيذه ومدة التسليم والقيمة المقترحة ليظهر عرضك شفافاً ضمن تعليقات المتقدمين.
                </p>
              </div>

              <form onSubmit={handleProposalSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Proposed Price */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      قيمة العرض المقترحة (بالجنيه المصري) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        required
                        value={proposedPrice}
                        onChange={(e) => setProposedPrice(e.target.value)}
                        placeholder="20000"
                        className="w-full h-[48px] rounded-[12px] border border-[#D1E3D6] bg-white pr-10 pl-4 text-[14px] font-bold text-[#05291A] outline-none focus:border-[#056B38]"
                      />
                      <DollarSign className="w-4 h-4 text-[#056B38] absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Delivery Days */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      مدة التسليم التقديرية (بالأيام) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        required
                        value={deliveryDays}
                        onChange={(e) => setDeliveryDays(e.target.value)}
                        placeholder="14"
                        className="w-full h-[48px] rounded-[12px] border border-[#D1E3D6] bg-white pr-10 pl-4 text-[14px] font-bold text-[#05291A] outline-none focus:border-[#056B38]"
                      />
                      <Calendar className="w-4 h-4 text-[#056B38] absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* What Developer Can Deliver / Proposal Letter */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">
                    ما تستطيع تنفيذه وخطة العمل (التعليق المتقدم) <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={proposalCover}
                    onChange={(e) => setProposalCover(e.target.value)}
                    placeholder="اكتب بالتفصيل ما الذي ستقدمه للمشروع، التقنيات المستخدمة، ومراحل التسليم..."
                    className="w-full rounded-[12px] border border-[#D1E3D6] bg-white p-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] leading-relaxed resize-none"
                  />
                </div>

                {/* Checkbox Attach Passport */}
                <div className="flex items-center gap-3 p-4 rounded-[14px] bg-[#E8FAF0] border border-[#D1E3D6]">
                  <input
                    id="attach-passport"
                    type="checkbox"
                    checked={attachPassport}
                    onChange={(e) => setAttachPassport(e.target.checked)}
                    className="w-4 h-4 accent-[#056B38] cursor-pointer"
                  />
                  <label htmlFor="attach-passport" className="text-[13px] font-bold text-[#05291A] cursor-pointer">
                    إرفاق شارة نقاط الثقة والجواز الرقمي (Verified Passport - {developer.trustScore || 92}% Trust Score)
                  </label>
                </div>

                {/* Submit Proposal Comment Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-[52px] rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[15px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "جاري نشر العرض..." : "إضافة وعرض خطتي للمشروع"}</span>
                </button>

              </form>
            </div>

            {/* PUBLIC PROPOSALS COMMENTS FEED (SHOWS HOW MANY PROPOSALS AND EACH OFFER) */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#056B38]" />
                  <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                    العروض والتعليقات المتقدمة ({proposalsFeed.length} عروض)
                  </h3>
                </div>
                <span className="text-[12px] font-bold bg-[#E8FAF0] text-[#056B38] px-3 py-1 rounded-full">
                  شفافية كاملة
                </span>
              </div>

              <div className="space-y-4">
                {proposalsFeed.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-5 rounded-[20px] border border-[#D1E3D6] bg-[#F7FAF8] space-y-3 transition-all hover:border-[#056B38]"
                  >
                    {/* Header: Dev Info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/60 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#E8FAF0] border border-[#C5E8D1] text-[#056B38] font-bold flex items-center justify-center text-[15px]">
                          {prop.devName.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-[#05291A]">{prop.devName}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#056B38] text-white px-2 py-0.5 rounded-full">
                              <ShieldCheck className="w-3 h-3" />
                              <span>{prop.trustScore}% Score</span>
                            </span>
                          </div>
                          <div className="text-[11px] text-[#526B5E]">{prop.role}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-[12px] font-bold bg-white px-3 py-1.5 rounded-xl border border-[#D1E3D6]">
                        <span className="text-[#056B38]">العرض: {prop.proposedPrice}</span>
                        <span>•</span>
                        <span className="text-[#05291A]">مدة التسليم: {prop.deliveryDays}</span>
                      </div>
                    </div>

                    {/* Proposal Comment Content */}
                    <p className="text-[13px] text-[#05291A] leading-relaxed">
                      {prop.deliverablesText}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#526B5E] pt-1">
                      <span>{prop.timeAgo}</span>
                      <Link href="/chat" className="font-bold text-[#056B38] hover:underline">
                        بدء محادثة مباشرة مع المطور
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Client Info & Security */}
          <div className="space-y-6 sticky top-24">
            
            {/* Client Info */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-4 shadow-2xs">
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold text-[18px]">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#05291A]">{project.clientName}</h3>
                  <div className="text-[12px] text-[#526B5E]">{project.clientLocation}</div>
                </div>
              </div>

              <div className="space-y-2 text-[13px]">
                <div className="flex justify-between text-[#526B5E]">
                  <span>تقييم العميل:</span>
                  <span className="font-bold text-[#056B38]">{project.clientRating}</span>
                </div>
                <div className="flex justify-between text-[#526B5E]">
                  <span>المشاريع المنشورة:</span>
                  <span className="font-bold text-[#05291A]">{project.clientProjectsCount} مشاريع</span>
                </div>
                <div className="flex justify-between text-[#526B5E]">
                  <span>حالة الحساب:</span>
                  <span className="font-bold text-[#056B38] bg-[#E8FAF0] px-2 py-0.5 rounded-full text-[11px]">
                    عميل موثوق (Client) ✓
                  </span>
                </div>
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-[#05291A] text-white p-6 space-y-4 shadow-md">
              <div className="flex items-center gap-2 text-[#339E61] font-bold text-[15px]">
                <ShieldCheck className="w-5 h-5" />
                <span>ضمان المستحقات البرمجية</span>
              </div>
              <p className="text-[12px] text-neutral-300 leading-relaxed">
                يتم حفظ ميزانية العمل في حساب الإيداع الآمن الخاص بـ Scora لحين إنجاز المشروع واستلام المخرجات بالكامل.
              </p>
            </div>

          </div>

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
