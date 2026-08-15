"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { updateClientProfile } from "@/lib/actions/profile";
import { uploadAvatar } from "@/lib/actions/upload";
import {
  Building2,
  MapPin,
  Globe,
  Briefcase,
  User,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  Camera,
  Search,
  ChevronDown,
  X,
  Plus,
  Sparkles,
  Award,
  Layers,
  Code,
  Lock,
  FileCheck
} from "lucide-react";

// HIGH-FIDELITY VECTOR SVG EGYPTIAN FLAG (WITH SALADIN EAGLE)
function EgyptFlagSVG({ className = "w-5 h-3.5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 900 600"
      className={`${className} rounded-[3px] shadow-xs border border-neutral-200 shrink-0 inline-block`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Red Stripe (Top) */}
      <rect width="900" height="200" fill="#C8102E" />
      {/* White Stripe (Middle) */}
      <rect y="200" width="900" height="200" fill="#FFFFFF" />
      {/* Black Stripe (Bottom) */}
      <rect y="400" width="900" height="200" fill="#000000" />
      
      {/* Golden Eagle of Saladin (Coat of Arms) */}
      <g transform="translate(450, 300) scale(0.6)">
        <path
          d="M-30,-75 C-15,-90 15,-90 30,-75 C45,-60 65,-40 75,10 C80,35 60,65 40,85 C25,95 -25,95 -40,85 C-60,65 -80,35 -75,10 C-65,-40 -45,-60 -30,-75 Z"
          fill="#C59B27"
        />
        <path
          d="M-10,-85 C-5,-105 15,-105 20,-85 C15,-70 -5,-70 -10,-85 Z"
          fill="#C59B27"
        />
        <path
          d="M-20,-20 L20,-20 L20,30 C20,45 0,60 0,60 C0,60 -20,45 -20,30 Z"
          fill="#FFFFFF"
          stroke="#C59B27"
          strokeWidth="3"
        />
        <rect x="-6" y="-20" width="12" height="60" fill="#C59B27" />
        <path
          d="M-35,85 L35,85 L25,105 L-25,105 Z"
          fill="#C59B27"
        />
      </g>
    </svg>
  );
}

// ALL EGYPTIAN GOVERNORATES & THEIR CITIES
const EGYPT_GOVERNORATES_AND_CITIES: Record<string, string[]> = {
  "القاهرة": [
    "مدينة نصر", "مصر الجديدة", "المعادي", "التجمع الخامس (القاهرة الجديدة)", "الزمالك", 
    "وسط البلد", "شبرا", "المقطم", "عين شمس", "حلوان", "الرحاب", "مدينتي", "الشروق", 
    "بدر", "العاصمة الإدارية الجديدة", "المرج", "الزيتون", "حدائق القبة", "روض الفرج", "العباسية"
  ],
  "الجيزة": [
    "الدقي", "المهندسين", "العجوزة", "الهرم", "فيصل", "مدينة 6 أكتوبر", "الشيخ زايد", 
    "حدائق الأهرام", "العمرانية", "بولاق الدكرور", "إمبابة", "البدرشين", "العياط", "أوسيم", "كرداسة", "الحوامدية"
  ],
  "الإسكندرية": [
    "سموحة", "ستانلي", "سيدي جابر", "سيدي بشر", "ميامي", "لوران", "جليم", "محطة الرمل", 
    "الإبراهيمية", "العجمي", "الهانوفيل", "المعمورة", "المنتزه", "برج العرب", "العامارية", "كرموز"
  ],
  "الغربية": [
    "طنطا", "المحلة الكبرى", "كفر الزيات", "زفتى", "السنطة", "سمنود", "بسيون", "قطور"
  ],
  "الدقهلية": [
    "المنصورة", "طلخا", "ميت غمر", "السنبلاوين", "دكرنس", "بلقاس", "منية النصر", "شربين", 
    "أجا", "الجمالية", "المطرية", "بني عبيد", "نبروه", "تمى الأمديد"
  ],
  "الشرقية": [
    "الزقازيق", "العاشر من رمضان", "بلبيس", "منيا القمح", "فاقوس", "أبو حماد", "أبو كبير", 
    "ههيا", "ديرب نجم", "كفر صقر", "أولاد صقر", "الحسينية", "الصالحية الجديدة", "مشتول السوق"
  ],
  "القليوبية": [
    "بنها", "شبرا الخيمة", "قليوب", "القناطر الخيرية", "الخانكة", "كفر شكر", "طوخ", "شبين القناطر", "العبور", "قها"
  ],
  "المنوفية": [
    "شبين الكوم", "مدينة السادات", "منوف", "أشمون", "الباجور", "قويسنا", "بركة السبع", "تلا", "الشهداء", "سرس الليان"
  ],
  "البحيرة": [
    "دمنهور", "كفر الدوار", "إيتاي البارود", "أبو حمص", "حوش عيسى", "رشيد", "إدكو", "الدلنجات", 
    "أبو المطامير", "كوم حمادة", "بدر", "وادي النطرون", "شبراخيت", "المحمودية"
  ],
  "كفر الشيخ": [
    "كفر الشيخ", "دسوق", "فوه", "مطوبس", "سيدي سالم", "الرياض", "بيلا", "الحامول", "بلطيم", "سيدي غازي", "قلين"
  ],
  "دمياط": [
    "دمياط", "دمياط الجديدة", "رأس البر", "فارسكور", "الزرقا", "كفر سعد", "كفر البطيخ", "ميت أبو غالب", "الروضة"
  ],
  "بورسعيد": [
    "حي الشرق", "حي العرب", "حي المناخ", "حي الضواحي", "حي الزهور", "حي الجنوب", "بورفؤاد"
  ],
  "الإسماعيلية": [
    "الإسماعيلية", "فايد", "القنطرة شرق", "القنطرة غرب", "التل الكبير", "القصاصين", "أبو صوير"
  ],
  "السويس": [
    "حي السويس", "حي الأربعين", "حي عتاقة", "حي فيصل", "حي الجناين", "العين السخنة"
  ],
  "الفيوم": [
    "الفيوم", "طامية", "سنورس", "إطسا", "إبشواي", "يوسف الصديق", "الفيوم الجديدة"
  ],
  "بني سويف": [
    "بني سويف", "بني سويف الجديدة", "الواسطى", "ناصر", "إهناسيا", "ببا", "سمسطا", "الفشن"
  ],
  "المنيا": [
    "المنيا", "المنيا الجديدة", "مغاغة", "بني مزار", "مطاي", "سمالوط", "أبو قرقاص", "ملوي", "دير مواس", "العدوة"
  ],
  "أسيوط": [
    "أسيوط", "أسيوط الجديدة", "ديروط", "القوصية", "أبنوب", "منفلوط", "الفتح", "أبو تيج", "الغنايم", "ساحل سليم", "البداري", "صدفا"
  ],
  "سوهاج": [
    "سوهاج", "سوهاج الجديدة", "أخميم", "أخميم الجديدة", "جرجا", "طهطا", "المراغة", "طما", "البلينا", "المنشأة", "دار السلام", "ساقلتة", "جهينة"
  ],
  "قنا": [
    "قنا", "قنا الجديدة", "نجع حمادي", "دشنا", "فرشوط", "أبو تشت", "فاو", "قوص", "نقادة", "الوقف"
  ],
  "الأقصر": [
    "الأقصر", "طيبة الجديدة", "إسنا", "أرمنت", "القرنة", "البياضية", "الزينية", "الطود"
  ],
  "أسوان": [
    "أسوان", "أسوان الجديدة", "كوم أمبو", "إدفو", "نصر النوبة", "دراو", "أبو سمبل"
  ],
  "البحر الأحمر": [
    "الغردقة", "الجونة", "سفاجا", "القصير", "مرسى علم", "رأس غارب", "الشلاتين", "حلايب"
  ],
  "شمال سيناء": [
    "العريش", "الشيخ زويد", "رفح", "بئر العبد", "نخل", "الحسنة"
  ],
  "جنوب سيناء": [
    "شرم الشيخ", "دهب", "نويبع", "طابا", "طور سيناء", "رأس سدر", "سانت كاترين", "أبو زنيمة", "أبو رديس"
  ],
  "مطروح": [
    "مرسى مطروح", "العلمين", "العلمين الجديدة", "سيدي عبد الرحمن", "الحمام", "الضبعة", "سيوة", "النجيلة", "السلوم", "براني"
  ],
  "الوادي الجديد": [
    "الخارجة", "الداخلة", "الفرافرة", "باريس", "بلاط"
  ]
};

// COMPANY INDUSTRIES
const COMPANY_INDUSTRIES = [
  "البرمجيات وتكنولوجيا المعلومات (SaaS / Tech)",
  "التجارة الإلكترونية والبيع بالتجزئة (E-Commerce)",
  "التكنولوجيا المالية والمدفوعات (FinTech)",
  "الذكاء الاصطناعي وتعلم الآلة (AI / LLMs)",
  "الرعاية الصحية والتكنولوجيا الطبية (HealthTech)",
  "التكنولوجيا التعليمية (EdTech)",
  "التطوير العقاري ومنصات العقارات (PropTech)",
  "الخدمات اللوجستية والشحن (Logistics)",
  "الإعلام والتسويق الرقمي (Media & Marketing)",
  "السياحة وحجوزات السفر (TravelTech)",
  "الاستشارات والخدمات المهنية (Consulting)",
  "الزراعة والتكنولوجيا الزراعية (AgriTech)",
  "مجال آخر / مشروع ناشئ"
];

// CLIENT ROLES FOR PERSONAL ACCOUNTS
const CLIENT_PERSONAL_ROLES = [
  "مؤسس شركة ناشئة (Startup Founder)",
  "صاحب فكرة / مشروع تجاري (Business Owner)",
  "مدير منتج / تقني (Product / Tech Lead)",
  "رائد أعمال مستقل (Entrepreneur)",
  "مستثمر أعمال (Angel Investor / VC)",
  "مدير تسويق وتطوير أعمال (Growth Lead)"
];

// TARGET PROJECT TRACKS
const TARGET_PROJECT_TRACKS = [
  "Full-Stack Web Development",
  "Mobile Apps (iOS / Android / Flutter)",
  "Agentic AI & LLM Solutions",
  "Backend & Cloud Architecture",
  "UI/UX & Product Design",
  "DevOps & Infrastructure",
  "Data Science & Analytics",
  "Cybersecurity & Auditing",
  "ERP & Business Automation (Odoo/SAP)"
];

// MASTER TECH POOL
const MASTER_TECH_POOL = [
  "JavaScript", "TypeScript", "Python", "React.js", "Next.js", "Vue.js", "Angular",
  "Node.js", "Express.js", "NestJS", "FastAPI", "Django", "PHP", "Laravel", "Spring Boot",
  "Flutter", "React Native", "Swift", "Kotlin", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Firebase", "LangChain", "LlamaIndex",
  "OpenAI APIs", "PyTorch", "Figma", "Tailwind CSS", "GraphQL", "REST APIs", "Odoo"
];

export default function CompleteClientProfilePage() {
  const router = useRouter();
  const { client, updateClient, updateUsername, addToast } = useProfile();

  const [currentStep, setCurrentStep] = useState(1);

  // Name splitting
  const existingNameParts = (client.fullName || "").trim().split(/\s+/);
  const [firstName, setFirstName] = useState(existingNameParts[0] || "");
  const [fatherName, setFatherName] = useState(existingNameParts[1] || "");
  const [familyName, setFamilyName] = useState(existingNameParts.slice(2).join(" ") || "");

  // Basic Account Data
  const [accountType, setAccountType] = useState<"personal" | "company">(
    (client.accountType as "personal" | "company") || "personal"
  );
  const [companyName, setCompanyName] = useState(client.companyName || "");
  const [companySize, setCompanySize] = useState("1-10");
  const [clientRole, setClientRole] = useState(CLIENT_PERSONAL_ROLES[0]);
  const [industry, setIndustry] = useState(COMPANY_INDUSTRIES[0]);
  const [phone, setPhone] = useState(client.phone || "");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState(client.website || "");
  const [aboutBio, setAboutBio] = useState("");

  // Location (Governorate & City)
  const initialGov = client.location ? client.location.split(" - ")[0] || "القاهرة" : "القاهرة";
  const initialCity = client.location ? client.location.split(" - ")[1] || "التجمع الخامس (القاهرة الجديدة)" : "التجمع الخامس (القاهرة الجديدة)";
  const [governorate, setGovernorate] = useState(initialGov);
  const [city, setCity] = useState(initialCity);
  const [isGovOpen, setIsGovOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const govRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  // Target Project Tracks & Preferred Skills
  const [selectedTracks, setSelectedTracks] = useState<string[]>([TARGET_PROJECT_TRACKS[0]]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["React.js", "Node.js", "TypeScript"]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [isSkillSearchOpen, setIsSkillSearchOpen] = useState(false);
  const skillSearchRef = useRef<HTMLDivElement>(null);

  // Avatar Upload
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State & Loading
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (govRef.current && !govRef.current.contains(event.target as Node)) {
        setIsGovOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
        setIsCityOpen(false);
      }
      if (skillSearchRef.current && !skillSearchRef.current.contains(event.target as Node)) {
        setIsSkillSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fullName = [firstName, fatherName, familyName].map((x) => x.trim()).filter(Boolean).join(" ");

  // Step 1 Validation
  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "الاسم الأول مطلوب";
    if (!familyName.trim()) newErrors.familyName = "اسم العائلة مطلوب";
    
    if (!username.trim()) {
      newErrors.username = "اسم المستخدم مطلوب";
    } else if (username.length < 3) {
      newErrors.username = "اسم المستخدم يجب أن يكون 3 أحرف على الأقل";
    } else if (!/^[a-z0-9_]+$/.test(username)) {
      newErrors.username = "اسم المستخدم يقبل فقط الحروف الإنجليزية الصغيرة والأرقام و _";
    }

    if (!phone.trim()) {
      newErrors.phone = "رقم الهاتف مطلوب";
    } else if (!/^01[0125][0-9]{8}$/.test(phone.trim())) {
      newErrors.phone = "يرجى كتابة رقم هاتف مصري صحيح (مثال: 01012345678)";
    }

    if (!governorate) newErrors.governorate = "اختر المحافظة";
    if (!city) newErrors.city = "اختر المدينة / الحي";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (accountType === "company" && !companyName.trim()) {
      newErrors.companyName = "اسم الشركة مطلوب";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep1() || !validateStep2()) {
      addToast("يرجى مراجعة وتعبئة الحقول المطلوبة بشكل صحيح", "warn");
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const locationString = `${governorate} - ${city}`;
      const data = new FormData();
      data.set("displayName", fullName.trim());
      data.set("accountType", accountType);
      data.set("companyName", accountType === "company" ? companyName.trim() : "");
      data.set("industry", accountType === "company" ? industry : clientRole);
      data.set("phone", phone.trim());
      data.set("username", username.trim().toLowerCase());
      data.set("location", locationString);
      data.set("website", accountType === "company" ? website.trim() : "");

      const result = await updateClientProfile(undefined, data);
      if (!result.ok) {
        const message =
          result.error ??
          Object.values(result.fieldErrors ?? {}).flat()[0] ??
          "تعذر حفظ البيانات";
        setErrors({ global: message });
        addToast(message, "warn");
        setLoading(false);
        return;
      }

      if (avatarFile) {
        const avatarData = new FormData();
        avatarData.set("file", avatarFile);
        const uploaded = await uploadAvatar(avatarData);
        if (!uploaded.ok) {
          addToast(uploaded.error || "تعذر رفع الصورة الشخصية", "warn");
        }
      }

      updateClient({
        companyName: accountType === "company" ? companyName.trim() : "",
        fullName: fullName.trim(),
        phone: phone.trim(),
        location: locationString,
        website: accountType === "company" ? website.trim() : "",
      });
      updateUsername(username.trim().toLowerCase());

      addToast("تم إكمال إعداد حساب العميل وصاحب العمل بنجاح!", "success");
      router.push("/dashboard");
    } catch (err: any) {
      setErrors({ global: err?.message || "حدث خطأ غير متوقع" });
    } finally {
      setLoading(false);
    }
  };

  // Tech Skill Helpers
  const toggleTrack = (track: string) => {
    setSelectedTracks((prev) =>
      prev.includes(track)
        ? prev.length > 1
          ? prev.filter((t) => t !== track)
          : prev
        : [...prev, track]
    );
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[960px] px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-8">
        
        {/* HEADER HERO */}
        <div className="rounded-[32px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-12 space-y-4 text-center shadow-2xs">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#056B38] text-[13px] font-bold border border-[#D1E3D6] shadow-2xs">
            <Building2 className="w-4 h-4 text-[#056B38]" />
            <span>إعداد حساب العميل وصاحب العمل · Client Onboarding</span>
          </div>

          <h1 className="text-[28px] md:text-[38px] font-extrabold text-[#05291A] font-heading leading-tight">
            أكمل إعداد حسابك للبدء في نشر المشاريع وتوظيف نخبة المطورين
          </h1>

          <p className="text-[14px] md:text-[15px] text-[#526B5E] max-w-2xl mx-auto leading-relaxed">
            خطوات بسيطة وموثقة تتيح لك الوصول للمطورين المعتمدين، إدارة عروض التنفيذ، وضمان حماية ميزانية مشروعك وعقود الملكية بنسبة 100%.
          </p>

          {/* STEPPER PROGRESS BAR */}
          <div className="pt-6 max-w-xl mx-auto">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-neutral-200 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 right-0 h-[2px] bg-[#056B38] -translate-y-1/2 transition-all duration-300 z-0"
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />

              {[
                { num: 1, label: "البيانات الأساسية" },
                { num: 2, label: "الكيان والمجال" },
                { num: 3, label: "الاهتمامات التقنية" },
                { num: 4, label: "المراجعة والتأكيد" },
              ].map((step) => (
                <div key={step.num} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[13px] transition-all ${
                      currentStep >= step.num
                        ? "bg-[#056B38] text-white shadow-xs"
                        : "bg-white border-2 border-neutral-300 text-[#526B5E]"
                    }`}
                  >
                    {currentStep > step.num ? <CheckCircle2 className="w-5 h-5" /> : step.num}
                  </div>
                  <span
                    className={`text-[11px] font-bold ${
                      currentStep >= step.num ? "text-[#056B38]" : "text-[#526B5E]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GLOBAL ERROR ALERT */}
        {errors.global && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errors.global}</span>
          </div>
        )}

        {/* STEP CONTENT CONTAINER */}
        <div className="rounded-[32px] border border-[#D1E3D6] bg-white p-8 md:p-12 space-y-8 shadow-2xs">
          
          {/* STEP 1: PERSONAL & CONTACT INFO */}
          {currentStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-neutral-100 pb-4">
                <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                  <User className="w-5 h-5 text-[#056B38]" />
                  <span>البيانات الشخصية ومعلومات الاتصال</span>
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  أدخل بياناتك الرسمية كرائد أعمال أو ممثل التوظيف للشركة للتواصل مع المطورين.
                </p>
              </div>

              {/* AVATAR / LOGO UPLOAD */}
              <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-[24px] bg-[#F7FAF8] border border-[#D1E3D6]">
                <div className="relative">
                  <label
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-[#C5E8D1] bg-[#E8FAF0] text-2xl font-extrabold text-[#056B38] shadow-xs hover:border-[#056B38] transition-all"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="معاينة الصورة" className="h-full w-full object-cover" />
                    ) : (
                      <span>{fullName.slice(0, 2).toUpperCase() || "؟"}</span>
                    )}
                    <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-6 h-6" />
                    </div>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setAvatarFile(f);
                      if (f) setAvatarPreview(URL.createObjectURL(f));
                    }}
                  />
                </div>

                <div className="space-y-1 text-center sm:text-right">
                  <div className="text-[14px] font-extrabold text-[#05291A]">صورة البروفايل أو شعار الشركة</div>
                  <p className="text-[12px] text-[#526B5E]">
                    اختر صورة واضحة أو لوجو شركتك لزيادة ثقة المطورين وجذب أفضل الكفاءات (اختياري).
                  </p>
                </div>
              </div>

              {/* TRIPLE FULL NAME */}
              <div className="space-y-2">
                <label className="block text-[13px] font-extrabold text-[#05291A]">
                  الاسم الرسمي بالكامل <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="الاسم الأول"
                      className={`w-full h-12 rounded-2xl border bg-[#F7FAF8] px-4 text-[14px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all ${
                        errors.firstName ? "border-red-400 bg-red-50/50" : "border-[#D1E3D6]"
                      }`}
                    />
                    {errors.firstName && <span className="text-[11px] text-red-500 mt-1 block">{errors.firstName}</span>}
                  </div>

                  <div>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="اسم الأب (اختياري)"
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-[14px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="اسم العائلة"
                      className={`w-full h-12 rounded-2xl border bg-[#F7FAF8] px-4 text-[14px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all ${
                        errors.familyName ? "border-red-400 bg-red-50/50" : "border-[#D1E3D6]"
                      }`}
                    />
                    {errors.familyName && <span className="text-[11px] text-red-500 mt-1 block">{errors.familyName}</span>}
                  </div>
                </div>
              </div>

              {/* USERNAME & PHONE NUMBER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Public Username */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    اسم المستخدم للرابط العام <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={30}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="مثال: ahmed_client"
                    dir="ltr"
                    className={`w-full h-12 rounded-2xl border bg-[#F7FAF8] px-4 text-left font-mono text-[14px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all ${
                      errors.username ? "border-red-400 bg-red-50/50" : "border-[#D1E3D6]"
                    }`}
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#526B5E] pt-0.5">
                    <span>رابط ملفك: scora.app/profile/{username || "username"}</span>
                    {errors.username && <span className="text-red-500 font-bold">{errors.username}</span>}
                  </div>
                </div>

                {/* Egyptian Mobile Phone with Saladin Flag */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    رقم الهاتف المصري <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center" dir="ltr">
                    <div className="absolute left-3 flex items-center gap-1.5 text-neutral-600 text-xs font-bold pl-1 border-r border-neutral-300 pr-2 pointer-events-none">
                      <EgyptFlagSVG className="w-5 h-3.5" />
                      <span>+20</span>
                    </div>
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="01012345678"
                      className={`w-full h-12 rounded-2xl border bg-[#F7FAF8] pl-20 pr-4 text-left font-mono text-[14px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all ${
                        errors.phone ? "border-red-400 bg-red-50/50" : "border-[#D1E3D6]"
                      }`}
                    />
                  </div>
                  {errors.phone && <span className="text-[11px] text-red-500 font-bold block">{errors.phone}</span>}
                </div>

              </div>

              {/* LOCATION: GOVERNORATE & CITY */}
              <div className="space-y-2">
                <label className="block text-[13px] font-extrabold text-[#05291A]">
                  الموقع الجغرافي داخل جمهورية مصر العربية <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Governorate Dropdown */}
                  <div className="relative" ref={govRef}>
                    <div
                      onClick={() => {
                        setIsGovOpen(!isGovOpen);
                        setIsCityOpen(false);
                      }}
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 flex items-center justify-between text-[14px] text-[#05291A] cursor-pointer hover:border-[#056B38] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#056B38]" />
                        <span>{governorate || "اختر المحافظة"}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-[#526B5E] transition-transform ${isGovOpen ? "rotate-180" : ""}`} />
                    </div>

                    {isGovOpen && (
                      <div className="absolute top-full right-0 left-0 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[#D1E3D6] bg-white shadow-xl z-30 p-1 space-y-0.5 animate-in fade-in">
                        {Object.keys(EGYPT_GOVERNORATES_AND_CITIES).map((gov) => (
                          <div
                            key={gov}
                            onClick={() => {
                              setGovernorate(gov);
                              setCity(EGYPT_GOVERNORATES_AND_CITIES[gov][0] || "");
                              setIsGovOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-colors ${
                              governorate === gov ? "bg-[#E8FAF0] text-[#056B38]" : "hover:bg-neutral-50 text-[#05291A]"
                            }`}
                          >
                            {gov}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* City Dropdown */}
                  <div className="relative" ref={cityRef}>
                    <div
                      onClick={() => {
                        if (governorate) {
                          setIsCityOpen(!isCityOpen);
                          setIsGovOpen(false);
                        }
                      }}
                      className={`w-full h-12 rounded-2xl border bg-[#F7FAF8] px-4 flex items-center justify-between text-[14px] text-[#05291A] transition-all ${
                        governorate ? "cursor-pointer hover:border-[#056B38] border-[#D1E3D6]" : "opacity-60 cursor-not-allowed border-neutral-200"
                      }`}
                    >
                      <span>{city || "اختر المدينة / الحي"}</span>
                      <ChevronDown className={`w-4 h-4 text-[#526B5E] transition-transform ${isCityOpen ? "rotate-180" : ""}`} />
                    </div>

                    {isCityOpen && governorate && (
                      <div className="absolute top-full right-0 left-0 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-[#D1E3D6] bg-white shadow-xl z-30 p-1 space-y-0.5 animate-in fade-in">
                        {EGYPT_GOVERNORATES_AND_CITIES[governorate]?.map((c) => (
                          <div
                            key={c}
                            onClick={() => {
                              setCity(c);
                              setIsCityOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-[13px] font-bold cursor-pointer transition-colors ${
                              city === c ? "bg-[#E8FAF0] text-[#056B38]" : "hover:bg-neutral-50 text-[#05291A]"
                            }`}
                          >
                            {c}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* NEXT BUTTON */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (validateStep1()) setCurrentStep(2);
                  }}
                  className="h-12 px-8 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[14px] font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>التالي: نوع الكيان والمجال</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 2: ACCOUNT TYPE & INDUSTRY */}
          {currentStep === 2 && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-neutral-100 pb-4">
                <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#056B38]" />
                  <span>نوع الحساب ونشاط الكيان</span>
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  حدد ما إذا كنت تنشر المشاريع كشركة مسجلة أو كصاحب عمل فردي ورائد أعمال.
                </p>
              </div>

              {/* ACCOUNT TYPE TOGGLE */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setAccountType("personal")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${
                    accountType === "personal"
                      ? "border-[#056B38] bg-[#E8FAF0] shadow-xs"
                      : "border-[#D1E3D6] bg-white hover:border-neutral-300"
                  }`}
                >
                  <User className={`w-6 h-6 ${accountType === "personal" ? "text-[#056B38]" : "text-[#526B5E]"}`} />
                  <div className="text-[15px] font-extrabold text-[#05291A]">حساب فرد / رائد أعمال</div>
                  <div className="text-[11px] text-[#526B5E]">لأصحاب الأفكار، المشاريع الناشئة، ورواد الأعمال المستقلين</div>
                </div>

                <div
                  onClick={() => setAccountType("company")}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center gap-2 text-center ${
                    accountType === "company"
                      ? "border-[#056B38] bg-[#E8FAF0] shadow-xs"
                      : "border-[#D1E3D6] bg-white hover:border-neutral-300"
                  }`}
                >
                  <Building2 className={`w-6 h-6 ${accountType === "company" ? "text-[#056B38]" : "text-[#526B5E]"}`} />
                  <div className="text-[15px] font-extrabold text-[#05291A]">حساب شركة / مؤسسة</div>
                  <div className="text-[11px] text-[#526B5E]">للشركات، الوكالات، ومسؤولي التوظيف في المؤسسات التقنية</div>
                </div>
              </div>

              {/* COMPANY FIELDS */}
              {accountType === "company" ? (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-extrabold text-[#05291A]">
                      اسم الشركة الرسمي <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="مثال: شركة سكورا للتطوير البرمجي"
                      className={`w-full h-12 rounded-2xl border bg-[#F7FAF8] px-4 text-[14px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all ${
                        errors.companyName ? "border-red-400 bg-red-50/50" : "border-[#D1E3D6]"
                      }`}
                    />
                    {errors.companyName && <span className="text-[11px] text-red-500 font-bold">{errors.companyName}</span>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-extrabold text-[#05291A]">
                        مجال نشاط الشركة
                      </label>
                      <select
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all"
                      >
                        {COMPANY_INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[13px] font-extrabold text-[#05291A]">
                        حجم فريق العمل
                      </label>
                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all"
                      >
                        <option value="1-10">1 - 10 موظفين</option>
                        <option value="11-50">11 - 50 موظف</option>
                        <option value="51-200">51 - 200 موظف</option>
                        <option value="200+">أكثر من 200 موظف</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-extrabold text-[#05291A]">
                      موقع الشركة الإلكتروني (اختياري)
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourcompany.com"
                        dir="ltr"
                        className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pl-11 text-left font-mono text-[13px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all"
                      />
                      <Globe className="absolute left-4 w-4 h-4 text-[#526B5E]" />
                    </div>
                  </div>
                </div>
              ) : (
                /* PERSONAL CLIENT FIELDS */
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-extrabold text-[#05291A]">
                      المسمى أو الدور الريادي
                    </label>
                    <select
                      value={clientRole}
                      onChange={(e) => setClientRole(e.target.value)}
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all"
                    >
                      {CLIENT_PERSONAL_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* BIO / ABOUT */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-extrabold text-[#05291A]">
                  نبذة تعريفية عن نشاطك أو أهدافك في المنصة (اختياري)
                </label>
                <textarea
                  rows={3}
                  value={aboutBio}
                  onChange={(e) => setAboutBio(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن رؤيتك ونوعية المشاريع البرمجية التي تخطط لإطلاقها عبر منصة سكورا..."
                  className="w-full rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all resize-none leading-relaxed"
                />
              </div>

              {/* STEP 2 ACTIONS */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="h-12 px-6 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[14px] font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (validateStep2()) setCurrentStep(3);
                  }}
                  className="h-12 px-8 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[14px] font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>التالي: الاهتمامات التقنية</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 3: TARGET TECH STACK & PROJECT DOMAINS */}
          {currentStep === 3 && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-neutral-100 pb-4">
                <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                  <Code className="w-5 h-5 text-[#056B38]" />
                  <span>المجالات والتقنيات البرمجية للمشاريع المستهدفة</span>
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  حدد التخصصات والتقنيات التي تهتم بتوظيف مطورين فيها لإبراز التوصيات المناسبة لك.
                </p>
              </div>

              {/* PROJECT DOMAINS MULTI-SELECT */}
              <div className="space-y-3">
                <label className="block text-[13px] font-extrabold text-[#05291A]">
                  تخصصات ومجالات المشاريع التي تبحث عنها (اختر واحد أو أكثر)
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {TARGET_PROJECT_TRACKS.map((track) => {
                    const isSelected = selectedTracks.includes(track);
                    return (
                      <button
                        key={track}
                        type="button"
                        onClick={() => toggleTrack(track)}
                        className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-[#056B38] text-white shadow-xs"
                            : "bg-[#F7FAF8] border border-[#D1E3D6] text-[#05291A] hover:border-[#056B38]"
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        <span>{track}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PREFERRED TECH STACK SELECTOR */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    التقنيات والأدوات المفضلة (Tech Stack)
                  </label>
                  <span className="text-[11px] font-bold text-[#056B38] bg-[#E8FAF0] px-2.5 py-0.5 rounded-full">
                    {selectedSkills.length} تقنية محددة
                  </span>
                </div>

                {/* Selected Skills Badges */}
                <div className="flex flex-wrap gap-2 min-h-[44px] p-3 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8]">
                  {selectedSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-3 py-1 rounded-lg bg-white border border-[#056B38]/30 text-[#056B38] text-[12px] font-bold flex items-center gap-1.5 shadow-2xs"
                    >
                      <span>{sk}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-600 transition-colors"
                        onClick={() => toggleSkill(sk)}
                      />
                    </span>
                  ))}
                  {selectedSkills.length === 0 && (
                    <span className="text-[12px] text-[#526B5E] p-1">انقر على التقنيات أدناه لإضافتها</span>
                  )}
                </div>

                {/* Searchable Pool */}
                <div className="space-y-2 pt-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={skillSearchQuery}
                      onChange={(e) => setSkillSearchQuery(e.target.value)}
                      placeholder="ابحث عن لغة برمجة، إطار عمل، أو قاعدة بيانات..."
                      className="w-full h-11 rounded-xl border border-[#D1E3D6] bg-white px-4 pr-10 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                    />
                    <Search className="absolute right-3.5 top-3 w-4 h-4 text-[#526B5E]" />
                  </div>

                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                    {MASTER_TECH_POOL.filter((sk) =>
                      sk.toLowerCase().includes(skillSearchQuery.toLowerCase())
                    ).map((sk) => {
                      const isSelected = selectedSkills.includes(sk);
                      return (
                        <button
                          key={sk}
                          type="button"
                          onClick={() => toggleSkill(sk)}
                          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#056B38] text-white"
                              : "bg-white border border-neutral-200 text-neutral-700 hover:border-[#056B38]"
                          }`}
                        >
                          {sk}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STEP 3 ACTIONS */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="h-12 px-6 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[14px] font-bold transition-all flex items-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="h-12 px-8 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[14px] font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                >
                  <span>التالي: المراجعة وتأكيد الحساب</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRMATION */}
          {currentStep === 4 && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-neutral-100 pb-4">
                <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#056B38]" />
                  <span>مراجعة البيانات واعتماد حساب العميل</span>
                </h3>
                <p className="text-[13px] text-[#526B5E]">
                  تأكد من صحة بياناتك قبل الانتهاء وبدء استخدام ميزات المنصة.
                </p>
              </div>

              {/* SUMMARY PREVIEW CARD */}
              <div className="rounded-[24px] border border-[#D1E3D6] bg-[#F7FAF8] p-6 space-y-4">
                <div className="flex items-center gap-4 border-b border-neutral-200/60 pb-4">
                  <div className="w-16 h-16 rounded-full bg-[#E8FAF0] text-[#056B38] font-black text-xl flex items-center justify-center border border-[#C5E8D1] overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="معاينة" className="w-full h-full object-cover" />
                    ) : (
                      <span>{fullName.slice(0, 2).toUpperCase() || "؟"}</span>
                    )}
                  </div>
                  <div>
                    <div className="text-[17px] font-extrabold text-[#05291A]">{fullName || "الاسم غير محدد"}</div>
                    <div className="text-[13px] text-[#526B5E]">
                      @{username} · {accountType === "company" ? companyName || "شركة" : clientRole}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                  <div className="flex items-center gap-2 text-[#526B5E]">
                    <Phone className="w-4 h-4 text-[#056B38]" />
                    <span>الهاتف: {phone} (+20)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#526B5E]">
                    <MapPin className="w-4 h-4 text-[#056B38]" />
                    <span>الموقع: {governorate} - {city}</span>
                  </div>
                  {accountType === "company" && website && (
                    <div className="flex items-center gap-2 text-[#526B5E]">
                      <Globe className="w-4 h-4 text-[#056B38]" />
                      <span className="truncate">{website}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[#526B5E]">
                    <Briefcase className="w-4 h-4 text-[#056B38]" />
                    <span>نوع الحساب: {accountType === "company" ? "حساب شركة" : "حساب فردي"}</span>
                  </div>
                </div>

                {selectedSkills.length > 0 && (
                  <div className="pt-2 border-t border-neutral-200/60 space-y-1.5">
                    <span className="text-[12px] font-bold text-[#05291A]">التقنيات المستهدفة:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSkills.slice(0, 10).map((sk) => (
                        <span key={sk} className="px-2.5 py-0.5 rounded-md bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38]">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* PLATFORM GUARANTEES FOR CLIENTS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-[#D1E3D6] space-y-2">
                  <ShieldCheck className="w-6 h-6 text-[#056B38]" />
                  <div className="text-[13px] font-bold text-[#05291A]">حماية مالية 100% (Escrow)</div>
                  <p className="text-[11px] text-[#526B5E] leading-relaxed">
                    لا يتم تسليم أي مستحقات للمطور إلا بعد مراجعة المخرجات البرمجية وموافقتك التامة.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#D1E3D6] space-y-2">
                  <FileCheck className="w-6 h-6 text-[#056B38]" />
                  <div className="text-[13px] font-bold text-[#05291A]">ملكية الشفرة المصدرية كاملة</div>
                  <p className="text-[11px] text-[#526B5E] leading-relaxed">
                    نقل قانوني كامل لحقوق الملكية الفكرية وجميع ملفات الكود البرمجي لحسابك.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#D1E3D6] space-y-2">
                  <Award className="w-6 h-6 text-[#056B38]" />
                  <div className="text-[13px] font-bold text-[#05291A]">مطورون مفحوصون تقنياً</div>
                  <p className="text-[11px] text-[#526B5E] leading-relaxed">
                    تعتمد المنصة أعلى معايير التقييم الفني للمطورين من خلال اختبارات ذكاء اصطناعي صارمة.
                  </p>
                </div>
              </div>

              {/* STEP 4 ACTIONS (SUBMIT) */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setCurrentStep(3)}
                  className="h-12 px-6 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[14px] font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="h-14 px-10 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[15px] font-bold transition-all flex items-center gap-2.5 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{loading ? "جاري حفظ وتفعيل الحساب..." : "حفظ وتفعيل الحساب والدخول للوحة التحكم"}</span>
                </button>
              </div>

            </div>
          )}

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
