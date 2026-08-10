"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import { GithubIcon, LinkedinIcon } from "@/components/auth/social-icons";
import {
  User,
  Mail,
  MapPin,
  Briefcase,
  Camera,
  Trash2,
  Globe,
  Plus,
  X,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function EditProfilePage() {
  const { developer, updateDeveloper } = useProfile();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(developer.avatarUrl);
  const [fullName, setFullName] = useState(developer.fullName);
  const [jobTitle, setJobTitle] = useState(developer.jobTitle);
  const [email, setEmail] = useState(developer.email);
  const [location, setLocation] = useState(developer.location);
  const [availability, setAvailability] = useState<"available" | "busy">(developer.availability);
  const [bio, setBio] = useState(developer.bio);
  
  // Links
  const [github, setGithub] = useState(developer.github);
  const [linkedin, setLinkedin] = useState(developer.linkedin);
  const [website, setWebsite] = useState(developer.website);

  // Skills
  const [skills, setSkills] = useState<string[]>(developer.skills);
  const [newSkill, setNewSkill] = useState("");

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const updated = [...skills, newSkill.trim()];
      setSkills(updated);
      setNewSkill("");
      updateDeveloper({ skills: updated });
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    const updated = skills.filter((s) => s !== skillToRemove);
    setSkills(updated);
    updateDeveloper({ skills: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDeveloper({
      fullName,
      jobTitle,
      email,
      location,
      availability,
      bio,
      avatarUrl,
      skills,
      github,
      linkedin,
      website,
    });

    window.location.href = "/profile";
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
      <SiteHeader />

      <main className="mx-auto max-w-[1000px] px-4 md:px-8 py-8 md:py-12 w-full flex-1">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1 text-[13px] font-semibold text-primary">
            <Link href="/profile" className="hover:underline">الملف الشخصي</Link>
            <span>/</span>
            <span>تعديل البيانات</span>
          </div>
          <h1 className="text-[30px] md:text-[36px] font-bold text-ink font-heading leading-tight">
            تعديل الملف الشخصي
          </h1>
          <p className="text-[14px] text-muted mt-1">
            قم بتحديث معلوماتك الشخصية وصورتك والمهارات التي تعبر عن خبرتك.
          </p>
        </div>

        {/* Edit Form Card */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Avatar & Basic Info Card */}
          <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h2 className="text-[20px] font-bold text-ink font-heading mb-6 pb-3 border-b border-neutral-100">
              الصورة الشخصية والبيانات الأساسية
            </h2>

            {/* Avatar Uploader Box */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8 p-6 bg-[#F7FAF8] rounded-[24px] border border-neutral-200/60">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar Preview"
                    className="h-24 w-24 rounded-full object-cover border-2 border-primary shadow-sm"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#EBF7EF] border-2 border-[#C5E8D1] text-[32px] font-bold text-[#0E6D3B]">
                    {getInitials(fullName)}
                  </div>
                )}
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md cursor-pointer hover:bg-[#005B27] transition-all"
                  title="رفع صورة جديدة"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const url = URL.createObjectURL(e.target.files[0]);
                      setAvatarUrl(url);
                      updateDeveloper({ avatarUrl: url });
                    }
                  }}
                />
              </div>

              <div className="text-center sm:text-right space-y-2">
                <h3 className="text-[16px] font-bold text-ink">الصورة الشخصية</h3>
                <p className="text-[13px] text-muted max-w-sm">
                  يدعم صور JPG أو PNG بحجم لا يتجاوز 5 ميجابايت. يفضل أبعاد مربعة 400x400.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-[12px] font-bold text-ink hover:bg-neutral-50 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-neutral-500" />
                    <span>تغيير الصورة</span>
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl(null);
                        updateDeveloper({ avatarUrl: null });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-[12px] font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>حذف الصورة</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  الاسم بالكامل
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      updateDeveloper({ fullName: e.target.value });
                    }}
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  />
                  <User className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Job Title */}
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  المسمى الوظيفي
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => {
                      setJobTitle(e.target.value);
                      updateDeveloper({ jobTitle: e.target.value });
                    }}
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  />
                  <Briefcase className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  البريد الإلكتروني
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      updateDeveloper({ email: e.target.value });
                    }}
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                    dir="ltr"
                  />
                  <Mail className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  الموقع / المدينة
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      updateDeveloper({ location: e.target.value });
                    }}
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  />
                  <MapPin className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Availability Status */}
              <div className="md:col-span-2">
                <label className="block text-[14px] font-bold text-ink mb-2">
                  حالة التوفر للعمل
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      availability === "available"
                        ? "border-primary bg-[#EBF7EF] text-primary"
                        : "border-neutral-200 bg-white text-ink hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="availability"
                      value="available"
                      checked={availability === "available"}
                      onChange={() => {
                        setAvailability("available");
                        updateDeveloper({ availability: "available" });
                      }}
                      className="accent-primary w-4 h-4"
                    />
                    <div>
                      <div className="font-bold text-[14px] flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span>متاح للمشاريع والعمل</span>
                      </div>
                      <div className="text-[12px] opacity-80">يظهر وسم "متاح" للعملاء والشركات</div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      availability === "busy"
                        ? "border-primary bg-[#EBF7EF] text-primary"
                        : "border-neutral-200 bg-white text-ink hover:bg-neutral-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="availability"
                      value="busy"
                      checked={availability === "busy"}
                      onChange={() => {
                        setAvailability("busy");
                        updateDeveloper({ availability: "busy" });
                      }}
                      className="accent-primary w-4 h-4"
                    />
                    <div>
                      <div className="font-bold text-[14px] flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
                        <span>غير متاح حالياً</span>
                      </div>
                      <div className="text-[12px] opacity-80">مشغول بمشاريع حالية</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bio & Description */}
          <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h2 className="text-[20px] font-bold text-ink font-heading mb-2">
              نبذة عن المطور (Bio)
            </h2>
            <p className="text-[13px] text-muted mb-4">
              اكتب وصفاً مختصراً يوضح أسلوبك في العمل وخبراتك التقنية.
            </p>

            <textarea
              rows={4}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                updateDeveloper({ bio: e.target.value });
              }}
              className="w-full rounded-2xl border border-neutral-200 p-4 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white leading-relaxed"
              placeholder="اكتب نبذة مختصرة عنك..."
            />
          </div>

          {/* Section 3: Skills Management */}
          <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h2 className="text-[20px] font-bold text-ink font-heading mb-2">
              إدارة المهارات والتقنيات
            </h2>
            <p className="text-[13px] text-muted mb-6">
              أضف أو احذف المهارات التي تتقنها لتظهر في ملفك الشخصي والباسبور.
            </p>

            {/* Current Skills Tags */}
            <div className="flex flex-wrap gap-2.5 mb-6 p-4 bg-[#F7FAF8] rounded-[24px] border border-neutral-200/60 min-h-[60px] items-center">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-2 rounded-full bg-white border border-neutral-200 px-4 py-2 text-[13px] font-bold text-[#0E6D3B] shadow-2xs"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill)}
                    className="text-neutral-400 hover:text-red-500 transition-colors focus:outline-none cursor-pointer"
                    title="حذف المهارة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Skill Input */}
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="أدخل مهارة جديدة (مثلاً: Docker, Rust...)"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSkill(e);
                  }
                }}
                className="flex-1 h-[48px] rounded-full border border-neutral-200 px-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
              />
              <button
                type="button"
                onClick={handleAddSkill}
                className="inline-flex h-[48px] items-center gap-2 rounded-full bg-primary hover:bg-[#005B27] px-6 text-[14px] font-bold text-white transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </div>
          </div>

          {/* Section 4: Social & Portfolio Links */}
          <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h2 className="text-[20px] font-bold text-ink font-heading mb-6 pb-3 border-b border-neutral-100">
              الروابط الخارجية ومعرض الأعمال
            </h2>

            <div className="space-y-4">
              {/* GitHub */}
              <div>
                <label className="block text-[13px] font-bold text-ink mb-1.5">
                  رابط حساب GitHub
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => {
                      setGithub(e.target.value);
                      updateDeveloper({ github: e.target.value });
                    }}
                    className="w-full h-[48px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                    dir="ltr"
                  />
                  <GithubIcon className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-[13px] font-bold text-ink mb-1.5">
                  رابط حساب LinkedIn
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => {
                      setLinkedin(e.target.value);
                      updateDeveloper({ linkedin: e.target.value });
                    }}
                    className="w-full h-[48px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                    dir="ltr"
                  />
                  <LinkedinIcon className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Personal Website */}
              <div>
                <label className="block text-[13px] font-bold text-ink mb-1.5">
                  الموقع الشخصي / Portfolio
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => {
                      setWebsite(e.target.value);
                      updateDeveloper({ website: e.target.value });
                    }}
                    className="w-full h-[48px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                    dir="ltr"
                  />
                  <Globe className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link
              href="/profile"
              className="inline-flex h-[52px] items-center justify-center rounded-full border border-neutral-300 bg-white px-8 text-[15px] font-bold text-ink hover:bg-neutral-50 transition-all cursor-pointer"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary hover:bg-[#005B27] px-8 text-[15px] font-bold text-white transition-all shadow-md cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>حفظ جميع التغييرات</span>
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
