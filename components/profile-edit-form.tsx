"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useProfile } from "@/components/profile-provider";
import { updateDeveloperProfile, updateClientProfile, setDeveloperSkills } from "@/lib/actions/profile";
import { removeAvatar, uploadAvatar } from "@/lib/actions/upload";
import { EgyptianLocationSelector } from "@/components/egyptian-location-selector";
import { GithubIcon, LinkedinIcon } from "@/components/auth/social-icons";
import {
  User,
  Briefcase,
  Camera,
  Trash2,
  Globe,
  Plus,
  X,
  CheckCircle2,
  AtSign,
  AlertCircle,
  Building2,
  Phone
} from "lucide-react";
import { CustomSelect } from "@/components/custom-select";

export interface InitialUserData {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  role: "developer" | "client";
  jobTitle?: string;
  location?: string;
  availability?: "available" | "busy";
  bio?: string;
  avatarUrl?: string | null;
  skills?: string[];
  github?: string;
  linkedin?: string;
  website?: string;
  companyName?: string;
  industry?: string;
  accountType?: "personal" | "company";
}

export function ProfileEditForm({ initialData }: { initialData: InitialUserData }) {
  const router = useRouter();
  const { updateDeveloper, updateClient, updateUsername, addToast } = useProfile();

  const [username, setUsername] = useState(initialData.username || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialData.avatarUrl ?? null);
  const [fullName, setFullName] = useState(initialData.fullName || "");
  const [jobTitle, setJobTitle] = useState(initialData.jobTitle || "");
  const [phone, setPhone] = useState(initialData.phone || "");
  const [location, setLocation] = useState(initialData.location || "القاهرة");
  const [availability, setAvailability] = useState<"available" | "busy">(initialData.availability || "available");
  const [bio, setBio] = useState(initialData.bio || "");
  
  // Client Specific Fields
  const [accountType, setAccountType] = useState<"personal" | "company">(initialData.accountType || "personal");
  const [companyName, setCompanyName] = useState(initialData.companyName || "");

  // Social / Web Links
  const [github, setGithub] = useState(initialData.github || "");
  const [linkedin, setLinkedin] = useState(initialData.linkedin || "");
  const [website, setWebsite] = useState(initialData.website || "");

  // Skills
  const [skills, setSkills] = useState<string[]>(initialData.skills || []);
  const [newSkill, setNewSkill] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newSkill.trim();
    if (clean && !skills.includes(clean)) {
      setSkills((prev) => [...prev, clean]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 2) {
      setErrorMessage("اسم المستخدم يجب أن يكون حرفين على الأقل");
      setIsSaving(false);
      return;
    }

    try {
      if (initialData.role === "developer") {
        const data = new FormData();
        data.set("displayName", fullName);
        data.set("jobTitle", jobTitle);
        data.set("bio", bio);
        data.set("location", location);
        data.set("availability", availability);
        data.set("github", github);
        data.set("linkedin", linkedin);
        data.set("website", website);
        data.set("phone", phone);
        data.set("username", cleanUsername);

        const profileResult = await updateDeveloperProfile(undefined, data);
        if (!profileResult.ok) {
          const err = profileResult.error ?? Object.values(profileResult.fieldErrors ?? {}).flat()[0] ?? "تعذر حفظ البيانات";
          setErrorMessage(err);
          addToast(err, "warn");
          setIsSaving(false);
          return;
        }

        if (skills.length > 0) {
          await setDeveloperSkills(skills);
        }

        updateDeveloper({
          fullName,
          jobTitle,
          phone,
          location,
          availability,
          bio,
          avatarUrl,
          skills,
          github,
          linkedin,
          website,
        });
      } else {
        const data = new FormData();
        data.set("displayName", fullName);
        data.set("accountType", accountType);
        data.set("companyName", companyName);
        data.set("location", location);
        data.set("website", website);
        data.set("phone", phone);
        data.set("username", cleanUsername);

        const profileResult = await updateClientProfile(undefined, data);
        if (!profileResult.ok) {
          const err = profileResult.error ?? Object.values(profileResult.fieldErrors ?? {}).flat()[0] ?? "تعذر حفظ البيانات";
          setErrorMessage(err);
          addToast(err, "warn");
          setIsSaving(false);
          return;
        }

        updateClient({
          fullName,
          accountType,
          companyName,
          phone,
          location,
          website,
          avatarUrl,
        });
      }

      updateUsername(cleanUsername);
      addToast("تم حفظ جميع التغييرات وتحديث البيانات بنجاح", "success");
      router.push(`/profile/${cleanUsername}`);
      router.refresh();
    } catch {
      setErrorMessage("حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsSaving(false);
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
    <form onSubmit={handleSubmit} className="space-y-8" dir="rtl">
      
      {/* Top Breadcrumb & Title */}
      <div>
        <div className="flex items-center gap-2 mb-1 text-[13px] font-bold text-[#056B38]">
          <Link href={`/profile/${username || initialData.username}`} className="hover:underline">
            الملف الشخصي
          </Link>
          <span>/</span>
          <span>تعديل البيانات</span>
        </div>
        <h1 className="text-3xl font-extrabold text-[#05291A]">تعديل بيانات الحساب والملف الشخصي</h1>
        <p className="text-sm text-[#526B5E] mt-1">
          تم تحميل بياناتك الحالية تلقائياً؛ يمكنك تعديل اسم المستخدم والمعلومات وصورة الحساب بسهولة.
        </p>
      </div>

      {/* Section 1: Avatar & Core Identity */}
      <div className="rounded-[32px] border border-[#D1E3D6] bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <h2 className="text-xl font-black text-[#05291A] pb-3 border-b border-neutral-100">
          الصورة الشخصية وبيانات الحساب
        </h2>

        {/* Avatar Uploader */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-[#F7FAF8] rounded-[24px] border border-[#D1E3D6]">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                width={96}
                height={96}
                unoptimized
                className="h-24 w-24 rounded-full object-cover border-2 border-[#056B38] shadow-xs"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[#E8FAF0] border-2 border-[#C5E8D1] text-2xl font-black text-[#056B38]">
                {getInitials(fullName || "Scora")}
              </div>
            )}
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#056B38] text-white shadow-md cursor-pointer hover:bg-[#005B27] transition-all"
              title="رفع صورة جديدة"
            >
              <Camera className="w-4 h-4" />
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={isUploadingAvatar}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setIsUploadingAvatar(true);
                const data = new FormData();
                data.set("file", file);
                const result = await uploadAvatar(data);
                setIsUploadingAvatar(false);
                if (!result.ok || !result.url) return addToast(result.error ?? "تعذر رفع الصورة", "warn");
                setAvatarUrl(result.url);
                addToast("تم رفع الصورة بنجاح", "success");
              }}
            />
          </div>

          <div className="text-center sm:text-right space-y-1.5 flex-1">
            <h3 className="text-sm font-black text-[#05291A]">الصورة الشخصية للحساب</h3>
            <p className="text-xs text-[#526B5E]">
              يدعم صور JPG أو PNG أو WebP. يفضل صورة واضحة ومربعة.
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D1E3D6] bg-white px-4 py-2 text-xs font-bold text-[#05291A] hover:bg-[#E8FAF0] transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#056B38]" />
                <span>{isUploadingAvatar ? "جاري الرفع..." : "تغيير الصورة"}</span>
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={async () => {
                    setIsUploadingAvatar(true);
                    const result = await removeAvatar();
                    setIsUploadingAvatar(false);
                    if (!result.ok) return addToast(result.error ?? "تعذر حذف الصورة", "warn");
                    setAvatarUrl(null);
                    addToast("تم حذف الصورة", "success");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الصورة</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Username (@username) */}
          <div>
            <label className="block text-xs font-black text-[#05291A] mb-1.5">
              اسم المستخدم (@username):
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                minLength={2}
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="w-full h-12 rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-mono font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8] dir-ltr text-right"
                placeholder="username"
              />
              <AtSign className="absolute right-3.5 w-4 h-4 text-[#056B38] pointer-events-none" />
            </div>
            <p className="text-[11px] text-[#526B5E] mt-1">
              أحرف إنجليزية صغيرة، أرقام، وشرطة سفلية (_) فقط. رابط ملفك: /profile/{username || "username"}
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-black text-[#05291A] mb-1.5">
              الاسم الكامل:
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-12 rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
              />
              <User className="absolute right-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-black text-[#05291A] mb-1.5">
              رقم الهاتف المصري:
            </label>
            <div className="relative flex items-center">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full h-12 rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-mono font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8] dir-ltr text-right"
              />
              <Phone className="absolute right-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          {/* Egyptian Governorate & City Selector */}
          <div>
            <EgyptianLocationSelector
              value={location}
              onChange={(loc) => setLocation(loc)}
              label="المحافظة والمدينة المصرية:"
            />
          </div>

          {/* Job Title (For Developers) */}
          {initialData.role === "developer" && (
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#05291A] mb-1.5">
                المسمى والتخصص الوظيفي:
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="مثال: Full-Stack Web Developer, Game Developer (Unity)..."
                  className="w-full h-12 rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
                />
                <Briefcase className="absolute right-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Company Details (For Clients) */}
          {initialData.role === "client" && (
            <>
              <div>
                <label className="block text-xs font-black text-[#05291A] mb-1.5">نوع الحساب:</label>
                <CustomSelect
                  value={accountType}
                  onChange={(val) => setAccountType(val as "personal" | "company")}
                  size="lg"
                  options={[
                    { value: "personal", label: "فردي / شخصي" },
                    { value: "company", label: "شركة أو مؤسسة" },
                  ]}
                />
              </div>

              {accountType === "company" && (
                <div>
                  <label className="block text-xs font-black text-[#05291A] mb-1.5">اسم الشركة:</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="اسم الشركة أو العلامة التجارية"
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-bold text-[#05291A] bg-[#F7FAF8] focus:outline-none focus:border-[#056B38]"
                    />
                    <Building2 className="absolute right-3.5 w-4 h-4 text-neutral-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Availability Status (Developers only) */}
          {initialData.role === "developer" && (
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-[#05291A] mb-2">
                حالة التوفر للعمل والمشاريع:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    availability === "available"
                      ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38]"
                      : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-[#F7FAF8]"
                  }`}
                >
                  <input
                    type="radio"
                    name="availability"
                    value="available"
                    checked={availability === "available"}
                    onChange={() => setAvailability("available")}
                    className="accent-[#056B38] w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-xs flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span>متاح للمشاريع والعمل الحر</span>
                    </div>
                    <div className="text-[11px] opacity-75">يظهر وسم متاح للعملاء والشركات</div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    availability === "busy"
                      ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38]"
                      : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-[#F7FAF8]"
                  }`}
                >
                  <input
                    type="radio"
                    name="availability"
                    value="busy"
                    checked={availability === "busy"}
                    onChange={() => setAvailability("busy")}
                    className="accent-[#056B38] w-4 h-4"
                  />
                  <div>
                    <div className="font-bold text-xs flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
                      <span>غير متاح حالياً</span>
                    </div>
                    <div className="text-[11px] opacity-75">مشغول بمشاريع حالية</div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Bio & Description */}
      <div className="rounded-[32px] border border-[#D1E3D6] bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-xl font-black text-[#05291A]">النبذة التعريفية (Bio)</h2>
        <p className="text-xs text-[#526B5E]">
          اكتب وصفاً يلخص مسيرتك، شغفك، وخبراتك العملية في التطوير البرمجي.
        </p>

        <textarea
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="اكتب نبذة مختصرة عنك..."
          className="w-full rounded-2xl border border-[#D1E3D6] p-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8] leading-relaxed"
        />
      </div>

      {/* Section 3: Skills Management (Developers only) */}
      {initialData.role === "developer" && (
        <div className="rounded-[32px] border border-[#D1E3D6] bg-white p-6 sm:p-8 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-[#05291A]">إدارة المهارات والتقنيات</h2>
          <p className="text-xs text-[#526B5E]">
            المهارات التي تتقنها وتظهر في ملفك الشخصي وباسبور الثقة الخاص بك.
          </p>

          <div className="flex flex-wrap gap-2 p-4 bg-[#F7FAF8] rounded-[24px] border border-[#D1E3D6] min-h-[60px] items-center">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#D1E3D6] px-3.5 py-1.5 text-xs font-bold text-[#056B38] shadow-2xs"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(skill)}
                  className="text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-md">
            <input
              type="text"
              placeholder="إضافة مهارة جديدة (مثلاً: Next.js, Docker...)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddSkill(e);
                }
              }}
              className="flex-1 h-11 rounded-2xl border border-[#D1E3D6] px-4 text-xs font-bold bg-[#F7FAF8] focus:outline-none focus:border-[#056B38]"
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="h-11 px-5 rounded-2xl bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          </div>
        </div>
      )}

      {/* Section 4: Social & Portfolio Links */}
      <div className="rounded-[32px] border border-[#D1E3D6] bg-white p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-xl font-black text-[#05291A]">الروابط الخارجية ومعرض الأعمال</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {initialData.role === "developer" && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#05291A] mb-1.5">حساب GitHub:</label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={github}
                    onChange={(e) => setGithub(e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full h-11 rounded-2xl border border-[#D1E3D6] pr-10 pl-3 text-xs font-mono bg-[#F7FAF8] focus:outline-none focus:border-[#056B38] dir-ltr text-right"
                  />
                  <GithubIcon className="absolute right-3 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#05291A] mb-1.5">حساب LinkedIn:</label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full h-11 rounded-2xl border border-[#D1E3D6] pr-10 pl-3 text-xs font-mono bg-[#F7FAF8] focus:outline-none focus:border-[#056B38] dir-ltr text-right"
                  />
                  <LinkedinIcon className="absolute right-3 w-4 h-4 text-neutral-400 pointer-events-none" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-[#05291A] mb-1.5">الموقع الشخصي / رابط البورتفوليو:</label>
            <div className="relative flex items-center">
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://..."
                className="w-full h-11 rounded-2xl border border-[#D1E3D6] pr-10 pl-3 text-xs font-mono bg-[#F7FAF8] focus:outline-none focus:border-[#056B38] dir-ltr text-right"
              />
              <Globe className="absolute right-3 w-4 h-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Save / Cancel Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={`/profile/${username || initialData.username}`}
          className="h-12 px-7 rounded-full border border-[#D1E3D6] bg-white hover:bg-[#F7FAF8] text-xs font-black text-[#05291A] flex items-center justify-center transition-all cursor-pointer"
        >
          إلغاء
        </Link>
        <button
          type="submit"
          disabled={isSaving}
          className="h-12 px-8 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>{isSaving ? "جاري حفظ التغييرات..." : "حفظ جميع التغييرات"}</span>
        </button>
      </div>
    </form>
  );
}
