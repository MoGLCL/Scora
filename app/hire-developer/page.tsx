"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import { ArrowLeft, CheckCircle2, ChevronDown, Check } from "lucide-react";

interface CustomHireDropdownProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  label: string;
}

function CustomHireDropdown({ options, value, onChange, label }: CustomHireDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className="space-y-2 relative" ref={dropdownRef}>
      <label className="block text-[14px] font-bold text-ink">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[52px] rounded-2xl border border-neutral-200/80 bg-[#F4F7F5] px-5 flex items-center justify-between text-[14px] text-ink font-bold focus:outline-none focus:border-primary focus:bg-white transition-all cursor-pointer shadow-2xs"
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-primary" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1.5 right-0 left-0 z-50 rounded-[18px] border border-[#D1E3D6] bg-white p-1.5 shadow-xl space-y-1 animate-in fade-in duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 rounded-[12px] text-[13px] font-bold text-right flex items-center justify-between cursor-pointer transition-colors ${
                  isSelected ? "bg-[#E8FAF0] text-[#056B38]" : "text-ink hover:bg-neutral-50"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-4 h-4 text-[#056B38]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function HireDeveloperPage() {
  const { developer, addAppliedProject, addToast } = useProfile();

  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [budgetFrom, setBudgetFrom] = useState("");
  const [budgetTo, setBudgetTo] = useState("");
  const [startDate, setStartDate] = useState("خلال أسبوعين");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const START_DATE_OPTIONS = [
    { label: "خلال أسبوع", value: "خلال أسبوع" },
    { label: "خلال أسبوعين", value: "خلال أسبوعين" },
    { label: "خلال شهر", value: "خلال شهر" },
    { label: "فوري (عاجل)", value: "فوري (عاجل)" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !description.trim()) {
      addToast("يرجى ملء جميع الحقول المطلوبة لتسليم طلب الشغل", "warn");
      return;
    }

    addAppliedProject({
      id: Date.now().toString(),
      title: projectName,
      clientName: "شركة الفرسان للحلول التقنية",
      proposedPrice: budgetFrom && budgetTo ? `${budgetFrom} - ${budgetTo} ج.م` : "حسب الاتفاق",
      deliveryDays: startDate,
      status: "مفتوح لتلقي العروض",
      appliedDate: "الآن",
    });

    setIsSubmitted(true);
    addToast("تم إرسال طلب الشغل للمطور وتسجيل العقد في المنصة بنجاح!", "success");
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
      {/* Unified Site Header */}
      <SiteHeader />

      {/* Sub Header / Breadcrumb Bar */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex h-14 max-w-[1296px] items-center justify-between px-6 md:px-8 text-[13px]">
          <div className="flex items-center gap-2 font-medium text-muted">
            <Link href="/developers" className="hover:text-primary transition-colors">
              المبرمجين
            </Link>
            <span>/</span>
            <span className="text-ink font-semibold">
              بروفايل {developer.fullName}
            </span>
          </div>

          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 font-bold text-[#0E6D3B] hover:underline"
          >
            <span>رجوع للبروفايل</span>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-14 w-full flex-1">
        
        {/* Main Heading Section */}
        <div className="text-right mb-10">
          <div className="text-[13px] font-bold text-[#0E6D3B] mb-1">
            تواصل وتوظيف
          </div>
          <h1 className="text-[34px] md:text-[42px] font-bold text-ink font-heading leading-tight mb-2">
            ابدأ كلام مع {developer.fullName}
          </h1>
          <p className="text-[15px] text-muted max-w-2xl">
            ابعت تفاصيل الشغل، وهو يقدر يراجع الطلب ويرد عليك من داخل SCORA.
          </p>
        </div>

        {/* 2 Columns Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN (Summary Card - 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              
              <div className="text-[13px] font-bold text-[#0E6D3B] mb-4">
                المبرمج اللي هتتواصل معاه
              </div>

              {/* Developer Dark Green Passport Card */}
              <div className="rounded-[24px] bg-[#004021] p-6 text-white mb-6 relative overflow-hidden shadow-sm">
                
                {/* Logo Top Right LTR */}
                <div className="flex justify-end mb-4" dir="ltr">
                  <div className="inline-flex items-baseline gap-1 font-heading text-[18px] font-bold text-white">
                    <span className="w-1 h-1 rounded-full bg-emerald-400 inline-block self-end mb-[2px]" />
                    <span>Scora</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  {/* Avatar */}
                  {developer.avatarUrl ? (
                    <img
                      src={developer.avatarUrl}
                      alt={developer.fullName}
                      className="h-16 w-16 rounded-full object-cover border-2 border-emerald-400"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0E6D3B] text-[20px] font-bold">
                      {getInitials(developer.fullName)}
                    </div>
                  )}

                  {/* Name & Title */}
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[20px] font-bold text-white font-heading">
                        {developer.fullName}
                      </h3>
                      <Check className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-[13px] text-emerald-100 mt-0.5">
                      {developer.jobTitle} · {developer.location}
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-4 text-center">
                  <div>
                    <div className="text-[11px] text-emerald-200">درجة الثقة</div>
                    <div className="text-[18px] font-bold text-white mt-0.5">
                      {developer.trustScore} / 100
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-emerald-200">نقط المهارة</div>
                    <div className="text-[18px] font-bold text-white mt-0.5">
                      {developer.skillPoints} SP
                    </div>
                  </div>
                </div>

              </div>

              {/* Core Skills List */}
              <div className="mb-6">
                <div className="text-[14px] font-bold text-ink mb-2">
                  المهارات الأساسية
                </div>
                <div className="flex flex-wrap gap-2 text-[13px] text-neutral-600">
                  {developer.skills.slice(0, 4).map((skill, idx) => (
                    <span key={skill}>
                      {skill} {idx < 3 ? "·" : ""}
                    </span>
                  ))}
                </div>
              </div>

              {/* Availability Badge */}
              <div className="mb-6 rounded-2xl bg-[#EBF7EF] p-4 text-center text-[14px] font-bold text-[#0E6D3B]">
                متاح يبدأ خلال أسبوع
              </div>

              {/* Back to Profile Link */}
              <div className="text-center">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 text-[14px] font-bold text-ink hover:text-[#0E6D3B] transition-colors"
                >
                  <span>راجع البروفايل الكامل</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>

            </div>
          </div>

          {/* RIGHT COLUMN (Form Card - 7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 md:p-10 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
              
              {isSubmitted ? (
                /* Success State */
                <div className="text-center py-12 space-y-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-16 h-16 rounded-full bg-[#EBF7EF] text-[#0E6D3B] flex items-center justify-center mx-auto mb-4 border border-[#C5E8D1]">
                    <CheckCircle2 className="w-10 h-10 text-[#0E6D3B]" />
                  </div>
                  <h3 className="text-[26px] font-bold text-ink font-heading">
                    تم إرسال طلب الشغل بنجاح!
                  </h3>
                  <p className="text-[14px] text-muted max-w-md mx-auto leading-relaxed">
                    تم استلام تفاصيل مشروعك وتسجيل العقد رسمياً في نظام Scora. سيقوم المطور {developer.fullName} بمراجعة الطلب والرد عليك مباشرة.
                  </p>
                  <div className="pt-6">
                    <Link
                      href="/dashboard"
                      className="inline-flex h-[50px] items-center justify-center gap-2 rounded-full bg-[#0E6D3B] hover:bg-[#005B27] px-8 text-[14px] font-bold text-white transition-all shadow-xs"
                    >
                      العودة للوحة التحكم
                    </Link>
                  </div>
                </div>
              ) : (
                /* Interactive Form */
                <form onSubmit={handleSubmit} className="space-y-6">
                  
                  <div>
                    <h2 className="text-[24px] font-bold text-ink font-heading mb-1">
                      تفاصيل الشغل
                    </h2>
                    <p className="text-[14px] text-muted">
                      كل ما التفاصيل تكون واضحة، الرد هيكون أسرع.
                    </p>
                  </div>

                  {/* Input 1: Project Name */}
                  <div>
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      اسم المشروع
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: لوحة تحكم لمتابعة المبيعات"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full h-[52px] rounded-2xl border border-neutral-200/80 bg-[#F4F7F5] px-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>

                  {/* Input 2: Project Description */}
                  <div>
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      احكيله عن الشغل
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="إيه المطلوب؟ وإيه النتيجة اللي مستنيها؟"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-2xl border border-neutral-200/80 bg-[#F4F7F5] p-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:bg-white transition-all leading-relaxed"
                    />
                  </div>

                  {/* Input 3: Budget Range */}
                  <div>
                    <label className="block text-[14px] font-bold text-ink mb-2">
                      الميزانية المتوقعة
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="من _ جنيه"
                          value={budgetFrom}
                          onChange={(e) => setBudgetFrom(e.target.value)}
                          className="w-full h-[52px] rounded-2xl border border-neutral-200/80 bg-[#F4F7F5] px-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:bg-white transition-all"
                        />
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          placeholder="لحد _ جنيه"
                          value={budgetTo}
                          onChange={(e) => setBudgetTo(e.target.value)}
                          className="w-full h-[52px] rounded-2xl border border-neutral-200/80 bg-[#F4F7F5] px-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Input 4: Custom Popover Dropdown for Start Date */}
                  <CustomHireDropdown
                    options={START_DATE_OPTIONS}
                    value={startDate}
                    onChange={setStartDate}
                    label="إمتى تحب تبدأ؟"
                  />

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full h-[54px] rounded-full bg-[#0E6D3B] hover:bg-[#005B27] text-[15px] font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                      <span>ابعت طلب الشغل</span>
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                  </div>

                </form>
              )}

            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
