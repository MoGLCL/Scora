"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { createProject } from "@/lib/actions/profile";
import {
  Calendar,
  Code,
  FileText,
  Plus,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Scale,
  Lock,
  HelpCircle,
  CheckSquare,
  LayoutDashboard
} from "lucide-react";
import { EgpCurrencyIcon } from "@/components/egp-currency-icon";

export default function CreateProjectOfferPage() {
  const { addToast } = useProfile();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [budgetFrom, setBudgetFrom] = useState("");
  const [budgetTo, setBudgetTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [deliverablesInput, setDeliverablesInput] = useState("");
  const [deliverables, setDeliverables] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [isFilledByAi, setIsFilledByAi] = useState(false);

  // Read AI Agent Project Draft from sessionStorage or URL query params on mount
  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem("scora_ai_project_draft");
        if (stored) {
          const draft: Record<string, unknown> = JSON.parse(stored);
          if (typeof draft.title === "string") setTitle(draft.title);
          if (typeof draft.category === "string") setCategory(draft.category);
          if (typeof draft.budgetFrom === "number" || typeof draft.budgetFrom === "string") setBudgetFrom(String(draft.budgetFrom));
          if (typeof draft.budgetTo === "number" || typeof draft.budgetTo === "string") setBudgetTo(String(draft.budgetTo));
          if (typeof draft.deadlineDays === "number" || typeof draft.deadlineDays === "string") setDeadline(String(draft.deadlineDays));
          if (typeof draft.description === "string") setDescription(draft.description);
          if (Array.isArray(draft.skills)) {
            setSelectedSkills(draft.skills.filter((skill): skill is string => typeof skill === "string").slice(0, 30));
          }
          if (Array.isArray(draft.deliverables)) {
            setDeliverables(draft.deliverables.filter((item): item is string => typeof item === "string").slice(0, 30));
          }
          setIsFilledByAi(true);
          sessionStorage.removeItem("scora_ai_project_draft");
          addToast("تمت تعبئة بيانات المشروع بواسطة مساعد SSD الذكي ", "info");
        }
      } catch {
        // Storage can be disabled or contain invalid JSON.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [addToast]);

  // Keep a sanitized snapshot available to SSD while the form is still unsaved.
  // The server validates and bounds this data before it reaches the model.
  React.useEffect(() => {
    try {
      sessionStorage.setItem(
        "scora_ai_page_context",
        JSON.stringify({
          title,
          category,
          description,
          budgetFrom: budgetFrom ? Number(budgetFrom) : undefined,
          budgetTo: budgetTo ? Number(budgetTo) : undefined,
          deadlineDays: deadline ? Number(deadline) : undefined,
          skills: selectedSkills,
          deliverables,
        })
      );
    } catch {
      // Storage can be disabled by a browser privacy policy.
    }
  }, [title, category, description, budgetFrom, budgetTo, deadline, selectedSkills, deliverables]);

  const exampleCategories = [
    "تطوير مواقع الويب (Full-Stack)",
    "تطبيقات الموبايل (iOS & Android)",
    "متاجر إلكترونية (E-Commerce)",
    "لوحات تحكم ومنصات SaaS",
    "واجهات وتجربة مستخدم (Frontend)",
    "الباك إند والـ APIs السحابية",
    "الذكاء الاصطناعي وتعلم الآلة",
    "برمجيات سطح المكتب",
    "أتمتة الأعمال والسكربتات",
    "الحماية والسيرفرات (DevOps)",
  ];

  const availableSkills = [
    "React.js",
    "Next.js",
    "Node.js",
    "TypeScript",
    "Python",
    "Flutter",
    "PostgreSQL",
    "Tailwind CSS",
    "Laravel",
    "Vue.js",
    "Docker"
  ];

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
    setFormError("");
    if (!title.trim() || !description.trim()) {
      const message = "يرجى كتابة عنوان المشروع ووصف واضح له";
      setFormError(message);
      addToast(message, "warn");
      return;
    }

    const numFrom = Number(budgetFrom);
    const numTo = Number(budgetTo);

    if (!Number.isInteger(numFrom) || !Number.isInteger(numTo) || numFrom < 1250 || numTo < numFrom) {
      const message =
        numFrom < 1250 || numTo < 1250
          ? "أقل ميزانية مسموحة للمشروع في المنصة هي 1,250 جنيه لضمان الجودة البرمجية"
          : "الميزانية النهائية لا يمكن أن تكون أقل من الميزانية الابتدائية";
      setFormError(message);
      addToast(message, "warn");
      return;
    }

    const numDeadline = deadline ? Number(deadline) : undefined;
    if (numDeadline !== undefined && (!Number.isInteger(numDeadline) || numDeadline < 3)) {
      const message = "أقل مدة تسليم مسموحة للمشروع هي 3 أيام";
      setFormError(message);
      addToast(message, "warn");
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
    deliverables.forEach((deliverable) => data.append("deliverables", deliverable));

    const result = await createProject(undefined, data);
    setIsSubmitting(false);

    if (!result.ok) {
      const message = result.error ?? Object.values(result.fieldErrors ?? {}).flat()[0] ?? "تعذر نشر المشروع";
      setFormError(message);
      addToast(message, "warn");
      return;
    }

    setIsPublished(true);
    setCreatedProjectId(result.projectId ?? null);
    addToast("تم نشر المشروع بنجاح", "success");
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-14 w-full flex-1 space-y-10">
        
        {/* BREADCRUMB & HEADER */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#526B5E]">
            <Link href="/projects" className="hover:text-[#056B38] transition-colors flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              <span>المشاريع والعروض</span>
            </Link>
            <span>/</span>
            <span className="text-[#056B38]">إنشاء ونشر مشروع جديد</span>
          </div>

          <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-10 space-y-4 shadow-2xs">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>نشر طلب مشروع جديد · Post New Job Offer</span>
            </div>
            <h1 className="text-[28px] md:text-[38px] font-extrabold text-[#05291A] font-heading leading-tight">
              نشر مشروع جديد واستقبال عروض المطورين المعتمدين
            </h1>
            <p className="text-[14px] text-[#526B5E] max-w-3xl leading-relaxed">
              أدخل متطلبات مشروعك وميزانيتك بوضوح لاستقبال عروض المطورين أصحاب الجواز الرقمي الموثق وتقييمات الثقة (Trust Score). يرجى الالتزام بالشروط والضوابط الموضحة لضمان حماية حقوقك.
            </p>
          </div>

          {/* AI Fill Banner */}
          {isFilledByAi && (
            <div className="rounded-2xl bg-[#E8FAF0] border-2 border-[#056B38]/30 p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[#056B38] text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-[#05291A]">
                    تمت تعبئة بيانات هذا المشروع تلقائياً بواسطة مساعد SSD الذكي 
                  </h3>
                  <p className="text-[11px] text-[#526B5E]">
                    يمكنك الآن مراجعة العنوان، النطاق، الميزانية والمخرجات وتعديل أي حقل تريده قبل الضغط على نشر.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFilledByAi(false)}
                className="text-xs text-[#056B38] font-bold hover:underline"
              >
                إخفاء التنبيه
              </button>
            </div>
          )}
        </div>

        {/* MAIN TWO-COLUMN CONTENT */}
        {isPublished ? (
          <div className="rounded-[28px] border border-[#D1E3D6] bg-[#E8FAF0] p-10 text-center space-y-6 shadow-sm max-w-2xl mx-auto">
            <CheckCircle2 className="w-16 h-16 text-[#056B38] mx-auto" />
            <h2 className="text-[24px] font-extrabold text-[#05291A] font-heading">
              تم نشر عرض المشروع بنجاح!
            </h2>
            <p className="text-[15px] text-[#526B5E] max-w-md mx-auto leading-relaxed">
              مشروعك «{title}» أصبح متاحاً الآن في سوق المشاريع. يمكنك متابعة العروض المتقدمة واختيار المطور الأنسب لبدء التنفيذ.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Link
                href={createdProjectId ? `/projects/${createdProjectId}/proposals` : "/projects"}
                className="h-[46px] px-7 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[14px] font-bold transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-95"
              >
                <span>متابعة العروض المتقدمة</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="h-[46px] px-7 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] text-[14px] font-bold hover:bg-[#F7FAF8] hover:border-[#056B38]/40 transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
              >
                <LayoutDashboard className="w-4 h-4 text-[#056B38]" />
                <span>لوحة التحكم</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left/Main Column: Project Form (2 Cols) */}
            <form onSubmit={handleSubmit} className="lg:col-span-2 rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-10 space-y-8 shadow-2xs">
              {formError && (
                <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Basic Info Section */}
              <div className="space-y-6">
                <div className="border-b border-neutral-100 pb-3">
                  <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#056B38]" />
                    <span>البيانات الأساسية للمشروع</span>
                  </h3>
                  <p className="text-[12px] text-[#526B5E] mt-1">اكتب بيانات دقيقة ومعبرة لتسهيل فهم المتطلبات على المطورين.</p>
                </div>

                {/* Title */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      عنوان المشروع <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-[#526B5E]">من 5 إلى 150 حرفاً</span>
                  </div>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={150}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: تطوير لوحة تحكم وتصاميم منصة SaaS تعليمية"
                    className="w-full h-[48px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[14px] font-bold text-[#05291A] outline-none focus:border-[#056B38] transition-all"
                  />
                  <div className="rounded-xl bg-[#F7FAF8] border border-[#D1E3D6]/70 p-3 text-[11px] text-[#526B5E] space-y-1">
                    <div className="font-bold text-[#05291A] flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#056B38]" />
                      <span>شروط العنوان:</span>
                    </div>
                    <p>• يجب أن يحدد نوع البرمجية بدقة (موقع، تطبيق، API، متجر...).</p>
                    <p>• يمنع كتابة أرقام هواتف أو بريد إلكتروني أو عبارات تسويقية عامة في العنوان.</p>
                  </div>
                </div>

                {/* Category Selection (Optional with Clean Examples) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      تصنيف أو تخصص المشروع <span className="text-[11px] font-normal text-[#526B5E]">(اختياري)</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    placeholder="اكتب تخصص مشروعك أو اختر من الأمثلة أدناه..."
                    className="w-full h-[48px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[14px] text-[#05291A] outline-none focus:border-[#056B38] transition-all"
                  />

                  {/* Clean Example Chips without emojis */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-bold text-[#526B5E]">أمثلة شائعة (اضغط للتعبئة التلقائية أو اكتب ما تريده):</div>
                    <div className="flex flex-wrap gap-2">
                      {exampleCategories.map((cat) => {
                        const isSelected = category === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setCategory(isSelected ? "" : cat)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-[#E8FAF0] border-[#056B38] text-[#056B38]"
                                : "bg-neutral-50 border-neutral-200 text-[#526B5E] hover:bg-neutral-100 hover:border-neutral-300"
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Budget & Timeline */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      الميزانية من (ج.م) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        required
                        min={1250}
                        step="any"
                        value={budgetFrom}
                        onChange={(e) => setBudgetFrom(e.target.value)}
                        placeholder="1250"
                        className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white pl-4 pr-10 text-[13px] font-bold text-[#05291A] outline-none focus:border-[#056B38]"
                      />
                      <EgpCurrencyIcon className="w-4 h-4 text-[#056B38] absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      الميزانية إلى (ج.م) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        required
                        min={Math.max(1250, Number(budgetFrom) || 1250)}
                        step="any"
                        value={budgetTo}
                        onChange={(e) => setBudgetTo(e.target.value)}
                        placeholder="15000"
                        className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white pl-4 pr-10 text-[13px] font-bold text-[#05291A] outline-none focus:border-[#056B38]"
                      />
                      <EgpCurrencyIcon className="w-4 h-4 text-[#056B38] absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">مدة التسليم (أيام)</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={3}
                        max={365}
                        step="any"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        placeholder="3"
                        className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white pl-4 pr-10 text-[13px] font-bold text-[#05291A] outline-none focus:border-[#056B38]"
                      />
                      <Calendar className="w-4 h-4 text-[#056B38] absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-[#F7FAF8] border border-[#D1E3D6]/70 p-3 text-[11px] text-[#526B5E] space-y-1">
                  <div className="font-bold text-[#05291A] flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-[#056B38]" />
                    <span>شروط الميزانية ومدة التسليم:</span>
                  </div>
                  <p>• الحد الأدنى لميزانية أي خدمة برمجية في المنصة هو 1,250 جنيه مصري لضمان جودة الكود واحترافية التنفيذ.</p>
                  <p>• يمكنك كتابة نفس القيمة في «من» و«إلى» إذا كانت الميزانية ثابتة ومحددة بدقة.</p>
                  <p>• أقل مدة تسليم مسموحة هي 3 أيام لضمان جودة البرمجة والاختبار.</p>
                  <p>• يتم إيداع الميزانية في حساب الضمان (Escrow) بعد اختيار المطور وقبل بدء التنفيذ.</p>
                </div>

                {/* Description */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      شرح وتفاصيل نطاق العمل <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-[#526B5E]">30 حرفاً كحد أدنى</span>
                  </div>
                  <textarea
                    rows={6}
                    required
                    minLength={30}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="اكتب وصفاً مفصلاً للمشروع: الصفحات المطلوبة، لوحة التحكم، طريقة تسجيل الدخول، الربط مع بوابات الدفع أو الـ APIs الخارجية..."
                    className="w-full rounded-[12px] border border-[#D1E3D6] bg-white p-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] leading-relaxed resize-none transition-all"
                  />
                  <div className="rounded-xl bg-[#F7FAF8] border border-[#D1E3D6]/70 p-3 text-[11px] text-[#526B5E] space-y-1">
                    <div className="font-bold text-[#05291A] flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#056B38]" />
                      <span>شروط ومواصفات الشرح:</span>
                    </div>
                    <p>• وضح المخرجات البرمجية، المنصات المستهدفة (ويب، iOS، أندرويد)، وأي تصميمات جاهزة لديك (مثل Figma).</p>
                    <p>• يمنع طلب أعمال تخترق أنظمة أو تنتهك حقوق الملكية الفكرية أو تخالف القوانين.</p>
                  </div>
                </div>
              </div>

              {/* 2. Deliverables Checklist */}
              <div className="space-y-4 pt-6 border-t border-neutral-100">
                <div>
                  <h3 className="text-[18px] font-bold text-[#05291A] font-heading flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-[#056B38]" />
                    <span>قائمة المخرجات والتسليمات المطلوبة (Deliverables)</span>
                  </h3>
                  <p className="text-[12px] text-[#526B5E] mt-0.5">حدد المخرجات التي ستراجعها قبل اعتماد الدفعة المالية للمطور.</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deliverablesInput}
                    onChange={(e) => setDeliverablesInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDeliverable();
                      }
                    }}
                    placeholder="أضف مخرجاً (مثال: تسليم الكود المصدري على مستودع GitHub + فيديو شرح)"
                    className="flex-1 h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                  />
                  <button
                    type="button"
                    onClick={handleAddDeliverable}
                    className="h-[46px] px-6 rounded-[12px] bg-[#056B38] text-white font-bold text-[13px] hover:bg-[#08592E] transition-all cursor-pointer shrink-0"
                  >
                    + إضافة مخرج
                  </button>
                </div>

                {deliverables.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {deliverables.map((del, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-[12px] bg-[#F7FAF8] border border-[#D1E3D6]/70 text-[13px] text-[#05291A]">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0" />
                          <span>{del}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeliverables(deliverables.filter((_, i) => i !== idx))}
                          className="text-red-500 font-bold hover:underline text-xs cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Skills & Technologies */}
              <div className="space-y-4 pt-6 border-t border-neutral-100">
                <div>
                  <h3 className="text-[18px] font-bold text-[#05291A] font-heading flex items-center gap-2">
                    <Code className="w-5 h-5 text-[#056B38]" />
                    <span>المهارات والتقنيات المطلوبة (Tech Stack)</span>
                  </h3>
                  <p className="text-[12px] text-[#526B5E] mt-0.5">تحديد التقنيات يساعد خوارزميات سكورا في ترشيح المطورين الأكثر خبرة لمشروعك.</p>
                </div>

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
                    placeholder="اكتب اسم أي مهارة أو تقنية (مثال: Docker, GraphQL, AWS) واضغط Enter"
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

                {/* Selected Skills Tags */}
                {selectedSkills.length > 0 && (
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
                            className="hover:text-red-300 font-bold ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preset Suggestions */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-bold text-[#526B5E]">مقترحات سريعة شائعة:</div>
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
                  className="w-full h-[52px] rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[15px] flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 active:scale-[0.99]"
                >
                  <Plus className="w-5 h-5" />
                  <span>{isSubmitting ? "جاري نشر المشروع..." : "نشر المشروع والبدء في استقبال العروض"}</span>
                </button>
              </div>
            </form>

            {/* Right Column: Platform Rules, Safety, & Escrow Conditions (1 Col) */}
            <div className="space-y-6">
              
              {/* Rules Card */}
              <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-7 space-y-5 shadow-2xs">
                <div className="flex items-center gap-2 text-[#05291A] font-extrabold text-[17px] font-heading pb-3 border-b border-neutral-100">
                  <Scale className="w-5 h-5 text-[#056B38]" />
                  <span>شروط وضوابط النشر في سكورا</span>
                </div>

                <div className="space-y-3.5 text-[12px] text-[#526B5E] leading-relaxed">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#05291A] block">1. متطلبات واضحة ونطاق عمل محدد</strong>
                      يجب تحديد نطاق العمل بشكل دقيق لتفادي أي نزاعات أو اختلافات أثناء تسليم الكود.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#05291A] block">2. ميزانية عادلة وحساب الضمان</strong>
                      الميزانية الدنيا 1,000 ج.م، وتودع في حساب الضمان (Escrow) ولا يتم تسليمها للمطور إلا بعد موافقتك.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#05291A] block">3. منع التعامل أو الدفع الخارجي</strong>
                      يمنع تبادل أرقام الهواتف أو التحويلات البنكية خارج المنصة؛ أي تعامل خارجي يفقدك حماية الضمان والتحكيم.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#05291A] block">4. حقوق الملكية الفكرية</strong>
                      بمجرد سداد قيمة المشروع، تنتقل كافة حقوق ملكية الكود المصدري والمخرجات للعميل بالكامل.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#05291A] block">5. حظر المشاريع المخالفة</strong>
                      يُحظر طلب برمجيات الاختراق أو انتهاك الخصوصية أو أي برمجيات تضر بالمستخدمين أو تخالف القانون.
                    </div>
                  </div>
                </div>
              </div>

              {/* Escrow Guarantee Card */}
              <div className="rounded-[28px] border border-[#D1E3D6] bg-[#E8FAF0] p-6 space-y-3 shadow-2xs">
                <div className="flex items-center gap-2 text-[#056B38] font-extrabold text-[15px]">
                  <Lock className="w-5 h-5 text-[#056B38]" />
                  <span>ضمان سكورا المالي 100%</span>
                </div>
                <p className="text-[12px] text-[#526B5E] leading-relaxed">
                  أموالك في أمان تام؛ يتم الاحتفاظ بالمبلغ كاملاً كأمانة وسيطة، ولا يتم تحرير الدفعة إلا بعد مراجعة المخرجات البرمجية والتأكد من مطابقتها لكافة الشروط المتفق عليها.
                </p>
              </div>

            </div>

          </div>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}
