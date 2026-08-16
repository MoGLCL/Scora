"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, Code, Briefcase, Sparkles, AtSign } from "lucide-react";
import { register } from "@/lib/actions/auth";
import { useProfile } from "@/components/profile-provider";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const { setUserRole, addToast, userRole, isAdmin } = useProfile();
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"developer" | "client">("developer");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (userRole !== "guest") {
      if (isAdmin) {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [userRole, isAdmin, router]);

  const generateSuggestion = () => {
    const prefixes = role === "developer" ? ["dev", "coder", "scora", "pro", "tech"] : ["client", "biz", "scora", "partner", "lead"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const randomNum = Math.floor(100 + Math.random() * 900);
    setUsername(`${randomPrefix}_${randomNum}`);
    setErrorMsg("");
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(val);
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    // Strict Frontend Validation
    if (!fullName.trim() || fullName.trim().length < 3) {
      const err = "يرجى إدخال الاسم الكامل (لا يقل عن 3 أحرف)";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      const err = "يرجى إدخال اسم مستخدم فريد (@username) لا يقل عن 3 أحرف";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      const err = "اسم المستخدم يقبل فقط الحروف الإنجليزية الصغيرة والأرقام والشرطة السفلية (_) دون مسافات";
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

    if (!acceptedTerms) {
      const err = "يجب التحديد بالموافقة على الشروط والأحكام وسياسة جمع وتوثيق نتائج التقييمات والمقابلات للمتابعة";
      setErrorMsg(err);
      addToast(err, "warn");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("fullName", fullName);
    formData.append("username", cleanUsername);
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
        if (res.redirectTo) {
          window.location.href = res.redirectTo;
        } else {
          router.replace(res.role === "client" && isAdmin ? "/admin" : "/dashboard");
        }
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
    <div className="min-h-dvh bg-background flex flex-col font-body" dir="rtl">
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
                  <span>عميل / شركة</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                الاسم الكامل
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="محمد أحمد علي"
                  required
                  className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50/50 pr-11 pl-4 text-[14px] font-body text-ink placeholder:text-neutral-400 focus:bg-white focus:border-[#056B38] focus:outline-none transition-all"
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              </div>
            </div>

            {/* Username (@username) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[14px] font-bold text-ink">
                  اسم المستخدم (@username)
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
                <input
                  type="text"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="username"
                  required
                  minLength={3}
                  maxLength={30}
                  className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50/50 pr-11 pl-4 text-[14px] font-mono font-bold text-ink placeholder:text-neutral-400 focus:bg-white focus:border-[#056B38] focus:outline-none transition-all dir-ltr text-right"
                />
                <AtSign className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              </div>
              <p className="text-[11px] text-muted mt-1">
                أحرف إنجليزية صغيرة وأرقام و _ فقط (3-30 حرفاً)
              </p>
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-[14px] font-bold text-ink mb-2">
                كلمة المرور
              </label>
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
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#056B38] focus:ring-[#056B38]"
              />
              <label htmlFor="terms" className="text-[12px] text-muted font-body leading-relaxed cursor-pointer">
                أوافق على{" "}
                <Link href="/privacy" className="text-[#056B38] font-bold hover:underline">
                  شروط الاستخدام
                </Link>{" "}
                و{" "}
                <Link href="/laws" className="text-[#056B38] font-bold hover:underline">
                  سياسة الخصوصية
                </Link>{" "}
                وتوثيق نتائج التقييمات البرمجية.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#056B38] hover:bg-[#08592E] text-white text-[15px] font-bold font-body transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>جاري إنشاء الحساب...</span>
              ) : (
                <>
                  <span>إنشاء حساب</span>
                  <ArrowLeft className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Divider & Login Link */}
          <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
            <p className="text-[14px] text-muted font-body">
              لديك حساب بالفعل؟{" "}
              <Link
                href="/login"
                className="font-bold text-[#056B38] hover:underline"
              >
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
