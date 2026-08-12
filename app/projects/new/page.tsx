"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { createProject } from "@/lib/actions/profile";
import {
  Briefcase,
  DollarSign,
  Calendar,
  Code,
  FileText,
  Plus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Building
} from "lucide-react";

export default function CreateProjectOfferPage() {
  const { client, addToast } = useProfile();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Full-Stack Web");
  const [budgetFrom, setBudgetFrom] = useState("15000");
  const [budgetTo, setBudgetTo] = useState("30000");
  const [deadline, setDeadline] = useState("14");
  const [description, setDescription] = useState("");
  const [deliverablesInput, setDeliverablesInput] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([
    "بناء وتصميم واجهات المستخدم المتجاوبة.",
    "ربط الـ APIs وقواعد البيانات.",
  ]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["React.js", "Node.js", "TypeScript"]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const availableSkills = ["React.js", "Next.js", "Node.js", "TypeScript", "Python", "Flutter", "PostgreSQL", "Tailwind CSS"];

  const handleAddDeliverable = () => {
    if (deliverablesInput.trim()) {
      setDeliverables([...deliverables, deliverablesInput.trim()]);
      setDeliverablesInput("");
    }
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed]);
      setCustomSkillInput("");
    }
  };

  const handleToggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      addToast("يرجى ملء جميع الحقول المطلوبة لإنشاء العرض", "warn");
      return;
    }

    const numFrom = Number(budgetFrom);
    const numTo = Number(budgetTo);

    if (isNaN(numFrom) || isNaN(numTo) || numFrom < 1000 || numTo <= numFrom) {
      addToast("يرجى إدخال نطاق ميزانية منطقي (الميزانية الأقصى يجب أن تكون أكبر من الميزانية الأدنى)", "warn");
      return;
    }

    setIsSubmitting(true);
    const data = new FormData();
    data.set("title", title);
    data.set("category", category);
    data.set("description", description);
    data.set("budgetFrom", budgetFrom);
    data.set("budgetTo", budgetTo);
    data.set("deadlineDays", deadline);
    selectedSkills.forEach((skill) => data.append("skills", skill));
    const result = await createProject(undefined, data);
    setIsSubmitting(false);
    if (result.error) {
      addToast(result.error, "warn");
      return;
    }
    setIsPublished(true);
    addToast("تم نشر المشروع بنجاح", "success");
    /*
      setIsSubmitting(false);
      setIsPublished(true);
      addToast("تم نشر عرض المشروع بنجاح! يمكن للمطورين التقديم الآن.", "success");
    }, 1000); */
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1000px] px-6 md:px-8 py-8 md:py-14 w-full flex-1 space-y-10">
        
        {/* BREADCRUMB & HEADER */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#526B5E]">
            <Link href="/projects" className="hover:text-[#056B38] transition-colors flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              <span>المشاريع والعروض</span>
            </Link>
            <span>/</span>
            <span className="text-[#056B38]">إنشاء عرض مشروع جديد (حساب عميل)</span>
          </div>

          <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-10 space-y-4 shadow-2xs">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>إنشاء طلب مشروع جديد · Post New Job Offer</span>
            </div>
            <h1 className="text-[28px] md:text-[38px] font-extrabold text-[#05291A] font-heading leading-tight">
              نشر مشروع جديد واستقبال عروض المطورين الموثقين
            </h1>
            <p className="text-[14px] text-[#526B5E]">
              أدخل تفاصيل مشروعك وميزانيتك لاستقبال العروض المقترحة واختيار أفضل المطورين أصحاب الجواز الرقمي الموثق.
            </p>
          </div>
        </div>

        {/* FORM / SUCCESS CARD */}
        {isPublished ? (
          <div className="rounded-[28px] border border-[#D1E3D6] bg-[#E8FAF0] p-10 text-center space-y-6 shadow-sm">
            <CheckCircle2 className="w-16 h-16 text-[#056B38] mx-auto" />
            <h2 className="text-[24px] font-extrabold text-[#05291A] font-heading">
              تم نشر عرض المشروع بنجاح!
            </h2>
            <p className="text-[15px] text-[#526B5E] max-w-md mx-auto">
              مشروعك "{title}" أصبح متاحاً الآن في سوق المشاريع. يمكنك متابعة المتقدمين وإجراء المقابلات واختيار المطور المناسب.
            </p>
            <div className="flex justify-center gap-4 pt-2">
              <Link
                href="/projects/1/proposals"
                className="h-[46px] px-8 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[14px] font-bold transition-all flex items-center gap-2 shadow-xs"
              >
                <span>متابعة العروض المتقدمة</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="h-[46px] px-8 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] text-[14px] font-bold hover:bg-neutral-50 transition-all"
              >
                اللوحة الرئيسية
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-10 space-y-8 shadow-2xs">
            
            {/* Project Basic Info */}
            <div className="space-y-6">
              <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading pb-3 border-b border-neutral-100">
                البيانات الأساسية للمشروع
              </h3>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#05291A]">عنوان المشروع <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: تطوير لوحة تحكم وتصاميم منصة SaaS تعليمية"
                  className="w-full h-[48px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[14px] font-bold text-[#05291A] outline-none focus:border-[#056B38]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">الميزانية من (ج.م) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={budgetFrom}
                    onChange={(e) => setBudgetFrom(e.target.value)}
                    className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">الميزانية إلى (ج.م) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    value={budgetTo}
                    onChange={(e) => setBudgetTo(e.target.value)}
                    className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">مدة التسليم التقديرية (بالأيام)</label>
                  <input
                    type="number"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-bold text-[#05291A]">شرح تفاصيل وتحديد المشروع <span className="text-red-500">*</span></label>
                <textarea
                  rows={5}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب وصفاً كاملاً لمشروعك، متطلبات العمل، والأهداف البرمجية المطلوب تحقيقها..."
                  className="w-full rounded-[12px] border border-[#D1E3D6] bg-white p-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] leading-relaxed resize-none"
                />
              </div>
            </div>

            {/* Deliverables Checklist */}
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <h3 className="text-[18px] font-bold text-[#05291A] font-heading">
                قائمة التسليمات والمخرجات المطلوب تنفيذها
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={deliverablesInput}
                  onChange={(e) => setDeliverablesInput(e.target.value)}
                  placeholder="أضف مخرجاً برمجيًا جديدًا (مثال: تسليم الكود الموثق ورابط الـ Dashboard)"
                  className="flex-1 h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                />
                <button
                  type="button"
                  onClick={handleAddDeliverable}
                  className="h-[46px] px-6 rounded-[12px] bg-[#056B38] text-white font-bold text-[13px] hover:bg-[#08592E] transition-all cursor-pointer"
                >
                  إضافة
                </button>
              </div>

              <div className="space-y-2 pt-2">
                {deliverables.map((del, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-[12px] bg-neutral-50 border border-neutral-100 text-[13px] text-[#05291A]">
                    <span>• {del}</span>
                    <button
                      type="button"
                      onClick={() => setDeliverables(deliverables.filter((_, i) => i !== idx))}
                      className="text-red-500 font-bold hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom Skills Selector & Tags */}
            <div className="space-y-4 pt-4 border-t border-neutral-100">
              <h3 className="text-[18px] font-bold text-[#05291A] font-heading">
                المهارات والتقنيات المطلوبة للمطور (مخصصة)
              </h3>

              {/* Custom Skill Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomSkill();
                    }
                  }}
                  placeholder="اكتب اسم أي مهارة أو تقنية مخصصة (مثال: GraphQL, Rust, Docker) واضغط Enter"
                  className="flex-1 h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSkill}
                  className="h-[46px] px-6 rounded-[12px] bg-[#056B38] text-white font-bold text-[13px] hover:bg-[#08592E] transition-all cursor-pointer shrink-0"
                >
                  + إضافة مهارة
                </button>
              </div>

              {/* Currently Selected Skills Tags */}
              <div className="space-y-2 pt-1">
                <div className="text-[12px] font-bold text-[#526B5E]">المهارات المحددة ({selectedSkills.length}):</div>
                <div className="flex flex-wrap gap-2">
                  {selectedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-3.5 py-1.5 rounded-full bg-[#056B38] text-white text-[12px] font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{sk}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedSkills(selectedSkills.filter((s) => s !== sk))}
                        className="hover:text-red-300 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick Preset Skill Suggestions */}
              <div className="space-y-1.5 pt-2">
                <div className="text-[11px] font-bold text-[#526B5E]">مقترحات سريعة:</div>
                <div className="flex flex-wrap gap-2">
                  {availableSkills.map((sk) => {
                    const isSelected = selectedSkills.includes(sk);
                    return (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => handleToggleSkill(sk)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#E8FAF0] text-[#056B38] border border-[#056B38]"
                            : "bg-neutral-100 text-[#526B5E] hover:bg-neutral-200"
                        }`}
                      >
                        + {sk}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-[#D1E3D6]">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-[52px] rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                <Plus className="w-5 h-5" />
                <span>{isSubmitting ? "جاري نشر العرض..." : "نشر عرض المشروع في المنصة"}</span>
              </button>
            </div>

          </form>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}
