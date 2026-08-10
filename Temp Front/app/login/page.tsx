"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SocialGrid } from "@/components/auth/social-grid";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect after login
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-5 text-[14px] text-ink placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
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

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-[54px] rounded-full bg-primary hover:bg-[#005B27] text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer mt-2"
            >
              <span>تسجيل الدخول</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </form>

          {/* Social Login Grid */}
          <SocialGrid label="أو تسجيل الدخول بواسطة" />

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
