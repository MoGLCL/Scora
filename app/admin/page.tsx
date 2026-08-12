"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Bot,
  Briefcase,
  CheckCircle2,
  ChevronDown,
  Clock,
  Code2,
  FileCode,
  Lock,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
  Award
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  decideReassessmentRequestForAdmin,
  deleteUserForAdmin,
  resetDeveloperAssessmentForAdmin,
  updateUserForAdmin,
  updateDeveloperTrustAndSkillPoints
} from "@/lib/actions/admin";
import { setAiAssistantEnabled, setQuickRegistrationEnabled } from "@/lib/actions/settings";
import { OpenRouterSettings } from "@/components/openrouter-settings";
import { useProfile } from "@/components/profile-provider";
import type { AccountStatus, AppRole } from "@/lib/types";

interface UserItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AppRole;
  isAdmin: boolean;
  skillPoints: number;
  trustScore: number;
  status: AccountStatus;
  reportsCount: number;
  joinDate: string;
  approvalStatus?: string;
  reassessmentStatus?: string;
  reassessmentRequestId?: number;
  reassessmentNote?: string;
  assessmentSessionStatus?: string;
  assessmentPublicId?: string | null;
  suspendedUntil?: string | null;
}

interface ProjectItem {
  id: number;
  title: string;
  status: string;
  budgetFrom: number;
  budgetTo: number;
  proposalsCount: number;
  ownerName: string;
  companyName: string | null;
  ownerUsername: string | null;
  accountType: string;
  category: string | null;
  deadlineDays: number | null;
}

interface AdminStats {
  totals?: { users: number; active: number; visits: number; visitors: number };
  daily?: Array<{ day: string; visits: number }>;
}

function Toast({ message, type }: { message: string; type: "success" | "warn" }) {
  return (
    <div
      className={`fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-2xl px-5 py-3 font-extrabold text-sm text-white shadow-xl animate-in slide-in-from-bottom duration-300 ${
        type === "success" ? "bg-[#056B38]" : "bg-amber-600"
      }`}
    >
      <CheckCircle2 className="h-5 w-5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-[22px] border border-[#D1E3D6] bg-white p-4 shadow-xs">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-[#05291A]">{value}</div>
        <div className="text-xs text-[#526B5E] font-bold">{label}</div>
      </div>
    </div>
  );
}

function ScoraSelectControl<T extends string>({
  value,
  options,
  onChange,
  disabled
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (val: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative inline-block">
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-10 appearance-none rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] pr-4 pl-9 text-xs font-extrabold text-[#05291A] hover:bg-[#E8FAF0] hover:border-[#056B38] focus:outline-none focus:ring-2 focus:ring-[#056B38]/20 transition-all disabled:opacity-50 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#526B5E]" />
    </div>
  );
}

export default function AdminPage() {
  const { systemSettings, updateSystemSettings } = useProfile();
  const [tab, setTab] = useState<"users" | "projects" | "stats" | "settings">("users");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [stats, setStats] = useState<AdminStats>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "developer" | "client" | "admin" | "restricted">("all");
  const [quickRegistration, setQuickRegistration] = useState(true);

  const [toast, setToast] = useState<{ message: string; type: "success" | "warn" } | null>(null);
  const [serverMessage, setServerMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Modals state
  const [suspensionModalUser, setSuspensionModalUser] = useState<UserItem | null>(null);
  const [selectedSuspensionDays, setSelectedSuspensionDays] = useState<number>(7);
  const [deleteModalUser, setDeleteModalUser] = useState<UserItem | null>(null);
  const [resetTestUser, setResetTestUser] = useState<UserItem | null>(null);

  // Points Edit Modal State
  const [pointsModalUser, setPointsModalUser] = useState<UserItem | null>(null);
  const [editTrustScore, setEditTrustScore] = useState<number>(85);
  const [editSkillPoints, setEditSkillPoints] = useState<number>(500);

  const addToast = (message: string, type: "success" | "warn" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.users)) setUsers(data.users);
    } catch {
      // Ignore
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/projects", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.projects)) setProjects(data.projects);
    } catch {
      // Ignore
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    void loadUsers();
    void loadProjects();
    void loadStats();
  }, [loadUsers, loadProjects, loadStats]);

  const visible = useMemo(
    () =>
      users.filter((u) => {
        const match =
          !search || `${u.id} ${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(search.toLowerCase());
        return (
          match &&
          (filter === "all" || filter === "restricted"
            ? filter === "all" || u.status !== "active"
            : filter === "admin"
            ? u.isAdmin
            : u.role === filter)
        );
      }),
    [users, search, filter]
  );

  const updateStatusOrRole = async (
    id: string,
    changes: { role?: AppRole; isAdmin?: boolean; status?: AccountStatus; suspensionDays?: number }
  ) => {
    setSavingUserId(id);
    setServerMessage(null);
    const result = await updateUserForAdmin({ userId: id, ...changes });
    if (!result.ok) {
      setSavingUserId(null);
      setServerMessage({ text: result.error, kind: "error" });
      return addToast(result.error, "warn");
    }
    await loadUsers();
    setSavingUserId(null);
    setServerMessage({ text: "تم حفظ التعديل في قاعدة البيانات بنجاح", kind: "success" });
    addToast("تم حفظ التعديل في قاعدة البيانات", "success");
  };

  const handleConfirmSuspension = async () => {
    if (!suspensionModalUser) return;
    await updateStatusOrRole(suspensionModalUser.id, {
      status: "suspended",
      suspensionDays: selectedSuspensionDays
    });
    setSuspensionModalUser(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    setSavingUserId(deleteModalUser.id);
    setServerMessage(null);
    const result = await deleteUserForAdmin(Number(deleteModalUser.id));
    if (!result.ok) {
      setSavingUserId(null);
      setServerMessage({ text: result.error, kind: "error" });
      addToast(result.error, "warn");
    } else {
      await loadUsers();
      setSavingUserId(null);
      setServerMessage({ text: "تم حذف الحساب نهائياً من قاعدة البيانات", kind: "success" });
      addToast("تم حذف الحساب نهائياً", "success");
    }
    setDeleteModalUser(null);
  };

  const handleConfirmResetAssessment = async () => {
    if (!resetTestUser) return;
    setSavingUserId(resetTestUser.id);
    setServerMessage(null);
    const result = await resetDeveloperAssessmentForAdmin(Number(resetTestUser.id));
    if (!result.ok) {
      setSavingUserId(null);
      setServerMessage({ text: result.error, kind: "error" });
      addToast(result.error, "warn");
    } else {
      await loadUsers();
      setSavingUserId(null);
      setServerMessage({ text: "تمت إتاحة إعادة اختبار المطور بنجاح", kind: "success" });
      addToast("تمت موافقة وإتاحة التقييم للمطور", "success");
    }
    setResetTestUser(null);
  };

  const handleDecideReassessment = async (
    userId: string,
    requestId: number,
    decision: "approve" | "reject"
  ) => {
    setSavingUserId(userId);
    setServerMessage(null);
    const result = await decideReassessmentRequestForAdmin({
      requestId,
      decision,
      reason: decision === "approve" ? "وافقت الإدارة على طلب إعادة التقييم" : "تم رفض طلب إعادة التقييم"
    });
    if (!result.ok) {
      setSavingUserId(null);
      setServerMessage({ text: result.error, kind: "error" });
      addToast(result.error, "warn");
    } else {
      await loadUsers();
      setSavingUserId(null);
      setServerMessage({
        text: decision === "approve" ? "تمت إتاحة إعادة الاختبار للمطور" : "تم رفض طلب إعادة الاختبار",
        kind: "success"
      });
      addToast(decision === "approve" ? "تمت إتاحة الاعتماد للمطور" : "تم رفض الطلب", "success");
    }
  };

  const handleSavePoints = async () => {
    if (!pointsModalUser) return;
    setSavingUserId(pointsModalUser.id);
    setServerMessage(null);
    const result = await updateDeveloperTrustAndSkillPoints({
      userId: Number(pointsModalUser.id),
      trustScore: Number(editTrustScore),
      skillPoints: Number(editSkillPoints)
    });
    if (!result.ok) {
      setSavingUserId(null);
      setServerMessage({ text: result.error, kind: "error" });
      addToast(result.error, "warn");
    } else {
      await loadUsers();
      setSavingUserId(null);
      setServerMessage({ text: "تم تحديث درجات التراست والـ SP للحساب بنجاح", kind: "success" });
      addToast("تم تحديث درجات التراست والـ SP بنجاح", "success");
    }
    setPointsModalUser(null);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#F7FAF8] font-sans antialiased text-[#05291A]">
      <SiteHeader />
      {toast && <Toast message={toast.message} type={toast.type} />}

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6 md:px-6">
        {/* Page Title Header */}
        <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#E8FAF0] text-[#056B38] px-3.5 py-1 text-xs font-extrabold border border-[#D1E3D6]">
                سيادي · لوحة التحكم
              </span>
              <span className="text-xs text-[#526B5E] font-bold">ربط حي مع MySQL</span>
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-[#05291A]">
              لوحة الإدارة والإشراف المالي والفني
            </h1>
            <p className="mt-1 text-xs md:text-sm text-[#526B5E]">
              إدارة الحسابات، صلاحيات الاعتماد، درجات التراست والـ SP، وتعديل إعدادات الذكاء الاصطناعي والمشاريع.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["users", "projects", "stats", "settings"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-5 py-2.5 text-xs font-extrabold transition-all shadow-xs ${
                  tab === t ? "bg-[#056B38] text-white shadow-md" : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0]"
                }`}
              >
                {t === "users"
                  ? "الحسابات والمطورون"
                  : t === "projects"
                  ? "المشاريع"
                  : t === "stats"
                  ? "الإحصائيات"
                  : "إعدادات النظام وAI"}
              </button>
            ))}
          </div>
        </section>

        {/* Server Notification Banner */}
        {serverMessage && (
          <div
            className={`rounded-2xl border p-4 text-xs font-extrabold flex items-center justify-between shadow-xs ${
              serverMessage.kind === "success"
                ? "bg-[#E8FAF0] border-[#D1E3D6] text-[#056B38]"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {serverMessage.kind === "success" ? (
                <CheckCircle2 className="h-5 w-5 text-[#056B38]" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <span>{serverMessage.text}</span>
            </div>
            <button type="button" onClick={() => setServerMessage(null)} className="text-current opacity-70 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Top Summary Stats Bar */}
        <section className="flex flex-col md:flex-row gap-4 items-stretch justify-between">
          <div className="flex-1 rounded-[24px] border border-[#D1E3D6] bg-white p-5 shadow-xs flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#526B5E]">المطورون المعتمدون</div>
              <div className="text-2xl font-extrabold text-[#056B38] mt-1">
                {users.filter((u) => u.role === "developer" && u.status === "active").length} مطور
              </div>
            </div>
            <p className="text-xs text-[#526B5E] max-w-xs">
              جميع الحسابات الظاهرة يتم جلبها مباشرة من جدول users و developers.
            </p>
          </div>
          <div className="flex gap-3">
            <Stat icon={Users} label="إجمالي الحسابات" value={users.length} />
            <Stat icon={Ban} label="المقيدون" value={users.filter((u) => u.status !== "active").length} />
          </div>
        </section>

        {/* Settings Tab */}
        {tab === "settings" && (
          <>
            <OpenRouterSettings notify={addToast} />
            <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex items-center justify-between shadow-xs">
              <div>
                <h2 className="font-extrabold text-[#05291A] flex items-center gap-2 text-lg">
                  <Bot className="h-5 w-5 text-[#056B38]" /> مساعد الذكاء الاصطناعي العامة (AI Assistant)
                </h2>
                <p className="mt-1 text-xs text-[#526B5E]">تعطيل المساعد يمنع ظهوره للمستخدمين عبر المنصة.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const enabled = !systemSettings.isAiAssistantEnabled;
                  const r = await setAiAssistantEnabled(enabled);
                  if (r.ok) {
                    updateSystemSettings({ isAiAssistantEnabled: enabled });
                    addToast("تم حفظ حالة المساعد الذكي", "success");
                  } else addToast(r.error, "warn");
                }}
                className={`h-10 rounded-full px-6 text-sm font-bold text-white transition-all ${
                  systemSettings.isAiAssistantEnabled ? "bg-[#056B38] hover:bg-[#005B27]" : "bg-gray-500"
                }`}
              >
                {systemSettings.isAiAssistantEnabled ? "مفعّل" : "متوقف"}
              </button>
            </section>
            <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex items-center justify-between shadow-xs">
              <div>
                <h2 className="font-extrabold text-[#05291A] text-lg">التسجيل السريع للحسابات</h2>
                <p className="mt-1 text-xs text-[#526B5E]">السماح بإنشاء حسابات مطورين وعملاء جديدة من صفحة التسجيل.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const next = !quickRegistration;
                  const r = await setQuickRegistrationEnabled(next);
                  if (r.ok) {
                    setQuickRegistration(next);
                    addToast("تم حفظ إعداد التسجيل السريع", "success");
                  } else addToast(r.error, "warn");
                }}
                className={`h-10 rounded-full px-6 text-sm font-bold text-white transition-all ${
                  quickRegistration ? "bg-[#056B38] hover:bg-[#005B27]" : "bg-gray-500"
                }`}
              >
                {quickRegistration ? "مفتوح" : "متوقف"}
              </button>
            </section>
          </>
        )}

        {/* Stats Tab */}
        {tab === "stats" && (
          <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 shadow-xs">
            <div className="grid gap-3 md:grid-cols-4">
              <Stat icon={Users} label="كل الحسابات" value={stats.totals?.users ?? 0} />
              <Stat icon={ShieldCheck} label="نشط آخر 15 دقيقة" value={stats.totals?.active ?? 0} />
              <Stat icon={Users} label="إجمالي الزيارات" value={stats.totals?.visits ?? 0} />
              <Stat icon={Users} label="الزوار الفريدون" value={stats.totals?.visitors ?? 0} />
            </div>
            <div className="mt-8 flex h-52 items-end gap-3 border-b border-l border-neutral-200 p-4">
              {stats.daily?.map((d) => {
                const max = Math.max(1, ...(stats.daily?.map((x) => x.visits) || [1]));
                return (
                  <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <span className="text-xs font-bold text-[#05291A]">{d.visits}</span>
                    <div
                      className="w-full rounded-t bg-[#056B38] transition-all"
                      style={{ height: `${Math.max(6, (d.visits / max) * 150)}px` }}
                    />
                    <span className="text-[10px] text-[#526B5E]">
                      {new Date(d.day).toLocaleDateString("ar-EG", { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Projects Tab */}
        {tab === "projects" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between rounded-[22px] border border-[#D1E3D6] bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#05291A]">
                  <Briefcase className="h-5 w-5 text-[#056B38]" /> المشاريع المنشورة
                </h2>
                <p className="mt-1 text-sm text-[#526B5E]">كل مشروع مرتبط بصاحب الحساب الحقيقي من قاعدة البيانات.</p>
              </div>
              <span className="rounded-full bg-[#E8FAF0] px-4 py-2 font-extrabold text-[#056B38]">
                {projects.length} مشروع
              </span>
            </div>
            <div className="grid gap-4">
              {projects.length ? (
                projects.map((project) => (
                  <article key={project.id} className="rounded-[22px] border border-[#D1E3D6] bg-white p-6 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-lg font-extrabold text-[#05291A] hover:text-[#056B38]"
                        >
                          #{project.id} · {project.title}
                        </Link>
                        <p className="mt-1 text-sm text-[#526B5E]">
                          {project.accountType === "company"
                            ? `شركة: ${project.companyName || project.ownerName}`
                            : `عميل: ${project.ownerName}`}{" "}
                          {project.ownerUsername ? `· @${project.ownerUsername}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#E8FAF0] px-3.5 py-1 text-xs font-bold text-[#056B38]">
                        {project.status}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#526B5E]">
                      <span>
                        الميزانية:{" "}
                        {project.budgetFrom === project.budgetTo
                          ? `${project.budgetFrom.toLocaleString("ar-EG")} ج.م`
                          : `${project.budgetFrom.toLocaleString("ar-EG")} - ${project.budgetTo.toLocaleString(
                              "ar-EG"
                            )} ج.م`}
                      </span>
                      <span>العروض: {project.proposalsCount}</span>
                      <span>المدة: {project.deadlineDays ? `${project.deadlineDays} يوم` : "غير محددة"}</span>
                      {project.category && <span>التصنيف: {project.category}</span>}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[22px] border border-[#D1E3D6] bg-white p-10 text-center text-[#526B5E]">
                  لا توجد مشاريع منشورة حتى الآن.
                </div>
              )}
            </div>
          </section>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <section className="space-y-4">
            {/* Re-assessment Request Alert Banner */}
            {users.some((u) => u.reassessmentStatus === "pending") && (
              <div className="rounded-[22px] border border-sky-300 bg-sky-50 p-5 shadow-xs space-y-3">
                <h2 className="font-extrabold text-sky-950 flex items-center gap-2 text-base">
                  <RotateCcw className="h-5 w-5 text-sky-700" />
                  طلبات إعادة إجراء الاختبار من المطورين
                </h2>
                <div className="grid gap-2 text-sm">
                  {users
                    .filter((u) => u.reassessmentStatus === "pending" && u.reassessmentRequestId)
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 border border-sky-100 shadow-2xs"
                      >
                        <div>
                          <div className="font-extrabold text-[#05291A]">
                            #{u.id} · {u.name} ({u.email})
                          </div>
                          {u.reassessmentNote && (
                            <div className="text-xs text-[#526B5E] mt-1 font-bold">
                              سبب الطلب: &quot;{u.reassessmentNote}&quot;
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={savingUserId === u.id}
                            onClick={() => handleDecideReassessment(u.id, u.reassessmentRequestId!, "approve")}
                            className="h-9 px-4 rounded-xl bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>موافقة على إعادة الاختبار</span>
                          </button>
                          <button
                            type="button"
                            disabled={savingUserId === u.id}
                            onClick={() => handleDecideReassessment(u.id, u.reassessmentRequestId!, "reject")}
                            className="h-9 px-4 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-extrabold transition-all cursor-pointer"
                          >
                            <span>رفض الطلب</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Developer Approval Action Banners */}
            {users.some(
              (u) =>
                u.role === "developer" &&
                ["generating", "generation_failed"].includes(u.assessmentSessionStatus ?? "")
            ) && (
              <div className="rounded-[22px] border border-sky-300 bg-sky-50 p-5 shadow-xs">
                <h2 className="font-extrabold text-sky-950">محاولات اعتماد المطورين</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  {users
                    .filter(
                      (u) =>
                        u.role === "developer" &&
                        ["generating", "generation_failed"].includes(u.assessmentSessionStatus ?? "")
                    )
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 border border-sky-100"
                      >
                        <span className="font-bold text-[#05291A]">
                          {u.name} · {u.email}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            u.assessmentSessionStatus === "generation_failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {u.assessmentSessionStatus === "generation_failed"
                            ? "فشل إنشاء الاختبار"
                            : "يجري إنشاء الاختبار"}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {users.some((u) => u.approvalStatus === "admin_review") && (
              <div className="rounded-[22px] border border-amber-300 bg-amber-50 p-5 shadow-xs">
                <h2 className="font-extrabold text-amber-900">طلبات اعتماد مطورين جديدة تنتظر المراجعة</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {users
                    .filter((u) => u.approvalStatus === "admin_review" && u.assessmentPublicId)
                    .map((u) => (
                      <Link
                        key={u.id}
                        href={`/admin/developers/${u.assessmentPublicId}/review`}
                        className="rounded-full bg-amber-900 hover:bg-amber-950 px-5 py-2 text-sm font-bold text-white transition-all shadow-xs flex items-center gap-2"
                      >
                        <span>مراجعة طلب {u.name}</span>
                        <ShieldCheck className="h-4 w-4" />
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Filter and Search Toolbar */}
            <div className="rounded-[22px] border border-[#D1E3D6] bg-white p-4 flex flex-col gap-3 md:flex-row md:justify-between shadow-xs">
              <div className="relative md:w-96">
                <Search className="absolute right-3.5 top-3 h-4 w-4 text-[#526B5E]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم، البريد الإلكتروني، الهاتـف، أو ID"
                  className="h-10 w-full rounded-full border border-[#D1E3D6] pr-10 pl-4 text-sm text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-white"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "developer", "client", "admin", "restricted"] as const).map((x) => (
                  <button
                    key={x}
                    onClick={() => setFilter(x)}
                    className={`rounded-full px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                      filter === x ? "bg-[#056B38] text-white shadow-xs" : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0]"
                    }`}
                  >
                    {x === "all"
                      ? "الكل"
                      : x === "developer"
                      ? "المطورون"
                      : x === "client"
                      ? "العملاء"
                      : x === "admin"
                      ? "الإدارة"
                      : "المقيدون والموقوفون"}
                  </button>
                ))}
              </div>
            </div>

            {/* Users List Cards */}
            <div className="grid gap-3">
              {visible.length ? (
                visible.map((u) => (
                  <article
                    key={u.id}
                    className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 flex flex-col gap-4 shadow-xs hover:border-[#056B38]/40 transition-all"
                  >
                    {/* Top Row: Info & Main Details */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-[#05291A] text-base">
                            #{u.id} · {u.name}
                          </span>
                          {u.isAdmin && (
                            <span className="rounded-full bg-[#056B38] text-white text-[11px] font-extrabold px-2.5 py-0.5">
                              أدمن النظام
                            </span>
                          )}
                          {u.status === "suspended" && (
                            <span className="rounded-full bg-amber-100 text-amber-900 text-[11px] font-extrabold px-2.5 py-0.5 flex items-center gap-1 border border-amber-300">
                              <Clock className="h-3 w-3" /> موقوف مؤقتاً
                            </span>
                          )}
                          {u.status === "banned" && (
                            <span className="rounded-full bg-red-100 text-red-700 text-[11px] font-extrabold px-2.5 py-0.5 flex items-center gap-1 border border-red-200">
                              <Ban className="h-3 w-3" /> محظور نهائياً
                            </span>
                          )}
                          {u.reassessmentStatus === "pending" && (
                            <span className="rounded-full bg-sky-100 text-sky-900 text-[11px] font-extrabold px-2.5 py-0.5 border border-sky-300">
                              طلب إعادة الاختبار
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#526B5E] flex flex-wrap gap-x-3 gap-y-1">
                          <span>{u.email}</span>
                          {u.phone && <span>· {u.phone}</span>}
                          <span>· تاريخ الانضمام: {u.joinDate}</span>
                        </div>

                        {u.status === "suspended" && u.suspendedUntil && (
                          <div className="text-xs font-extrabold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-flex items-center gap-1 mt-1">
                            <Clock className="h-3.5 w-3.5 text-amber-700" />
                            <span>ينتهي الإيقاف تلقائياً بتاريخ: {u.suspendedUntil}</span>
                          </div>
                        )}
                      </div>

                      {/* Interactive Editable Trust & Skill Points Badge */}
                      <button
                        type="button"
                        onClick={() => {
                          setPointsModalUser(u);
                          setEditTrustScore(u.trustScore || 85);
                          setEditSkillPoints(u.skillPoints || 500);
                        }}
                        title="اضغط لتعديل درجات التراست والـ SP للمستخدم مباشرة"
                        className="text-xs font-bold text-[#526B5E] bg-[#F7FAF8] hover:bg-[#E8FAF0] border border-[#D1E3D6] hover:border-[#056B38] px-4 py-2 rounded-2xl flex items-center gap-3 transition-all cursor-pointer shadow-2xs"
                      >
                        <div>Trust: <span className="text-[#056B38] font-extrabold">{u.trustScore}</span></div>
                        <div className="h-3 w-px bg-neutral-300" />
                        <div>SP: <span className="text-[#05291A] font-extrabold">{u.skillPoints}</span></div>
                        <Award className="h-4 w-4 text-[#056B38] shrink-0" />
                      </button>
                    </div>

                    {/* Bottom Control Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Left: Role and Admin Selects */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-bold text-[#526B5E]">نوع الحساب:</span>
                        <ScoraSelectControl
                          disabled={savingUserId === u.id}
                          value={u.role}
                          options={[
                            { value: "developer", label: "مطور برمجيات" },
                            { value: "client", label: "عميل / صاحب عمل" }
                          ]}
                          onChange={(newRole) => updateStatusOrRole(u.id, { role: newRole as AppRole })}
                        />

                        {/* Admin Toggle */}
                        <button
                          type="button"
                          disabled={savingUserId === u.id}
                          onClick={() => updateStatusOrRole(u.id, { isAdmin: !u.isAdmin })}
                          className={`h-10 rounded-2xl px-4 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                            u.isAdmin
                              ? "bg-[#056B38] text-white hover:bg-[#005B27] shadow-xs"
                              : "border border-[#D1E3D6] bg-[#F7FAF8] text-[#05291A] hover:bg-[#E8FAF0] hover:border-[#056B38]"
                          }`}
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>{u.isAdmin ? "صلاحية أدمن" : "منح أدمن"}</span>
                        </button>
                      </div>

                      {/* Right: Status and Admin Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-bold text-[#526B5E]">حالة الحساب:</span>
                        <ScoraSelectControl
                          disabled={savingUserId === u.id}
                          value={u.status}
                          options={[
                            { value: "active", label: "نشط" },
                            { value: "suspended", label: "إيقاف مؤقت..." },
                            { value: "banned", label: "حظر نهائي" }
                          ]}
                          onChange={(newStatus) => {
                            if (newStatus === "suspended") {
                              setSuspensionModalUser(u);
                            } else {
                              updateStatusOrRole(u.id, { status: newStatus as AccountStatus });
                            }
                          }}
                        />

                        {/* Edit Trust & SP Points Action Button */}
                        {u.role === "developer" && (
                          <button
                            type="button"
                            disabled={savingUserId === u.id}
                            onClick={() => {
                              setPointsModalUser(u);
                              setEditTrustScore(u.trustScore || 85);
                              setEditSkillPoints(u.skillPoints || 500);
                            }}
                            title="تعديل درجات التراست والـ SP"
                            className="h-10 rounded-2xl border border-amber-300 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-900 px-4 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Award className="h-4 w-4" />
                            <span>تعديل Trust & SP</span>
                          </button>
                        )}

                        {/* Reset Developer Assessment Button */}
                        {u.role === "developer" && (
                          <button
                            type="button"
                            disabled={savingUserId === u.id}
                            onClick={() => setResetTestUser(u)}
                            title="إعادة تفعيل اختبار تقييم المطور"
                            className="h-10 rounded-2xl border border-[#056B38]/40 bg-[#E8FAF0] hover:bg-[#056B38] hover:text-white text-[#056B38] px-4 text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            <span>إعادة اختبار المطور</span>
                          </button>
                        )}

                        {/* Delete Account Button */}
                        <button
                          type="button"
                          disabled={savingUserId === u.id}
                          onClick={() => setDeleteModalUser(u)}
                          title="حذف الحساب نهائياً"
                          className="h-10 px-3.5 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[22px] border border-[#D1E3D6] bg-white p-10 text-center text-[#526B5E]">
                  لا توجد نتائج حقيقية مطابقة للبحث الحسابات.
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. Suspension Duration Selector Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {suspensionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-extrabold text-[#05291A] flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                تحديد فترة الإيقاف المؤقت
              </h3>
              <button
                type="button"
                onClick={() => setSuspensionModalUser(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[#526B5E]">
                يرجى اختيار المدة الزمنية لإيقاف حساب المطور/العميل{" "}
                <strong className="text-[#05291A] font-extrabold">{suspensionModalUser.name}</strong> ({suspensionModalUser.email}):
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { days: 1, label: "يوم واحد (24 ساعة)" },
                  { days: 3, label: "3 أيّام" },
                  { days: 7, label: "أسبوع واحد (7 أيّام)" },
                  { days: 14, label: "أسبوعين (14 يوم)" },
                  { days: 30, label: "شهر (30 يوم)" },
                  { days: 90, label: "3 أشهر (90 يوم)" }
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setSelectedSuspensionDays(item.days)}
                    className={`p-3 rounded-2xl border text-xs font-bold text-right transition-all flex items-center justify-between cursor-pointer ${
                      selectedSuspensionDays === item.days
                        ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] font-extrabold shadow-xs"
                        : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-[#F7FAF8]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {selectedSuspensionDays === item.days && <ShieldAlert className="h-4 w-4 text-[#056B38]" />}
                  </button>
                ))}
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>سينتهي الإيقاف أوتوماتيكياً وينشط الحساب بعد انقضاء الفترة المحددة.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmSuspension}
                className="flex-1 h-11 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>تأكيد الإيقاف</span>
              </button>
              <button
                type="button"
                onClick={() => setSuspensionModalUser(null)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. Direct Points (Trust & SP) Editor Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {pointsModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-extrabold text-[#05291A] flex items-center gap-2">
                <Award className="h-5 w-5 text-[#056B38]" />
                تعديل درجات التراست والـ SP للمستخدم
              </h3>
              <button
                type="button"
                onClick={() => setPointsModalUser(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[#526B5E]">
                المستخدم: <strong className="text-[#05291A] font-extrabold">{pointsModalUser.name}</strong> ({pointsModalUser.email})
              </p>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[#05291A]">درجة التراست (Trust Score 0 - 100):</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={editTrustScore}
                  onChange={(e) => setEditTrustScore(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm font-bold text-[#05291A] focus:outline-none focus:border-[#056B38]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-extrabold text-[#05291A]">نقاط المهارة (Skill Points - SP):</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  value={editSkillPoints}
                  onChange={(e) => setEditSkillPoints(Number(e.target.value))}
                  className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm font-bold text-[#05291A] focus:outline-none focus:border-[#056B38]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSavePoints}
                className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>حفظ وتفعيل النقاط بالحساب</span>
              </button>
              <button
                type="button"
                onClick={() => setPointsModalUser(null)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. Delete Confirmation Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-extrabold text-red-700 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                تأكيد حذف الحساب نهائياً
              </h3>
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#526B5E] leading-relaxed">
                هل أنت تأكد من رغبتك في حذف حساب{" "}
                <strong className="text-[#05291A] font-extrabold">{deleteModalUser.name}</strong> ({deleteModalUser.email})؟
              </p>
              <div className="rounded-2xl bg-red-50 border border-red-200 p-3 text-xs text-red-800 font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                <span>تحذير: هذا الإجراء نهائي وسيتم مسح جميع بيانات الحساب والمشروعات والعروض التابعة له.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>تأكيد الحذف النهائي</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. Reset Assessment Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {resetTestUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-extrabold text-[#05291A] flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-[#056B38]" />
                إعادة تفعيل اختبار التقييم للمطور
              </h3>
              <button
                type="button"
                onClick={() => setResetTestUser(null)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#526B5E] leading-relaxed">
                هل تريد موافقة وإعادة فتح تقديم الاختبار للمطور{" "}
                <strong className="text-[#05291A] font-extrabold">{resetTestUser.name}</strong> ({resetTestUser.email})؟
              </p>
              <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] p-3 text-xs text-[#056B38] font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0" />
                <span>سيظهر زر "بدء الاختبار الآن" فوراً في حساب المطور لإتاحة إعادة الاعتماد.</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmResetAssessment}
                className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>تأكيد الإتاحة وإعادة الاختبار</span>
              </button>
              <button
                type="button"
                onClick={() => setResetTestUser(null)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
