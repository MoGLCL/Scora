"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Bot,
  Briefcase,
  ChevronDown,
  Clock,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  AlertTriangle,
  X
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  deleteUserForAdmin,
  resetDeveloperAssessmentForAdmin,
  updateUserForAdmin
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
  status: AccountStatus;
  skillPoints: number;
  trustScore: number;
  joinDate: string;
  reportsCount: number;
  approvalStatus?: string | null;
  assessmentPublicId?: string | null;
  assessmentSessionStatus?: string | null;
  suspendedUntil?: string | null;
}

interface ProjectItem {
  id: number;
  title: string;
  category: string | null;
  budgetFrom: number;
  budgetTo: number;
  deadlineDays: number | null;
  status: string;
  postedAt: string;
  ownerName: string;
  ownerUsername: string | null;
  accountType: "personal" | "company";
  companyName: string | null;
  proposalsCount: number;
}

export default function AdminPage() {
  const { systemSettings, updateSystemSettings, addToast } = useProfile();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | AppRole | "admin" | "restricted">("all");
  const [tab, setTab] = useState<"users" | "projects" | "stats" | "settings">("users");
  const [stats, setStats] = useState<{
    totals?: { users: number; active: number; visits: number; visitors: number };
    daily?: { day: string; visits: number }[];
    settings?: Record<string, boolean>;
  }>({});
  const [quickRegistration, setQuickRegistration] = useState(true);
  const [serverMessage, setServerMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  // Modals state
  const [suspensionModalUser, setSuspensionModalUser] = useState<UserItem | null>(null);
  const [selectedSuspensionDays, setSelectedSuspensionDays] = useState<number>(7);
  const [deleteModalUser, setDeleteModalUser] = useState<UserItem | null>(null);
  const [resetTestUser, setResetTestUser] = useState<UserItem | null>(null);

  const loadUsers = async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (response.ok) setUsers(await response.json());
    } catch {
      addToast("تعذر تحميل قائمة المستخدمين", "warn");
    }
  };

  useEffect(() => {
    let active = true, userTimer: ReturnType<typeof setTimeout> | undefined;
    const fetchUsersLoop = async () => {
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        if (response.ok && active) setUsers(await response.json());
      } catch {
        if (active) addToast("تعذر تحميل المستخدمين", "warn");
      } finally {
        if (active) userTimer = setTimeout(fetchUsersLoop, 8000);
      }
    };
    void fetchUsersLoop();

    fetch("/api/admin/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setProjects)
      .catch(() => addToast("تعذر تحميل المشاريع", "warn"));

    let statsLoading = false;
    const loadStats = () => {
      if (statsLoading) return;
      statsLoading = true;
      fetch("/api/admin/stats", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((data) => {
          setStats(data);
          if (typeof data.settings?.quick_registration_enabled === "boolean") {
            setQuickRegistration(data.settings.quick_registration_enabled);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          statsLoading = false;
        });
    };
    loadStats();

    const timer = window.setInterval(loadStats, 8000);
    return () => {
      active = false;
      if (userTimer) clearTimeout(userTimer);
      window.clearInterval(timer);
    };
  }, [addToast]);

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
      setServerMessage({ text: "تمت إعادة إتاحة اختبار التقييم للمطور بنجاح", kind: "success" });
      addToast("تمت إعادة إتاحة التقييم للمطور", "success");
    }
    setResetTestUser(null);
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1296px] flex-1 px-6 py-10 space-y-7">
        {serverMessage && (
          <div
            role="status"
            className={`rounded-2xl border p-4 text-sm font-bold flex items-center justify-between animate-in fade-in duration-200 ${
              serverMessage.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span>{serverMessage.text}</span>
            <button type="button" onClick={() => setServerMessage(null)} className="text-gray-500 hover:text-black">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <nav className="flex flex-wrap gap-2 rounded-2xl border border-[#D1E3D6] bg-white p-2 shadow-sm">
          {(
            [
              ["users", "المستخدمون والتحكم"],
              ["projects", "المشاريع المنشورة"],
              ["stats", "الإحصائيات والزيارات"],
              ["settings", "إعدادات النظام و AI"]
            ] as const
          ).map(([k, l]) => (
            <button
              type="button"
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-xl px-6 py-3 font-extrabold text-sm transition-all ${
                tab === k ? "bg-[#056B38] text-white shadow-sm" : "text-[#526B5E] hover:bg-[#F7FAF8]"
              }`}
            >
              {l}
            </button>
          ))}
        </nav>

        {/* Header Stats Banner */}
        <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between shadow-sm">
          <div>
            <h1 className="text-3xl font-extrabold text-[#05291A]">لوحة التحكم والإدارة الفنية</h1>
            <p className="mt-2 text-sm text-[#526B5E]">
              إدارة مستخدمي منصة سكورا، مراجعة الاعتماد، تفعيل إيقاف الحسابات، وإعادة اختبار المطورين مباشرة.
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
            <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex items-center justify-between shadow-sm">
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
            <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex items-center justify-between shadow-sm">
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
          <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 shadow-sm">
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
            <div className="flex items-center justify-between rounded-[22px] border border-[#D1E3D6] bg-white p-5 shadow-sm">
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
                  <article key={project.id} className="rounded-[22px] border border-[#D1E3D6] bg-white p-6 shadow-sm">
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
            {/* Developer Approval Action Banners */}
            {users.some(
              (u) =>
                u.role === "developer" &&
                ["generating", "generation_failed"].includes(u.assessmentSessionStatus ?? "")
            ) && (
              <div className="rounded-[22px] border border-sky-300 bg-sky-50 p-5 shadow-sm">
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
              <div className="rounded-[22px] border border-amber-300 bg-amber-50 p-5 shadow-sm">
                <h2 className="font-extrabold text-amber-900">طلبات اعتماد مطورين جديدة تنتظر المراجعة</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {users
                    .filter((u) => u.approvalStatus === "admin_review" && u.assessmentPublicId)
                    .map((u) => (
                      <Link
                        key={u.id}
                        href={`/admin/developers/${u.assessmentPublicId}/review`}
                        className="rounded-full bg-amber-900 hover:bg-amber-950 px-5 py-2 text-sm font-bold text-white transition-all shadow-sm flex items-center gap-2"
                      >
                        <span>مراجعة طلب {u.name}</span>
                        <ShieldCheck className="h-4 w-4" />
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Filter and Search Toolbar */}
            <div className="rounded-[22px] border border-[#D1E3D6] bg-white p-4 flex flex-col gap-3 md:flex-row md:justify-between shadow-sm">
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
                    className={`rounded-full px-4 py-2 text-xs font-extrabold transition-all ${
                      filter === x ? "bg-[#056B38] text-white shadow-sm" : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0]"
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

            {/* Users List Grid */}
            <div className="grid gap-3">
              {visible.length ? (
                visible.map((u) => (
                  <article
                    key={u.id}
                    className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm hover:border-[#056B38]/30 transition-all"
                  >
                    {/* User Identity Info */}
                    <div className="space-y-1 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#05291A] text-base">
                          #{u.id} · {u.name}
                        </span>
                        {u.isAdmin && (
                          <span className="rounded-full bg-[#056B38] text-white text-[11px] font-extrabold px-2.5 py-0.5">
                            أدمن
                          </span>
                        )}
                        {u.status === "suspended" && (
                          <span className="rounded-full bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> موقوف
                          </span>
                        )}
                        {u.status === "banned" && (
                          <span className="rounded-full bg-red-100 text-red-700 text-[11px] font-extrabold px-2.5 py-0.5 flex items-center gap-1">
                            <Ban className="h-3 w-3" /> محظور
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-[#526B5E] flex flex-wrap gap-x-3 gap-y-1">
                        <span>{u.email}</span>
                        {u.phone && <span>· {u.phone}</span>}
                        <span>· انضم {u.joinDate}</span>
                      </div>

                      {u.status === "suspended" && u.suspendedUntil && (
                        <div className="text-xs font-bold text-amber-700 mt-1 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>تاريخ انتهاء الإيقاف: {u.suspendedUntil}</span>
                        </div>
                      )}
                    </div>

                    {/* Scora Custom Styled Controls */}
                    <div className="flex flex-wrap items-center gap-3">
                      {/* Scora Custom Role Select */}
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
                        className={`h-10 rounded-2xl px-4 text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                          u.isAdmin
                            ? "bg-[#056B38] text-white hover:bg-[#005B27] shadow-sm"
                            : "border border-[#D1E3D6] bg-[#F7FAF8] text-[#05291A] hover:bg-[#E8FAF0] hover:border-[#056B38]"
                        }`}
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>{u.isAdmin ? "صلاحية أدمن" : "منح أدمن"}</span>
                      </button>

                      {/* Scora Custom Status Select with Suspension Duration Modal Trigger */}
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

                      {/* Reset Developer Assessment Button */}
                      {u.role === "developer" && (
                        <button
                          type="button"
                          disabled={savingUserId === u.id}
                          onClick={() => setResetTestUser(u)}
                          title="إعادة تفعيل اختبار تقييم المطور"
                          className="h-10 rounded-2xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-800 px-3.5 text-xs font-extrabold transition-all flex items-center gap-1.5"
                        >
                          <RotateCcw className="h-3.5 w-3.5 text-sky-700" />
                          <span>إعادة اختبار المطور</span>
                        </button>
                      )}

                      {/* Delete Account Button */}
                      <button
                        type="button"
                        disabled={savingUserId === u.id}
                        onClick={() => setDeleteModalUser(u)}
                        title="حذف الحساب نهائياً"
                        className="h-10 w-10 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Trust & Skill Points Badge */}
                    <div className="text-xs font-bold text-[#526B5E] bg-[#F7FAF8] border border-[#D1E3D6] px-3.5 py-2 rounded-2xl text-center">
                      <div>Trust: <span className="text-[#056B38] font-extrabold">{u.trustScore}</span></div>
                      <div>SP: <span className="text-[#05291A] font-extrabold">{u.skillPoints}</span></div>
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
                className="text-gray-400 hover:text-black"
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
                    className={`p-3 rounded-2xl border text-xs font-bold text-right transition-all flex items-center justify-between ${
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
                <span>
                  تاريخ رفع الإيقاف القادم تلقائياً:{" "}
                  {new Date(Date.now() + selectedSuspensionDays * 86400000).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmSuspension}
                className="flex-1 h-11 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm transition-all shadow-sm"
              >
                تأكيد الإيقاف المؤقت
              </button>
              <button
                type="button"
                onClick={() => setSuspensionModalUser(null)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. Permanent Account Deletion Confirmation Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-extrabold text-red-700 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                حذف الحساب نهائياً من المنصة
              </h3>
              <button type="button" onClick={() => setDeleteModalUser(null)} className="text-gray-400 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[#526B5E]">
                هل أنت متأكد من رغبتك في حذف حساب{" "}
                <strong className="text-[#05291A] font-extrabold">{deleteModalUser.name}</strong> ({deleteModalUser.email}) نهائياً؟
              </p>

              <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 font-bold leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-red-900 font-extrabold">
                  <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
                  <span>تحذير: هذه العملية لا يمكن التراجع عنها!</span>
                </div>
                <p>سيتم حذف بيانات الحساب والملف الشخصي وسجل الاختبارات نهائياً من قاعدة بيانات MySQL.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm transition-all shadow-sm"
              >
                تأكيد الحذف النهائي
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8]"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. Developer Assessment Reset Confirmation Modal */}
      {/* ───────────────────────────────────────────────────────────── */}
      {resetTestUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-sky-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-extrabold text-sky-900 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-sky-700" />
                إعادة تفعيل اختبار تقييم المطور
              </h3>
              <button type="button" onClick={() => setResetTestUser(null)} className="text-gray-400 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-[#526B5E]">
                هل ترغب في إتاحة إعادة تقديم اختبار تقييم المطورين للمطور{" "}
                <strong className="text-[#05291A] font-extrabold">{resetTestUser.name}</strong>؟
              </p>

              <div className="rounded-2xl bg-sky-50 border border-sky-200 p-3.5 text-xs text-sky-900 font-bold leading-relaxed">
                ستتم إعادة حالة اعتماد المطور إلى (معلق / Pending)، وإرسال تنبيه حاد للحساب بتوفر إجراء التقييم مجدداً.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmResetAssessment}
                className="flex-1 h-11 rounded-full bg-sky-700 hover:bg-sky-800 text-white font-extrabold text-sm transition-all shadow-sm"
              >
                تأكيد إعادة الاختبار
              </button>
              <button
                type="button"
                onClick={() => setResetTestUser(null)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8]"
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

{/* ───────────────────────────────────────────────────────────── */}
{/* Scora Custom Styled Select Dropdown Control */}
{/* ───────────────────────────────────────────────────────────── */}
function ScoraSelectControl({
  value,
  options,
  onChange,
  disabled
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative inline-block">
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 appearance-none rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#05291A] text-xs font-extrabold pr-4 pl-9 cursor-pointer transition-all focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 disabled:opacity-50"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-white text-[#05291A] font-bold py-1">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute left-3 top-3 h-3.5 w-3.5 text-[#056B38] pointer-events-none" />
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] px-5 py-3 shadow-xs">
      <Icon className="h-4 w-4 text-[#056B38]" />
      <div className="mt-1 text-xs font-bold text-[#526B5E]">{label}</div>
      <div className="text-xl font-extrabold text-[#05291A]">{value}</div>
    </div>
  );
}
