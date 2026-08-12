"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import { EgyptianLocationSelector } from "@/components/egyptian-location-selector";
import {
  User,
  Mail,
  MapPin,
  Building,
  Camera,
  Trash2,
  Globe,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";

export default function EditClientProfilePage() {
  const { client, updateClient } = useProfile();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(client.avatarUrl);
  const [fullName, setFullName] = useState(client.fullName);
  const [companyName, setCompanyName] = useState(client.companyName);
  const [email, setEmail] = useState(client.email);
  const [location, setLocation] = useState(client.location);
  const [website, setWebsite] = useState(client.website);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Realtime update to ProfileProvider & LocalStorage
    updateClient({
      fullName,
      companyName,
      email,
      location,
      avatarUrl,
      website,
    });

    // Seamless navigation back to client profile
    window.location.href = "/client-profile";
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
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const url = URL.createObjectURL(e.target.files[0]);
                      setAvatarUrl(url);
                      updateClient({ avatarUrl: url });
                    }
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
                      onClick={() => {
                        setAvatarUrl(null);
                        updateClient({ avatarUrl: null });
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
              <div>
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
              </div>

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
                    onChange={(e) => {
                      setEmail(e.target.value);
                      updateClient({ email: e.target.value });
                    }}
                    className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                    dir="ltr"
                  />
                  <Mail className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                </div>
              </div>

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
              <div className="md:col-span-2">
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
              </div>
            </div>
          </div>

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link
              href="/client-profile"
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
