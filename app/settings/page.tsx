"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Building2, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Shield, User } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import { CustomSelect } from "@/components/custom-select";
import { ProfileEditForm, InitialUserData } from "@/components/profile-edit-form";
import { COMPANY_INDUSTRIES } from "@/lib/egyptian-locations";
import { changeUserPassword, getUserSettingsData, saveClientCompanySettings, saveUserAiPreferences, UserSettingsFullData } from "@/lib/actions/user-settings";

type SettingsTab = "profile" | "security" | "ai" | "company";
const SETTINGS_TABS: SettingsTab[] = ["profile", "security", "ai", "company"];

function isSettingsTab(value: string | null): value is SettingsTab {
  return Boolean(value && SETTINGS_TABS.includes(value as SettingsTab));
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const { addToast } = useProfile();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<SettingsTab>(isSettingsTab(requestedTab) ? requestedTab : "profile");
  const [loading, setLoading] = useState(true);
  const [settingsData, setSettingsData] = useState<UserSettingsFullData | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiMode, setAiMode] = useState<"creative" | "balanced" | "strict">("balanced");
  const [aiTone, setAiTone] = useState<"egyptian_friendly" | "formal_arabic" | "technical_english">("egyptian_friendly");
  const [aiAutoSuggest, setAiAutoSuggest] = useState(true);
  const [isSavingAi, setIsSavingAi] = useState(false);

  const [accountType, setAccountType] = useState<"personal" | "company">("personal");
  const [companyName, setCompanyName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [industry, setIndustry] = useState("البرمجيات وتكنولوجيا المعلومات (SaaS / Tech)");
  const [companySize, setCompanySize] = useState("1-10");
  const [website, setWebsite] = useState("");
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await getUserSettingsData();
    if (!result.ok) {
      addToast(result.error, "warn");
      setLoading(false);
      return;
    }
    setSettingsData(result.data);
    setAiEnabled(result.data.aiPreferences.enabled);
    setAiMode(result.data.aiPreferences.mode);
    setAiTone(result.data.aiPreferences.tone);
    setAiAutoSuggest(result.data.aiPreferences.autoSuggest);
    if (result.data.clientData) {
      setAccountType(result.data.clientData.accountType);
      setCompanyName(result.data.clientData.companyName || "");
      setTaxId(result.data.clientData.taxId || "");
      setIndustry(result.data.clientData.industry || "البرمجيات وتكنولوجيا المعلومات (SaaS / Tech)");
      setCompanySize(result.data.clientData.companySize || "1-10");
      setWebsite(result.data.clientData.website || "");
    }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isChangingPass) return;
    if (newPassword !== confirmPassword) {
      addToast("كلمة المرور الجديدة وتأكيدها غير متطابقين", "warn");
      return;
    }
    setIsChangingPass(true);
    const result = await changeUserPassword({ currentPassword, newPassword, confirmPassword });
    setIsChangingPass(false);
    if (!result.ok) {
      addToast(result.error, "warn");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    addToast("تم تغيير كلمة المرور بنجاح", "success");
  };

  const handleSaveAi = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingAi(true);
    const result = await saveUserAiPreferences({ enabled: aiEnabled, mode: aiMode, tone: aiTone, autoSuggest: aiAutoSuggest });
    setIsSavingAi(false);
    addToast(result.ok ? "تم حفظ إعدادات وكيل الذكاء الاصطناعي SSD" : result.error, result.ok ? "success" : "warn");
  };

  const handleSaveCompany = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSavingCompany(true);
    const result = await saveClientCompanySettings({ accountType, companyName, taxId, industry, companySize, website });
    setIsSavingCompany(false);
    if (!result.ok) {
      addToast(result.error, "warn");
      return;
    }
    addToast("تم تحديث بيانات الحساب والشركة بنجاح", "success");
    void loadData();
  };

  const profileInitialData: InitialUserData | null = settingsData ? {
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
  } : null;

  const isClient = settingsData?.user.role === "client";
  const tabs: { key: SettingsTab; label: string; icon: typeof User }[] = [
    { key: "profile", label: "تعديل الملف والبيانات", icon: User },
    { key: "security", label: "الأمان وكلمة المرور", icon: KeyRound },
    { key: "ai", label: "وكيل الذكاء الاصطناعي SSD", icon: Bot },
    ...(isClient ? [{ key: "company" as const, label: "إعدادات الحساب والشركة", icon: Building2 }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body" dir="rtl">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-6 py-8 space-y-6">
        <div className="bg-white p-6 rounded-[28px] border border-[#D1E3D6] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 border border-[#C5E8D1]"><Shield className="w-7 h-7" /></div>
            <div><h1 className="text-2xl font-black text-[#05291A]">إعدادات الحساب والملف الشخصي</h1><p className="text-xs text-[#526B5E]">تعديل البيانات، كلمة المرور، وتفضيلات وكيل SSD.</p></div>
          </div>
          <button type="button" onClick={() => void loadData()} className="p-2 rounded-xl text-[#526B5E] hover:text-[#056B38] hover:bg-[#E8FAF0] border border-[#D1E3D6] flex items-center gap-2 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"><RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /><span>تحديث البيانات</span></button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto p-1.5 bg-white border border-[#D1E3D6] rounded-[22px] shadow-2xs no-scrollbar">
          {tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setActiveTab(key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${activeTab === key ? "bg-[#056B38] text-white shadow-xs" : "text-[#526B5E] hover:text-[#05291A] hover:bg-[#F7FAF8]"}`}><Icon className="w-4 h-4" /><span>{label}</span></button>)}
        </div>

        {activeTab === "profile" && <div className="animate-in fade-in duration-150">{profileInitialData ? <ProfileEditForm initialData={profileInitialData} /> : <LoadingPanel />}</div>}

        {activeTab === "security" && <section className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="border-b border-[#D1E3D6] pb-4 space-y-1"><h2 className="text-lg font-black text-[#05291A]">تغيير كلمة المرور</h2><p className="text-xs text-[#526B5E]">استخدم كلمة مرور قوية ولا تشاركها مع أي شخص.</p></div>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            <PasswordInput label="كلمة المرور الحالية" value={currentPassword} onChange={setCurrentPassword} visible={showCurrentPass} onToggle={() => setShowCurrentPass((value) => !value)} />
            <PasswordInput label="كلمة المرور الجديدة" value={newPassword} onChange={setNewPassword} visible={showNewPass} onToggle={() => setShowNewPass((value) => !value)} />
            <TextField label="تأكيد كلمة المرور الجديدة" value={confirmPassword} onChange={setConfirmPassword} type="password" required />
            <ActionButton busy={isChangingPass} label="تحديث كلمة المرور" busyLabel="جاري الحفظ والتحديث..." />
          </form>
        </section>}

        {activeTab === "ai" && <section className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="border-b border-[#D1E3D6] pb-4 space-y-1"><h2 className="text-xl font-black text-[#05291A]">إعدادات وكيل الذكاء الاصطناعي SSD</h2><p className="text-xs text-[#526B5E]">خصص أسلوب وسلوك وكيل SSD في المنصة.</p></div>
          <form onSubmit={handleSaveAi} className="space-y-5 max-w-xl">
            <ToggleRow title="تفعيل وكيل SSD في المنصة" checked={aiEnabled} onChange={setAiEnabled} />
            <SelectField label="نمط التحليل والمساعدة" value={aiMode} onChange={(value) => { if (value === "creative" || value === "balanced" || value === "strict") setAiMode(value); }} options={[{ value: "balanced", label: "دقيق ومتوازن وموجز (Balanced)" }, { value: "creative", label: "اقتراحات إبداعية وتفصيل شامل (Creative)" }, { value: "strict", label: "تحليل صارم للجودة (Strict)" }]} />
            <SelectField label="لهجة وأسلوب المحادثة" value={aiTone} onChange={(value) => { if (value === "egyptian_friendly" || value === "formal_arabic" || value === "technical_english") setAiTone(value); }} options={[{ value: "egyptian_friendly", label: "لهجة مصرية تقنية ودودة" }, { value: "formal_arabic", label: "لغة عربية فصحى رسمية" }, { value: "technical_english", label: "English (Technical)" }]} />
            <ToggleRow title="المقترحات الذكية التلقائية" checked={aiAutoSuggest} onChange={setAiAutoSuggest} />
            <ActionButton busy={isSavingAi} label="حفظ إعدادات SSD" busyLabel="جاري حفظ التفضيلات..." />
          </form>
        </section>}

        {activeTab === "company" && isClient && <section className="bg-white rounded-[28px] border border-[#D1E3D6] p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
          <div className="border-b border-[#D1E3D6] pb-4 space-y-1"><h2 className="text-xl font-black text-[#05291A]">نوع الحساب وبيانات الشركة</h2><p className="text-xs text-[#526B5E]">أضف معلومات الشركة إذا كان الحساب تجاريًا.</p></div>
          <form onSubmit={handleSaveCompany} className="space-y-5 max-w-xl">
            <SelectField label="نوع حساب العميل" value={accountType} onChange={(value) => { if (value === "personal" || value === "company") setAccountType(value); }} options={[{ value: "personal", label: "حساب فردي / شخصي" }, { value: "company", label: "شركة أو مؤسسة" }]} />
            {accountType === "company" && <><TextField label="اسم الشركة أو العلامة التجارية" value={companyName} onChange={setCompanyName} required /><TextField label="السجل التجاري أو الرقم الضريبي" value={taxId} onChange={setTaxId} /><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><SelectField label="مجال النشاط" value={industry} onChange={setIndustry} options={COMPANY_INDUSTRIES || []} /><SelectField label="حجم فريق العمل" value={companySize} onChange={setCompanySize} options={[{ value: "1-10", label: "1 - 10 موظفين" }, { value: "11-50", label: "11 - 50 موظف" }, { value: "51-200", label: "51 - 200 موظف" }, { value: "200+", label: "أكثر من 200 موظف" }]} /></div><TextField label="موقع الشركة الإلكتروني" value={website} onChange={setWebsite} type="url" dir="ltr" /></>}
            <ActionButton busy={isSavingCompany} label="حفظ بيانات الحساب" busyLabel="جاري حفظ التعديلات..." />
          </form>
        </section>}
      </main>
      <SiteFooter />
    </div>
  );
}

function LoadingPanel() { return <div className="p-12 text-center bg-white rounded-[28px] border border-[#D1E3D6]"><Loader2 className="w-8 h-8 animate-spin text-[#056B38] mx-auto mb-3" /><p className="text-xs font-bold text-[#526B5E]">جاري تحميل البيانات...</p></div>; }

function PasswordInput({ label, value, onChange, visible, onToggle }: { label: string; value: string; onChange: (value: string) => void; visible: boolean; onToggle: () => void }) { return <div className="space-y-1.5"><label className="block text-xs font-bold text-[#05291A]">{label}</label><div className="relative flex items-center"><input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} required className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 pl-11 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all" /><button type="button" aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={onToggle} className="absolute left-3.5 p-1 text-[#526B5E] hover:text-[#056B38]">{visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>; }

function ActionButton({ busy, label, busyLabel }: { busy: boolean; label: string; busyLabel: string }) { return <button type="submit" disabled={busy} className="h-12 px-7 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all cursor-pointer shadow-xs flex items-center gap-2 disabled:opacity-50 active:scale-95">{busy ? <><Loader2 className="w-4 h-4 animate-spin" /><span>{busyLabel}</span></> : <><CheckCircle2 className="w-4 h-4" /><span>{label}</span></>}</button>; }

function ToggleRow({ title, checked, onChange }: { title: string; checked: boolean; onChange: (value: boolean) => void }) { return <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] flex items-center justify-between gap-4"><h3 className="text-xs font-black text-[#05291A]">{title}</h3><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="w-5 h-5 accent-[#056B38] rounded cursor-pointer" /></div>; }

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly (string | { value: string; label: string })[] }) { return <div className="space-y-1.5"><label className="block text-xs font-bold text-[#05291A]">{label}</label><CustomSelect value={value} onChange={onChange} size="lg" options={[...options]} /></div>; }

function TextField({ label, value, onChange, type = "text", required = false, dir }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; dir?: "ltr" | "rtl" }) { return <div className="space-y-1.5"><label className="block text-xs font-bold text-[#05291A]">{label}</label><input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} dir={dir} className="w-full h-12 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all" /></div>; }

export default function SettingsPage() { return <Suspense fallback={<div className="min-h-screen bg-[#F7FAF8] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#056B38]" /></div>}><SettingsContent /></Suspense>; }
