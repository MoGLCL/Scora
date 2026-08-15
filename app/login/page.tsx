"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Mail, Lock, Eye, EyeOff, ArrowLeft, AlertCircle } from "lucide-react";
import { login } from "@/lib/actions/auth";
import { useProfile } from "@/components/profile-provider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { setUserRole, addToast, userRole, isAdmin, developer, client } = useProfile();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (userRole !== "guest") {
      if (isAdmin) {
        router.replace("/admin");
      } else if (userRole === "developer") {
        router.replace((!developer.jobTitle || developer.skills.length === 0) ? "/complete-profile" : "/dashboard");
      } else if (userRole === "client") {
        router.replace(!client.fullName ? "/complete-client-profile" : "/dashboard");
      }
    }
  }, [userRole, isAdmin, developer, client, router]);

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
        router.replace(res.redirectTo || (res.role === "client" && isAdmin ? "/admin" : "/dashboard"));
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
        <div className="w-full max-w-[480px] rounded-[36px] border border-neutral-200/80 bg-white p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-[28px] md:text-[34px] font-bold text-ink font-heading leading-tight">
              مرحباً بعودتك
            </h1>
            <p className="text-[14px] text-muted font-body mt-1.5">
              سجل الدخول لحسابك في Scora لمتابعة التقييمات والمشاريع
            </p>
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
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
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50/50 pr-11 pl-4 text-[14px] font-body text-ink placeholder:text-neutral-400 focus:bg-white focus:border-[#056B38] focus:outline-none transition-all"
                  dir="ltr"
                />
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[14px] font-bold text-ink">
                  كلمة المرور
                </label>
                <Link
                  href="/reset-password"
                  className="text-[12px] font-bold text-[#056B38] hover:underline"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50/50 pr-11 pl-11 text-[14px] font-body text-ink placeholder:text-neutral-400 focus:bg-white focus:border-[#056B38] focus:outline-none transition-all"
                  dir="ltr"
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-ink transition-colors cursor-pointer"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
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
              className="w-full h-12 rounded-2xl bg-[#056B38] hover:bg-[#08592E] text-white text-[15px] font-bold font-body transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>جاري تسجيل الدخول...</span>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Divider & Register Link */}
          <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
            <p className="text-[14px] text-muted font-body">
              ليس لديك حساب بعد؟{" "}
              <Link
                href="/register"
                className="font-bold text-[#056B38] hover:underline"
              >
                إنشاء حساب جديد
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
