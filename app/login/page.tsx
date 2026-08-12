"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { useProfile } from "@/components/profile-provider";

export default function LoginPage() {
  const { setUserRole, addToast, userRole, developer, client } = useProfile();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    // Frontend validation
    if (!email.trim() || !email.includes("@")) {
      const err = "يرجى أدخل بريد إلكتروني صحيح ومسجل بالمنصة";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      const err = "كلمة المرور قصيرة جداً (يجب أن لا تقل عن 6 أحرف)";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    try {
      const res = await login(undefined, formData);
      if (res?.error) {
        setErrorMsg(res.error);
        addToast(res.error, "warn");
      } else if (res?.ok && res.role) {
        setUserRole(res.role);
        addToast("تم تسجيل الدخول بنجاح!", "success");
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
              مرحباً بك في Scora
            </h1>
            <p className="text-[14px] text-muted font-body mt-1.5">
              سجل الدخول للمتابعة إلى لوحة التحكم الخاصة بك
            </p>
          </div>

          {/* Explicit Error Banner Box */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-[18px] bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold flex items-center gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className={`w-full h-[52px] rounded-full border pl-11 pr-5 text-[14px] text-ink placeholder:text-neutral-400 focus:outline-none transition-all bg-white ${
                    errorMsg ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100" : "border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  }`}
                  dir="ltr"
                />
                <Mail className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[14px] font-bold text-ink">
                  كلمة المرور
                </label>
                <Link
                  href="/reset-password"
                  className="text-[13px] font-semibold text-primary hover:underline transition-colors"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg("");
                  }}
                  className={`w-full h-[52px] rounded-full border pl-11 pr-11 text-[14px] text-ink placeholder:text-neutral-400 focus:outline-none transition-all bg-white ${
                    errorMsg ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100" : "border-neutral-200 focus:border-primary focus:ring-2 focus:ring-primary/10"
                  }`}
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[54px] rounded-full bg-primary hover:bg-[#005B27] text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer mt-2 disabled:opacity-50"
            >
              <span>{loading ? "جاري التحقق وسجل الدخول..." : "تسجيل الدخول"}</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center text-[14px] text-muted">
            <span>ليس لديك حساب؟ </span>
            <Link
              href="/register"
              className="font-bold text-primary hover:underline transition-colors"
            >
              إنشاء حساب جديد
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
