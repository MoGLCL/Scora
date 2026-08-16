"use client";

import { useState } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Clock,
  ShieldCheck,
  Award,
  Briefcase,
  Globe,
  KeyRound,
  Bell,
  Trash2,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  Edit3,
  Sparkles,
  Copy,
  Check,
  Code2,
  Sliders,
} from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import type { AccountStatus, AppRole } from "@/lib/types";
import { VerifiedBadge } from "@/components/verified-badge";
import { toggleDeveloperVerificationForAdmin } from "@/lib/actions/admin";

export interface ExtendedUserItem {
  id: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  role: AppRole;
  isAdmin: boolean;
  status: AccountStatus;
  skillPoints: number;
  trustScore: number;
  reportsCount: number;
  projectsCount?: number;
  proposalsCount?: number;
  joinDate: string;
  createdAt?: string;
  lastSeenAt?: string | null;
  isOnline?: boolean;
  isVerified?: boolean;
  jobTitle?: string;
  headline?: string;
  bio?: string;
  country?: string;
  city?: string;
  location?: string;
  experienceYears?: number | null;
  githubUrl?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  companyName?: string;
  clientWebsite?: string;
  approvalStatus?: string | null;
  rejectionReason?: string | null;
  assessmentPublicId?: string | null;
  assessmentSessionStatus?: string | null;
  reassessmentRequestId?: number | null;
  reassessmentStatus?: string | null;
  reassessmentNote?: string | null;
  suspendedUntil?: string | null;
  subscriptionPlan?: "free" | "pro" | "vip" | null;
  subscriptionStatus?: string | null;
  subscriptionEnd?: string | null;
  skills?: { name: string; nameAr: string | null; level: string; sp: number }[];
}

// ─────────────────────────────────────────────────────────────
// 1. Full User Details Inspector Modal
// ─────────────────────────────────────────────────────────────
export function UserDetailsModal({
  user,
  onClose,
  onOpenEdit,
  onOpenPassword,
  onOpenNotify,
  onOpenPoints,
  onOpenSuspension,
  onOpenDelete,
  onOpenResetTest,
  onOpenPlan,
}: {
  user: ExtendedUserItem;
  onClose: () => void;
  onOpenEdit: (u: ExtendedUserItem) => void;
  onOpenPassword: (u: ExtendedUserItem) => void;
  onOpenNotify: (u: ExtendedUserItem) => void;
  onOpenPoints: (u: ExtendedUserItem) => void;
  onOpenSuspension: (u: ExtendedUserItem) => void;
  onOpenDelete: (u: ExtendedUserItem) => void;
  onOpenResetTest: (u: ExtendedUserItem) => void;
  onOpenPlan?: (u: ExtendedUserItem) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-2xl rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-7 shadow-2xl space-y-6 my-8 max-h-[88vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
          <div className="flex items-center gap-3 flex-1 pl-4">
            <div className="relative shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-[#056B38] text-white flex items-center justify-center font-black text-lg shadow-xs">
                {user.name ? user.name.slice(0, 2).toUpperCase() : "U"}
              </div>
              {user.isOnline && (
                <span
                  title="متصل الآن"
                  className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-500/30"
                />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-[#05291A]">#{user.id} · {user.name}</h3>
                {user.isAdmin && (
                  <span className="rounded-full bg-[#056B38] text-white text-xs font-black px-2.5 py-0.5">
                    أدمن
                  </span>
                )}
                {user.isVerified && (
                  <VerifiedBadge
                    type={user.role === "developer" ? "developer" : user.role === "client" ? "client" : "general"}
                    showLabel
                  />
                )}
              </div>
              <p className="text-xs text-[#526B5E] mt-1 font-bold">
                {user.role === "developer" ? "مطور برمجيات" : "صاحب عمل / عميل"} · انضم بتاريخ {user.joinDate}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center transition-all cursor-pointer shrink-0"
            title="إغلاق النافذة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Status Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3">
            <span className="text-[#526B5E] font-bold block text-[11px]">حالة الحساب:</span>
            <span
              className={`font-black mt-1 inline-block ${
                user.status === "active"
                  ? "text-[#056B38]"
                  : user.status === "suspended"
                  ? "text-amber-700"
                  : "text-red-600"
              }`}
            >
              {user.status === "active"
                ? "نشط ومتاح"
                : user.status === "suspended"
                ? "موقوف مؤقتاً"
                : "محظور نهائياً"}
            </span>
          </div>

          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3">
            <span className="text-[#526B5E] font-bold block text-[11px]">درجة التراست:</span>
            <span className="font-black text-[#056B38] text-sm mt-1 inline-block">
              {user.trustScore}%
            </span>
          </div>

          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3">
            <span className="text-[#526B5E] font-bold block text-[11px]">نقاط المهارة (SP):</span>
            <span className="font-black text-[#05291A] text-sm mt-1 inline-block">
              {user.skillPoints} SP
            </span>
          </div>

          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3">
            <span className="text-[#526B5E] font-bold block text-[11px]">آخر ظهور:</span>
            <span className="font-black text-[#05291A] mt-1 inline-block">
              {user.isOnline ? "متواجد الآن" : user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleDateString("ar-EG") : "غير مسجل"}
            </span>
          </div>
        </div>

        {/* Contact & Bio Information */}
        <div className="rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-4 space-y-3 text-xs">
          <h4 className="font-black text-[#05291A] text-sm flex items-center gap-1.5">
            <User className="h-4 w-4 text-[#056B38]" /> معلومات الاتصال والملف
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[#05291A]">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#526B5E] shrink-0" />
              <span className="font-bold">{user.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#526B5E] shrink-0" />
              <span className="font-bold">{user.phone || "لم يسجل هاتف"}</span>
            </div>
            {user.jobTitle && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#526B5E] shrink-0" />
                <span className="font-bold">{user.jobTitle}</span>
              </div>
            )}
            {user.companyName && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#526B5E] shrink-0" />
                <span className="font-bold">شركة: {user.companyName}</span>
              </div>
            )}
            {(user.country || user.city || user.location) && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#526B5E] shrink-0" />
                <span className="font-bold">
                  {[user.country, user.city, user.location].filter(Boolean).join(" - ")}
                </span>
              </div>
            )}
            {user.experienceYears !== null && user.experienceYears !== undefined && (
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-[#526B5E] shrink-0" />
                <span className="font-bold">{user.experienceYears} سنوات خبرة</span>
              </div>
            )}
          </div>

          {/* Subscription Plan Status Bar */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6]">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#056B38] text-white flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#05291A]">باقة الحساب:</span>
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                    user.subscriptionPlan === "vip"
                      ? "bg-[#05291A] text-white"
                      : user.subscriptionPlan === "pro"
                      ? "bg-[#056B38] text-white"
                      : "bg-white text-[#056B38] border border-[#D1E3D6]"
                  }`}>
                    {user.subscriptionPlan === "vip" ? "VIP" : user.subscriptionPlan === "pro" ? "Pro" : "Free"}
                  </span>
                  <span className="text-[10px] text-[#526B5E] font-bold">
                    ({user.subscriptionStatus === "active" ? "نشط" : user.subscriptionStatus === "trial" ? "فترة تجريبية" : "منتهي"})
                  </span>
                </div>
                {user.subscriptionEnd && (
                  <div className="text-[10px] text-[#526B5E] font-mono mt-0.5">
                    تنتهي في: {user.subscriptionEnd}
                  </div>
                )}
              </div>
            </div>

            {onOpenPlan && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlan(user);
                }}
                className="h-8 px-3 rounded-xl bg-[#056B38] hover:bg-[#04552D] text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all shrink-0"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>تغيير الباقة</span>
              </button>
            )}
          </div>

          {user.bio && (
            <div className="border-t border-neutral-200 pt-2 text-[#526B5E] leading-relaxed">
              <span className="font-bold text-[#05291A] block mb-1">النبذة التعريفية:</span>
              <p className="bg-white p-3 rounded-xl border border-[#D1E3D6] font-bold">{user.bio}</p>
            </div>
          )}

          {/* Social Links */}
          {(user.githubUrl || user.linkedinUrl || user.portfolioUrl || user.clientWebsite) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-200">
              {user.githubUrl && (
                <a
                  href={user.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-white border border-[#D1E3D6] px-3 py-1.5 font-bold text-[#05291A] hover:text-[#056B38] flex items-center gap-1.5"
                >
                  <Code2 className="h-3.5 w-3.5" /> GitHub <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
              {user.linkedinUrl && (
                <a
                  href={user.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-white border border-[#D1E3D6] px-3 py-1.5 font-bold text-[#05291A] hover:text-[#056B38] flex items-center gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5 text-sky-700" /> LinkedIn <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
              {user.portfolioUrl && (
                <a
                  href={user.portfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-white border border-[#D1E3D6] px-3 py-1.5 font-bold text-[#05291A] hover:text-[#056B38] flex items-center gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5 text-emerald-600" /> معرض الأعمال <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
              {user.clientWebsite && (
                <a
                  href={user.clientWebsite}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-white border border-[#D1E3D6] px-3 py-1.5 font-bold text-[#05291A] hover:text-[#056B38] flex items-center gap-1.5"
                >
                  <Globe className="h-3.5 w-3.5 text-sky-600" /> موقع الشركة <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Developer Skills Section */}
        {user.role === "developer" && user.skills && user.skills.length > 0 && (
          <div className="space-y-2 text-xs">
            <h4 className="font-black text-[#05291A] text-sm flex items-center gap-1.5">
              <Award className="h-4 w-4 text-[#056B38]" /> مهارات المطور ونقاط SP المكتسبة ({user.skills.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {user.skills.map((s, idx) => (
                <span
                  key={idx}
                  className="rounded-xl bg-[#E8FAF0] border border-[#D1E3D6] px-3 py-1.5 font-bold text-[#05291A] flex items-center gap-2"
                >
                  <span>{s.nameAr || s.name}</span>
                  <span className="rounded-lg bg-white px-1.5 py-0.5 text-[10px] font-black text-[#056B38] border border-[#D1E3D6]">
                    {s.sp} SP
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="border-t border-neutral-100 pt-4 flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEdit(user);
            }}
            className="h-10 rounded-2xl bg-[#056B38] hover:bg-[#005B27] text-white px-4 text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Edit3 className="h-4 w-4" />
            <span>تعديل البيانات</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenPassword(user);
            }}
            className="h-10 rounded-2xl border border-neutral-200 bg-[#F7FAF8] hover:bg-[#E8FAF0] text-[#05291A] px-4 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <KeyRound className="h-4 w-4 text-[#056B38]" />
            <span>تعيين كلمة مرور</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenNotify(user);
            }}
            className="h-10 rounded-2xl border border-neutral-200 bg-[#F7FAF8] hover:bg-[#E8FAF0] text-[#05291A] px-4 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Bell className="h-4 w-4 text-[#056B38]" />
            <span>إرسال إشعار</span>
          </button>

          {user.role === "developer" && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPoints(user);
              }}
              className="h-10 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-4 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Award className="h-4 w-4 text-amber-700" />
              <span>تعديل Trust & SP</span>
            </button>
          )}

          {/* Toggle Verification Button for ANY user role */}
          <button
            type="button"
            onClick={async () => {
              const nextVal = !user.isVerified;
              const res = await toggleDeveloperVerificationForAdmin(Number(user.id), nextVal);
              if (res.ok) {
                onClose();
              }
            }}
            className={`h-10 rounded-2xl border px-4 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              user.isVerified
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                : "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{user.isVerified ? "إلغاء التوثيق" : "توثيق الحساب "}</span>
          </button>

          {user.role === "developer" && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenResetTest(user);
              }}
              className="h-10 rounded-2xl border border-[#056B38]/30 bg-[#E8FAF0] hover:bg-[#056B38] hover:text-white text-[#056B38] px-4 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              <span>إعادة الاختبار</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSuspension(user);
            }}
            className="h-10 rounded-2xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 px-4 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Clock className="h-4 w-4" />
            <span>إيقاف مؤقت...</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDelete(user);
            }}
            className="h-10 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 px-4 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>حذف نهائي</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Edit User Details Modal
// ─────────────────────────────────────────────────────────────
export function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: ExtendedUserItem;
  onClose: () => void;
  onSave: (changes: {
    username?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    role?: AppRole;
    isAdmin?: boolean;
    isVerified?: boolean;
    jobTitle?: string;
    bio?: string;
    companyName?: string;
    experienceYears?: number;
  }) => Promise<void>;
}) {
  const [username, setUsername] = useState(user.username || "");
  const [fullName, setFullName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone || "");
  const [role, setRole] = useState<AppRole>(user.role);
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);
  const [isVerified, setIsVerified] = useState(Boolean(user.isVerified));
  const [jobTitle, setJobTitle] = useState(user.jobTitle || "");
  const [bio, setBio] = useState(user.bio || "");
  const [companyName, setCompanyName] = useState(user.companyName || "");
  const [experienceYears, setExperienceYears] = useState(user.experienceYears ?? 0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        username: username.trim() || undefined,
        fullName,
        email,
        phone,
        role,
        isAdmin,
        isVerified,
        jobTitle: role === "developer" ? jobTitle : undefined,
        bio: role === "developer" ? bio : undefined,
        experienceYears: role === "developer" ? experienceYears : undefined,
        companyName: role === "client" ? companyName : undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-lg rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="text-lg font-black text-[#05291A] flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-[#056B38]" />
            تعديل بيانات المستخدم #{user.id}
          </h3>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center transition-all cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#05291A]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block">اسم المستخدم (@username):</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  placeholder="username"
                  className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm font-mono dir-ltr focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block">الاسم الكامل:</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block">البريد الإلكتروني:</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block">رقم الهاتف:</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block">نوع الحساب:</label>
              <CustomSelect
                value={role}
                onChange={(val) => setRole(val as AppRole)}
                size="md"
                options={[
                  { value: "developer", label: "مطور برمجيات (Developer)" },
                  { value: "client", label: "صاحب عمل (Client)" },
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block">صلاحية الأدمن:</label>
              <CustomSelect
                value={isAdmin ? "yes" : "no"}
                onChange={(val) => setIsAdmin(val === "yes")}
                size="md"
                options={[
                  { value: "no", label: "مستخدم عادي" },
                  { value: "yes", label: "أدمن المنصة" },
                ]}
              />
            </div>
          </div>

          {role === "developer" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block">المسمى الوظيفي:</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="مثال: Full-stack Next.js Developer"
                    className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block">سنوات الخبرة:</label>
                  <input
                    type="number"
                    min={0}
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 bg-[#F7FAF8] border border-[#D1E3D6] p-3 rounded-2xl">
                <input
                  type="checkbox"
                  id="isVerifiedCheck"
                  checked={isVerified}
                  onChange={(e) => setIsVerified(e.target.checked)}
                  className="h-4 w-4 accent-[#056B38] cursor-pointer"
                />
                <label htmlFor="isVerifiedCheck" className="text-xs font-black text-[#05291A] cursor-pointer">
                  منح شارة المطور الموثق (Verified Badge)
                </label>
              </div>

              <div className="space-y-1.5">
                <label className="block">النبذة التعريفية:</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label className="block">اسم الشركة / المؤسسة:</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: شركة تقنية الحلول المبتكرة"
                className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
              />
            </div>
          )}

          <div className="flex gap-3 pt-3 border-t border-neutral-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? "جاري الحفظ..." : "حفظ التعديلات"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. Set New Password Modal
// ─────────────────────────────────────────────────────────────
export function SetPasswordModal({
  user,
  onClose,
  onSave,
}: {
  user: ExtendedUserItem;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  };

  const copyToClipboard = () => {
    if (!password) return;
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return;
    setLoading(true);
    try {
      await onSave(password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="text-lg font-black text-[#05291A] flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-[#056B38]" />
            تعيين كلمة مرور جديدة
          </h3>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#05291A]">
          <p className="text-[#526B5E] text-xs leading-relaxed font-normal">
            تعيين كلمة مرور جديدة لحساب <strong className="text-[#05291A] font-black">{user.name}</strong> ({user.email}).
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block">كلمة المرور الجديدة:</label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs text-[#056B38] font-black hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" /> توليد كلمة مرور قوية
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل 6 أحرف على الأقل..."
                className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm font-mono dir-ltr focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
              />
              {password && (
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="absolute left-3 top-3 text-[#526B5E] hover:text-[#056B38]"
                  title="نسخ كلمة المرور"
                >
                  {copied ? <Check className="h-4 w-4 text-[#056B38]" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-[#E8FAF0] border border-[#D1E3D6] p-3 text-[#056B38] text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>سيتم تشفير كلمة المرور فوراً باستخدام Bcrypt 12 Rounds وحفظها في قاعدة البيانات.</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || password.length < 6}
              className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              <span>{loading ? "جاري التعيين..." : "تعيين كلمة المرور"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Send Direct Notification Modal
// ─────────────────────────────────────────────────────────────
export function SendNotificationModal({
  user,
  onClose,
  onSend,
}: {
  user: ExtendedUserItem;
  onClose: () => void;
  onSend: (message: string, linkUrl?: string) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      await onSend(message, linkUrl || undefined);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="text-lg font-black text-[#05291A] flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#056B38]" />
            إرسال إشعار مباشر للحساب
          </h3>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#05291A]">
          <p className="text-[#526B5E] text-xs leading-relaxed font-normal">
            إرسال تنبيه أو إشعار فوري إلى <strong className="text-[#05291A] font-black">{user.name}</strong> يظهر في جرس الإشعارات الخاص به.
          </p>

          <div className="space-y-1.5">
            <label className="block">نص الإشعار:</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب نص الإشعار هنا..."
              className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[#526B5E]">رابط التوجيه (اختياري):</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="مثال: /projects أو /profile"
              className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Bell className="h-4 w-4" />
              <span>{loading ? "جاري الإرسال..." : "إرسال الإشعار فوراً"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 8. Change User Subscription Plan Modal
// ─────────────────────────────────────────────────────────────
export function ChangeUserPlanModal({
  user,
  onClose,
  onSave,
}: {
  user: ExtendedUserItem;
  onClose: () => void;
  onSave: (
    userId: string,
    plan: "free" | "pro" | "vip",
    status: "active" | "trial" | "expired" | "cancelled",
    durationDays?: number | null
  ) => Promise<void>;
}) {
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "vip">(
    user.subscriptionPlan || "free"
  );
  const [selectedStatus, setSelectedStatus] = useState<"active" | "trial" | "expired" | "cancelled">(
    (user.subscriptionStatus as "active" | "trial" | "expired" | "cancelled") || "active"
  );
  const [durationOption, setDurationOption] = useState<number | "lifetime">(30);
  const [customDays, setCustomDays] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const days = customDays ? Number(customDays) : durationOption === "lifetime" ? null : durationOption;
      await onSave(user.id, selectedPlan, selectedStatus, days);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="w-full max-w-lg rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-7 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="text-lg font-black text-[#05291A] flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#056B38]" />
            تعيين باقة الاشتراك للمستخدم
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#05291A]">
          <p className="text-[#526B5E] text-xs leading-relaxed font-normal">
            يمكنك كمسؤول تعيين باقة اشتراك فورية لحساب <strong className="text-[#05291A] font-black">{user.name}</strong> ({user.email}) وتحديد مدتها وحالتها.
          </p>

          {/* Plan Selector */}
          <div className="space-y-1.5">
            <label className="block">اختر الباقة:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "free" as const, name: "المجانية (Free)" },
                { id: "pro" as const, name: "الاحترافية (Pro)" },
                { id: "vip" as const, name: "الفائقة (VIP)" },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPlan(p.id)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    selectedPlan === p.id
                      ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] ring-2 ring-[#056B38]/20 font-black shadow-xs"
                      : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-[#F7FAF8]"
                  }`}
                >
                  <span className="text-xs">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status Selector */}
          <div className="space-y-1.5">
            <label className="block">حالة الاشتراك:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as "active" | "trial" | "expired" | "cancelled")}
              className="w-full h-10 px-3 text-xs font-bold rounded-xl border border-[#D1E3D6] focus:border-[#056B38] outline-hidden bg-white text-[#05291A]"
            >
              <option value="active">نشط ومفعل (Active)</option>
              <option value="trial">فترة تجريبية (Trial)</option>
              <option value="expired">منتهي الصلاحية (Expired)</option>
              <option value="cancelled">ملغي (Cancelled)</option>
            </select>
          </div>

          {/* Duration Selector */}
          <div className="space-y-1.5">
            <label className="block">المدة الزمنية للاشتراك:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 30, label: "شهر (30 يوم)" },
                { value: 90, label: "3 أشهر" },
                { value: 365, label: "سنة (365 يوم)" },
                { value: "lifetime" as const, label: "دائم (مفتوح)" },
              ].map((d) => (
                <button
                  key={String(d.value)}
                  type="button"
                  onClick={() => {
                    setDurationOption(d.value);
                    setCustomDays("");
                  }}
                  className={`p-2 rounded-xl border text-[11px] font-bold text-center transition-all cursor-pointer ${
                    !customDays && durationOption === d.value
                      ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] font-black"
                      : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-[#F7FAF8]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Days Input */}
          <div className="space-y-1">
            <label className="text-[11px] text-[#526B5E]">أو حدد عدد أيام مخصص:</label>
            <input
              type="number"
              min={1}
              max={3650}
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              placeholder="مثال: 60 يوماً"
              className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{loading ? "جاري الحفظ..." : "حفظ وتفعيل الباقة"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

