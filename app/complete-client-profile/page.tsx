"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { updateClientProfile } from "@/lib/actions/profile";
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

  const [fullName, setFullName] = useState(client.fullName || "");
  const [phone, setPhone] = useState(client.phone || "");
  const [location, setLocation] = useState(client.location || "القاهرة، مصر");
  const [website, setWebsite] = useState(client.website || "");
  const [industry, setIndustry] = useState("تكنولوجيا المعلومات والبرمجيات");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("الاسم الشخصي إجباري");
      return;
    }

    setLoading(true);
    setError("");
    const data = new FormData();
    data.set("displayName", fullName.trim());
    data.set("companyName", "");
    data.set("phone", phone);
    data.set("location", location.trim());
    data.set("website", website.trim());
    const result = await updateClientProfile(undefined, data);
    if (!result.ok) {
      const message = result.error ?? Object.values(result.fieldErrors ?? {}).flat()[0] ?? "تعذر حفظ البيانات";
      setError(message);
      setLoading(false);
      return;
    }
    updateClient({ companyName: "", fullName: fullName.trim(), phone, location: location.trim(), website: website.trim() });
    addToast("تم إكمال بيانات حساب العميل بنجاح!", "success");
    router.push("/dashboard");
    router.refresh();
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
          
          <div className="space-y-2">
            <label className="block text-[13px] font-extrabold text-[#05291A]">
              الاسم الكامل لمسؤول الحساب / العميل <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (error) setError("");
                }}
                placeholder="مثال: المهندس أحمد خالد"
                className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pr-11 text-[14px] font-body text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all"
              />
              <User className="absolute right-4 w-5 h-5 text-[#526B5E]" />
            </div>
          </div>

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

            <div className="space-y-2">
              <label className="block text-[13px] font-extrabold text-[#05291A]">
                مجال العمل الرئيسي
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-[14px] font-body text-[#05291A] outline-none focus:border-[#056B38] focus:bg-white transition-all cursor-pointer"
              >
                <option value="تكنولوجيا المعلومات والبرمجيات">تكنولوجيا المعلومات والبرمجيات</option>
                <option value="المنصات التعليمية والتجارة الإلكترونية">المنصات التعليمية والتجارة الإلكترونية</option>
                <option value="حلول الذكاء الاصطناعي">حلول الذكاء الاصطناعي</option>
                <option value="خدمات الأعمال والأنظمة">خدمات الأعمال والأنظمة</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
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
          </div>

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
