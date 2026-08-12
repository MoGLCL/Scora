"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import {
  UserCheck,
  ShieldCheck,
  DollarSign,
  Clock,
  CheckCircle2,
  Edit,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Briefcase,
  X,
  Code
} from "lucide-react";

export default function ClientProposalsManagementPage() {
  const params = useParams();
  const { addToast } = useProfile();

  // Edit Budget Modal State
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetFrom, setBudgetFrom] = useState("15000");
  const [budgetTo, setBudgetTo] = useState("25000");

  // Applicants State
  const [hiredDevId, setHiredDevId] = useState<string | null>(null);

  const projectInfo = {
    id: params?.id || "1",
    title: "تطوير لوحة تحكم وتصاميم منصة SaaS تعليمية",
    budget: `${budgetFrom} - ${budgetTo} ج.م`,
    status: "مفتوح لتلقي العروض",
  };

  const proposals = [
    {
      id: "dev-1",
      name: "محمد وائل الغنام",
      role: "Software Developer · Full-stack",
      trustScore: 94,
      spPoints: 850,
      proposedPrice: "20,000 ج.م",
      proposedTime: "14 يوماً",
      skills: ["React.js", "Next.js", "TypeScript", "Node.js", "Python"],
      coverLetter: "قرأت متطلبات مشروع SaaS بعناية، ولدي خبرة سابقة في بناء لوحات تحكم متكاملة وتسهيل ربط API والاختبارات الأوتوماتيكية.",
      passportUrl: "/profile",
    },
    {
      id: "dev-2",
      name: "أحمد علي محمود",
      role: "Backend & Systems Engineer",
      trustScore: 88,
      spPoints: 720,
      proposedPrice: "18,500 ج.م",
      proposedTime: "10 أيام",
      skills: ["Node.js", "Express.js", "PostgreSQL", "Docker"],
      coverLetter: "متخصص في بناء وحماية السيرفرات وقواعد البيانات وتأمين واجهات الـ Endpoints بسرعة وكفاءة عالية.",
      passportUrl: "/profile",
    },
  ];

  const handleHireDeveloper = (devName: string, devId: string) => {
    setHiredDevId(devId);
    addToast(`تم قبول عرض ${devName} وتعيينه للمشروع بنجاح!`, "success");
  };

  const handleSaveNewBudget = () => {
    setIsEditBudgetOpen(false);
    addToast(`تم تعديل ميزانية المشروع إلى ${budgetFrom} - ${budgetTo} ج.م`, "success");
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-14 w-full flex-1 space-y-10">
        
        {/* BREADCRUMB & HEADER */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#526B5E]">
            <Link href="/dashboard" className="hover:text-[#056B38] transition-colors flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              <span>لوحة التحكم الرئيسية</span>
            </Link>
            <span>/</span>
            <span className="text-[#056B38]">إدارة المتقدمين والعروض</span>
          </div>

          <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-10 space-y-6 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>إدارة عروض العميل · Client Offers Management</span>
                </div>
                <h1 className="text-[26px] md:text-[36px] font-extrabold text-[#05291A] font-heading leading-tight">
                  {projectInfo.title}
                </h1>
                <div className="flex items-center gap-3 text-[13px] font-bold text-[#526B5E]">
                  <span>الميزانية الحالية: <strong className="text-[#056B38]">{projectInfo.budget}</strong></span>
                  <span>•</span>
                  <span>عدد المتقدمين: <strong>{proposals.length} مطورين</strong></span>
                </div>
              </div>

              {/* Action Buttons for Client */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditBudgetOpen(true)}
                  className="h-[46px] px-6 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] font-bold text-[13px] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <Edit className="w-4 h-4 text-[#056B38]" />
                  <span>تعديل الميزانية والعرض</span>
                </button>
                <Link
                  href="/projects/new"
                  className="h-[46px] px-6 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[13px] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <span>+ نشر عرض جديد</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* APPLICANTS PROPOSALS LIST */}
        <div className="space-y-6">
          <h2 className="text-[22px] font-extrabold text-[#05291A] font-heading">
            المطورون المتقدمون للعرض ({proposals.length})
          </h2>

          <div className="space-y-6">
            {proposals.map((item) => {
              const isHired = hiredDevId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-[24px] border p-6 md:p-8 space-y-6 transition-all shadow-2xs ${
                    isHired
                      ? "border-[#056B38] bg-[#E8FAF0]"
                      : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                  }`}
                >
                  {/* Developer Info Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#E8FAF0] border border-[#C5E8D1] text-[#056B38] font-bold flex items-center justify-center text-[18px]">
                        {item.name.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-[18px] font-bold text-[#05291A] font-heading">{item.name}</h3>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#056B38] text-white px-2.5 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified Passport</span>
                          </span>
                        </div>
                        <div className="text-[13px] text-[#526B5E] mt-0.5">{item.role}</div>
                      </div>
                    </div>

                    {/* Passport Score Stats */}
                    <div className="flex items-center gap-4 bg-neutral-50 px-4 py-2 rounded-2xl border border-neutral-200/60">
                      <div className="text-center">
                        <div className="text-[11px] text-[#526B5E]">نقاط الثقة</div>
                        <div className="text-[16px] font-extrabold text-[#056B38]">{item.trustScore}%</div>
                      </div>
                      <div className="w-px h-6 bg-neutral-200" />
                      <div className="text-center">
                        <div className="text-[11px] text-[#526B5E]">رصيد SP</div>
                        <div className="text-[16px] font-extrabold text-amber-600">{item.spPoints} SP</div>
                      </div>
                    </div>
                  </div>

                  {/* Proposed Price & Time Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F7FAF8] p-4 rounded-[16px] border border-[#D1E3D6]/60">
                    <div className="flex items-center gap-2 text-[14px]">
                      <span className="text-[#526B5E]">القيمة المقترحة:</span>
                      <strong className="text-[#056B38] font-heading text-[16px]">{item.proposedPrice}</strong>
                    </div>
                    <div className="flex items-center gap-2 text-[14px]">
                      <span className="text-[#526B5E]">مدة التسليم:</span>
                      <strong className="text-[#05291A] font-heading text-[16px]">{item.proposedTime}</strong>
                    </div>
                  </div>

                  {/* Proposal Cover Letter */}
                  <div className="space-y-2">
                    <div className="text-[13px] font-bold text-[#05291A]">تفاصيل عرض المطور:</div>
                    <p className="text-[14px] text-[#526B5E] leading-relaxed">
                      {item.coverLetter}
                    </p>
                  </div>

                  {/* Skills Tags */}
                  <div className="flex flex-wrap gap-2">
                    {item.skills.map((sk) => (
                      <span key={sk} className="px-3 py-1 rounded-full bg-neutral-100 text-[12px] font-bold text-[#05291A]">
                        {sk}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-neutral-100">
                    <Link
                      href="/profile"
                      target="_blank"
                      className="text-[13px] font-bold text-[#056B38] hover:underline flex items-center gap-1"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>معاينة الجواز الرقمي الكامل للمطور</span>
                    </Link>

                    <div className="flex items-center gap-3">
                      <Link
                        href="/chat"
                        className="h-[42px] px-5 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] text-[13px] font-bold hover:bg-neutral-50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-[#056B38]" />
                        <span>محادثة خاصة</span>
                      </Link>

                      {isHired ? (
                        <span className="h-[42px] px-6 rounded-full bg-[#056B38] text-white text-[13px] font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم اختيار وتعيين المطور ✓</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleHireDeveloper(item.name, item.id)}
                          className="h-[42px] px-6 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[13px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>قبول وتعيين المطور</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* EDIT BUDGET MODAL */}
        {isEditBudgetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-[24px] bg-white p-6 md:p-8 space-y-6 shadow-2xl relative dir-rtl" dir="rtl">
              <button
                type="button"
                onClick={() => setIsEditBudgetOpen(false)}
                className="absolute left-5 top-5 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1">
                <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                  تعديل ميزانية المشروع والعرض
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  تحديث نطاق الميزانية المقترحة للمتقدمين.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">الميزانية الأدنى (ج.م)</label>
                  <input
                    type="number"
                    value={budgetFrom}
                    onChange={(e) => setBudgetFrom(e.target.value)}
                    className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] font-bold text-[#05291A] outline-none focus:border-[#056B38]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">الميزانية الأقصى (ج.م)</label>
                  <input
                    type="number"
                    value={budgetTo}
                    onChange={(e) => setBudgetTo(e.target.value)}
                    className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] font-bold text-[#05291A] outline-none focus:border-[#056B38]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveNewBudget}
                  className="flex-1 h-[46px] rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[14px] transition-all cursor-pointer"
                >
                  حفظ والتحديث
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditBudgetOpen(false)}
                  className="px-6 h-[46px] rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-[14px] hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}
