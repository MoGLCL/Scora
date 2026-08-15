"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import { updateClientProfile } from "@/lib/actions/profile";
import { removeAvatar, uploadAvatar } from "@/lib/actions/upload";
import { useRouter } from "next/navigation";
import { EgyptianLocationSelector } from "@/components/egyptian-location-selector";
import { AiPreferenceToggle } from "@/components/ai-preference-toggle";
import {
  User,
  Mail,
  Building,
  Camera,
  Trash2,
  Globe,
  CheckCircle2,
} from "lucide-react";

export default function EditClientProfilePage() {
  const router = useRouter();
  const { client, username, updateClient, addToast } = useProfile();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(client.avatarUrl);
  const [fullName, setFullName] = useState(client.fullName);
  const [companyName, setCompanyName] = useState(client.companyName);
  const [industry, setIndustry] = useState(client.industry);
  const [accountType, setAccountType] = useState(client.accountType);
  const [phone, setPhone] = useState(client.phone);
  const email = client.email;
  const [location, setLocation] = useState(client.location);
  const [website, setWebsite] = useState(client.website);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const data=new FormData();data.set("accountType",accountType);data.set("displayName",fullName);data.set("companyName",accountType==="company"?companyName:"");data.set("industry",accountType==="company"?industry:"");data.set("website",accountType==="company"?website:"");data.set("location",location);data.set("phone",phone);data.set("username",username);
    const result=await updateClientProfile(undefined,data);if(!result.ok){setIsSaving(false);addToast(result.error??Object.values(result.fieldErrors??{}).flat()[0]??"تعذر حفظ البيانات","warn");return}
    updateClient({
      accountType,
      fullName,
      companyName,
      industry,
      email,
      phone,
      location,
      avatarUrl,
      website,
    });

    addToast("تم حفظ البيانات في قاعدة البيانات","success");
    setIsSaving(false);
    router.push(`/profile/${username}`);
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
            <Link href="/client-profile" className="hover:underline">ملف العمـيل</Link>
            <span>/</span>
            <span>تعديل البيانات</span>
          </div>
          <h1 className="text-[30px] md:text-[36px] font-bold text-ink font-heading leading-tight">
            تعديل ملف العمـيل
          </h1>
          <p className="text-[14px] text-muted mt-1">
            قم بتحديث معلومات شركتك وبياناتك الشخصية وتفاصيل التوظيف.
          </p>
        </div>

        {/* Edit Form Card */}
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-white p-3"><button type="button" onClick={()=>setAccountType("personal")} className={`h-11 rounded-xl font-bold ${accountType==="personal"?"bg-primary text-white":"bg-neutral-50"}`}>حساب شخصي</button><button type="button" onClick={()=>setAccountType("company")} className={`h-11 rounded-xl font-bold ${accountType==="company"?"bg-primary text-white":"bg-neutral-50"}`}>حساب شركة</button></div>
          
          {/* Section 1: Avatar & Company Info */}
          <div className="rounded-[32px] border border-neutral-200/80 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h2 className="text-[20px] font-bold text-ink font-heading mb-6 pb-3 border-b border-neutral-100">
              الصورة الشخصية وبيانات الشركة
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
                  htmlFor="client-avatar-upload"
                  className="absolute bottom-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md cursor-pointer hover:bg-[#005B27] transition-all"
                  title="رفع صورة جديدة"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  id="client-avatar-upload"
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
                    updateClient({ avatarUrl: result.url });
                    addToast("تم رفع الصورة وحفظها", "success");
                  }}
                />
              </div>

              <div className="text-center sm:text-right space-y-2">
                <h3 className="text-[16px] font-bold text-ink">شعار / صورة العمـيل</h3>
                <p className="text-[13px] text-muted max-w-sm">
                  يدعم صور JPG أو PNG بحجم لا يتجاوز 5 ميجابايت.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                  <label
                    htmlFor="client-avatar-upload"
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-[12px] font-bold text-ink hover:bg-neutral-50 transition-all cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-neutral-500" />
                    <span>تغيير الصورة</span>
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
                        updateClient({ avatarUrl: null });
                        addToast("تم حذف الصورة", "success");
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
                  اسم المسؤول / العميل
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      updateClient({ fullName: e.target.value });
                    }}
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  />
                  <User className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              {/* Company Name */}
              {accountType === "company" && <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  اسم الشركة / المنظمة
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      updateClient({ companyName: e.target.value });
                    }}
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  />
                  <Building className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>}

              {accountType === "company" && <div>
                <label className="block text-[14px] font-bold text-ink mb-2">مجال عمل الشركة</label>
                <input
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="مثال: تجارة إلكترونية، تعليم، تقنية مالية"
                  className="w-full h-[52px] rounded-full border border-neutral-200 px-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                />
              </div>}

              {/* Email */}
              <div>
                <label className="block text-[14px] font-bold text-ink mb-2">
                  البريد الإلكتروني للعمل
                </label>
                <div className="relative flex items-center">
                  <input
                    type="email"
                    required
                    value={email}
                    readOnly
                    aria-readonly="true"
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-neutral-500 bg-neutral-50"
                    dir="ltr"
                  />
                  <Mail className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

              <div><label className="block text-[14px] font-bold text-ink mb-2">رقم الهاتف</label><input type="tel" required value={phone} onChange={(e)=>setPhone(e.target.value)} className="w-full h-[52px] rounded-full border border-neutral-200 px-5" dir="ltr"/></div>

              {/* Location */}
              <div>
                <EgyptianLocationSelector
                  value={location}
                  onChange={(loc) => {
                    setLocation(loc);
                    updateClient({ location: loc });
                  }}
                  label="مقر الشركة والمحافظة المصریة"
                />
              </div>

              {/* Company Website */}
              {accountType === "company" && <div className="md:col-span-2">
                <label className="block text-[14px] font-bold text-ink mb-2">
                  رابط موقع الشركة الإلكتروني
                </label>
                <div className="relative flex items-center">
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => {
                      setWebsite(e.target.value);
                      updateClient({ website: e.target.value });
                    }}
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                    dir="ltr"
                  />
                  <Globe className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>}
            </div>
          </div>

          <AiPreferenceToggle />

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link
              href={`/profile/${username}`}
              className="inline-flex h-[52px] items-center justify-center rounded-full border border-neutral-300 bg-white px-8 text-[15px] font-bold text-ink hover:bg-neutral-50 transition-all cursor-pointer"
            >
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary hover:bg-[#005B27] px-8 text-[15px] font-bold text-white transition-all shadow-md cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSaving ? "جاري الحفظ..." : "حفظ جميع التغييرات"}</span>
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
