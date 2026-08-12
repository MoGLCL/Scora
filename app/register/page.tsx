"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, Code, Briefcase } from "lucide-react";
import { register } from "@/lib/actions/auth";
import { useProfile } from "@/components/profile-provider";

export default function RegisterPage() {
  const { setUserRole, addToast, userRole, developer, client } = useProfile();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"developer" | "client">("developer");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (userRole !== "guest") {
      if (userRole === "developer") {
        window.location.href = (!developer.jobTitle || developer.skills.length === 0) ? "/complete-profile" : "/dashboard";
      } else if (userRole === "client") {
        window.location.href = !client.fullName ? "/complete-client-profile" : "/dashboard";
      }
    }
  }, [userRole, developer, client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Strict Frontend Validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      const err = "يرجى أدخل الاسم الكامل (لا يقل عن 3 أحرف)";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    if (!email.trim() || !email.includes("@") || !email.includes(".")) {
      const err = "بريد إلكتروني غير صالح، يرجى كتابة بريد مثل name@company.com";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    if (!password || password.length < 8) {
      const err = "كلمة المرور يجب أن لا تقل عن 8 أحرف وتحتوي على حرف ورقم";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    /* Phone is collected and verified as part of mandatory onboarding.
    const cleanPhone = phone.replace(/[\s\-()]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      const err = "يرجى إدخال رقم موبايل مصري صحيح (مثال: 01012345678)";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    } */

    if (!acceptedTerms) {
      const err = "يجب التحديد بالموافقة على الشروط والأحكام وسياسة جمع وتوثيق نتائج التقييمات والمقابلات للمتابعة";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("email", email);
    formData.append("password", password);
    formData.append("role", role);

    try {
      const res = await register(undefined, formData);
      if (res?.error) {
        setErrorMsg(res.error);
        addToast(res.error, "warn");
      } else if (res?.fieldErrors) {
        const firstError = Object.values(res.fieldErrors).flat()[0];
        if (firstError) {
          setErrorMsg(firstError);
          addToast(firstError, "warn");
        }
      } else if (res?.ok && res.role) {
        setUserRole(res.role);
        addToast("تم إنشاء الحساب بنجاح!", "success");
        window.location.href = res.redirectTo || "/dashboard";
      }
    } catch {
      const err = "حدث خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.";
      setErrorMsg(err);
      addToast(err, "warn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body" dir="rtl">
      <SiteHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-[520px] rounded-[36px] border border-neutral-200/80 bg-white p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-[28px] md:text-[34px] font-bold text-ink font-heading leading-tight">
              إنشاء حساب جديد في Scora
            </h1>
            <p className="text-[14px] text-muted font-body mt-1.5">
              انضم إلينا وابدأ رحلتك التقنية اليوم
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold">
              {errorMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account Role Selector */}
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                نوع الحساب المطلوب
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole("developer")}
                  className={`flex items-center justify-center gap-2 h-11 rounded-2xl border text-[13px] font-bold transition-all cursor-pointer ${
                    role === "developer"
                      ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38]"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <Code className="w-4 h-4" />
                  <span>مطور برمجيات</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("client")}
                  className={`flex items-center justify-center gap-2 h-11 rounded-2xl border text-[13px] font-bold transition-all cursor-pointer ${
                    role === "client"
                      ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38]"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <Briefcase className="w-4 h-4" />
                  <span>عميل / صاحب عمل</span>
                </button>
              </div>
            </div>

            {/* Username Field */}
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                الاسم الكامل
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  required
                  placeholder="أدخل اسمك الكامل"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                />
                <User className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Phone belongs to onboarding, not account registration.
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                رقم الموبايل
              </label>
              <div className="relative flex items-center">
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  dir="ltr"
                />
                <Phone className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
              </div>
            </div> */}

            {/* Email Field */}
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                البريد الإلكتروني
              </label>
              <div className="relative flex items-center">
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  dir="ltr"
                />
                <Mail className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                كلمة المرور
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-11 text-[14px] text-ink placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  dir="ltr"
                />
                <Lock className="absolute right-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 text-neutral-400 hover:text-ink transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms & Conditions Agreement Checkbox */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6]">
              <input
                type="checkbox"
                id="terms"
                required
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked);
                  if (errorMsg) setErrorMsg("");
                }}
                className="mt-0.5 w-5 h-5 rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer accent-[#056B38] shrink-0"
              />
              <label htmlFor="terms" className="text-[12.5px] text-[#05291A] leading-relaxed font-body cursor-pointer select-none">
                أوافق على{" "}
                <Link href="/laws" target="_blank" className="font-bold text-[#056B38] underline hover:text-[#08592E]">
                  الشروط والأحكام
                </Link>{" "}
                وسياسة جمع وتوثيق نتائج التقييمات والمقابلات البرمجية لضمان مصداقية التوظيف للشركات.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] rounded-full bg-primary hover:bg-[#005B27] text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{loading ? "جاري إنشاء الحساب..." : "إنشاء حساب"}</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center text-[14px] text-muted">
            <span>لديك حساب بالفعل؟ </span>
            <Link
              href="/login"
              className="font-bold text-primary hover:underline transition-colors"
            >
              تسجيل الدخول
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
