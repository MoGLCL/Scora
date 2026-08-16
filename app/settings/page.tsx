"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { CustomSelect } from "@/components/custom-select";
import { ProfileEditForm, InitialUserData } from "@/components/profile-edit-form";
import {
  getUserSettingsData,
  changeUserPassword,
  toggleTwoFactorAuth,
  revokeUserSession,
  revokeAllOtherSessions,
  saveUserAiPreferences,
  saveClientCompanySettings,
  UserSettingsFullData,
} from "@/lib/actions/user-settings";
import {
  User,
  Shield,
  KeyRound,
  Smartphone,
  Bot,
  Building2,
  Lock,
  CheckCircle2,
  Loader2,
  RefreshCw,
  LogOut,
  Laptop,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { COMPANY_INDUSTRIES } from "@/lib/egyptian-locations";

function SettingsContent() {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab") as "profile" | "security" | "sessions" | "2fa" | "ai" | "company" | null;

  const { addToast } = useProfile();
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "sessions" | "2fa" | "ai" | "company">(
    initialTabParam || "profile"
  );
  const [loading, setLoading] = useState(true);
  const [settingsData, setSettingsData] = useState<UserSettingsFullData | null>(null);

  // 1. Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // 2. 2FA State
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isToggling2fa, setIsToggling2fa] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // 3. AI Preferences State
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiMode, setAiMode] = useState<"creative" | "balanced" | "strict">("balanced");
  const [aiTone, setAiTone] = useState<"egyptian_friendly" | "formal_arabic" | "technical_english">("egyptian_friendly");
  const [aiAutoSuggest, setAiAutoSuggest] = useState(true);
  const [isSavingAi, setIsSavingAi] = useState(false);

  // 4. Company & Account Type State
  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [industry, setIndustry] = useState("البرمجيات وتكنولوجيا المعلومات (SaaS / Tech)");
  const [companySize, setCompanySize] = useState("1-10");
  const [website, setWebsite] = useState("");
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Load Settings Data
  const loadData = async () => {
    setLoading(true);
    const res = await getUserSettingsData();
    if (res.ok) {
      setSettingsData(res.data);
      setIs2faEnabled(res.data.user.is2faEnabled);
      setAiEnabled(res.data.aiPreferences.enabled);
      setAiMode(res.data.aiPreferences.mode);
      setAiTone(res.data.aiPreferences.tone);
      setAiAutoSuggest(res.data.aiPreferences.autoSuggest);

      if (res.data.clientData) {
        setAccountType(res.data.clientData.accountType);
        setCompanyName(res.data.clientData.companyName || "");
        setTaxId(res.data.clientData.taxId || "");
        setIndustry(res.data.clientData.industry || "البرمجيات وتكنولوجيا المعلومات (SaaS / Tech)");
        setCompanySize(res.data.clientData.companySize || "1-10");
        setWebsite(res.data.clientData.website || "");
      }
    } else {
      addToast(res.error, "warn");
    }
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword || isChangingPass) return;
    if (newPassword !== confirmPassword) {
      addToast("كلمة المرور الجديدة وتأكيدها غير متطابقين", "warn");
      return;
    }

    setIsChangingPass(true);
    const res = await changeUserPassword({ currentPassword, newPassword, confirmPassword });
    setIsChangingPass(false);

    if (res.ok) {
      addToast("تم تغيير كلمة المرور بنجاح", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      addToast(res.error, "warn");
    }
  };

  // Handle Toggle 2FA
  const handleToggle2fa = async (enable: boolean) => {
    if (enable && twoFactorCode.length !== 6) {
      addToast("يرجى إدخال رمز التحقق المكون من 6 أرقام", "warn");
      return;
    }

    setIsToggling2fa(true);
    const res = await toggleTwoFactorAuth({ enabled: enable, code: twoFactorCode });
    setIsToggling2fa(false);

    if (res.ok) {
      setIs2faEnabled(enable);
      setTwoFactorCode("");
      addToast(enable ? "تم تفعيل المصادقة الثنائية 2FA بنجاح" : "تم إلغاء المصادقة الثنائية", "success");
      void loadData();
    } else {
      addToast(res.error, "warn");
    }
  };

  // Handle Save AI Preferences
  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAi(true);
    const res = await saveUserAiPreferences({
      enabled: aiEnabled,
      mode: aiMode,
      tone: aiTone,
      autoSuggest: aiAutoSuggest,
    });
    setIsSavingAi(false);

    if (res.ok) {
      addToast("تم حفظ إعدادات وكيل الذكاء الاصطناعي SSD", "success");
    } else {
      addToast(res.error, "warn");
    }
  };

  // Handle Save Company Settings
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);
    const res = await saveClientCompanySettings({
      accountType,
      companyName,
      taxId,
      industry,
      companySize,
      website,
    });
    setIsSavingCompany(false);

    if (res.ok) {
      addToast("تم تحديث بيانات الحساب والشركة بنجاح", "success");
      void loadData();
    } else {
      addToast(res.error, "warn");
    }
  };

  // Handle Revoke Session
  const handleRevokeSession = async (id: number) => {
    const res = await revokeUserSession(id);
    if (res.ok) {
      addToast("تم إنهاء الجلسة بنجاح", "success");
      void loadData();
    } else {
      addToast(res.error, "warn");
    }
  };

  // Handle Revoke All Other Sessions
  const handleRevokeAllOthers = async () => {
    const res = await revokeAllOtherSessions();
    if (res.ok) {
      addToast("تم تسجيل الخروج من كافة الأجهزة الأخرى", "success");
      void loadData();
    } else {
      addToast(res.error, "warn");
    }
  };

  const profileInitialData: InitialUserData | null = settingsData
    ? {
        id: settingsData.user.id,
        username: settingsData.user.username,
        fullName: settingsData.user.fullName,
        email: settingsData.user.email,
        phone: settingsData.user.phone,
        role: settingsData.user.role,
        jobTitle: settingsData.devProfile?.jobTitle || "",
        location: settingsData.devProfile?.location || settingsData.clientData?.location || "القاهرة",
        availability: settingsData.devProfile?.availability || "available",
        bio: settingsData.devProfile?.bio || "",
        avatarUrl: settingsData.user.avatarUrl,
        skills: settingsData.devProfile?.skills || [],
        github: settingsData.devProfile?.github || "",
        linkedin: settingsData.devProfile?.linkedin || "",
        website: settingsData.devProfile?.website || settingsData.clientData?.website || "",
        companyName: settingsData.clientData?.companyName || "",
        industry: settingsData.clientData?.industry || "",
        accountType: settingsData.clientData?.accountType || "personal",
      }
    : null;

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body" dir="rtl">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-6 py-8 space-y-6">
        
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-[28px] border border-[#D1E3D6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 border border-[#C5E8D1]">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#05291A]">إعدادات الحساب والملف الشخصي</h1>
              <p className="text-xs text-[#526B5E]">
                تعديل البيانات والملف الشخصي، الأمان وكلمات المرور، الجلسات النشطة، 2FA، ووكيل SSD.
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl text-[#526B5E] hover:text-[#056B38] hover:bg-[#E8FAF0] border border-[#D1E3D6] flex items-center gap-2 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>

        {/* Settings Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-white border border-[#D1E3D6] rounded-[22px] shadow-2xs no-scrollbar">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "profile"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:text-[#05291A] hover:bg-[#F7FAF8]"
            }`}
          >
            <User className="w-4 h-4" />
            <span>تعديل الملف والبيانات</span>
          </button>

          <button
            onClick={() => setActiveTab("security")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "security"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:text-[#05291A] hover:bg-[#F7FAF8]"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>الأمان وكلمة المرور</span>
          </button>

          <button
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "sessions"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:text-[#05291A] hover:bg-[#F7FAF8]"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>الجلسات وسجل الدخول ({settingsData?.sessions.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("2fa")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "2fa"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:text-[#05291A] hover:bg-[#F7FAF8]"
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>المصادقة الثنائية (2FA)</span>
          </button>

          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "ai"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:text-[#05291A] hover:bg-[#F7FAF8]"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>وكيل الذكاء الاصطناعي SSD</span>
          </button>

          <button
            onClick={() => setActiveTab("company")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "company"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:text-[#05291A] hover:bg-[#F7FAF8]"
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>إعدادات الحساب والشركة</span>
          </button>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: PROFILE & BASIC INFO EDITING */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "profile" && (
          <div className="animate-in fade-in duration-150">
            {profileInitialData ? (
              <ProfileEditForm initialData={profileInitialData} />
            ) : (
              <div className="p-12 text-center bg-white rounded-[28px] border border-[#D1E3D6]">
                <Loader2 className="w-8 h-8 animate-spin text-[#056B38] mx-auto mb-3" />
                <p className="text-xs font-bold text-[#526B5E]">جاري تحميل بيانات الملف الشخصي...</p>
              </div>
            )}
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: SECURITY & PASSWORD */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "security" && (
          <div className="grid gap-6 md:grid-cols-[1fr_360px] animate-in fade-in duration-150">
            <section className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 sm:p-8 shadow-xs space-y-6">
              <div className="border-b border-[#D1E3D6] pb-4 space-y-1">
                <h2 className="text-lg font-black text-[#05291A]">تغيير كلمة المرور</h2>
                <p className="text-xs text-[#526B5E]">
                  احرص على استخدام كلمة مرور قوية تحتوي على أحرف وأرقام ورموز لضمان حماية حسابك.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#05291A]">كلمة المرور الحالية</label>
                  <div className="relative flex items-center">
                    <input
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pl-11 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass(!showCurrentPass)}
                      className="absolute left-3.5 p-1 text-[#526B5E] hover:text-[#056B38]"
                    >
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#05291A]">كلمة المرور الجديدة</label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8 أحرف على الأقل..."
                      required
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pl-11 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute left-3.5 p-1 text-[#526B5E] hover:text-[#056B38]"
                    >
                      {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#05291A]">تأكيد كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد كتابة كلمة المرور..."
                    required
                    className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="h-12 px-7 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isChangingPass ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ والتحديث...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تحديث كلمة المرور</span>
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* Side Card: Account Security Snapshot */}
            <aside className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-[#056B38] font-black text-sm">
                <Shield className="w-4 h-4" />
                <span>حالة أمان الحساب</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] flex items-center justify-between">
                  <span className="font-bold text-[#05291A]">المصادقة الثنائية (2FA)</span>
                  {is2faEnabled ? (
                    <span className="bg-[#E8FAF0] text-[#056B38] font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-[#C5E8D1]">
                      مفعلة
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full text-[11px] border border-amber-200">
                      غير مفعلة
                    </span>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] flex items-center justify-between">
                  <span className="font-bold text-[#05291A]">الجلسات النشطة</span>
                  <span className="font-mono font-bold text-[#056B38]">
                    {settingsData?.sessions.filter((s) => s.status === "active").length || 1} أجهزة
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] flex items-center justify-between">
                  <span className="font-bold text-[#05291A]">عضو منذ</span>
                  <span className="text-[#526B5E] font-bold">
                    {settingsData ? new Date(settingsData.user.createdAt).toLocaleDateString("ar-EG") : "..."}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: ACTIVE SESSIONS & LOGIN HISTORY */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "sessions" && (
          <section className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D1E3D6] pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-[#05291A]">الجلسات النشطة وسجل الدخول</h2>
                <p className="text-xs text-[#526B5E]">
                  يمكنك مراجعة الأجهزة والمتصفحات التي سجلت الدخول بحسابك، وتسجيل الخروج من أي جهاز غير معروف.
                </p>
              </div>

              <button
                type="button"
                onClick={handleRevokeAllOthers}
                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black border border-red-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج من كافة الأجهزة الأخرى</span>
              </button>
            </div>

            {/* Sessions List */}
            <div className="space-y-3">
              {settingsData?.sessions.map((sess) => {
                const isCurrent = sess.isCurrent;
                const isActive = sess.status === "active";

                return (
                  <div
                    key={sess.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCurrent
                        ? "bg-[#E8FAF0] border-[#056B38]"
                        : isActive
                        ? "bg-white border-[#D1E3D6] hover:border-[#056B38]/60"
                        : "bg-[#F7FAF8] border-[#D1E3D6] opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? "bg-[#056B38] text-white"
                            : "bg-[#F7FAF8] text-[#526B5E] border border-[#D1E3D6]"
                        }`}
                      >
                        {sess.deviceName.toLowerCase().includes("phone") ? (
                          <Smartphone className="w-5 h-5" />
                        ) : (
                          <Laptop className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-0.5 text-right">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-extrabold text-[#05291A]">{sess.deviceName}</h3>
                          {isCurrent && (
                            <span className="bg-[#056B38] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                              الجهاز الحالي
                            </span>
                          )}
                          {!isActive && (
                            <span className="bg-neutral-200 text-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              تم تسجيل الخروج
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#526B5E]">
                          <span>{sess.browser}</span>
                          <span>•</span>
                          <span className="font-mono">{sess.ipAddress}</span>
                          <span>•</span>
                          <span>{sess.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-left text-[11px] text-[#526B5E]">
                        <p className="font-bold">آخر نشاط:</p>
                        <time>{new Date(sess.lastActiveAt).toLocaleString("ar-EG")}</time>
                      </div>

                      {!isCurrent && isActive && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(sess.id)}
                          className="px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold transition-colors cursor-pointer"
                        >
                          إنهاء الجلسة
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 4: TWO-FACTOR AUTHENTICATION (2FA) */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "2fa" && (
          <section className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-[#D1E3D6] pb-4 space-y-1">
              <div className="flex items-center gap-2 text-[#056B38] font-bold text-xs">
                <Lock className="w-4 h-4" />
                <span>حماية الحساب الإضافية</span>
              </div>
              <h2 className="text-xl font-black text-[#05291A]">المصادقة الثنائية (2FA - Two-Factor Auth)</h2>
              <p className="text-xs text-[#526B5E]">
                تضيف المصادقة الثنائية طبقة أمان فائقة تطلب إدخال رمز مؤقت من تطبيق المصادقة (Google Authenticator / Authy) عند كل تسجيل دخول.
              </p>
            </div>

            {is2faEnabled ? (
              <div className="p-6 rounded-[22px] bg-[#E8FAF0] border border-[#C5E8D1] space-y-4 max-w-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#056B38] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#05291A]">المصادقة الثنائية مفعلة ونشطة</h3>
                    <p className="text-xs text-[#526B5E] mt-0.5">
                      حسابك محمي بنجاح ولن يتمكن أحد من تسجيل الدخول بدون الرمز المؤقت.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={isToggling2fa}
                    onClick={() => handleToggle2fa(false)}
                    className="px-5 py-2.5 rounded-full border border-red-300 text-red-600 hover:bg-red-50 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isToggling2fa ? "جاري الإلغاء..." : "إيقاف المصادقة الثنائية"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-xl">
                <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] text-xs text-[#526B5E] space-y-2">
                  <p className="font-black text-[#05291A]">خطوات تفعيل المصادقة الثنائية:</p>
                  <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                    <li>قم بتحميل تطبيق Google Authenticator أو Microsoft Authenticator على هاتفك.</li>
                    <li>انسخ المفتاح السري الموضح بالأسفل.</li>
                    <li>أدخل رمز التحقق المكون من 6 أرقام لتأكيد التفعيل.</li>
                  </ol>
                </div>

                {/* Secret Key Box */}
                <div className="p-4 rounded-2xl border border-[#D1E3D6] bg-white space-y-3">
                  <span className="text-xs font-bold text-[#05291A] block">المفتاح السري (Secret Key):</span>
                  <div className="flex items-center justify-between gap-2 p-3 bg-[#F7FAF8] rounded-xl border border-[#D1E3D6]">
                    <span className="font-mono font-black text-xs text-[#056B38] tracking-widest" dir="ltr">
                      SCORA-2026-SEC-PRO9
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText("SCORA-2026-SEC-PRO9");
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="p-1.5 rounded-lg text-[#526B5E] hover:text-[#056B38] hover:bg-white transition-colors cursor-pointer"
                      title="نسخ المفتاح"
                    >
                      {copiedKey ? <Check className="w-4 h-4 text-[#056B38]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Verification Code Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-[#05291A]">أدخل رمز التحقق (6 أرقام)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-48 h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-center font-mono font-black text-lg tracking-widest text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="button"
                  disabled={isToggling2fa || twoFactorCode.length !== 6}
                  onClick={() => handleToggle2fa(true)}
                  className="h-12 px-7 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {isToggling2fa ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحقق والتفعيل...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>تأكيد وتفعيل 2FA الآن</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 5: SSD AI AGENT PREFERENCES */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "ai" && (
          <section className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-[#D1E3D6] pb-4 space-y-1">
              <div className="flex items-center gap-2 text-[#056B38] font-bold text-xs">
                <Bot className="w-4 h-4" />
                <span>المساعد الذكي للمنصة</span>
              </div>
              <h2 className="text-xl font-black text-[#05291A]">إعدادات وكيل الذكاء الاصطناعي SSD Agent</h2>
              <p className="text-xs text-[#526B5E]">
                خصص أسلوب وسلوك وكيل SSD في مراجعة مشاريعك، صياغة عروض العمل، وحل النزاعات.
              </p>
            </div>

            <form onSubmit={handleSaveAi} className="space-y-5 max-w-xl">
              {/* Toggle Enable/Disable SSD Agent */}
              <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black text-[#05291A]">تفعيل وكيل SSD في المنصة</h3>
                  <p className="text-[11px] text-[#526B5E]">
                    إتاحة مساعد SSD التفاعلي في الشات، وتنسيق المشاريع، والمساعدة في التذاكر.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="w-5 h-5 accent-[#056B38] rounded cursor-pointer"
                />
              </div>

              {/* Assistance Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#05291A]">نمط التحليل والمساعدة (Mode)</label>
                <CustomSelect
                  value={aiMode}
                  onChange={(val) => setAiMode(val as any)}
                  size="lg"
                  options={[
                    { value: "balanced", label: "دقيق ومتوازن وموجز (Balanced)" },
                    { value: "creative", label: "اقتراحات إبداعية وتفصيل شامل (Creative & In-depth)" },
                    { value: "strict", label: "تحليل صارم للمطابقة والجودة (Strict Quality Analysis)" },
                  ]}
                />
              </div>

              {/* Tone / Language Preference */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#05291A]">لهجة وأسلوب المحادثة (Tone)</label>
                <CustomSelect
                  value={aiTone}
                  onChange={(val) => setAiTone(val as any)}
                  size="lg"
                  options={[
                    { value: "egyptian_friendly", label: "لهجة مصرية تقنية ودودة وسلسة" },
                    { value: "formal_arabic", label: "لغة عربية فصحى احترافية ورسمية" },
                    { value: "technical_english", label: "English (Technical Software Engineering)" },
                  ]}
                />
              </div>

              {/* Auto Suggest Toggle */}
              <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-black text-[#05291A]">المقترحات الذكية التلقائية</h3>
                  <p className="text-[11px] text-[#526B5E]">
                    اقتراح مهارات ونصوص مساعدة تلقائياً أثناء كتابة تفاصيل المشاريع أو العروض.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={aiAutoSuggest}
                  onChange={(e) => setAiAutoSuggest(e.target.checked)}
                  className="w-5 h-5 accent-[#056B38] rounded cursor-pointer"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingAi}
                className="h-12 px-7 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isSavingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ التفضيلات...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ إعدادات SSD</span>
                  </>
                )}
              </button>
            </form>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 6: COMPANY & ACCOUNT SETTINGS */}
        {/* ───────────────────────────────────────────────────────────── */}
        {activeTab === "company" && (
          <section className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            <div className="border-b border-[#D1E3D6] pb-4 space-y-1">
              <div className="flex items-center gap-2 text-[#056B38] font-bold text-xs">
                <Building2 className="w-4 h-4" />
                <span>إدارة المؤسسة والحساب</span>
              </div>
              <h2 className="text-xl font-black text-[#05291A]">نوع الحساب وبيانات الشركة</h2>
              <p className="text-xs text-[#526B5E]">
                يمكنك تحويل حسابك من فردي إلى شركة معتمدة، وإضافة بيانات السجل التجاري والنشاط.
              </p>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-5 max-w-xl">
              {/* Account Type Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#05291A]">نوع حساب العميل</label>
                <CustomSelect
                  value={accountType}
                  onChange={(val) => setAccountType(val as "personal" | "company")}
                  size="lg"
                  options={[
                    { value: "personal", label: "حساب فردي / شخصي (Personal Client)" },
                    { value: "company", label: "شركة أو مؤسسة معتمدة (Company / Enterprise)" },
                  ]}
                />
              </div>

              {accountType === "company" && (
                <div className="space-y-4 pt-2 border-t border-[#D1E3D6] animate-in fade-in duration-150">
                  {/* Company Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#05291A]">اسم الشركة أو العلامة التجارية *</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="مثال: شركة النيل للحلول البرمجية"
                      required
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Tax / Commercial ID */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#05291A]">السجل التجاري أو الرقم الضريبي (اختياري)</label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="مثال: 948-204-118"
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Industry */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#05291A]">مجال النشاط</label>
                      <CustomSelect
                        value={industry}
                        onChange={(val) => setIndustry(val)}
                        size="lg"
                        options={COMPANY_INDUSTRIES || []}
                      />
                    </div>

                    {/* Company Size */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[#05291A]">حجم فريق العمل</label>
                      <CustomSelect
                        value={companySize}
                        onChange={(val) => setCompanySize(val)}
                        size="lg"
                        options={[
                          { value: "1-10", label: "1 - 10 موظفين" },
                          { value: "11-50", label: "11 - 50 موظف" },
                          { value: "51-200", label: "51 - 200 موظف" },
                          { value: "200+", label: "أكثر من 200 موظف" },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[#05291A]">موقع الشركة الإلكتروني</label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://company.com"
                      dir="ltr"
                      className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-xs font-mono text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingCompany}
                className="h-12 px-7 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {isSavingCompany ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ التعديلات...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ بيانات الحساب</span>
                  </>
                )}
              </button>
            </form>
          </section>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#056B38]" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
