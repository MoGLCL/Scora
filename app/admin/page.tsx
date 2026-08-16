"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  Bot,
  Briefcase,
  Clock,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  AlertTriangle,
  X,
  CheckCircle2,
  Award,
  Edit3,
  KeyRound,
  Bell,
  Eye,
  Download,
  LayoutGrid,
  List,
  Sparkles,
  TrendingUp,
  Activity,
  Globe,
  Radio,
  MessageSquare,
  CheckCircle,
  FileCheck,
  History,
  Star,
  Tag,
  Sliders,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { VerifiedBadge } from "@/components/verified-badge";
import { SiteFooter } from "@/components/site-footer";
import { CustomSelect } from "@/components/custom-select";
import {
  decideReassessmentRequestForAdmin,
  deleteUserForAdmin,
  resetDeveloperAssessmentForAdmin,
  updateUserForAdmin,
  updateUserFullDetailsForAdmin,
  setUserPasswordForAdmin,
  sendAdminDirectNotification,
  toggleDeveloperVerificationForAdmin,
  updateProjectForAdmin,
  deleteProjectForAdmin,
  deleteProposalForAdmin,
  broadcastNotificationForAdmin,
  updateSupportTicketStatusForAdmin,
  deleteReviewForAdmin,
  setUserSubscriptionForAdmin,
} from "@/lib/actions/admin";
import { setAiAssistantEnabled, setQuickRegistrationEnabled, setSpPerStarSetting } from "@/lib/actions/settings";
import { OpenRouterSettings } from "@/components/openrouter-settings";
import { AdminCouponsTab } from "@/components/admin/admin-coupons-tab";
import { AdminAiLogsTab } from "@/components/admin/admin-ai-logs-tab";
import { AdminPlansTab } from "@/components/admin/admin-plans-tab";
import { useProfile } from "@/components/profile-provider";
import { AdminProgressiveChart, type TimelineDataPoint } from "@/components/admin/admin-progressive-chart";
import {
  UserDetailsModal,
  EditUserModal,
  SetPasswordModal,
  SendNotificationModal,
  ChangeUserPlanModal,
  type ExtendedUserItem,
} from "@/components/admin/admin-user-modals";
import {
  ProjectDetailsModal,
  EditProjectModal,
  DeleteProjectModal,
  BroadcastNotificationModal,
  type ExtendedProjectItem,
  type SupportTicketItem,
} from "@/components/admin/admin-project-modals";
import type { AccountStatus, AppRole } from "@/lib/types";

interface AssessmentSessionItem {
  id: number;
  publicId: string;
  developerId: number;
  developerName: string;
  developerEmail: string;
  jobTitle: string;
  isVerified: boolean;
  status: string;
  model: string | null;
  score: number | null;
  trustAwarded: number | null;
  spAwarded: number | null;
  startedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewReason: string | null;
}

interface AuditLogItem {
  id: number;
  actorUserId: number | null;
  actorName: string;
  action: string;
  category: "security" | "admin" | "ai" | "system";
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  status: "success" | "warn" | "danger";
  createdAt: string;
}

interface ReviewItem {
  id: number;
  projectId: number | null;
  projectTitle: string;
  reviewerName: string;
  reviewerEmail: string;
  revieweeName: string;
  revieweeEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface StatsResponse {
  totals?: {
    users: number;
    developers: number;
    clients: number;
    admins: number;
    active_accounts: number;
    online_now: number;
    suspended_accounts: number;
    banned_accounts: number;
    pending_reviews: number;
    pending_reassessments: number;
    verified_developers: number;
    projects: number;
    open_projects: number;
    in_progress_projects: number;
    completed_projects: number;
    closed_projects: number;
    proposals: number;
    visits: number;
    visitors: number;
    assessments_count: number;
    reviews_count: number;
  };
  timeline?: TimelineDataPoint[];
  topPaths?: { path: string; visits: number; visitors: number }[];
  hourlyToday?: { hour: number; hourLabel: string; visits: number }[];
  categories?: { category: string; count: number }[];
  settings?: Record<string, boolean>;
}

export default function AdminPage() {
  const { systemSettings, updateSystemSettings, addToast } = useProfile();
  const [users, setUsers] = useState<ExtendedUserItem[]>([]);
  const [projects, setProjects] = useState<ExtendedProjectItem[]>([]);
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [assessments, setAssessments] = useState<AssessmentSessionItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<StatsResponse>({});

  const [tab, setTab] = useState<
    "users" | "projects" | "assessments" | "tickets" | "reviews" | "audit" | "stats" | "ai" | "ai_logs" | "plans" | "coupons" | "settings"
  >("users");

  // Users filter state
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "developer" | "dev_verified" | "dev_review" | "client" | "admin" | "restricted" | "online"
  >("all");
  const [sortBy, setSortBy] = useState<"newest" | "trust" | "sp" | "reports" | "name">("newest");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Projects filter state
  const [projectStatusFilter, setProjectStatusFilter] = useState<"all" | "open" | "in_progress" | "completed" | "closed">("all");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectSortBy, setProjectSortBy] = useState<"newest" | "proposals" | "budget">("newest");

  // Tickets filter state
  const [ticketStatusFilter, setTicketStatusFilter] = useState<"all" | "new" | "reviewing" | "resolved">("all");

  // Assessments filter state
  const [assessmentStatusFilter, setAssessmentStatusFilter] = useState<string>("all");
  const [assessmentSearch, setAssessmentSearch] = useState("");

  // Audit Logs filter state
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>("all");

  const [quickRegistration, setQuickRegistration] = useState(true);
  const [spPerStar, setSpPerStar] = useState<number>(5);
  const [serverMessage, setServerMessage] = useState<{ text: string; kind: "success" | "error" } | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [savingProjectId, setSavingProjectId] = useState<number | null>(null);

  // User Modals state
  const [detailsModalUser, setDetailsModalUser] = useState<ExtendedUserItem | null>(null);
  const [editInfoUser, setEditInfoUser] = useState<ExtendedUserItem | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<ExtendedUserItem | null>(null);
  const [notifyModalUser, setNotifyModalUser] = useState<ExtendedUserItem | null>(null);
  const [suspensionModalUser, setSuspensionModalUser] = useState<ExtendedUserItem | null>(null);
  const [selectedSuspensionDays, setSelectedSuspensionDays] = useState<number>(7);
  const [customDaysInput, setCustomDaysInput] = useState<string>("");
  const [deleteModalUser, setDeleteModalUser] = useState<ExtendedUserItem | null>(null);
  const [resetTestUser, setResetTestUser] = useState<ExtendedUserItem | null>(null);
  const [editPointsUser, setEditPointsUser] = useState<ExtendedUserItem | null>(null);
  const [planModalUser, setPlanModalUser] = useState<ExtendedUserItem | null>(null);
  const [customTrustScore, setCustomTrustScore] = useState<number>(0);
  const [customSkillPoints, setCustomSkillPoints] = useState<number>(0);

  // Project Modals state
  const [detailsModalProject, setDetailsModalProject] = useState<ExtendedProjectItem | null>(null);
  const [editModalProject, setEditModalProject] = useState<ExtendedProjectItem | null>(null);
  const [deleteModalProject, setDeleteModalProject] = useState<ExtendedProjectItem | null>(null);

  // Review Delete Modal state
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  // Broadcast Notification Modal state
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      if (response.ok) setUsers(await response.json());
    } catch {
      addToast("تعذر تحميل قائمة المستخدمين", "warn");
    }
  }, [addToast]);

  const loadProjects = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/projects", { cache: "no-store" });
      if (response.ok) setProjects(await response.json());
    } catch {
      addToast("تعذر تحميل المشاريع", "warn");
    }
  }, [addToast]);

  const loadTickets = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/tickets", { cache: "no-store" });
      if (response.ok) setTickets(await response.json());
    } catch {
      // silent
    }
  }, []);

  const loadAssessments = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/assessments", { cache: "no-store" });
      if (response.ok) setAssessments(await response.json());
    } catch {
      // silent
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/audit-logs", { cache: "no-store" });
      if (response.ok) setAuditLogs(await response.json());
    } catch {
      // silent
    }
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" });
      if (response.ok) setReviews(await response.json());
    } catch {
      // silent
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/stats", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        if (typeof data.settings?.quick_registration_enabled === "boolean") {
          setQuickRegistration(data.settings.quick_registration_enabled);
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    let active = true;
    let userTimer: ReturnType<typeof setTimeout> | undefined;

    const fetchUsersLoop = async () => {
      try {
        const response = await fetch("/api/admin/users", { cache: "no-store" });
        if (response.ok && active) setUsers(await response.json());
      } catch {
        if (active) addToast("تعذر تحميل المستخدمين", "warn");
      } finally {
        if (active) userTimer = setTimeout(fetchUsersLoop, 12000);
      }
    };
    const initialTimer = window.setTimeout(() => {
      void fetchUsersLoop();
      loadProjects();
      loadTickets();
      loadAssessments();
      loadAuditLogs();
      loadReviews();
      loadStats();
    }, 0);

    const statsTimer = window.setInterval(() => {
      loadStats();
      loadProjects();
      loadTickets();
      loadAssessments();
    }, 15000);

    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      if (userTimer) clearTimeout(userTimer);
      window.clearInterval(statsTimer);
    };
  }, [addToast, loadAssessments, loadAuditLogs, loadProjects, loadReviews, loadStats, loadTickets]);

  // Filter & Sort visible users
  const visibleUsers = useMemo(() => {
    const list = users.filter((u) => {
      const match =
        !search ||
        `${u.id} ${u.name} ${u.email} ${u.phone} ${u.jobTitle || ""} ${u.companyName || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());

      if (!match) return false;

      switch (filter) {
        case "developer":
          return u.role === "developer";
        case "dev_verified":
          return u.role === "developer" && u.isVerified;
        case "dev_review":
          return u.role === "developer" && u.approvalStatus === "admin_review";
        case "client":
          return u.role === "client";
        case "admin":
          return u.isAdmin;
        case "restricted":
          return u.status !== "active";
        case "online":
          return Boolean(u.isOnline);
        default:
          return true;
      }
    });

    list.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return Number(b.id) - Number(a.id);
        case "trust":
          return b.trustScore - a.trustScore;
        case "sp":
          return b.skillPoints - a.skillPoints;
        case "reports":
          return b.reportsCount - a.reportsCount;
        case "name":
          return a.name.localeCompare(b.name, "ar");
        default:
          return 0;
      }
    });

    return list;
  }, [users, search, filter, sortBy]);

  // Filtered & Sorted projects
  const visibleProjects = useMemo(() => {
    const list = projects.filter((p) => {
      const matchSearch =
        !projectSearch ||
        `${p.id} ${p.title} ${p.ownerName} ${p.companyName || ""} ${p.category || ""}`
          .toLowerCase()
          .includes(projectSearch.toLowerCase());
      const matchStatus = projectStatusFilter === "all" || p.status === projectStatusFilter;
      return matchSearch && matchStatus;
    });

    list.sort((a, b) => {
      switch (projectSortBy) {
        case "newest":
          return b.id - a.id;
        case "proposals":
          return b.proposalsCount - a.proposalsCount;
        case "budget":
          return b.budgetTo - a.budgetTo;
        default:
          return 0;
      }
    });

    return list;
  }, [projects, projectSearch, projectStatusFilter, projectSortBy]);

  // Filtered tickets
  const visibleTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (ticketStatusFilter === "all") return true;
      return t.status === ticketStatusFilter;
    });
  }, [tickets, ticketStatusFilter]);

  // Filtered assessments
  const visibleAssessments = useMemo(() => {
    return assessments.filter((a) => {
      const matchSearch =
        !assessmentSearch ||
        `${a.developerName} ${a.developerEmail} ${a.publicId} ${a.jobTitle}`
          .toLowerCase()
          .includes(assessmentSearch.toLowerCase());
      const matchStatus = assessmentStatusFilter === "all" || a.status === assessmentStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [assessments, assessmentSearch, assessmentStatusFilter]);

  // Filtered audit logs
  const visibleAuditLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      if (auditCategoryFilter === "all") return true;
      return l.category === auditCategoryFilter;
    });
  }, [auditLogs, auditCategoryFilter]);

  // ─── Actions Handlers ──────────────────────────────────────────

  const updateStatusOrRole = async (
    id: string,
    changes: {
      role?: AppRole;
      isAdmin?: boolean;
      status?: AccountStatus;
      suspensionDays?: number;
      trustScore?: number;
      skillPoints?: number;
    }
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
    addToast("تم حفظ التعديل بنجاح", "success");
  };

  const handleSaveFullDetails = async (changes: {
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
  }) => {
    if (!editInfoUser) return;
    setSavingUserId(editInfoUser.id);
    const result = await updateUserFullDetailsForAdmin({
      userId: Number(editInfoUser.id),
      ...changes,
    });
    if (!result.ok) {
      setSavingUserId(null);
      setServerMessage({ text: result.error, kind: "error" });
      return addToast(result.error, "warn");
    }
    await loadUsers();
    setSavingUserId(null);
    setEditInfoUser(null);
    setServerMessage({ text: "تم تحديث بيانات المستخدم بنجاح", kind: "success" });
    addToast("تم تحديث بيانات المستخدم بنجاح", "success");
  };

  const handleSetPassword = async (newPassword: string) => {
    if (!passwordModalUser) return;
    setSavingUserId(passwordModalUser.id);
    const result = await setUserPasswordForAdmin({
      userId: Number(passwordModalUser.id),
      newPassword,
    });
    setSavingUserId(null);
    if (!result.ok) {
      setServerMessage({ text: result.error, kind: "error" });
      return addToast(result.error, "warn");
    }
    setPasswordModalUser(null);
    setServerMessage({ text: "تم تعيين كلمة المرور الجديدة وتشفيرها بنجاح", kind: "success" });
    addToast("تم تغيير كلمة المرور بنجاح", "success");
  };

  const handleSendNotification = async (message: string, linkUrl?: string) => {
    if (!notifyModalUser) return;
    setSavingUserId(notifyModalUser.id);
    const result = await sendAdminDirectNotification({
      userId: Number(notifyModalUser.id),
      message,
      linkUrl,
    });
    setSavingUserId(null);
    if (!result.ok) {
      setServerMessage({ text: result.error, kind: "error" });
      return addToast(result.error, "warn");
    }
    setNotifyModalUser(null);
    setServerMessage({ text: "تم إرسال الإشعار إلى حساب المستخدم بنجاح", kind: "success" });
    addToast("تم إرسال الإشعار بنجاح", "success");
  };

  const handleSaveUserPlan = async (
    userId: string,
    plan: "free" | "pro" | "vip",
    status: "active" | "trial" | "expired" | "cancelled",
    durationDays?: number | null
  ) => {
    try {
      const res = await setUserSubscriptionForAdmin({
        userId,
        plan,
        status,
        durationDays,
      });
      if (res.ok) {
        addToast(res.message, "success");
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, subscriptionPlan: plan, subscriptionStatus: status }
              : u
          )
        );
        await loadUsers();
      } else {
        addToast(res.error, "warn");
      }
    } catch {
      addToast("حدث خطأ أثناء تعيين الباقة", "warn");
    }
  };

  const handleOpenEditPoints = (u: ExtendedUserItem) => {
    setEditPointsUser(u);
    setCustomTrustScore(u.trustScore);
    setCustomSkillPoints(u.skillPoints);
  };

  const handleSaveCustomPoints = async () => {
    if (!editPointsUser) return;
    await updateStatusOrRole(editPointsUser.id, {
      trustScore: Math.min(100, Math.max(0, customTrustScore)),
      skillPoints: Math.max(0, customSkillPoints),
    });
    setEditPointsUser(null);
  };

  const handleConfirmSuspension = async () => {
    if (!suspensionModalUser) return;
    const days = customDaysInput ? Number(customDaysInput) : selectedSuspensionDays;
    await updateStatusOrRole(suspensionModalUser.id, {
      status: "suspended",
      suspensionDays: Math.max(1, Math.min(365, days)),
    });
    setSuspensionModalUser(null);
    setCustomDaysInput("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteModalUser) return;
    setSavingUserId(deleteModalUser.id);
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
    const result = await resetDeveloperAssessmentForAdmin(Number(resetTestUser.id));
    if (!result.ok) {
      setSavingUserId(null);
      setServerMessage({ text: result.error, kind: "error" });
      addToast(result.error, "warn");
    } else {
      await loadUsers();
      await loadAssessments();
      setSavingUserId(null);
      setServerMessage({ text: "تمت إتاحة إعادة التقييم للمطور بنجاح", kind: "success" });
      addToast("تمت إتاحة إعادة التقييم للمطور", "success");
    }
    setResetTestUser(null);
  };

  const handleDecideReassessment = async (targetUserId: string, requestId: number, decision: "approve" | "reject") => {
    setSavingUserId(targetUserId);
    const result = await decideReassessmentRequestForAdmin({ requestId, decision });
    if (!result.ok) {
      setSavingUserId(null);
      setServerMessage({ text: result.error, kind: "error" });
      addToast(result.error, "warn");
    } else {
      await loadUsers();
      setSavingUserId(null);
      setServerMessage({
        text: decision === "approve" ? "تمت الموافقة على طلب إعادة الاختبار" : "تم رفض طلب إعادة الاختبار",
        kind: "success",
      });
      addToast(decision === "approve" ? "تمت الموافقة على طلب إعادة الاختبار" : "تم رفض الطلب", "success");
    }
  };

  const handleSaveProject = async (changes: {
    title?: string;
    description?: string;
    category?: string;
    budgetFrom?: number;
    budgetTo?: number;
    deadlineDays?: number;
    status?: "open" | "in_progress" | "completed" | "closed";
  }) => {
    if (!editModalProject) return;
    setSavingProjectId(editModalProject.id);
    const result = await updateProjectForAdmin({
      projectId: editModalProject.id,
      ...changes,
    });
    setSavingProjectId(null);
    if (!result.ok) {
      setServerMessage({ text: result.error, kind: "error" });
      return addToast(result.error, "warn");
    }
    await loadProjects();
    setEditModalProject(null);
    setServerMessage({ text: "تم حفظ تعديلات المشروع بنجاح", kind: "success" });
    addToast("تم حفظ تعديلات المشروع بنجاح", "success");
  };

  const handleUpdateProjectStatus = async (projectId: number, newStatus: "open" | "in_progress" | "completed" | "closed") => {
    setSavingProjectId(projectId);
    const result = await updateProjectForAdmin({
      projectId,
      status: newStatus,
    });
    setSavingProjectId(null);
    if (!result.ok) {
      setServerMessage({ text: result.error, kind: "error" });
      return addToast(result.error, "warn");
    }
    await loadProjects();
    setServerMessage({ text: `تم تحديث حالة المشروع إلى: ${newStatus}`, kind: "success" });
    addToast("تم تحديث حالة المشروع", "success");
  };

  const handleDeleteProject = async () => {
    if (!deleteModalProject) return;
    setSavingProjectId(deleteModalProject.id);
    const result = await deleteProjectForAdmin(deleteModalProject.id);
    setSavingProjectId(null);
    if (!result.ok) {
      setServerMessage({ text: result.error, kind: "error" });
      return addToast(result.error, "warn");
    }
    await loadProjects();
    setDeleteModalProject(null);
    setServerMessage({ text: "تم حذف المشروع وكافة عروضه بنجاح", kind: "success" });
    addToast("تم حذف المشروع بنجاح", "success");
  };

  const handleDeleteProposal = async (proposalId: number) => {
    const result = await deleteProposalForAdmin(proposalId);
    if (!result.ok) {
      addToast(result.error, "warn");
    } else {
      addToast("تم حذف العرض بنجاح", "success");
      await loadProjects();
    }
  };

  const handleBroadcastSend = async (targetAudience: "all" | "developers" | "clients", message: string, linkUrl?: string) => {
    const result = await broadcastNotificationForAdmin({
      targetAudience,
      message,
      linkUrl,
    });
    if (!result.ok) {
      setServerMessage({ text: result.error, kind: "error" });
      addToast(result.error, "warn");
    } else {
      setServerMessage({ text: `تم إرسال الإشعار الجماعي إلى ${result.count} مستخدم بنجاح`, kind: "success" });
      addToast(`تم إرسال الإشعار إلى ${result.count} حساب`, "success");
    }
  };

  const handleUpdateTicketStatus = async (ticketId: number, status: "new" | "reviewing" | "resolved") => {
    const result = await updateSupportTicketStatusForAdmin({ ticketId, status });
    if (!result.ok) {
      addToast(result.error, "warn");
    } else {
      addToast("تم تحديث حالة البلاغ بنجاح", "success");
      await loadTickets();
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    setDeletingReviewId(reviewId);
    const result = await deleteReviewForAdmin(reviewId);
    setDeletingReviewId(null);
    if (!result.ok) {
      addToast(result.error, "warn");
    } else {
      addToast("تم حذف التقييم بنجاح", "success");
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setReviewToDelete(null);
    }
  };

  const exportUsersCSV = () => {
    if (!visibleUsers.length) return addToast("لا توجد بيانات لتصديرها", "warn");
    const headers = ["ID", "Name", "Email", "Phone", "Role", "IsAdmin", "Status", "TrustScore", "SkillPoints", "JoinDate"];
    const rows = visibleUsers.map((u) => [
      u.id,
      `"${u.name.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      `"${u.phone}"`,
      u.role,
      u.isAdmin ? "Yes" : "No",
      u.status,
      u.trustScore,
      u.skillPoints,
      `"${u.joinDate}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `scora_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast("تم تصدير ملف CSV بنجاح", "success");
  };

  // Pending counts
  const pendingReviewsCount = users.filter((u) => u.approvalStatus === "admin_review").length;
  const pendingReassessmentsCount = users.filter((u) => u.reassessmentStatus === "pending").length;
  const onlineCount = users.filter((u) => u.isOnline).length;
  const newTicketsCount = tickets.filter((t) => t.status === "new").length;

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1360px] flex-1 px-4 sm:px-6 py-8 space-y-6">
        {/* Server Notification Toast Banner */}
        {serverMessage && (
          <div
            role="status"
            className={`rounded-2xl border p-4 text-xs font-black flex items-center justify-between shadow-xs animate-in fade-in duration-150 ${
              serverMessage.kind === "success"
                ? "border-[#D1E3D6] bg-[#E8FAF0] text-[#056B38]"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <div className="flex items-center gap-2">
              {serverMessage.kind === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-[#056B38]" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span>{serverMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setServerMessage(null)}
              className="text-gray-500 hover:text-black cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Top Header Banner & Quick Live KPIs Ribbon */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                <h1 className="text-2xl sm:text-3xl font-black text-[#05291A]">
                  لوحة التحكم والإدارة المركزية
                </h1>
                <span className="rounded-full bg-[#E8FAF0] px-3 py-1 text-xs font-black text-[#056B38] border border-[#D1E3D6]">
                  Enterprise v2.0
                </span>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-[#526B5E] max-w-2xl leading-relaxed">
                إدارة المستخدمين والمشاريع، جلسات التقييم والاختبارات، البلاغات، الرقابة، والتحليلات اللحظية الشاملة.
              </p>
            </div>

            {/* Quick Live Stats Pills & Broadcast CTA */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3 text-right">
                  <div className="flex items-center justify-between text-[#526B5E] text-[11px] font-bold">
                    <span>المستخدمون</span>
                    <Users className="h-3.5 w-3.5 text-[#056B38]" />
                  </div>
                  <div className="mt-1 text-lg font-black text-[#05291A]">
                    {stats.totals?.users ?? users.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#E8FAF0]/60 border border-[#D1E3D6] p-3 text-right">
                  <div className="flex items-center justify-between text-[#056B38] text-[11px] font-bold">
                    <span>متصل الآن</span>
                    <Activity className="h-3.5 w-3.5 text-[#056B38]" />
                  </div>
                  <div className="mt-1 text-lg font-black text-[#056B38]">
                    {stats.totals?.online_now ?? onlineCount}
                  </div>
                </div>

                <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3 text-right">
                  <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold">
                    <span>مراجعات معلقة</span>
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                  </div>
                  <div className="mt-1 text-lg font-black text-amber-900">
                    {pendingReviewsCount}
                  </div>
                </div>

                <div className="rounded-2xl bg-sky-50/70 border border-sky-200 p-3 text-right">
                  <div className="flex items-center justify-between text-sky-800 text-[11px] font-bold">
                    <span>المشاريع</span>
                    <Briefcase className="h-3.5 w-3.5 text-sky-700" />
                  </div>
                  <div className="mt-1 text-lg font-black text-sky-900">
                    {projects.length}
                  </div>
                </div>
              </div>

              {/* Broadcast Announcement Button */}
              <button
                type="button"
                onClick={() => setShowBroadcastModal(true)}
                className="h-11 rounded-2xl bg-[#056B38] hover:bg-[#005B27] text-white px-5 text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <Radio className="h-4 w-4" />
                <span>إرسال إشعار جماعي</span>
              </button>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Navigation Tabs Bar with Badges */}
        {/* ───────────────────────────────────────────────────────────── */}
        <nav className="flex flex-wrap gap-1.5 rounded-2xl border border-[#D1E3D6] bg-white p-2 shadow-xs">
          <button
            type="button"
            onClick={() => setTab("users")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "users"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>المستخدمون</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                tab === "users" ? "bg-white text-[#056B38]" : "bg-[#F7FAF8] text-[#526B5E]"
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("projects")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "projects"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>المشاريع والرقابة</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                tab === "projects" ? "bg-white text-[#056B38]" : "bg-[#F7FAF8] text-[#526B5E]"
              }`}
            >
              {projects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("assessments")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "assessments"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <FileCheck className="h-4 w-4" />
            <span>جلسات التقييم والاختبارات</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                tab === "assessments" ? "bg-white text-[#056B38]" : "bg-[#F7FAF8] text-[#526B5E]"
              }`}
            >
              {assessments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("tickets")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "tickets"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>البلاغات والدعم</span>
            {newTicketsCount > 0 && (
              <span className="rounded-full bg-red-500 text-white px-2 py-0.5 text-[10px] font-black animate-pulse">
                {newTicketsCount} جديد
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab("reviews")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "reviews"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <Star className="h-4 w-4" />
            <span>التقييمات ({reviews.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("audit")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "audit"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <History className="h-4 w-4" />
            <span>سجل الرقابة والعمليات</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("stats")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "stats"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>الإحصائيات والتحليلات</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("ai")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "ai"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>نماذج الذكاء الاصطناعي</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("ai_logs")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "ai_logs"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>محادثات الذكاء الاصطناعي</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("plans")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "plans"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>تسعير ومميزات الباقات</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("coupons")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "coupons"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>كوبونات الخصم</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("settings")}
            className={`rounded-xl px-3.5 sm:px-4 py-2 font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer ${
              tab === "settings"
                ? "bg-[#056B38] text-white shadow-xs"
                : "text-[#526B5E] hover:bg-[#F7FAF8] hover:text-[#05291A]"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>إعدادات المنصة</span>
          </button>
        </nav>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 1: USERS MANAGEMENT TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <section className="space-y-4">
            {/* Re-assessment Request Alert Banner */}
            {pendingReassessmentsCount > 0 && (
              <div className="rounded-[24px] border border-sky-300 bg-sky-50 p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-sky-950 flex items-center gap-2 text-sm sm:text-base">
                    <RotateCcw className="h-5 w-5 text-sky-700" />
                    طلبات إعادة إجراء الاختبار من المطورين ({pendingReassessmentsCount})
                  </h2>
                </div>
                <div className="grid gap-2.5 text-xs">
                  {users
                    .filter((u) => u.reassessmentStatus === "pending" && u.reassessmentRequestId)
                    .map((u) => (
                      <div
                        key={u.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 border border-sky-100 shadow-2xs"
                      >
                        <div>
                          <div className="font-black text-[#05291A] text-sm">
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
                            className="h-9 px-4 rounded-xl bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span>موافقة على إعادة الاختبار</span>
                          </button>
                          <button
                            type="button"
                            disabled={savingUserId === u.id}
                            onClick={() => handleDecideReassessment(u.id, u.reassessmentRequestId!, "reject")}
                            className="h-9 px-4 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-black transition-all cursor-pointer disabled:opacity-50"
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
            {pendingReviewsCount > 0 && (
              <div className="rounded-[24px] border border-amber-300 bg-amber-50 p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <h2 className="font-black text-amber-950 flex items-center gap-2 text-sm sm:text-base">
                    <ShieldAlert className="h-5 w-5 text-amber-700" />
                    طلبات اعتماد مطورين جديدة تنتظر قرار الأدمن ({pendingReviewsCount})
                  </h2>
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {users
                    .filter((u) => u.approvalStatus === "admin_review" && u.assessmentPublicId)
                    .map((u) => (
                      <Link
                        key={u.id}
                        href={`/admin/developers/${u.assessmentPublicId}/review`}
                        className="rounded-2xl bg-amber-900 hover:bg-amber-950 px-4 py-2.5 text-xs font-black text-white transition-all shadow-xs flex items-center gap-2"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        <span>مراجعة طلب اعتماد: {u.name} (#{u.id})</span>
                      </Link>
                    ))}
                </div>
              </div>
            )}

            {/* Filter and Search Toolbar */}
            <div className="rounded-[26px] border border-[#D1E3D6] bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                {/* Search Box */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute right-3.5 top-3 h-4 w-4 text-[#526B5E]" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث بالاسم، البريد، الهاتف، ID، أو المسمى..."
                    className="h-10 w-full rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="absolute left-3 top-3 text-gray-400 hover:text-black"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Sort & View Mode Switcher & Export */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="min-w-[160px]">
                    <CustomSelect
                      value={sortBy}
                      onChange={(val) => setSortBy(val as typeof sortBy)}
                      size="sm"
                      options={[
                        { value: "newest", label: "الأحدث انضماماً" },
                        { value: "trust", label: "أعلى Trust Score" },
                        { value: "sp", label: "أعلى نقاط SP" },
                        { value: "reports", label: "الأكثر بلاغات" },
                        { value: "name", label: "أبجدياً بالاسم" },
                      ]}
                    />
                  </div>

                  <div className="flex rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("cards")}
                      title="عرض البطاقات"
                      className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                        viewMode === "cards" ? "bg-[#056B38] text-white shadow-xs" : "text-[#526B5E] hover:text-[#05291A]"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      title="عرض الجدول"
                      className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                        viewMode === "table" ? "bg-[#056B38] text-white shadow-xs" : "text-[#526B5E] hover:text-[#05291A]"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={exportUsersCSV}
                    title="تصدير قائمة المستخدمين CSV"
                    className="h-10 px-3.5 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#05291A] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-[#056B38]" />
                    <span className="hidden sm:inline">تصدير CSV</span>
                  </button>
                </div>
              </div>

              {/* Quick Filter Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-neutral-100">
                {[
                  { key: "all", label: "كل الحسابات", count: users.length },
                  { key: "developer", label: "المطورون", count: users.filter((u) => u.role === "developer").length },
                  { key: "dev_verified", label: "مطورون موثقون", count: users.filter((u) => u.role === "developer" && u.isVerified).length },
                  { key: "dev_review", label: "قيد المراجعة", count: pendingReviewsCount },
                  { key: "client", label: "العملاء", count: users.filter((u) => u.role === "client").length },
                  { key: "admin", label: "صلاحية الإدارة", count: users.filter((u) => u.isAdmin).length },
                  { key: "online", label: "متصل الآن", count: onlineCount },
                  { key: "restricted", label: "الموقوفون والمحظورون", count: users.filter((u) => u.status !== "active").length },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setFilter(item.key as typeof filter)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      filter === item.key
                        ? "bg-[#056B38] text-white shadow-2xs"
                        : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0] hover:text-[#05291A]"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.2 text-[10px] ${
                        filter === item.key ? "bg-white/20 text-white" : "bg-neutral-200/70 text-[#05291A]"
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Cards View Mode ─── */}
            {viewMode === "cards" && (
              <div className="grid gap-3.5">
                {visibleUsers.length ? (
                  visibleUsers.map((u) => (
                    <article
                      key={u.id}
                      className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 flex flex-col gap-4 shadow-xs hover:border-[#056B38]/50 transition-all"
                    >
                      {/* Top Row: User Main Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="h-11 w-11 rounded-2xl bg-[#056B38]/10 border border-[#056B38]/20 text-[#056B38] flex items-center justify-center font-black text-sm shadow-2xs">
                              {u.name ? u.name.slice(0, 2).toUpperCase() : "U"}
                            </div>
                            {u.isOnline && (
                              <span
                                title="متواجد الآن"
                                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-500/20"
                              />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-[#05291A] text-base">
                                #{u.id} · {u.name}
                              </span>
                              {u.username ? (
                                <Link
                                  href={`/profile/${u.username}`}
                                  target="_blank"
                                  className="font-mono text-xs font-bold text-[#056B38] bg-[#E8FAF0] px-2 py-0.5 rounded-lg border border-[#C5E8D1] hover:bg-[#D4F5E0] transition-colors"
                                >
                                  @{u.username}
                                </Link>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                                  بدون يوزرنيم
                                </span>
                              )}
                              {u.isAdmin && (
                                <span className="rounded-full bg-[#056B38] text-white text-[10px] font-black px-2.5 py-0.5">
                                  أدمن
                                </span>
                              )}
                              {u.isVerified && (
                                <VerifiedBadge
                                  type={u.role === "developer" ? "developer" : u.role === "client" ? "client" : "general"}
                                  showLabel
                                  size="sm"
                                />
                              )}
                              {u.status === "suspended" && (
                                <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 flex items-center gap-1 border border-amber-300">
                                  <Clock className="h-3 w-3" /> موقوف مؤقتاً
                                </span>
                              )}
                              {u.status === "banned" && (
                                <span className="rounded-full bg-red-100 text-red-700 text-[10px] font-black px-2.5 py-0.5 flex items-center gap-1 border border-red-200">
                                  <Ban className="h-3 w-3" /> محظور نهائياً
                                </span>
                              )}
                              {u.approvalStatus === "admin_review" && (
                                <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 border border-amber-300 animate-pulse">
                                  بانتظار قرار الأدمن
                                </span>
                              )}
                              <span
                                onClick={() => setPlanModalUser(u)}
                                title="انقر لتعديل وتعيين باقة الاشتراك لهذا المستخدم"
                                className={`rounded-full text-[10px] font-black px-2.5 py-0.5 cursor-pointer transition-all ${
                                  u.subscriptionPlan === "vip"
                                    ? "bg-[#05291A] text-white hover:bg-[#041D12]"
                                    : u.subscriptionPlan === "pro"
                                    ? "bg-[#056B38] text-white hover:bg-[#04552D]"
                                    : "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6] hover:bg-[#D1E3D6]"
                                }`}
                              >
                                باقة {u.subscriptionPlan === "vip" ? "VIP" : u.subscriptionPlan === "pro" ? "Pro" : "Free"}
                              </span>
                            </div>

                            <div className="text-xs text-[#526B5E] flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>{u.email}</span>
                              {u.phone && <span>· {u.phone}</span>}
                              {u.jobTitle && <span className="font-bold text-[#05291A]">· {u.jobTitle}</span>}
                              {u.companyName && <span className="font-bold text-[#05291A]">· شركة: {u.companyName}</span>}
                              <span>· تاريخ الانضمام: {u.joinDate}</span>
                            </div>

                            {u.status === "suspended" && u.suspendedUntil && (
                              <div className="text-xs font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 inline-flex items-center gap-1 mt-1">
                                <Clock className="h-3.5 w-3.5 text-amber-700" />
                                <span>ينتهي الإيقاف تلقائياً بتاريخ: {u.suspendedUntil}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Trust & SP Badges */}
                        <button
                          type="button"
                          onClick={() => (u.role === "developer" ? handleOpenEditPoints(u) : undefined)}
                          title={u.role === "developer" ? "انقر لتعديل درجة التراست و SP الممنوحة للمطور" : undefined}
                          className={`text-xs font-bold text-[#526B5E] bg-[#F7FAF8] border border-[#D1E3D6] px-3.5 py-2 rounded-2xl flex items-center gap-3 transition-all ${
                            u.role === "developer" ? "hover:border-[#056B38] hover:bg-[#E8FAF0] cursor-pointer" : ""
                          }`}
                        >
                          <div>Trust: <span className="text-[#056B38] font-black">{u.trustScore}%</span></div>
                          <div className="h-3 w-px bg-neutral-300" />
                          <div>SP: <span className="text-[#05291A] font-black">{u.skillPoints}</span></div>
                          {u.role === "developer" && (
                            <Award className="w-3.5 h-3.5 text-[#056B38] opacity-70" />
                          )}
                        </button>
                      </div>

                      {/* Bottom Control Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#526B5E]">نوع الحساب:</span>
                          <ScoraSelectControl
                            disabled={savingUserId === u.id}
                            value={u.role}
                            options={[
                              { value: "developer", label: "مطور برمجيات" },
                              { value: "client", label: "عميل / صاحب عمل" },
                            ]}
                            onChange={(newRole) => updateStatusOrRole(u.id, { role: newRole as AppRole })}
                          />

                          <button
                            type="button"
                            disabled={savingUserId === u.id}
                            onClick={() => updateStatusOrRole(u.id, { isAdmin: !u.isAdmin })}
                            className={`h-9 rounded-xl px-3 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                              u.isAdmin
                                ? "bg-[#056B38] text-white hover:bg-[#005B27] shadow-2xs"
                                : "border border-[#D1E3D6] bg-[#F7FAF8] text-[#05291A] hover:bg-[#E8FAF0] hover:border-[#056B38]"
                            }`}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            <span>{u.isAdmin ? "صلاحية أدمن" : "منح أدمن"}</span>
                          </button>

                          {u.role === "developer" && (
                            <button
                              type="button"
                              disabled={savingUserId === u.id}
                              onClick={async () => {
                                setSavingUserId(u.id);
                                await toggleDeveloperVerificationForAdmin(Number(u.id), !u.isVerified);
                                await loadUsers();
                                setSavingUserId(null);
                                addToast("تم تحديث شارة التوثيق", "success");
                              }}
                              className={`h-9 rounded-xl px-3 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                                u.isVerified
                                  ? "border border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100"
                                  : "border border-[#D1E3D6] bg-[#F7FAF8] text-[#526B5E] hover:bg-sky-50 hover:text-sky-800"
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>{u.isVerified ? "موثق" : "توثيق"}</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailsModalUser(u)}
                            title="عرض وفحص تفاصيل الملف الشخصي الكامل"
                            className="h-9 px-3 rounded-xl border border-neutral-200 bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#05291A] text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-[#056B38]" />
                            <span>فحص الملف</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditInfoUser(u)}
                            title="تعديل البيانات الأساسية"
                            className="h-9 px-3 rounded-xl border border-neutral-200 bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#05291A] text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#056B38]" />
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPasswordModalUser(u)}
                            title="تعيين كلمة مرور جديدة للمستخدم"
                            className="h-9 px-3 rounded-xl border border-neutral-200 bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#05291A] text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-[#056B38]" />
                            <span>كلمة السر</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNotifyModalUser(u)}
                            title="إرسال إشعار مباشر لحساب المستخدم"
                            className="h-9 px-3 rounded-xl border border-neutral-200 bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#05291A] text-xs font-black flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Bell className="h-3.5 w-3.5 text-[#056B38]" />
                            <span>إشعار</span>
                          </button>

                          <span className="text-xs font-bold text-[#526B5E] mr-1">الحالة:</span>
                          <ScoraSelectControl
                            disabled={savingUserId === u.id}
                            value={u.status}
                            options={[
                              { value: "active", label: "نشط" },
                              { value: "suspended", label: "إيقاف مؤقت..." },
                              { value: "banned", label: "حظر نهائي" },
                            ]}
                            onChange={(newStatus) => {
                              if (newStatus === "suspended") {
                                setSuspensionModalUser(u);
                              } else {
                                updateStatusOrRole(u.id, { status: newStatus as AccountStatus });
                              }
                            }}
                          />

                          {u.role === "developer" && (
                            <button
                              type="button"
                              disabled={savingUserId === u.id}
                              onClick={() => setResetTestUser(u)}
                              title="إعادة إتاحة اختبار التقييم للمطور"
                              className="h-9 px-3 rounded-xl border border-[#056B38]/30 bg-[#E8FAF0] hover:bg-[#056B38] hover:text-white text-[#056B38] text-xs font-black flex items-center gap-1 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>إعادة الاختبار</span>
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={savingUserId === u.id}
                            onClick={() => setDeleteModalUser(u)}
                            title="حذف الحساب نهائياً"
                            className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-black text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-12 text-center text-[#526B5E]">
                    <Users className="h-10 w-10 text-[#526B5E]/40 mx-auto mb-2" />
                    <p className="font-bold">لا توجد حسابات مطابقة للبحث أو الفلتر المحدد.</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Dense Table View Mode ─── */}
            {viewMode === "table" && (
              <div className="rounded-[26px] border border-[#D1E3D6] bg-white overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#F7FAF8] border-b border-[#D1E3D6] text-[#526B5E] font-black">
                      <tr>
                        <th className="p-3.5">#ID</th>
                        <th className="p-3.5">المستخدم</th>
                        <th className="p-3.5">نوع الحساب</th>
                        <th className="p-3.5">الباقة</th>
                        <th className="p-3.5">الحالة</th>
                        <th className="p-3.5">Trust & SP</th>
                        <th className="p-3.5">التواجد</th>
                        <th className="p-3.5 text-left">إجراءات وتحكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-bold text-[#05291A]">
                      {visibleUsers.length ? (
                        visibleUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-[#F7FAF8]/70 transition-all">
                            <td className="p-3.5 font-black text-[#056B38]">#{u.id}</td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <div className="h-8 w-8 rounded-xl bg-[#056B38]/10 text-[#056B38] flex items-center justify-center font-black text-xs">
                                    {u.name ? u.name.slice(0, 2).toUpperCase() : "U"}
                                  </div>
                                  {u.isOnline && (
                                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-black flex items-center gap-1.5">
                                    <span>{u.name}</span>
                                    {u.isAdmin && (
                                      <span className="rounded-full bg-[#056B38] text-white text-[9px] px-1.5 py-0.2 font-black">
                                        أدمن
                                      </span>
                                    )}
                                    {u.isVerified && (
                                      <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#526B5E] font-normal">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${
                                  u.role === "developer"
                                    ? "bg-emerald-50 text-[#056B38] border border-emerald-200"
                                    : "bg-sky-50 text-sky-800 border border-sky-200"
                                }`}
                              >
                                {u.role === "developer" ? "مطور" : "عميل"}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <button
                                type="button"
                                onClick={() => setPlanModalUser(u)}
                                title="انقر لتعديل وتعيين الباقة"
                                className={`rounded-xl px-2.5 py-1 text-[11px] font-black cursor-pointer transition-all ${
                                  u.subscriptionPlan === "vip"
                                    ? "bg-[#05291A] text-white hover:bg-[#041D12]"
                                    : u.subscriptionPlan === "pro"
                                    ? "bg-[#056B38] text-white hover:bg-[#04552D]"
                                    : "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6] hover:bg-[#D1E3D6]"
                                }`}
                              >
                                {u.subscriptionPlan === "vip" ? "VIP" : u.subscriptionPlan === "pro" ? "Pro" : "Free"}
                              </button>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${
                                  u.status === "active"
                                    ? "bg-[#E8FAF0] text-[#056B38]"
                                    : u.status === "suspended"
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {u.status === "active"
                                  ? "نشط"
                                  : u.status === "suspended"
                                  ? "موقوف"
                                  : "محظور"}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-[#056B38]">{u.trustScore}%</span>
                                <span className="text-neutral-300">/</span>
                                <span className="font-black text-[#05291A]">{u.skillPoints} SP</span>
                              </div>
                            </td>
                            <td className="p-3.5 text-[11px] text-[#526B5E]">
                              {u.isOnline ? (
                                <span className="font-black text-emerald-700 flex items-center gap-1">
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" /> الآن
                                </span>
                              ) : (
                                u.joinDate
                              )}
                            </td>
                            <td className="p-3.5 text-left">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setDetailsModalUser(u)}
                                  title="فحص الملف"
                                  className="p-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-[#E8FAF0] text-[#05291A]"
                                >
                                  <Eye className="h-3.5 w-3.5 text-[#056B38]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditInfoUser(u)}
                                  title="تعديل البيانات"
                                  className="p-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-[#E8FAF0] text-[#05291A]"
                                >
                                  <Edit3 className="h-3.5 w-3.5 text-[#056B38]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPasswordModalUser(u)}
                                  title="تعيين كلمة سر"
                                  className="p-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-[#E8FAF0] text-[#05291A]"
                                >
                                  <KeyRound className="h-3.5 w-3.5 text-[#056B38]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNotifyModalUser(u)}
                                  title="إرسال إشعار"
                                  className="p-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-[#E8FAF0] text-[#05291A]"
                                >
                                  <Bell className="h-3.5 w-3.5 text-[#056B38]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteModalUser(u)}
                                  title="حذف الحساب"
                                  className="p-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-[#526B5E]">
                            لا توجد حسابات مطابقة.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 2: PROJECTS & MODERATION TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "projects" && (
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-[26px] border border-[#D1E3D6] bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-[#05291A]">
                  <Briefcase className="h-5 w-5 text-[#056B38]" /> إدارة المشاريع والرقابة ({projects.length})
                </h2>
                <p className="mt-1 text-xs text-[#526B5E]">
                  مراجعة المشاريع، تعديل تفاصيلها وميزانياتها، مراجعة العروض المقدمة وحذف المشاريع المخالفة.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-[#526B5E]" />
                  <input
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="ابحث في المشاريع..."
                    className="h-9 rounded-xl border border-[#D1E3D6] pr-8 pl-3 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
                  />
                </div>

                <div className="min-w-[140px]">
                  <CustomSelect
                    value={projectSortBy}
                    onChange={(val) => setProjectSortBy(val as typeof projectSortBy)}
                    size="sm"
                    options={[
                      { value: "newest", label: "الأحدث" },
                      { value: "proposals", label: "الأكثر عروضاً" },
                      { value: "budget", label: "الأعلى ميزانية" },
                    ]}
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {(["all", "open", "in_progress", "completed", "closed"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setProjectStatusFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                        projectStatusFilter === st
                          ? "bg-[#056B38] text-white shadow-2xs"
                          : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0]"
                      }`}
                    >
                      {st === "all"
                        ? `الكل (${projects.length})`
                        : st === "open"
                        ? "مفتوح"
                        : st === "in_progress"
                        ? "قيد التنفيذ"
                        : st === "completed"
                        ? "مكتمل"
                        : "مغلق"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Projects List */}
            <div className="grid gap-3.5">
              {visibleProjects.length ? (
                visibleProjects.map((project) => (
                  <article
                    key={project.id}
                    className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 shadow-xs hover:border-[#056B38]/50 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-[#056B38]">#{project.id}</span>
                          <h3 className="text-base sm:text-lg font-black text-[#05291A]">
                            {project.title}
                          </h3>
                        </div>
                        <p className="mt-1 text-xs text-[#526B5E]">
                          {project.accountType === "company"
                            ? `شركة: ${project.companyName || project.ownerName}`
                            : `صاحب العمل: ${project.ownerName}`}{" "}
                          {project.ownerEmail ? `(${project.ownerEmail})` : ""} · نُشر: {project.postedAt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#526B5E]">حالة المشروع:</span>
                        <ScoraSelectControl
                          disabled={savingProjectId === project.id}
                          value={project.status}
                          options={[
                            { value: "open", label: "مفتوح للتقديم" },
                            { value: "in_progress", label: "قيد التنفيذ" },
                            { value: "completed", label: "مكتمل ومسلّم" },
                            { value: "closed", label: "مغلق / ملغي" },
                          ]}
                          onChange={(newSt) => handleUpdateProjectStatus(project.id, newSt as "open" | "in_progress" | "completed" | "closed")}
                        />
                      </div>
                    </div>

                    {project.description && (
                      <p className="text-xs text-[#526B5E] line-clamp-2 leading-relaxed bg-[#F7FAF8] p-3 rounded-2xl border border-neutral-100">
                        {project.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                      <div className="flex flex-wrap gap-4 text-xs text-[#526B5E]">
                        <span>
                          الميزانية:{" "}
                          <strong className="text-[#05291A]">
                            {project.budgetFrom === project.budgetTo
                              ? `${project.budgetFrom.toLocaleString("ar-EG")} ج.م`
                              : `${project.budgetFrom.toLocaleString("ar-EG")} - ${project.budgetTo.toLocaleString(
                                  "ar-EG"
                                )} ج.م`}
                          </strong>
                        </span>
                        <span>
                          العروض:{" "}
                          <strong className="text-[#056B38] font-black bg-[#E8FAF0] px-2 py-0.5 rounded-lg border border-[#D1E3D6]">
                            {project.proposalsCount} عرض
                          </strong>
                        </span>
                        <span>المدة: <strong className="text-[#05291A]">{project.deadlineDays ? `${project.deadlineDays} يوم` : "غير محددة"}</strong></span>
                        {project.category && <span>التصنيف: <strong className="text-[#05291A]">{project.category}</strong></span>}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsModalProject(project)}
                          title="عرض تفاصيل المشروع والعروض المقدمة"
                          className="h-9 px-3.5 rounded-xl border border-neutral-200 bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#05291A] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#056B38]" />
                          <span>فحص المشروع والعروض</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditModalProject(project)}
                          title="تعديل تفاصيل المشروع"
                          className="h-9 px-3.5 rounded-xl border border-neutral-200 bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#05291A] text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-[#056B38]" />
                          <span>تعديل</span>
                        </button>

                        <button
                          type="button"
                          disabled={savingProjectId === project.id}
                          onClick={() => setDeleteModalProject(project)}
                          title="حذف المشروع نهائياً"
                          className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-xs font-black flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-12 text-center text-[#526B5E]">
                  <Briefcase className="h-10 w-10 text-[#526B5E]/40 mx-auto mb-2" />
                  <p className="font-bold">لا توجد مشاريع مطابقة للفلتر المحدد.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 3: DEVELOPER ASSESSMENTS & TESTING SESSIONS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "assessments" && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[26px] border border-[#D1E3D6] bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-[#05291A]">
                  <FileCheck className="h-5 w-5 text-[#056B38]" /> جلسات اختبارات وتقييم المطورين ({assessments.length})
                </h2>
                <p className="mt-1 text-xs text-[#526B5E]">
                  متابعة جلسات التقييم الذكي واختبارات المطورين، الدرجات ونقاط التراست الممنوحة والمراجعات.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="absolute right-3 top-2.5 h-3.5 w-3.5 text-[#526B5E]" />
                  <input
                    value={assessmentSearch}
                    onChange={(e) => setAssessmentSearch(e.target.value)}
                    placeholder="ابحث باسم المطور أو المعرف..."
                    className="h-9 rounded-xl border border-[#D1E3D6] pr-8 pl-3 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
                  />
                </div>

                <div className="flex flex-wrap gap-1">
                  {(["all", "admin_review", "approved", "in_progress", "rejected"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setAssessmentStatusFilter(st)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                        assessmentStatusFilter === st
                          ? "bg-[#056B38] text-white shadow-2xs"
                          : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0]"
                      }`}
                    >
                      {st === "all"
                        ? "الكل"
                        : st === "admin_review"
                        ? "بانتظار المراجعة"
                        : st === "approved"
                        ? "معتمد"
                        : st === "in_progress"
                        ? "جاري الاختبار"
                        : "مرفوض"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Assessments List */}
            <div className="grid gap-3.5">
              {visibleAssessments.length ? (
                visibleAssessments.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 shadow-xs hover:border-[#056B38]/50 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-[#05291A] text-base">
                            {item.developerName}
                          </span>
                          <span className="text-xs text-[#526B5E]">({item.developerEmail})</span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                              item.status === "approved"
                                ? "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
                                : item.status === "admin_review"
                                ? "bg-amber-100 text-amber-900 border border-amber-300 animate-pulse"
                                : item.status === "in_progress"
                                ? "bg-sky-50 text-sky-800 border border-sky-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {item.status === "approved"
                              ? "معتمد وناجح"
                              : item.status === "admin_review"
                              ? "بانتظار مراجعة الأدمن"
                              : item.status === "in_progress"
                              ? "جاري أداء الاختبار"
                              : "مرفوض"}
                          </span>
                        </div>
                        <p className="text-xs text-[#526B5E] mt-1">
                          المسمى: {item.jobTitle} · النموذج: <code className="font-mono text-[#05291A]">{item.model || "Default"}</code> · بدأ: {item.startedAt}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-left bg-[#F7FAF8] border border-[#D1E3D6] px-3.5 py-1.5 rounded-xl">
                          <span className="text-xs text-[#526B5E] block">النتيجة والدرجات:</span>
                          <div className="flex items-center gap-2 font-black text-xs">
                            <span className="text-[#056B38]">الدرجة: {item.score ?? 0}%</span>
                            <span>·</span>
                            <span className="text-amber-800">Trust: +{item.trustAwarded ?? 0}%</span>
                            <span>·</span>
                            <span className="text-[#05291A]">{item.spAwarded ?? 0} SP</span>
                          </div>
                        </div>

                        <Link
                          href={`/admin/developers/${item.publicId}/review`}
                          className="h-10 px-4 rounded-xl bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          <span>فتح مراجعة الجلسة</span>
                        </Link>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-12 text-center text-[#526B5E]">
                  <FileCheck className="h-10 w-10 text-[#056B38]/40 mx-auto mb-2" />
                  <p className="font-bold">لا توجد جلسات اختبار مطابقة للفلتر المحدد.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 4: SUPPORT TICKETS & REPORTS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "tickets" && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[26px] border border-[#D1E3D6] bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-[#05291A]">
                  <MessageSquare className="h-5 w-5 text-[#056B38]" /> مركز البلاغات وتذاكر الدعم ({tickets.length})
                </h2>
                <p className="mt-1 text-xs text-[#526B5E]">
                  متابعة بلاغات المستخدمين، الشكاوى والنزاعات وحلها مباشرة.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(["all", "new", "reviewing", "resolved"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setTicketStatusFilter(st)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      ticketStatusFilter === st
                        ? "bg-[#056B38] text-white shadow-2xs"
                        : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0]"
                    }`}
                  >
                    {st === "all"
                      ? `الكل (${tickets.length})`
                      : st === "new"
                      ? "جديد"
                      : st === "reviewing"
                      ? "قيد المعالجة"
                      : "تم الحل"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets List */}
            <div className="grid gap-3.5">
              {visibleTickets.length ? (
                visibleTickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#526B5E]">#{ticket.id}</span>
                          <span className="rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold px-2.5 py-0.5 border border-amber-300">
                            {ticket.category}
                          </span>
                          <h3 className="text-base font-black text-[#05291A]">{ticket.subject}</h3>
                        </div>
                        <p className="mt-1 text-xs text-[#526B5E]">
                          مقدم البلاغ: <strong className="text-[#05291A]">{ticket.userName}</strong> ({ticket.userEmail}) · تاريخ الإرسال: {ticket.createdAt}
                        </p>
                        {ticket.reportedUserName && (
                          <div className="mt-1 text-xs font-black text-red-700 bg-red-50 p-2 rounded-xl border border-red-200 inline-block">
                            المُبلغ عنه: {ticket.reportedUserName} ({ticket.reportedUserEmail})
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#526B5E]">حالة التذكرة:</span>
                        <ScoraSelectControl
                          value={ticket.status}
                          options={[
                            { value: "new", label: "جديد (New)" },
                            { value: "reviewing", label: "قيد المعالجة" },
                            { value: "resolved", label: "تم الحل (Resolved)" },
                          ]}
                          onChange={(newSt) => handleUpdateTicketStatus(ticket.id, newSt as "new" | "reviewing" | "resolved")}
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-3.5 text-xs text-[#05291A] leading-relaxed">
                      {ticket.description}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-12 text-center text-[#526B5E]">
                  <CheckCircle className="h-10 w-10 text-[#056B38]/40 mx-auto mb-2" />
                  <p className="font-bold">لا توجد بلاغات أو تذاكر دعم في هذا التصنيف.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 5: REVIEWS MODERATION TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "reviews" && (
          <section className="space-y-4">
            <div className="rounded-[26px] border border-[#D1E3D6] bg-white p-5 shadow-xs">
              <h2 className="flex items-center gap-2 text-xl font-black text-[#05291A]">
                <Star className="h-5 w-5 text-amber-500 fill-amber-400" /> تقييمات ومراجعات المستخدمين ({reviews.length})
              </h2>
              <p className="mt-1 text-xs text-[#526B5E]">
                متابعة تقييمات العملاء والمطورين على المشاريع المنجزة وحذف التقييمات المخالفة أو المسيئة.
              </p>
            </div>

            <div className="grid gap-3.5">
              {reviews.length ? (
                reviews.map((rev) => (
                  <article
                    key={rev.id}
                    className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 shadow-xs space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < rev.rating ? "fill-amber-400 text-amber-500" : "text-gray-300"}`}
                              />
                            ))}
                          </div>
                          <span className="font-black text-[#05291A] text-sm">
                            {rev.rating} من 5
                          </span>
                          <span className="text-xs text-[#526B5E]">· {rev.createdAt}</span>
                        </div>
                        <p className="text-xs text-[#526B5E] mt-1">
                          من: <strong className="text-[#05291A]">{rev.reviewerName}</strong> ({rev.reviewerEmail}) 
                          {" "}← إلى: <strong className="text-[#05291A]">{rev.revieweeName}</strong> ({rev.revieweeEmail})
                        </p>
                        <p className="text-xs text-[#056B38] font-bold mt-0.5">
                          المشروع: {rev.projectTitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setReviewToDelete(rev)}
                        title="حذف هذا التقييم"
                        className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف التقييم</span>
                      </button>
                    </div>

                    {rev.comment && (
                      <p className="text-xs text-[#05291A] font-bold leading-relaxed bg-[#F7FAF8] p-3 rounded-xl border border-neutral-100">
                        &quot;{rev.comment}&quot;
                      </p>
                    )}
                  </article>
                ))
              ) : (
                <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-12 text-center text-[#526B5E]">
                  <Star className="h-10 w-10 text-amber-400 mx-auto mb-2 opacity-50" />
                  <p className="font-bold">لا توجد تقييمات مسجلة حتى الآن.</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 6: AUDIT LOGS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "audit" && (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[26px] border border-[#D1E3D6] bg-white p-5 shadow-xs">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-black text-[#05291A]">
                  <History className="h-5 w-5 text-[#056B38]" /> سجل الرقابة والعمليات الإدارية ({auditLogs.length})
                </h2>
                <p className="mt-1 text-xs text-[#526B5E]">
                  سجل أحداث النظام والأمان والعمليات الإدارية المنفذة مع عناوين IP والتواريخ.
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(["all", "admin", "security", "ai", "system"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setAuditCategoryFilter(cat)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-black transition-all cursor-pointer ${
                      auditCategoryFilter === cat
                        ? "bg-[#056B38] text-white shadow-2xs"
                        : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0]"
                    }`}
                  >
                    {cat === "all"
                      ? "الكل"
                      : cat === "admin"
                      ? "عمليات الأدمن"
                      : cat === "security"
                      ? "أمان وتسجيل دخول"
                      : cat === "ai"
                      ? "الذكاء الاصطناعي"
                      : "النظام"}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[26px] border border-[#D1E3D6] bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#F7FAF8] border-b border-[#D1E3D6] text-[#526B5E] font-black">
                    <tr>
                      <th className="p-3.5">#ID</th>
                      <th className="p-3.5">المنفّذ (Actor)</th>
                      <th className="p-3.5">العملية (Action)</th>
                      <th className="p-3.5">التصنيف</th>
                      <th className="p-3.5">الهدف / التفاصيل</th>
                      <th className="p-3.5">IP</th>
                      <th className="p-3.5">الوقت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-bold text-[#05291A]">
                    {visibleAuditLogs.length ? (
                      visibleAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#F7FAF8]/70 transition-all">
                          <td className="p-3.5 font-black text-[#056B38]">#{log.id}</td>
                          <td className="p-3.5">
                            <span className="font-black text-[#05291A]">{log.actorName}</span>
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono text-xs text-[#056B38] bg-[#E8FAF0] px-2 py-0.5 rounded-lg border border-[#D1E3D6]">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span className="rounded-lg bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-[#526B5E]">
                              {log.category}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#526B5E] max-w-xs truncate">
                            {log.details || `${log.targetType || ""} #${log.targetId || ""}`}
                          </td>
                          <td className="p-3.5 font-mono text-[11px] text-[#526B5E] dir-ltr">
                            {log.ipAddress || "—"}
                          </td>
                          <td className="p-3.5 text-[#526B5E] text-[11px] whitespace-nowrap">
                            {log.createdAt}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[#526B5E]">
                          لا توجد سجلات مطابقة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 7: LIVE STATS & ANALYTICS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "stats" && (
          <section className="space-y-6">
            {/* KPI Summary Row */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[24px] bg-white border border-[#D1E3D6] p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#526B5E]">إجمالي مشاهدات المنصة</span>
                  <div className="p-2 rounded-xl bg-[#E8FAF0] text-[#056B38]">
                    <Eye className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-[#05291A]">
                  {(stats.totals?.visits ?? 0).toLocaleString("ar-EG")}
                </div>
                <div className="mt-1 text-[11px] text-[#526B5E]">
                  مجموع الزيارات عبر كافة صفحات الموقع
                </div>
              </div>

              <div className="rounded-[24px] bg-white border border-[#D1E3D6] p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#526B5E]">إجمالي الزوار الفريدين</span>
                  <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-[#05291A]">
                  {(stats.totals?.visitors ?? 0).toLocaleString("ar-EG")}
                </div>
                <div className="mt-1 text-[11px] text-[#526B5E]">
                  زوار فريدون عبر الجلسات
                </div>
              </div>

              <div className="rounded-[24px] bg-white border border-[#D1E3D6] p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#526B5E]">النشطون آخر 15 دقيقة</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <Activity className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-[#056B38]">
                  {(stats.totals?.online_now ?? 0).toLocaleString("ar-EG")}
                </div>
                <div className="mt-1 text-[11px] text-[#526B5E]">
                  متواجدون ويتصفحون المنصة الآن
                </div>
              </div>

              <div className="rounded-[24px] bg-white border border-[#D1E3D6] p-5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#526B5E]">المشاريع والعروض المودعة</span>
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                    <Briefcase className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-2 text-2xl font-black text-[#05291A]">
                  {(stats.totals?.projects ?? 0) + (stats.totals?.proposals ?? 0)}
                </div>
                <div className="mt-1 text-[11px] text-[#526B5E]">
                  {stats.totals?.projects ?? 0} مشروع · {stats.totals?.proposals ?? 0} عرض
                </div>
              </div>
            </div>

            {/* Instant Smooth Analytics Line Chart + Breakdown Charts */}
            <AdminProgressiveChart
              timeline={stats.timeline || []}
              totals={stats.totals}
              hourlyToday={stats.hourlyToday || []}
              categories={stats.categories || []}
            />

            {/* Top Visited Pages Section */}
            <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h3 className="font-black text-[#05291A] text-base flex items-center gap-2">
                  <Globe className="h-4 w-4 text-[#056B38]" /> أكثر صفحات المنصة زيارة وتفاعلاً
                </h3>
                <span className="text-xs text-[#526B5E] font-bold">بيانات حقيقية من Page Views</span>
              </div>

              <div className="divide-y divide-neutral-100 text-xs">
                {stats.topPaths && stats.topPaths.length > 0 ? (
                  stats.topPaths.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-6 w-6 rounded-lg bg-[#F7FAF8] border border-[#D1E3D6] text-[#05291A] font-black flex items-center justify-center text-[11px]">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-[#05291A] font-mono dir-ltr truncate">
                          {p.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[#526B5E]">{p.visitors} زائر</span>
                        <span className="font-black text-[#056B38] bg-[#E8FAF0] px-2.5 py-0.5 rounded-full border border-[#D1E3D6]">
                          {p.visits.toLocaleString("ar-EG")} زيارة
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-[#526B5E]">لا توجد زيارات مسجلة حتى الآن.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 8: AI MODELS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "ai" && <OpenRouterSettings notify={addToast} />}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 9: AI CHAT LOGS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "ai_logs" && <AdminAiLogsTab notify={addToast} />}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 10: PLANS PRICING & LIMITS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "plans" && <AdminPlansTab notify={addToast} />}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 11: COUPONS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "coupons" && <AdminCouponsTab notify={addToast} />}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* TAB 10: SETTINGS TAB */}
        {/* ───────────────────────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="space-y-4">
            <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex items-center justify-between shadow-xs">
              <div>
                <h2 className="font-black text-[#05291A] flex items-center gap-2 text-base sm:text-lg">
                  <Bot className="h-5 w-5 text-[#056B38]" /> مساعد الذكاء الاصطناعي العام (AI Assistant)
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
                className={`h-10 rounded-full px-6 text-xs sm:text-sm font-black text-white transition-all cursor-pointer ${
                  systemSettings.isAiAssistantEnabled ? "bg-[#056B38] hover:bg-[#005B27]" : "bg-gray-500"
                }`}
              >
                {systemSettings.isAiAssistantEnabled ? "مفعّل" : "متوقف"}
              </button>
            </section>

            <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex items-center justify-between shadow-xs">
              <div>
                <h2 className="font-black text-[#05291A] text-base sm:text-lg">التسجيل السريع للحسابات</h2>
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
                className={`h-10 rounded-full px-6 text-xs sm:text-sm font-black text-white transition-all cursor-pointer ${
                  quickRegistration ? "bg-[#056B38] hover:bg-[#005B27]" : "bg-gray-500"
                }`}
              >
                {quickRegistration ? "مفتوح" : "متوقف"}
              </button>
            </section>

            <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h2 className="font-black text-[#05291A] text-base sm:text-lg">مكافأة تقييم مشاريع المطورين (SP لكل نجمة)</h2>
                <p className="mt-1 text-xs text-[#526B5E]">عدد نقاط المهارة (SP) التي تضاف للمطور تلقائياً عند تقييم مشاريعه في معرض الأعمال.</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={spPerStar}
                  onChange={(e) => setSpPerStar(parseInt(e.target.value, 10) || 5)}
                  className="w-20 h-10 rounded-2xl border border-[#D1E3D6] text-center font-bold text-sm bg-[#F7FAF8] focus:outline-none focus:border-[#056B38]"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const r = await setSpPerStarSetting(spPerStar);
                    if (r.ok) {
                      addToast(`تم ضبط المكافأة على ${spPerStar} SP لكل نجمة`, "success");
                    } else addToast(r.error, "warn");
                  }}
                  className="h-10 rounded-full px-5 text-xs font-black text-white bg-[#056B38] hover:bg-[#005B27] transition-all cursor-pointer shadow-xs"
                >
                  حفظ المعدل
                </button>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* ALL MODALS */}
      {/* ───────────────────────────────────────────────────────────── */}

      {/* 1. Full User Details Inspector Modal */}
      {detailsModalUser && (
        <UserDetailsModal
          user={detailsModalUser}
          onClose={() => setDetailsModalUser(null)}
          onOpenEdit={(u) => setEditInfoUser(u)}
          onOpenPassword={(u) => setPasswordModalUser(u)}
          onOpenNotify={(u) => setNotifyModalUser(u)}
          onOpenPoints={(u) => handleOpenEditPoints(u)}
          onOpenSuspension={(u) => setSuspensionModalUser(u)}
          onOpenDelete={(u) => setDeleteModalUser(u)}
          onOpenResetTest={(u) => setResetTestUser(u)}
          onOpenPlan={(u) => setPlanModalUser(u)}
        />
      )}

      {/* 1.1 Change User Subscription Plan Modal */}
      {planModalUser && (
        <ChangeUserPlanModal
          user={planModalUser}
          onClose={() => setPlanModalUser(null)}
          onSave={handleSaveUserPlan}
        />
      )}

      {/* 2. Edit User Info Modal */}
      {editInfoUser && (
        <EditUserModal
          user={editInfoUser}
          onClose={() => setEditInfoUser(null)}
          onSave={handleSaveFullDetails}
        />
      )}

      {/* 3. Set New Password Modal */}
      {passwordModalUser && (
        <SetPasswordModal
          user={passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          onSave={handleSetPassword}
        />
      )}

      {/* 4. Send Notification Modal */}
      {notifyModalUser && (
        <SendNotificationModal
          user={notifyModalUser}
          onClose={() => setNotifyModalUser(null)}
          onSend={handleSendNotification}
        />
      )}

      {/* 5. Custom Duration Suspension Modal */}
      {suspensionModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-black text-[#05291A] flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                تحديد فترة الإيقاف المؤقت
              </h3>
              <button
                type="button"
                onClick={() => setSuspensionModalUser(null)}
                className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <p className="text-xs text-[#526B5E] leading-relaxed">
                يرجى اختيار المدة الزمنية لإيقاف حساب{" "}
                <strong className="text-[#05291A] font-black">{suspensionModalUser.name}</strong> ({suspensionModalUser.email}):
              </p>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { days: 1, label: "يوم واحد (24 ساعة)" },
                  { days: 3, label: "3 أيّام" },
                  { days: 7, label: "أسبوع واحد (7 أيّام)" },
                  { days: 14, label: "أسبوعين (14 يوم)" },
                  { days: 30, label: "شهر (30 يوم)" },
                  { days: 90, label: "3 أشهر (90 يوم)" },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => {
                      setSelectedSuspensionDays(item.days);
                      setCustomDaysInput("");
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-right transition-all flex items-center justify-between cursor-pointer ${
                      !customDaysInput && selectedSuspensionDays === item.days
                        ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] font-black shadow-2xs"
                        : "border-[#D1E3D6] bg-white text-[#05291A] hover:bg-[#F7FAF8]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {!customDaysInput && selectedSuspensionDays === item.days && (
                      <ShieldAlert className="h-3.5 w-3.5 text-[#056B38]" />
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#526B5E]">أو أدخل عدداً مخصصاً من الأيام:</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={customDaysInput}
                  onChange={(e) => setCustomDaysInput(e.target.value)}
                  placeholder="مثال: 45 يوماً"
                  className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
                />
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 font-bold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  سيتم رفع الإيقاف تلقائياً بعد{" "}
                  {customDaysInput ? `${customDaysInput} يوم` : `${selectedSuspensionDays} يوم`} من تاريخ اليوم.
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmSuspension}
                className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>تأكيد الإيقاف المؤقت</span>
              </button>
              <button
                type="button"
                onClick={() => setSuspensionModalUser(null)}
                className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Edit Developer Trust & SP Modal */}
      {editPointsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-black text-[#05291A] flex items-center gap-2">
                <Award className="h-5 w-5 text-[#056B38]" />
                تعديل درجة التراست ونقاط المهارة (SP)
              </h3>
              <button type="button" onClick={() => setEditPointsUser(null)} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-[#526B5E]">
                تعديل نقاط المطور <strong className="text-[#05291A]">{editPointsUser.name}</strong> ({editPointsUser.email}):
              </p>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#05291A] flex items-center justify-between">
                  <span>درجة التراست (Trust Score - حتى 100%):</span>
                  <span className="text-[#056B38] font-bold">{customTrustScore}%</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={customTrustScore}
                  onChange={(e) => setCustomTrustScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-[#05291A] flex items-center justify-between">
                  <span>نقاط المهارة (SP - مفتوحة):</span>
                  <span className="text-amber-700 font-bold">{customSkillPoints} SP</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={customSkillPoints}
                  onChange={(e) => setCustomSkillPoints(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveCustomPoints}
                className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>حفظ التعديلات فوراً</span>
              </button>
              <button
                type="button"
                onClick={() => setEditPointsUser(null)}
                className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Reset Developer Assessment Modal */}
      {resetTestUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-black text-[#05291A] flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-[#056B38]" />
                إعادة تفعيل اختبار تقييم المطور
              </h3>
              <button type="button" onClick={() => setResetTestUser(null)} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#526B5E] leading-relaxed font-bold">
                هل ترغب في إتاحة إعادة تقديم اختبار تقييم المطورين للمطور{" "}
                <strong className="text-[#05291A] font-black">{resetTestUser.name}</strong>؟
              </p>

              <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] p-3.5 text-xs text-[#056B38] font-bold leading-relaxed">
                ستتم إتاحة محاولة جديدة للمطور مع الحفاظ على سجل الاختبارات السابقة، وسيصله إشعار مباشر فوراً.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmResetAssessment}
                className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>تأكيد إعادة الاختبار</span>
              </button>
              <button
                type="button"
                onClick={() => setResetTestUser(null)}
                className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Permanent Account Deletion Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-black text-red-700 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                حذف الحساب نهائياً من المنصة
              </h3>
              <button type="button" onClick={() => setDeleteModalUser(null)} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#526B5E] leading-relaxed font-bold">
                هل أنت متأكد من رغبتك في حذف حساب{" "}
                <strong className="text-[#05291A] font-black">{deleteModalUser.name}</strong> ({deleteModalUser.email}) نهائياً؟
              </p>

              <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 font-bold leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-red-900 font-black">
                  <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
                  <span>تحذير: لا يمكن التراجع عن هذه العملية!</span>
                </div>
                <p>سيتم حذف بيانات الحساب والملف الشخصي وسجل الاختبارات نهائياً من قاعدة البيانات.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>تأكيد الحذف النهائي</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Project Details & Bids Modal */}
      {detailsModalProject && (
        <ProjectDetailsModal
          project={detailsModalProject}
          onClose={() => setDetailsModalProject(null)}
          onOpenEdit={(p) => setEditModalProject(p)}
          onOpenDelete={(p) => setDeleteModalProject(p)}
          onDeleteProposal={handleDeleteProposal}
        />
      )}

      {/* 10. Edit Project Modal */}
      {editModalProject && (
        <EditProjectModal
          project={editModalProject}
          onClose={() => setEditModalProject(null)}
          onSave={handleSaveProject}
        />
      )}

      {/* 11. Delete Project Modal */}
      {deleteModalProject && (
        <DeleteProjectModal
          project={deleteModalProject}
          onClose={() => setDeleteModalProject(null)}
          onConfirm={handleDeleteProject}
        />
      )}

      {/* 12. Delete Review Confirmation Modal */}
      {reviewToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-black text-red-700 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-600" />
                حذف التقييم نهائياً
              </h3>
              <button type="button" onClick={() => setReviewToDelete(null)} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#526B5E] leading-relaxed font-bold">
                هل أنت متأكد من رغبتك في حذف تقييم{" "}
                <strong className="text-[#05291A] font-black">{reviewToDelete.reviewerName}</strong> على مشروع «{reviewToDelete.projectTitle}»؟
              </p>

              {reviewToDelete.comment && (
                <p className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                  &quot;{reviewToDelete.comment}&quot;
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={deletingReviewId === reviewToDelete.id}
                onClick={() => handleDeleteReview(reviewToDelete.id)}
                className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{deletingReviewId === reviewToDelete.id ? "جاري الحذف..." : "تأكيد حذف التقييم"}</span>
              </button>
              <button
                type="button"
                onClick={() => setReviewToDelete(null)}
                className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <BroadcastNotificationModal
          onClose={() => setShowBroadcastModal(false)}
          onSend={handleBroadcastSend}
        />
      )}

      <SiteFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Scora Custom Styled Select Dropdown Control
// ─────────────────────────────────────────────────────────────
function ScoraSelectControl({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="min-w-[150px]">
      <CustomSelect
        disabled={disabled}
        value={value}
        onChange={onChange}
        size="sm"
        options={options}
      />
    </div>
  );
}
