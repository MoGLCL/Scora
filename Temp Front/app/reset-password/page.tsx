"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Lock, RefreshCw, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to login after reset
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-body">
      <SiteHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-[520px] rounded-[36px] border border-neutral-200/80 bg-white p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-[28px] md:text-[34px] font-bold text-ink font-heading leading-tight">
              إعادة تعيين كلمة المرور
            </h1>
            <p className="text-[14px] text-muted font-body mt-1.5">
              يرجى إدخال كلمة مرور جديدة قوية لتأمين حسابك.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password Field */}
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                كلمة المرور الجديدة
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••••••••••"
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

            {/* Confirm Password Field */}
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                تأكيد كلمة المرور
              </label>
              <div className="relative flex items-center">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-[52px] rounded-full border border-neutral-200 pl-11 pr-11 text-[14px] text-ink placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white"
                  dir="ltr"
                />
                <RefreshCw className="absolute right-4 w-5 h-5 text-neutral-400 pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-4 text-neutral-400 hover:text-ink transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Validation Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 pb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF7EF] text-[#0E6D3B] text-[12px] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#0E6D3B]" />
                <span>8 أحرف على الأقل</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EBF7EF] text-[#0E6D3B] text-[12px] font-semibold">
                <CheckCircle2 className="w-4 h-4 text-[#0E6D3B]" />
                <span>رمز خاص واحد (@, #, $)</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-[54px] rounded-full bg-primary hover:bg-[#005B27] text-white font-bold text-[16px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer mt-2"
            >
              <span>تحديث كلمة المرور</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </form>

          {/* Footer Link */}
          <div className="text-center text-[14px] text-muted mt-8">
            <span>تواجه مشكلة؟ </span>
            <Link
              href="/support"
              className="font-bold text-primary hover:underline transition-colors"
            >
              تواصل مع الدعم الفني
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
