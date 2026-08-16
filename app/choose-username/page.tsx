"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AtSign, ArrowLeft, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { setMandatoryUsername } from "@/lib/actions/username";

export default function ChooseUsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow lowercase a-z, 0-9, and underscore
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(val);
    setError(null);
  };

  const generateSuggestion = () => {
    const prefixes = ["dev", "coder", "scora", "pro", "tech"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    setUsername(`${randomPrefix}_${randomNum}`);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username.length < 3) {
      setError("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("username", username);
      const res = await setMandatoryUsername(undefined, formData);
      if (res.error) {
        setError(res.error);
      } else if (res.ok && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col items-center justify-center p-4 font-body dir-rtl" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-[32px] border border-[#D1E3D6] p-8 sm:p-10 shadow-xs space-y-6">
        
        {/* Header Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38] border border-[#C5E8D1] mx-auto shadow-2xs">
            <AtSign className="h-7 w-7 text-[#056B38]" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#05291A] font-heading">
              اختر اسم المستخدم الخاص بك
            </h1>
            <p className="text-xs sm:text-sm text-[#526B5E] leading-relaxed">
              يلزم تعيين اسم مستخدم فريد (@username) للوصول إلى حسابك ومشاريعك وملفك الشخصي في منصة سكورا.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-extrabold text-[#05291A]">
                اسم المستخدم (@username):
              </label>
              <button
                type="button"
                onClick={generateSuggestion}
                className="text-xs text-[#056B38] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>اقتراح اسم</span>
              </button>
            </div>

            <div className="relative">
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono font-bold text-sm pointer-events-none">
                @
              </div>
              <input
                type="text"
                required
                minLength={3}
                maxLength={30}
                value={username}
                onChange={handleUsernameChange}
                placeholder="username"
                autoFocus
                className="w-full rounded-2xl border border-[#D1E3D6] pr-9 pl-4 py-3.5 text-sm font-mono font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8] transition-all dir-ltr text-right"
              />
            </div>

            <p className="text-[11px] text-[#526B5E]">
              أحرف إنجليزية صغيرة، أرقام، وشرطة سفلية (_) فقط. من 3 إلى 30 حرفاً.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || username.length < 3}
            className="w-full h-12 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            <span>{isPending ? "جاري الحفظ والتأكيد..." : "متابعة الدخول للمنصة"}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-[#526B5E]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-[#056B38]" />
            <span>بيئة موثقة وآمنة</span>
          </span>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-neutral-500 hover:text-rose-600 hover:underline transition-colors cursor-pointer">
              تسجيل الخروج
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
