"use client";

import React, { useState } from "react";
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
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
  ,Phone
} from "lucide-react";

export default function CompleteClientProfilePage() {
  const router = useRouter();
  const { client, updateClient, addToast, userRole } = useProfile();

  const existingNameParts=(client.fullName||"").trim().split(/\s+/);
  const [firstName, setFirstName] = useState(existingNameParts[0]||"");
  const [fatherName, setFatherName] = useState(existingNameParts[1]||"");
  const [familyName, setFamilyName] = useState(existingNameParts.slice(2).join(" ")||"");
  const fullName=[firstName,fatherName,familyName].map(x=>x.trim()).filter(Boolean).join(" ");
  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [companyName, setCompanyName] = useState(client.companyName || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState(client.location || "القاهرة، مصر");
  const [website, setWebsite] = useState(client.website || "");
  const [industry, setIndustry] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !fatherName.trim() || !familyName.trim()) {
      setError("اكتب الاسم الأول واسم الأب واسم العائلة");
      return;
    }

    setLoading(true);
    setError("");
    const data = new FormData();
    data.set("displayName", fullName.trim());
    data.set("accountType", accountType);
    data.set("companyName", accountType === "company" ? companyName.trim() : "");
    data.set("industry", accountType === "company" ? industry : "");
    data.set("phone", phone);
    data.set("username", username);
    data.set("location", location.trim());
    data.set("website", website.trim());
    const result = await updateClientProfile(undefined, data);
    if (!result.ok) {
      const message = result.error ?? Object.values(result.fieldErrors ?? {}).flat()[0] ?? "تعذر حفظ البيانات";
      setError(message);
      setLoading(false);
      return;
    }
    if (avatarFile) { const avatarData=new FormData();avatarData.set("file",avatarFile);const uploaded=await uploadAvatar(avatarData);if(!uploaded.ok){setError(uploaded.error||"تعذر رفع الصورة");setLoading(false);return;} }
    updateClient({ companyName: accountType === "company" ? companyName.trim() : "", fullName: fullName.trim(), phone, location: location.trim(), website: accountType === "company" ? website.trim() : "" });
    addToast("تم إكمال بيانات حساب العميل بنجاح!", "success");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[800px] px-6 py-12 md:py-16 w-full flex-1 space-y-8">
        
        {/* Header Info */}
        <div className="bg-white rounded-[32px] border border-[#D1E3D6] p-8 md:p-10 space-y-4 shadow-sm text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8FAF0] text-[#056B38] text-[12px] font-bold border border-[#D1E3D6]">
            <Building2 className="w-4 h-4 text-[#056B38]" />
            <span>إعداد حساب العميل وصاحب العمل</span>
          </div>

          <h1 className="text-[28px] md:text-[36px] font-extrabold text-[#05291A] font-heading leading-tight">
            أكمل بياناتك للبدء في نشر المشاريع وتوظيف المطورين
          </h1>

          <p className="text-[14px] text-[#526B5E] max-w-xl mx-auto">
            مطلوب إدخال بيانات الشركة ومسؤول التوظيف لإتمام إتاحة استخدام المنصة، البحث عن المطورين، ونشر المشاريع الفنية.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[32px] border border-[#D1E3D6] p-8 md:p-10 space-y-6 shadow-sm">
          <div className="flex flex-col items-center gap-3"><label className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-[#C5E8D1] bg-[#E8FAF0] text-2xl font-extrabold text-[#056B38]">{avatarPreview?<img src={avatarPreview} alt="معاينة الصورة" className="h-full w-full object-cover"/>:<span>{fullName.trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("")||"؟"}</span>}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0]||null;setAvatarFile(f);if(f)setAvatarPreview(URL.createObjectURL(f))}}/></label><p className="text-xs text-[#526B5E]">صورة البروفايل اختيارية — لو سيبتها هنظهر أول حرفين من اسمك</p></div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F7FAF8] p-2" role="group" aria-label="نوع حساب العميل">
            <button type="button" onClick={()=>setAccountType("personal")} className={`h-11 rounded-xl font-bold ${accountType==="personal"?"bg-[#056B38] text-white":"text-[#526B5E]"}`}><User className="ml-2 inline h-4 w-4"/>حساب شخصي</button>
            <button type="button" onClick={()=>setAccountType("company")} className={`h-11 rounded-xl font-bold ${accountType==="company"?"bg-[#056B38] text-white":"text-[#526B5E]"}`}><Building2 className="ml-2 inline h-4 w-4"/>حساب شركة</button>
          </div>
          
          <div className="space-y-2">
            <label className="block text-[13px] font-extrabold text-[#05291A]">اسم المستخدم للرابط العام <span className="text-red-500">*</span></label>
            <input type="text" required minLength={3} maxLength={30} pattern="[a-z0-9_]+" value={username} onChange={(e)=>setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} placeholder="ahmed_client" dir="ltr" className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-left" />
            <p className="text-xs text-[#526B5E]">scora.app/profile/{username || "username"}</p>
          </div>

          {accountType === "company" && <div className="space-y-2"><label className="block text-[13px] font-extrabold text-[#05291A]">اسم الشركة <span className="text-red-500">*</span></label><div className="relative flex items-center"><input required value={companyName} onChange={(e)=>setCompanyName(e.target.value)} placeholder="اسم الشركة الرسمي" className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pr-11"/><Building2 className="absolute right-4 h-5 w-5 text-[#526B5E]"/></div></div>}

          <div className="space-y-2"><label className="block text-[13px] font-extrabold text-[#05291A]">الاسم الثلاثي <span className="text-red-500">*</span></label><div className="grid gap-3 md:grid-cols-3"><input required value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="الاسم الأول" className="h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4"/><input required value={fatherName} onChange={e=>setFatherName(e.target.value)} placeholder="اسم الأب" className="h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4"/><input required value={familyName} onChange={e=>setFamilyName(e.target.value)} placeholder="اسم العائلة" className="h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4"/></div></div>

          <div className="space-y-2">
            <label className="block text-[13px] font-extrabold text-[#05291A]">
              رقم الهاتف <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input type="tel" required inputMode="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01012345678"
                className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pr-11 text-[14px] text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white" />
              <Phone className="absolute right-4 w-5 h-5 text-[#526B5E]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
              <label className="block text-[13px] font-extrabold text-[#05291A]">
                الموقع / المدينة داخل مصر
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="القاهرة، مصر"
                  className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pr-11 text-[14px] font-body text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all"
                />
                <MapPin className="absolute right-4 w-5 h-5 text-[#526B5E]" />
              </div>
            </div>

            {accountType === "company" && <div className="space-y-2">
              <label className="block text-[13px] font-extrabold text-[#05291A]">
                مجال العمل الرئيسي
              </label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="اكتب مجال عمل الشركة"
                className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-[14px] font-body text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all cursor-pointer"
              />
            </div>}
          </div>

          {accountType === "company" && <div className="space-y-2">
            <label className="block text-[13px] font-extrabold text-[#05291A]">
              موقع الشركة الإلكتروني (اختياري)
            </label>
            <div className="relative flex items-center">
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.dev"
                className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pr-11 text-[14px] font-body text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all"
              />
              <Globe className="absolute right-4 w-5 h-5 text-[#526B5E]" />
            </div>
          </div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50 mt-4"
          >
            <span>حفظ وإتمام الحساب والدخول للوحة التحكم</span>
            <ArrowRight className="w-5 h-5" />
          </button>

        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
