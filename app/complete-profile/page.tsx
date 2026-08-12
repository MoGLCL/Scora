"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { updateDeveloperProfile, setDeveloperSkills } from "@/lib/actions/profile";
import { EgyptianLocationSelector } from "@/components/egyptian-location-selector";
import { useRouter } from "next/navigation";
import {
  User,
  Phone,
  GraduationCap,
  Briefcase,
  Code,
  Globe,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  Check,
  ChevronDown,
  Navigation,
  ExternalLink
} from "lucide-react";

// Data Lists
const EGYPTIAN_UNIVERSITIES = [
  "جامعة القاهرة",
  "جامعة عين شمس",
  "جامعة الإسكندرية",
  "جامعة المنصورة",
  "جامعة أسيوط",
  "جامعة حلوان",
  "جامعة الزقازيق",
  "جامعة طنطا",
  "جامعة بنها",
  "جامعة المنوفية",
  "جامعة قناة السويس",
  "الجامعة الأمريكية بالقاهرة (AUC)",
  "الجامعة الألمانيّة بالقاهرة (GUC)",
  "الجامعة البريطانية في مصر (BUE)",
  "جامعة مصر للعلوم والتكنولوجيا (MUST)",
  "جامعة 6 أكتوبر",
  "جامعة النيل الأهلية",
  "جامعة زويل للعلوم والتكنولوجيا",
  "الأكاديمية البحرية (AASTMT)",
];

const EGYPTIAN_COLLEGES = [
  "كلية الحاسبات والمعلومات والذكاء الاصطناعي",
  "كلية الهندسة",
  "كلية الهندسة الإلكترونية",
  "كلية العلوم",
  "كلية التكنولوجيا والتعليم الصناعي",
  "كلية الألسن واللغات والترجمة",
  "كلية التجارة وإدارة الأعمال",
];

const PRIMARY_TRACKS_LIST = [
  "Full-Stack Web Developer (مطور ويب متكامل)",
  "Frontend Engineer (مطور واجهات ومستخدم)",
  "Backend & Systems Engineer (مطور أنظمة وقواعد بيانات)",
  "Agentic AI Engineer (مهندس ذكاء اصطناعي وحلول ذكية)",
  "Mobile App Engineer (مطور تطبيقات موبايل)",
  "Cloud & DevOps Engineer (مهندس سحابيات وبنية تحتية)",
  "Cybersecurity Specialist (مهندس أمن معلومات)",
  "UI/UX Product Designer (مصمم واجهات وتجربة مستخدم)",
];

const SKILLS_MASTER_LIST = [
  "JavaScript", "TypeScript", "Python", "C++", "Java", "Go", "Rust",
  "React.js", "Next.js", "Vue.js", "Node.js", "Express.js", "FastAPI", "Django",
  "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Git & GitHub",
  "PyTorch", "TensorFlow", "Tailwind CSS", "Figma"
];

export default function DeveloperOnboardingPage() {
  const router = useRouter();
  const { developer, updateDeveloper, setUserRole, addToast } = useProfile();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Personal Info
  const [firstName, setFirstName] = useState(developer.fullName.split(" ")[0] || "");
  const [fatherName, setFatherName] = useState(developer.fullName.split(" ")[1] || "");
  const [familyName, setFamilyName] = useState(developer.fullName.split(" ")[2] || "");
  const [phone, setPhone] = useState(developer.phone || "");
  const [username, setUsername] = useState("");

  // Step 2: Academic Info
  const [qualificationType, setQualificationType] = useState("university");
  const [universityName, setUniversityName] = useState("جامعة القاهرة");
  const [collegeName, setCollegeName] = useState("كلية الحاسبات والمعلومات والذكاء الاصطناعي");

  // Custom Dropdown Popover States
  const [isUniDropdownOpen, setIsUniDropdownOpen] = useState(false);
  const [isColDropdownOpen, setIsColDropdownOpen] = useState(false);
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState(false);

  const uniRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Step 3: Technical Track & Skills
  const [primaryTrack, setPrimaryTrack] = useState(PRIMARY_TRACKS_LIST[0]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(developer.skills);

  // Step 4: Passport & Social Links
  const [github, setGithub] = useState(developer.github || "");
  const [linkedin, setLinkedin] = useState(developer.linkedin || "");
  const [website, setWebsite] = useState(developer.website || "");
  const [location, setLocation] = useState(developer.location || "القاهرة، مصر");
  const [bio, setBio] = useState(developer.bio || "أبني منتجات ويب وتطبيقات قابلة للتوسع وأشرح قراراتي التقنية بوضوح.");
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (uniRef.current && !uniRef.current.contains(event.target as Node)) {
        setIsUniDropdownOpen(false);
      }
      if (colRef.current && !colRef.current.contains(event.target as Node)) {
        setIsColDropdownOpen(false);
      }
      if (trackRef.current && !trackRef.current.contains(event.target as Node)) {
        setIsTrackDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleSkill = (skill: string) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  // Auto detect location function
  const handleAutoDetectLocation = () => {
    setIsDetectingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsDetectingLocation(false);
          setLocation("القاهرة، مصر (تم التحديد أوتوماتيكياً)");
          addToast("تم تحديد موقعك الجغرافي بنجاح: القاهرة، مصر", "success");
        },
        (error) => {
          setIsDetectingLocation(false);
          setLocation("القاهرة، مصر");
          addToast("تم تحديد المدينة الافتراضية: القاهرة، مصر", "info");
        }
      );
    } else {
      setIsDetectingLocation(false);
      setLocation("القاهرة، مصر");
      addToast("تم تحديد المدينة الافتراضية: القاهرة، مصر", "info");
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!firstName.trim() || !familyName.trim()) {
        addToast("يرجى ملء الاسم الأول وعائلة الحساب إجباريًا", "warn");
        return;
      }
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = async () => {
    const fullCombinedName = `${firstName.trim()} ${fatherName.trim()} ${familyName.trim()}`.trim();
    const data = new FormData();
    data.set("displayName", fullCombinedName || developer.fullName);
    data.set("jobTitle", primaryTrack.split(" (")[0]);
    data.set("bio", bio);
    data.set("location", location);
    data.set("phone", phone);
    data.set("username", username);
    data.set("availability", "available");
    data.set("github", github);
    data.set("linkedin", linkedin);
    data.set("website", website);
    const profileResult = await updateDeveloperProfile(undefined, data);
    if (!profileResult.ok) {
      addToast(profileResult.error ?? Object.values(profileResult.fieldErrors ?? {}).flat()[0] ?? "تعذر حفظ الملف الشخصي", "warn");
      return;
    }
    const skillsResult = await setDeveloperSkills(selectedSkills);
    if (!skillsResult.ok) {
      addToast(skillsResult.error ?? "تعذر حفظ المهارات", "warn");
      return;
    }
    updateDeveloper({
      fullName: fullCombinedName || developer.fullName,
      phone,
      jobTitle: primaryTrack.split(" (")[0],
      location,
      bio,
      skills: selectedSkills,
      github,
      linkedin,
      website,
    });

    setUserRole("developer");
    addToast("تهانينا! تم تفعيل الجواز الرقمي وبدء حساب المطور بنجاح.", "success");
    router.push(`/profile/${username}`);
  };

  const fullNameDisplay = `${firstName} ${fatherName} ${familyName}`.trim() || "اسم المطور";

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-14 w-full flex-1 space-y-10">
        
        {/* TOP TITLE & STEPPER */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-10 space-y-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6] mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>إعداد حساب المطور · Developer Onboarding</span>
              </div>
              <h1 className="text-[28px] md:text-[38px] font-extrabold text-[#05291A] font-heading leading-tight">
                أكمل إعداد الجواز الرقمي (Developer Passport)
              </h1>
              <p className="text-[14px] text-[#526B5E] mt-1">
                ادخل بياناتك الشخصية والتعليمية ومهاراتك لتوثيق نقاط الثقة وتقييمات الكود.
              </p>
            </div>

            {/* Step Progress Tracker */}
            <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-[#D1E3D6] shrink-0">
              {[1, 2, 3, 4].map((stepNum) => {
                const isCurrent = currentStep === stepNum;
                const isPassed = currentStep > stepNum;
                return (
                  <div key={stepNum} className="flex items-center gap-2">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                        isCurrent
                          ? "bg-[#056B38] text-white ring-4 ring-[#056B38]/15"
                          : isPassed
                          ? "bg-[#E8FAF0] text-[#056B38] border border-[#056B38]"
                          : "bg-neutral-100 text-[#526B5E]"
                      }`}
                    >
                      {isPassed ? <Check className="w-4 h-4" /> : stepNum}
                    </div>
                    {stepNum < 4 && <div className="w-6 h-0.5 bg-[#D1E3D6]" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ONBOARDING LAYOUT (GRID FORM + LIVE PASSPORT CARD PREVIEW) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left / Main Column: Multi-Step Form */}
          <div className="lg:col-span-2 rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-8 shadow-2xs">
            
            {/* STEP 1: PERSONAL INFO */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                    الخطوة 1: البيانات الشخصية والأساسية
                  </h3>
                  <p className="text-[13px] text-[#526B5E] mt-1">
                    أدخل اسمك الرسمي ورقم هاتفك للتوثيق والاتصال بالشركات.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">الاسم الأول *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="مثال: محمد"
                      className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">اسم الأب</label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="مثال: وائل"
                      className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">اسم العائلة *</label>
                    <input
                      type="text"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="مثال: الغنام"
                      className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">رقم الهاتف للتوثيق *</label>
                  <div className="relative flex items-center">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="010xxxxxxx"
                      className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white pr-10 pl-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] dir-ltr"
                    />
                    <Phone className="w-4 h-4 text-[#526B5E] absolute right-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ACADEMIC QUALIFICATION */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                    الخطوة 2: المؤهل الأكاديمي والتعليمي
                  </h3>
                  <p className="text-[13px] text-[#526B5E] mt-1">
                    حدد تحصيلك الأكاديمي والجامعي لاحتساب نقاط المهارات المعتمدة.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setQualificationType("university")}
                    className={`p-4 rounded-[16px] border text-right transition-all cursor-pointer ${
                      qualificationType === "university"
                        ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] font-bold"
                        : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-neutral-50"
                    }`}
                  >
                    <GraduationCap className="w-6 h-6 mb-2" />
                    <div className="text-[15px]">طالب أو خريج جامعي</div>
                    <div className="text-[12px] opacity-80 mt-1">بكالوريوس / حاسبات / هندسة</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQualificationType("self_taught")}
                    className={`p-4 rounded-[16px] border text-right transition-all cursor-pointer ${
                      qualificationType === "self_taught"
                        ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] font-bold"
                        : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-neutral-50"
                    }`}
                  >
                    <Award className="w-6 h-6 mb-2" />
                    <div className="text-[15px]">تعلم ذاتي / دورات مكثفة</div>
                    <div className="text-[12px] opacity-80 mt-1">خبرة عملية بدون مؤهل حاسبات</div>
                  </button>
                </div>

                {qualificationType === "university" && (
                  <div className="space-y-4 pt-2">
                    
                    {/* CUSTOM POPOVER SELECT 1: UNIVERSITY */}
                    <div className="space-y-1.5 relative" ref={uniRef}>
                      <label className="text-[13px] font-bold text-[#05291A]">اسم الجامعة</label>
                      <button
                        type="button"
                        onClick={() => setIsUniDropdownOpen(!isUniDropdownOpen)}
                        className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 flex items-center justify-between text-[13px] text-[#05291A] font-bold outline-none hover:border-[#056B38] transition-all cursor-pointer"
                      >
                        <span>{universityName}</span>
                        <ChevronDown className={`w-4 h-4 text-[#526B5E] transition-transform duration-200 ${isUniDropdownOpen ? "rotate-180 text-[#056B38]" : ""}`} />
                      </button>

                      {isUniDropdownOpen && (
                        <div className="absolute top-full mt-1.5 right-0 left-0 z-50 max-h-60 overflow-y-auto rounded-[14px] border border-[#D1E3D6] bg-white p-1.5 shadow-lg space-y-1 animate-in fade-in duration-150">
                          {EGYPTIAN_UNIVERSITIES.map((uni) => {
                            const isSelected = uni === universityName;
                            return (
                              <button
                                key={uni}
                                type="button"
                                onClick={() => {
                                  setUniversityName(uni);
                                  setIsUniDropdownOpen(false);
                                }}
                                className={`w-full px-3.5 py-2.5 rounded-[10px] text-[13px] font-bold text-right flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected ? "bg-[#E8FAF0] text-[#056B38]" : "text-[#05291A] hover:bg-neutral-50"
                                }`}
                              >
                                <span>{uni}</span>
                                {isSelected && <Check className="w-4 h-4 text-[#056B38]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* CUSTOM POPOVER SELECT 2: COLLEGE */}
                    <div className="space-y-1.5 relative" ref={colRef}>
                      <label className="text-[13px] font-bold text-[#05291A]">اسم الكلية</label>
                      <button
                        type="button"
                        onClick={() => setIsColDropdownOpen(!isColDropdownOpen)}
                        className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 flex items-center justify-between text-[13px] text-[#05291A] font-bold outline-none hover:border-[#056B38] transition-all cursor-pointer"
                      >
                        <span>{collegeName}</span>
                        <ChevronDown className={`w-4 h-4 text-[#526B5E] transition-transform duration-200 ${isColDropdownOpen ? "rotate-180 text-[#056B38]" : ""}`} />
                      </button>

                      {isColDropdownOpen && (
                        <div className="absolute top-full mt-1.5 right-0 left-0 z-50 max-h-60 overflow-y-auto rounded-[14px] border border-[#D1E3D6] bg-white p-1.5 shadow-lg space-y-1 animate-in fade-in duration-150">
                          {EGYPTIAN_COLLEGES.map((col) => {
                            const isSelected = col === collegeName;
                            return (
                              <button
                                key={col}
                                type="button"
                                onClick={() => {
                                  setCollegeName(col);
                                  setIsColDropdownOpen(false);
                                }}
                                className={`w-full px-3.5 py-2.5 rounded-[10px] text-[13px] font-bold text-right flex items-center justify-between cursor-pointer transition-colors ${
                                  isSelected ? "bg-[#E8FAF0] text-[#056B38]" : "text-[#05291A] hover:bg-neutral-50"
                                }`}
                              >
                                <span>{col}</span>
                                {isSelected && <Check className="w-4 h-4 text-[#056B38]" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* STEP 3: TECHNICAL TRACK & SKILLS */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                    الخطوة 3: المسار التقني والمهارات
                  </h3>
                  <p className="text-[13px] text-[#526B5E] mt-1">
                    اختر تخصصك الرئيسي وحدد أدواتك البرمجية الأكثر إتقاناً.
                  </p>
                </div>

                {/* CUSTOM POPOVER SELECT 3: TRACK */}
                <div className="space-y-1.5 relative" ref={trackRef}>
                  <label className="text-[13px] font-bold text-[#05291A]">المسار التخصصي الرئيسي *</label>
                  <button
                    type="button"
                    onClick={() => setIsTrackDropdownOpen(!isTrackDropdownOpen)}
                    className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 flex items-center justify-between text-[13px] text-[#05291A] font-bold outline-none hover:border-[#056B38] transition-all cursor-pointer"
                  >
                    <span>{primaryTrack}</span>
                    <ChevronDown className={`w-4 h-4 text-[#526B5E] transition-transform duration-200 ${isTrackDropdownOpen ? "rotate-180 text-[#056B38]" : ""}`} />
                  </button>

                  {isTrackDropdownOpen && (
                    <div className="absolute top-full mt-1.5 right-0 left-0 z-50 max-h-60 overflow-y-auto rounded-[14px] border border-[#D1E3D6] bg-white p-1.5 shadow-lg space-y-1 animate-in fade-in duration-150">
                      {PRIMARY_TRACKS_LIST.map((track) => {
                        const isSelected = track === primaryTrack;
                        return (
                          <button
                            key={track}
                            type="button"
                            onClick={() => {
                              setPrimaryTrack(track);
                              setIsTrackDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-[10px] text-[13px] font-bold text-right flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? "bg-[#E8FAF0] text-[#056B38]" : "text-[#05291A] hover:bg-neutral-50"
                            }`}
                          >
                            <span>{track}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#056B38]" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-3 pt-2">
                  <label className="text-[13px] font-bold text-[#05291A]">اختر مهاراتك وأدواتك البرمجية:</label>
                  <div className="flex flex-wrap gap-2">
                    {SKILLS_MASTER_LIST.map((skill) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#056B38] text-white shadow-2xs"
                              : "bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0]"
                          }`}
                        >
                          {skill} {isSelected && "✓"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PASSPORT & SOCIAL LINKS */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                    الخطوة 4: روابط الحساب والجواز الرقمي
                  </h3>
                  <p className="text-[13px] text-[#526B5E] mt-1">
                    أضف رابط GitHub وموقعك الشخصي لتوثيق مشاريعك الفعلية.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">حساب GitHub</label>
                    <div className="relative flex items-center">
                      <input
                        type="url"
                        value={github}
                        onChange={(e) => setGithub(e.target.value)}
                        className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white pr-10 pl-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] dir-ltr"
                      />
                      <Code className="w-4 h-4 text-[#526B5E] absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">حساب LinkedIn</label>
                    <div className="relative flex items-center">
                      <input
                        type="url"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white pr-10 pl-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] dir-ltr"
                      />
                      <Globe className="w-4 h-4 text-[#526B5E] absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Location with AUTO-DETECT & EGYPTIAN GOVERNORATE SELECTOR */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <EgyptianLocationSelector
                      value={location}
                      onChange={setLocation}
                      label="المحافظة والمدينة المصریة *"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-[#05291A]">الموقع الشخصي / المعرض</label>
                    <div className="relative flex items-center">
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white pr-10 pl-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] dir-ltr"
                      />
                      <Globe className="w-4 h-4 text-[#526B5E] absolute right-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-bold text-[#05291A]">نبذة شخصية مختصرة (Bio)</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full rounded-[12px] border border-[#D1E3D6] bg-white p-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] resize-none"
                  />
                </div>
              </div>
            )}

            {/* STEP NAVIGATION BUTTONS */}
            <div className="flex items-center justify-between pt-6 border-t border-[#D1E3D6]">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="h-[46px] px-6 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-[13px] flex items-center gap-2 hover:bg-neutral-50 transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>الخطوة السابقة</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-[46px] px-8 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                >
                  <span>حفظ ومتابعة</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteOnboarding}
                  className="h-[46px] px-8 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[14px] flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تأكيد وتفعيل الجواز الرقمي</span>
                </button>
              )}
            </div>

          </div>

          {/* Right Column: Live Passport Preview Card with Location & Social Badges */}
          <div className="space-y-6 sticky top-24">
            <div className="rounded-[24px] border border-[#D1E3D6] bg-[#05291A] text-white p-6 space-y-6 shadow-md overflow-hidden relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#339E61]" />
                  <span className="text-[13px] font-bold font-heading">معاينة الجواز الرقمي</span>
                </div>
                <span className="text-[11px] font-bold bg-[#056B38] px-2.5 py-1 rounded-full text-[#D4F5E0]">
                  Verified Passport
                </span>
              </div>

                    <div className="space-y-2">
                      <label className="block text-[13px] font-extrabold text-[#05291A]">اسم المستخدم للرابط العام</label>
                      <input type="text" required minLength={3} maxLength={30} pattern="[a-z0-9_]+" value={username} onChange={(e)=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} placeholder="mohamed_dev" className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-left" dir="ltr" />
                      <p className="text-xs text-[#526B5E]">scora.app/profile/{username || "username"}</p>
                    </div>

                    <div className="space-y-2">
                <h4 className="text-[20px] font-bold text-white font-heading">{fullNameDisplay}</h4>
                <p className="text-[13px] text-[#D4F5E0] font-bold">{primaryTrack.split(" (")[0]}</p>
                <div className="flex flex-col gap-1 text-[12px] text-neutral-300 pt-1">
                  <span>{universityName}</span>
                  {/* Location Address in Passport Card */}
                  <span className="flex items-center gap-1.5 text-[#339E61] font-medium">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{location || "القاهرة، مصر"}</span>
                  </span>
                </div>
              </div>

              {/* GitHub & LinkedIn Badges inside Live Passport Card */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-white/10">
                {github && (
                  <a
                    href={github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] text-[#D4F5E0] font-mono transition-colors"
                  >
                    <Code className="w-3 h-3 text-[#339E61]" />
                    <span>GitHub</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
                {linkedin && (
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] text-[#D4F5E0] font-mono transition-colors"
                  >
                    <Globe className="w-3 h-3 text-[#339E61]" />
                    <span>LinkedIn</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
              </div>

              {/* Trust Score & SP Stats */}
              <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
                <div>
                  <div className="text-[11px] text-neutral-400">نقاط الثقة</div>
                  <div className="text-[18px] font-extrabold text-[#339E61]">92%</div>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div>
                  <div className="text-[11px] text-neutral-400">رصيد الـ SP</div>
                  <div className="text-[18px] font-extrabold text-amber-400">SP 850</div>
                </div>
              </div>

              {/* Skills Tags */}
              <div className="space-y-2">
                <div className="text-[12px] font-bold text-[#D4F5E0]">المهارات المحددة ({selectedSkills.length}):</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkills.slice(0, 5).map((sk) => (
                    <span key={sk} className="text-[11px] font-medium bg-white/10 px-2.5 py-0.5 rounded-full text-white">
                      {sk}
                    </span>
                  ))}
                  {selectedSkills.length > 5 && (
                    <span className="text-[11px] font-medium bg-white/10 px-2 py-0.5 rounded-full text-neutral-300">
                      +{selectedSkills.length - 5}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
