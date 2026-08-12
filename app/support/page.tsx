"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import {
  Search,
  UserCheck,
  CreditCard,
  Briefcase,
  Wrench,
  ChevronDown,
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  HelpCircle,
  Clock,
  ShieldCheck,
  Check
} from "lucide-react";

export default function SupportPage() {
  const { addToast } = useProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "developers" | "clients" | "billing">("all");
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);

  // Support Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    userRole: "developer",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Custom Dropdown State
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleOptions = [
    { value: "developer", label: "مطور (Developer)" },
    { value: "client", label: "عميل فردي (Client)" },
    { value: "company", label: "شركة أو مؤسسة (Company)" },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // FAQ Data
  const faqs = [
    {
      category: "developers",
      question: "كيف يتم احتساب نقاط الثقة (Trust Score) والـ Developer Passport؟",
      answer:
        "يتم احتساب نقاط الثقة تلقائياً بناءً على نتائج التقييمات التقنية الفعلية (Assessments)، تحليل جودة الكود المرفوع، والتأكد من إنجاز المهام البرمجية دون الاعتماد الحصري على التوليد الآلي، ليحصل المطور على جواز رقمي موثق تشفيرياً.",
    },
    {
      category: "developers",
      question: "ما الفرق بين خطة Pro وخطة Verified للمطورين؟",
      answer:
        "خطة Pro تمنحك 4 تقييمات تقنية شهرياً وتحليلات الذكاء الاصطناعي لمهاراتك. بينما خطة Verified تضمن لك مقابلة تقنية موثوقة (Technical Interview) مع خبير تقني وشارة توثيق رسمية على حسابك مع رابط Passport عام للمشاركة مع الشركات.",
    },
    {
      category: "clients",
      question: "كيف يمكن للعملاء والشركات البحث والتواصل مع المطورين الموثقين؟",
      answer:
        "يمكن للعملاء التصفح عبر دليل المطورين (/developers)، وفلترة النتائج حسب المهارات وخبرة المطورين ونقاط الثقة (Trust Score)، ومن ثم إرسال عرض توظيف أو بدء محادثة مباشرة عبر المنصة.",
    },
    {
      category: "billing",
      question: "هل يمكنني إلغاء الاشتراك أو استرجاع الأموال؟",
      answer:
        "نعم، نضمن لك استرجاع كامل المبلغ خلال 14 يوماً من تاريخ الترقية لأي باقة مدفوعة وبدون أي أسئلة معقدة. كما يمكنك إلغاء التجديد التلقائي للاشتراك في أي وقت من إعدادات حسابك.",
    },
    {
      category: "billing",
      question: "ما هي وسائل الدفع الإلكتروني المتاحة في Scora؟",
      answer:
        "ندعم جميع بطاقات الفيزا والماستركارد (Visa/Mastercard)، بطاقات ميزة المحليات، والمحافظ الإلكترونية الشهيرة مع إصدار فوري للفواتير الضريبية الموثقة.",
    },
    {
      category: "clients",
      question: "كيف تضمن Scora جدية التقييمات وتجنب التقييمات الوهمية؟",
      answer:
        "تعتمد Scora على محرك اختبارات برمجي مدمج يحلل الكود البرمجي خطوة بخطوة في بيئة تشغيل آمنة (Sandbox)، مع مراقبة الذكاء الاصطناعي ومراجع الخبراء المعتمدين لمنع أي تلاعب.",
    },
  ];

  // Filter FAQs based on category & search query
  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      addToast("يرجى ملء جميع الحقول المطلوبة إجباريًا", "warn");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
      addToast("تم إرسال تذكرة الدعم بنجاح! سيتواصل معك فريقنا خلال ساعتين.", "success");
    }, 1200);
  };

  const selectedRoleOption = roleOptions.find((opt) => opt.value === formData.userRole) || roleOptions[0];

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-16">
        
        {/* HERO / SEARCH HEADER */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-14 text-center space-y-6 relative overflow-hidden shadow-2xs">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6] shadow-2xs">
            <HelpCircle className="w-4 h-4 text-[#056B38]" />
            <span>مركز الدعم والمساعدة · Scora Help Center</span>
          </div>

          <h1 className="text-[32px] md:text-[46px] font-extrabold text-[#05291A] font-heading leading-tight max-w-3xl mx-auto">
            كيف يمكننا مساعدتك اليوم؟
          </h1>

          <p className="text-[15px] md:text-[16px] text-[#526B5E] leading-relaxed max-w-2xl mx-auto">
            ابحث في الأسئلة الشائعة، المقالات التعليمة، أو تواصل مباشرة مع فريق الدعم الفني لمساعدتك في أي استفسار.
          </p>

          {/* Search Input Box */}
          <div className="max-w-2xl mx-auto relative pt-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-[#526B5E] absolute right-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن سؤال، ميزة، أو حل لمشكلة تقنية..."
                className="w-full h-[54px] rounded-full border border-[#D1E3D6] bg-white pr-12 pl-6 text-[14px] text-[#05291A] placeholder-[#526B5E]/70 outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* QUICK CATEGORY CARDS (4 Cards) */}
        <div className="space-y-6">
          <div>
            <h2 className="text-[26px] font-extrabold text-[#05291A] font-heading">
              أقسام الدعم السريع
            </h2>
            <p className="text-[14px] text-[#526B5E] mt-1">
              اختر القسم المناسب لاستكشاف الحلول والأجوبة الشائعة.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1 */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3 hover:border-[#056B38] hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-[#05291A]">
                الحساب والجواز الرقمي
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                إدارة الملف الشخصي، توثيق Developer Passport، وتقييم المهارات.
              </p>
            </div>

            {/* Card 2 */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3 hover:border-[#056B38] hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center group-hover:scale-105 transition-transform">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-[#05291A]">
                الاشتراكات والمدفوعات
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                باقات Pro وVerified، الفواتير الضريبية، وسياسة الاسترجاع.
              </p>
            </div>

            {/* Card 3 */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3 hover:border-[#056B38] hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-[#05291A]">
                التوظيف والمشاريع
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                نشر طلبات التوظيف، تواصل العملاء مع المطورين، وعقود العمل.
              </p>
            </div>

            {/* Card 4 */}
            <div className="rounded-[20px] border border-[#D1E3D6] bg-white p-6 space-y-3 hover:border-[#056B38] hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Wrench className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-[#05291A]">
                المشاكل التقنية والـ API
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                حل مشاكل الاختبارات، رفع الكود البرمجي، وتكاملات API.
              </p>
            </div>

          </div>
        </div>

        {/* FREQUENTLY ASKED QUESTIONS (FAQ Accordion Section) */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D1E3D6] pb-4">
            <div>
              <h2 className="text-[26px] font-extrabold text-[#05291A] font-heading">
                الأسئلة الشائعة (FAQ)
              </h2>
              <p className="text-[14px] text-[#526B5E] mt-1">
                إجابات فورية لأكثر الأسئلة تكراراً من المطورين والعملاء.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                  activeCategory === "all"
                    ? "bg-[#056B38] text-white"
                    : "bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0]"
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("developers")}
                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                  activeCategory === "developers"
                    ? "bg-[#056B38] text-white"
                    : "bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0]"
                }`}
              >
                للمطورين
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("clients")}
                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                  activeCategory === "clients"
                    ? "bg-[#056B38] text-white"
                    : "bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0]"
                }`}
              >
                للعملاء والشركات
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("billing")}
                className={`px-4 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                  activeCategory === "billing"
                    ? "bg-[#056B38] text-white"
                    : "bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0]"
                }`}
              >
                الاشتراكات والدفع
              </button>
            </div>
          </div>

          {/* Accordion List */}
          <div className="space-y-4">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 rounded-[20px] border border-dashed border-[#D1E3D6] p-8">
                <HelpCircle className="w-10 h-10 text-[#526B5E] mx-auto mb-3" />
                <p className="text-[15px] font-bold text-[#05291A]">لم نجد نتائج مطابقة لـ "{searchQuery}"</p>
                <p className="text-[13px] text-[#526B5E] mt-1">جرب البحث بكلمات أخرى أو تواصل مع فريق الدعم أدناه.</p>
              </div>
            ) : (
              filteredFaqs.map((faq, index) => {
                const isOpen = expandedFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-[20px] border border-[#D1E3D6] bg-white overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaqIndex(isOpen ? null : index)}
                      className="w-full p-5 px-6 text-right flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50/80 transition-colors"
                    >
                      <span className="text-[16px] font-bold text-[#05291A]">
                        {faq.question}
                      </span>
                      <div
                        className={`w-8 h-8 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 bg-[#056B38] text-white" : ""
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 pt-1 text-[14px] text-[#526B5E] leading-relaxed border-t border-[#D1E3D6]/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* CONTACT SUPPORT FORM & LIVE CHAT SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
          
          {/* Left / Main Column: Ticket Form */}
          <div className="lg:col-span-2 rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-6 shadow-2xs">
            <div>
              <h3 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                إرسال تذكرة دعم فني
              </h3>
              <p className="text-[13px] text-[#526B5E] mt-1">
                املأ النموذج وسيتواصل معك أحد خبراء فريق Scora خلال ساعتين عمل.
              </p>
            </div>

            {formSubmitted ? (
              <div className="rounded-[20px] bg-[#E8FAF0] border border-[#D1E3D6] p-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-[#056B38] mx-auto" />
                <h4 className="text-[20px] font-bold text-[#05291A]">
                  تم استلام رسالتك بنجاح!
                </h4>
                <p className="text-[14px] text-[#526B5E] max-w-md mx-auto">
                  شكراً لتواصلك معنا. قام نظام التذاكر بإنشاء الرقم المرجعي #SC-{(Math.random() * 8999 + 1000).toFixed(0)} وسيرد عليك ممثل الدعم المخصص على بريدك الإلكتروني.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setFormSubmitted(false);
                    setFormData({ name: "", email: "", userRole: "developer", subject: "", message: "" });
                  }}
                  className="rounded-full bg-[#056B38] text-white px-6 py-2.5 text-[13px] font-bold hover:bg-[#08592E] transition-all cursor-pointer"
                >
                  إرسال تذكرة جديدة
                </button>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      الاسم الكامل <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="أدخل اسمك الكامل"
                      className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] transition-all"
                    />
                  </div>

                  {/* Email Input */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      البريد الإلكتروني <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Custom Styled Popover Role Selector Dropdown */}
                  <div className="space-y-1.5 relative" ref={dropdownRef}>
                    <label className="text-[13px] font-bold text-[#05291A]">
                      نوع الحساب
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                      className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 flex items-center justify-between text-[13px] text-[#05291A] font-medium outline-none hover:border-[#056B38] focus:border-[#056B38] transition-all cursor-pointer"
                    >
                      <span>{selectedRoleOption.label}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#526B5E] transition-transform duration-200 ${
                          isRoleDropdownOpen ? "rotate-180 text-[#056B38]" : ""
                        }`}
                      />
                    </button>

                    {/* Popover Dropdown Menu */}
                    {isRoleDropdownOpen && (
                      <div className="absolute top-full mt-1.5 right-0 left-0 z-50 rounded-[14px] border border-[#D1E3D6] bg-white p-1.5 shadow-lg space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
                        {roleOptions.map((option) => {
                          const isSelected = option.value === formData.userRole;
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, userRole: option.value });
                                setIsRoleDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 rounded-[10px] text-[13px] font-bold text-right flex items-center justify-between cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-[#E8FAF0] text-[#056B38]"
                                  : "text-[#05291A] hover:bg-neutral-50"
                              }`}
                            >
                              <span>{option.label}</span>
                              {isSelected && <Check className="w-4 h-4 text-[#056B38]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Subject Input */}
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">
                      موضوع التذكرة <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="مثال: مشكلة في توثيق الجواز الرقمي"
                      className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] transition-all"
                    />
                  </div>
                </div>

                {/* Message Input */}
                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">
                    تفاصيل الرسالة أو المشكلة <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="اكتب جميع التفاصيل والمعلومات المتعلقة باستفسارك هنا..."
                    className="w-full rounded-[12px] border border-[#D1E3D6] bg-white p-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] transition-all resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto h-[48px] px-8 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[14px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? "جاري الإرسال..." : "إرسال تذكرة الدعم"}</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Sidebar Direct Contact Info */}
          <div className="space-y-6">
            
            {/* Live Chat Card */}
            <div className="rounded-[24px] bg-[#056B38] p-6 text-white space-y-4 shadow-md overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h4 className="text-[18px] font-bold font-heading">
                الشات المباشر (Live Chat)
              </h4>
              <p className="text-[13px] text-[#D4F5E0] leading-relaxed">
                مسؤولو الدعم متواجدون لمساعدتك فوراً والإجابة على أي استفسارات تقنية.
              </p>
              <div className="flex items-center gap-2 text-[12px] text-[#D4F5E0] pt-1">
                <Clock className="w-4 h-4" />
                <span>متوسط زمن الرد: أقل من 5 دقائق</span>
              </div>
              <Link
                href="/chat?tab=support"
                className="w-full h-[44px] rounded-[12px] bg-white text-[#056B38] hover:bg-neutral-100 text-[13px] font-bold transition-all flex items-center justify-center cursor-pointer shadow-xs"
              >
                بدء محادثة الآن
              </Link>
            </div>

            {/* Email Support Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center">
                <Mail className="w-6 h-6" />
              </div>
              <h4 className="text-[18px] font-bold text-[#05291A]">
                البريد الإلكتروني المباشر
              </h4>
              <div className="space-y-2 text-[13px]">
                <div className="flex items-center justify-between text-[#526B5E] border-b border-neutral-100 pb-2">
                  <span>دعم المطورين:</span>
                  <a href="mailto:support@scora.app" className="font-bold text-[#056B38] hover:underline dir-ltr">
                    support@scora.app
                  </a>
                </div>
                <div className="flex items-center justify-between text-[#526B5E] pt-1">
                  <span>مبيعات الشركات:</span>
                  <a href="mailto:sales@scora.app" className="font-bold text-[#056B38] hover:underline dir-ltr">
                    sales@scora.app
                  </a>
                </div>
              </div>
            </div>

            {/* Guarantees Box */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-[#E8FAF0] p-6 space-y-3">
              <div className="flex items-center gap-2 text-[#056B38] font-bold text-[14px]">
                <ShieldCheck className="w-5 h-5" />
                <span>حماية وخصوصية تامة</span>
              </div>
              <p className="text-[12px] text-[#526B5E] leading-relaxed">
                جميع بياناتك، تذاكر الدعم، والشات المباشر محمية ومشفّرة بالكامل طوال الوقت.
              </p>
            </div>

          </div>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
