"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { updateUserForAdmin } from "@/lib/actions/admin";
import { setAiAssistantEnabled } from "@/lib/actions/settings";
import {
  ShieldCheck,
  Users,
  AlertTriangle,
  FileText,
  Settings,
  Bot,
  Ban,
  UserCheck,
  UserX,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Activity,
  CheckCircle2,
  Lock,
  Zap,
  Globe,
  Key,
  Database,
  BarChart3,
  MessageSquare,
  Send,
  Mail,
  Sparkles,
  ChevronDown,
  XCircle,
  Clock,
  ArrowUpRight,
  ExternalLink,
  DollarSign,
  Download,
  Eye,
  Briefcase,
  Terminal
} from "lucide-react";
import { ProgressiveLineChart } from "@/components/progressive-line-chart";
import {
  DiscordIcon,
  FacebookIcon,
  GoogleIcon,
  GithubIcon,
  XIcon,
  LinkedinIcon,
} from "@/components/auth/social-icons";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "developer" | "client" | "admin" | "moderator";
  trustScore: number;
  skillPoints: number;
  status: "active" | "suspended" | "banned";
  joinDate: string;
  reportsCount: number;
}

interface TicketChatMessage {
  id: string;
  sender: "complainant" | "admin" | "reported";
  senderName: string;
  text: string;
  time: string;
}

interface ComplaintItem {
  id: string;
  complainantName: string;
  complainantEmail: string;
  complainantRole: string;
  complainantTrust: number;
  reportedId: string;
  reportedName: string;
  reportedEmail: string;
  reportedRole: string;
  reportedTrust: number;
  reportedSp: number;
  reportedReportsCount: number;
  category: "كود غير مطابق" | "تأخير تسليم" | "مخالفة سلوك" | "نزاع مالي";
  description: string;
  status: "new" | "reviewing" | "resolved";
  date: string;
  chatHistory: TicketChatMessage[];
}

interface CustomAdminDropdownProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (newValue: T) => void;
  className?: string;
}

function CustomAdminDropdown<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: CustomAdminDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full inline-flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-xl border border-[#D1E3D6] bg-[#F7FAF8] hover:bg-[#E8FAF0] hover:border-[#056B38] text-[12px] font-extrabold text-[#05291A] cursor-pointer transition-all shadow-2xs"
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#056B38] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[170px] w-full z-50 bg-white rounded-2xl border-2 border-[#056B38] p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-right px-3 py-2 rounded-xl text-[12px] font-bold cursor-pointer transition-colors ${
                  opt.value === value
                    ? "bg-[#E8FAF0] text-[#056B38] font-extrabold"
                    : "text-[#05291A] hover:bg-[#F7FAF8]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface SystemAuditLog {
  id: string;
  action: string;
  category: "أمنية" | "إدارية" | "AI Engine" | "نظام";
  performedBy: string;
  ipAddress: string;
  timestamp: string;
  details: string;
  status: "success" | "warn" | "danger";
}

export default function AdminPage() {
  const { userRole, systemSettings, updateSystemSettings, addToast } = useProfile();

  const [activeTab, setActiveTab] = useState<"users" | "complaints" | "system" | "ai" | "trust" | "logs">("users");

  // Active Ticket Live Chat Modal / Window State
  const [activeChatTicket, setActiveChatTicket] = useState<ComplaintItem | null>(null);
  const [chatInputText, setChatInputText] = useState("");

  // Full Real User Edit Modal State
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "developer" as "developer" | "client" | "admin" | "moderator",
    skillPoints: 0,
    trustScore: 100,
    status: "active" as "active" | "suspended" | "banned",
    reportsCount: 0,
  });

  // INTERACTIVE CHARTS STATE
  const [chartTimeRange, setChartTimeRange] = useState<"2026" | "q2" | "last30">("2026");
  const [chartType, setChartType] = useState<"enterprise" | "bar">("enterprise");
  
  // Hover Tooltip Month State
  const [hoveredMonth, setHoveredMonth] = useState<{
    name: string;
    revenue: string;
    volume: number;
    devs: number;
    aiEval: number;
    growth: string;
  } | null>(null);

  // Filter state for users
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "developer" | "client" | "banned">("all");

  // Filter state for logs
  const [logCategoryFilter, setLogCategoryFilter] = useState<"all" | "أمنية" | "إدارية" | "AI Engine">("all");

  // Custom Dropdown state for AI Model Select
  const [isAiModelDropdownOpen, setIsAiModelDropdownOpen] = useState(false);

  // Enterprise Financial Chart Data Points — populated from DB when available
  const enterpriseChartPoints: Array<{
    name: string; revenue: string; volume: number; devs: number; aiEval: number; x: number; yRev: number; yVol: number;
  }> = [];

  // Managed Users List starting clean from real registered users
  const [usersList, setUsersList] = useState<UserItem[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadUsers = () => fetch("/api/admin/users", { cache: "no-store" })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("تعذر تحميل المستخدمين")))
        .then((dbUsers: UserItem[]) => setUsersList(dbUsers))
        .catch(() => addToast("تعذر تحميل المستخدمين من قاعدة البيانات", "warn"));
      loadUsers();
      const usersTimer = window.setInterval(loadUsers, 5000);

      const savedComplaints = localStorage.getItem("scora_admin_complaints");
      if (savedComplaints) {
        try { setComplaintsList(JSON.parse(savedComplaints)); } catch (e) {}
      }
      return () => window.clearInterval(usersTimer);
    }
  }, []);

  const updateUsersListState = (updater: (prev: UserItem[]) => UserItem[]) => {
    setUsersList((prev) => {
      return updater(prev);
    });
  };

  // System Audit & Activity Logs Stream
  const [systemLogsList] = useState<SystemAuditLog[]>([]);

  // Managed Complaints List
  const [complaintsList, setComplaintsList] = useState<ComplaintItem[]>([]);

  // AI & System Form State
  const [activePlatformConfig, setActivePlatformConfig] = useState<string | null>("google");
  const [googleClientId, setGoogleClientId] = useState(systemSettings.googleClientId);
  const [facebookAppId, setFacebookAppId] = useState(systemSettings.facebookAppId);
  const [discordClientId, setDiscordClientId] = useState(systemSettings.discordClientId);
  const [linkedinClientId, setLinkedinClientId] = useState(systemSettings.linkedinClientId);
  const [xClientId, setXClientId] = useState(systemSettings.xClientId);
  const [githubClientId, setGithubClientId] = useState(systemSettings.githubClientId);
  const [phoneOtpProvider, setPhoneOtpProvider] = useState(systemSettings.phoneOtpProvider);
  const [demoDefaultRole, setDemoDefaultRole] = useState<"developer" | "client">(systemSettings.oneClickDefaultRole);

  const [smtpHost, setSmtpHost] = useState(systemSettings.smtpHost || "smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(systemSettings.smtpPort || "587");
  const [smtpUser, setSmtpUser] = useState(systemSettings.smtpUser || "notifications@scora.app");
  const [smtpPass, setSmtpPass] = useState(systemSettings.smtpPass || "••••••••");
  const [smtpFromEmail, setSmtpFromEmail] = useState(systemSettings.smtpFromEmail || "no-reply@scora.app");
  const [smtpFromName, setSmtpFromName] = useState(systemSettings.smtpFromName || "منصة سكورا — Scora Platform");

  const [aiBaseUrl, setAiBaseUrl] = useState(systemSettings.aiAssistantBaseUrl);
  const [aiApiKey, setAiApiKey] = useState(systemSettings.aiAssistantApiKey);
  const [aiModel, setAiModel] = useState(systemSettings.trustEngineModel);
  const [baseTrust, setBaseTrust] = useState(systemSettings.baseTrustPoints);
  const [penaltyPoints, setPenaltyPoints] = useState(systemSettings.integrityPenalty);
  const [spRate, setSpRate] = useState(systemSettings.spExchangeRate);
  const [minTrust, setMinTrust] = useState(systemSettings.minTrustThreshold);

  // Full User Editing Handlers
  const handleOpenEditUserModal = (user: UserItem) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      skillPoints: user.skillPoints,
      trustScore: user.trustScore,
      status: user.status,
      reportsCount: user.reportsCount,
    });
  };

  const handleSaveFullUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUsersListState((prev) =>
      prev.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              name: editForm.name,
              email: editForm.email,
              role: editForm.role,
              skillPoints: Number(editForm.skillPoints),
              trustScore: Number(editForm.trustScore),
              status: editForm.status,
              reportsCount: Number(editForm.reportsCount),
            }
          : u
      )
    );

    setEditingUser(null);
    addToast("تم حفظ جميع تعديلات بيانات المستخدم والتحديث بنجاح!", "success");
  };

  // User Actions (Banning, Suspending, Role Promotion/Demotion, SP Balance Editing)
  const handleUpdateUserRole = async (userId: string, newRole: "developer" | "client" | "admin" | "moderator") => {
    if (newRole === "moderator") { addToast("دور المشرف غير موجود في قاعدة البيانات", "warn"); return; }
    const result = await updateUserForAdmin({ userId, role: newRole });
    if (!result.ok) { addToast(result.error, "warn"); return; }
    updateUsersListState((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    const roleLabels: Record<string, string> = {
      admin: "مدير النظام (Admin)",
      moderator: "مشرف ومراقب محتوى",
      developer: "مطور برمجيات",
      client: "عميل / صاحب عمل",
    };
    addToast(`تم تعديل رتبة المستخدم إلى [${roleLabels[newRole]}] بنجاح!`, "success");
  };

  const handleUpdateUserSp = (userId: string, deltaOrValue: number, isDirectSet: boolean = false) => {
    setUsersList((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updatedSp = isDirectSet ? Math.max(0, deltaOrValue) : Math.max(0, u.skillPoints + deltaOrValue);
          return { ...u, skillPoints: updatedSp };
        }
        return u;
      })
    );
    addToast("تم تعديل رصيد نقاط SP للمستخدم بنجاح!", "success");
  };

  const handleBanUser = async (userId: string) => {
    const result = await updateUserForAdmin({ userId, status: "banned" });
    if (!result.ok) { addToast(result.error, "warn"); return; }
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: "banned" } : u))
    );
    addToast("تم حظر المستخدم نهائياً من المنصة", "warn");
  };

  const handleSuspendUser = async (userId: string) => {
    const result = await updateUserForAdmin({ userId, status: "suspended" });
    if (!result.ok) { addToast(result.error, "warn"); return; }
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: "suspended" } : u))
    );
    addToast("تم إيقاف حساب المستخدم مؤقتاً لمدة 7 أيام", "info");
  };

  const handleUnbanUser = async (userId: string) => {
    const result = await updateUserForAdmin({ userId, status: "active" });
    if (!result.ok) { addToast(result.error, "warn"); return; }
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: "active" } : u))
    );
    addToast("تم تفعيل حساب المستخدم وإلغاء الحظر بنجاح", "success");
  };

  // Direct Ban from Complaint Card
  const handleBanReportedUserFromComplaint = (reportedId: string, name: string) => {
    handleBanUser(reportedId);
    addToast(`تم حظر المستخدم المشتكى عليه (${name}) مباشرة بناءً على التذكرة`, "warn");
  };

  // Complaint Actions
  const handleResolveComplaint = (complaintId: string) => {
    setComplaintsList((prev) =>
      prev.map((c) => (c.id === complaintId ? { ...c, status: "resolved" } : c))
    );
    if (activeChatTicket?.id === complaintId) {
      setActiveChatTicket((prev) => prev ? { ...prev, status: "resolved" } : null);
    }
    addToast("تم تسوية الشكوى وإغلاق التذكرة رسمياً", "success");
  };

  // Send Ticket Chat Message from Admin
  const handleSendTicketMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || !activeChatTicket) return;

    const newMsg: TicketChatMessage = {
      id: Date.now().toString(),
      sender: "admin",
      senderName: "إدارة سكورا (Admin)",
      text: chatInputText.trim(),
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };

    setComplaintsList((prev) =>
      prev.map((c) =>
        c.id === activeChatTicket.id
          ? { ...c, chatHistory: [...c.chatHistory, newMsg] }
          : c
      )
    );

    setActiveChatTicket((prev) =>
      prev ? { ...prev, chatHistory: [...prev.chatHistory, newMsg] } : null
    );

    setChatInputText("");
    addToast("تم إرسال رد الإدارة إلى طرفي التذكرة بنجاح", "success");
  };

  // Export Analytics Data Handler
  const handleExportReport = () => {
    addToast("جاري إنشاء وتنزيل تقرير الإحصائيات بصيغة CSV / PDF...", "success");
  };

  // Save Settings Handlers
  const handleSaveQuickSignInSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings({
      googleClientId,
      facebookAppId,
      discordClientId,
      linkedinClientId,
      xClientId,
      githubClientId,
      phoneOtpProvider,
      oneClickDefaultRole: demoDefaultRole,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFromEmail,
      smtpFromName,
    });
    addToast("تم حفظ وتحديث إعدادات جميع خيارات التسجيل السريع وسيرفر البريد (SMTP) بنجاح!", "success");
  };

  const handleSaveAiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings({
      aiAssistantBaseUrl: aiBaseUrl,
      aiAssistantApiKey: aiApiKey,
      trustEngineModel: aiModel,
    });
    addToast("تم حفظ إعدادات الـ AI API Keys ومحرك التقييم بنجاح!", "success");
  };

  const handleSaveTrustRules = (e: React.FormEvent) => {
    e.preventDefault();
    updateSystemSettings({
      baseTrustPoints: baseTrust,
      integrityPenalty: penaltyPoints,
      spExchangeRate: spRate,
      minTrustThreshold: minTrust,
    });
    addToast("تم تحديث قواعد معاملات الثقة ونقاط SP بنجاح!", "success");
  };

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch = u.name.includes(userSearchQuery) || u.email.includes(userSearchQuery) || u.id.includes(userSearchQuery);
    if (userRoleFilter === "developer") return matchesSearch && u.role === "developer";
    if (userRoleFilter === "client") return matchesSearch && u.role === "client";
    if (userRoleFilter === "banned") return matchesSearch && (u.status === "banned" || u.status === "suspended");
    return matchesSearch;
  });

  // Filtered System Logs
  const filteredLogs = systemLogsList.filter((log) => {
    if (logCategoryFilter === "all") return true;
    return log.category === logCategoryFilter;
  });

  const aiModelLabels: Record<string, string> = {
    "gpt-4o": "GPT-4o (الموصى به لتحليل الكود الفني)",
    "claude-3-5-sonnet": "Claude 3.5 Sonnet (فائق الدقة في المراجعة)",
    "deepseek-r1": "DeepSeek R1 (نموذج مفتوح المصدر محلي)",
    "scora-eval-v2": "Scora Local Evaluator Model v2",
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1360px] px-6 md:px-8 py-8 md:py-12 w-full flex-1 space-y-8">
        
        {/* SINGLE CLEAN WHITE ENTERPRISE DASHBOARD HERO WITH PROGRESSIVE CHART */}
        <div className="rounded-[32px] bg-white p-6 md:p-8 text-[#05291A] shadow-xs space-y-6 border border-[#D1E3D6]">
          
          {/* Header & Export Control Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#D1E3D6] pb-5">
            <div className="space-y-1">
              <h1 className="text-[26px] md:text-[32px] font-extrabold font-heading text-[#05291A] tracking-tight">
                لوحة الأداء المالي والمؤشرات التشغيلية
              </h1>
              <p className="text-[13px] text-[#526B5E] max-w-xl">
                مراقبة مباشرة للسيولة المالية، صافي أرباح المنصة، المشاريع النشطة، وسجلات أداء الذكاء الاصطناعي.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleExportReport}
                className="flex items-center gap-2 bg-[#056B38] hover:bg-[#08592E] text-white px-5 py-2.5 rounded-full font-extrabold text-[12px] transition-all cursor-pointer shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>تصدير البيانات (CSV / PDF)</span>
              </button>
            </div>
          </div>

          {/* ARABIC RESPONSIVE TOP 6 KPI CARDS (INCLUDING VISITORS, SIGNUPS & PROFIT) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            
            <div className="bg-[#F7FAF8] rounded-[20px] p-4 border border-[#D1E3D6] space-y-1.5 hover:border-[#056B38] transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#526B5E] font-extrabold">
                <span>إجمالي السيولة النقدية</span>
                <DollarSign className="w-4 h-4 text-[#056B38]" />
              </div>
              <div className="text-[20px] font-extrabold text-[#05291A]">265,400 ج.م</div>
              <div className="text-[10px] text-[#056B38] font-extrabold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+28.4% نمو إجمالي السيولة</span>
              </div>
            </div>

            <div className="bg-[#F7FAF8] rounded-[20px] p-4 border border-[#D1E3D6] space-y-1.5 hover:border-[#056B38] transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#526B5E] font-extrabold">
                <span>صافي أرباح المنصة (15%)</span>
                <Sparkles className="w-4 h-4 text-[#056B38]" />
              </div>
              <div className="text-[20px] font-extrabold text-[#05291A]">39,810 ج.م</div>
              <div className="text-[10px] text-[#056B38] font-extrabold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+31.2% نمو الأرباح</span>
              </div>
            </div>

            <div className="bg-[#F7FAF8] rounded-[20px] p-4 border border-[#D1E3D6] space-y-1.5 hover:border-[#0284C7] transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#526B5E] font-extrabold">
                <span>الزوار والمشاهدات اليومية</span>
                <Eye className="w-4 h-4 text-[#0284C7]" />
              </div>
              <div className="text-[20px] font-extrabold text-[#05291A]">12,850 زائر</div>
              <div className="text-[10px] text-[#0284C7] font-extrabold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+22.5% تفاعل يومي</span>
              </div>
            </div>

            <div className="bg-[#F7FAF8] rounded-[20px] p-4 border border-[#D1E3D6] space-y-1.5 hover:border-[#8B5CF6] transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#526B5E] font-extrabold">
                <span>التسجيلات الجديدة هذا الشهر</span>
                <Users className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div className="text-[20px] font-extrabold text-[#05291A]">342 حساب جديد</div>
              <div className="text-[10px] text-[#8B5CF6] font-extrabold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+15.8% تسجيلات جدد</span>
              </div>
            </div>

            <div className="bg-[#F7FAF8] rounded-[20px] p-4 border border-[#D1E3D6] space-y-1.5 hover:border-[#056B38] transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#526B5E] font-extrabold">
                <span>المشاريع النشطة والمعالجة</span>
                <Briefcase className="w-4 h-4 text-[#056B38]" />
              </div>
              <div className="text-[20px] font-extrabold text-[#05291A]">53 مشروعاً</div>
              <div className="text-[10px] text-[#056B38] font-extrabold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>+18.2% نسبة النجاح</span>
              </div>
            </div>

            <div className="bg-[#F7FAF8] rounded-[20px] p-4 border border-[#D1E3D6] space-y-1.5 hover:border-amber-600 transition-colors">
              <div className="flex items-center justify-between text-[11px] text-[#526B5E] font-extrabold">
                <span>الشكاوى النشطة المعلقة</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-[20px] font-extrabold text-[#C62828]">
                {complaintsList.filter(c => c.status !== "resolved").length} تذاكر نشطة
              </div>
              <div className="text-[10px] text-amber-700 font-extrabold">متوسط التسوية: 1.2 يوم</div>
            </div>

          </div>

          {/* SINGLE RESPONSIVE CHART CONTAINER WITH CLEAN WHITE STYLE & ARABIC CONTROLS */}
          <div className="bg-[#F7FAF8] rounded-[24px] p-5 md:p-6 border border-[#D1E3D6] space-y-4">
            
            {/* Chart Toolbar: Time Segments + Title */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D1E3D6] pb-3">
              
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#056B38]" />
                <span className="text-[13px] font-extrabold text-[#05291A]">حركة المعاملات والسيولة بالألف جنيه (EGP Volume)</span>
              </div>

              {/* Time Range Segmented Control Pills */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-full border border-[#D1E3D6] text-[11px] font-extrabold">
                <button
                  type="button"
                  onClick={() => setChartTimeRange("2026")}
                  className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                    chartTimeRange === "2026" ? "bg-[#056B38] text-white" : "text-[#526B5E] hover:text-[#05291A]"
                  }`}
                >
                  عام 2026
                </button>
                <button
                  type="button"
                  onClick={() => setChartTimeRange("q2")}
                  className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                    chartTimeRange === "q2" ? "bg-[#056B38] text-white" : "text-[#526B5E] hover:text-[#05291A]"
                  }`}
                >
                  الربع الثاني
                </button>
                <button
                  type="button"
                  onClick={() => setChartTimeRange("last30")}
                  className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                    chartTimeRange === "last30" ? "bg-[#056B38] text-white" : "text-[#526B5E] hover:text-[#05291A]"
                  }`}
                >
                  آخر 30 يوم
                </button>
              </div>

            </div>

            {/* HIGH-PRECISION CHART.JS PROGRESSIVE LINE EASING CANVAS */}
            <div className="w-full h-[280px] md:h-[320px] pt-1">
              <ProgressiveLineChart timeRange={chartTimeRange} />
            </div>

          </div>

        </div>

        {/* ADMIN NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-[#D1E3D6]">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "users"
                ? "bg-[#056B38] text-white shadow-md"
                : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0] hover:text-[#056B38]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة المستخدمين والحيود ({usersList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("complaints")}
            className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "complaints"
                ? "bg-[#056B38] text-white shadow-md"
                : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0] hover:text-[#056B38]"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>الشكاوى وتحديد المستخدمين ({complaintsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "logs"
                ? "bg-[#056B38] text-white shadow-md"
                : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0] hover:text-[#056B38]"
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>سجلات النظام (Audit System Logs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "system"
                ? "bg-[#056B38] text-white shadow-md"
                : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0] hover:text-[#056B38]"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>وضع الصيانة والتسجيل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "ai"
                ? "bg-[#056B38] text-white shadow-md"
                : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0] hover:text-[#056B38]"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>إعدادات AI & API Keys</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("trust")}
            className={`px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
              activeTab === "trust"
                ? "bg-[#056B38] text-white shadow-md"
                : "bg-[#F7FAF8] text-[#526B5E] hover:bg-[#E8FAF0] hover:text-[#056B38]"
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>معاملات الثقة و SP Points</span>
          </button>
        </div>

        {/* TAB 1: USERS MANAGEMENT & MODERATION */}
        {activeTab === "users" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#F7FAF8] p-4 rounded-[20px] border border-[#D1E3D6]">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-[#526B5E] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، البريد، أو الـ User ID..."
                  className="w-full h-10 rounded-full border border-[#D1E3D6] bg-white pr-10 pl-4 text-[13px] outline-none focus:border-[#056B38]"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setUserRoleFilter("all")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all ${
                    userRoleFilter === "all" ? "bg-[#056B38] text-white" : "bg-white border border-[#D1E3D6] text-[#526B5E]"
                  }`}
                >
                  الجميع ({usersList.length})
                </button>

                <button
                  type="button"
                  onClick={() => setUserRoleFilter("developer")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all ${
                    userRoleFilter === "developer" ? "bg-[#056B38] text-white" : "bg-white border border-[#D1E3D6] text-[#526B5E]"
                  }`}
                >
                  المطورين ({usersList.filter(u => u.role === "developer").length})
                </button>

                <button
                  type="button"
                  onClick={() => setUserRoleFilter("client")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all ${
                    userRoleFilter === "client" ? "bg-[#056B38] text-white" : "bg-white border border-[#D1E3D6] text-[#526B5E]"
                  }`}
                >
                  العملاء ({usersList.filter(u => u.role === "client").length})
                </button>

                <button
                  type="button"
                  onClick={() => setUserRoleFilter("banned")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-all ${
                    userRoleFilter === "banned" ? "bg-[#C62828] text-white" : "bg-white border border-[#D1E3D6] text-[#C62828]"
                  }`}
                >
                  المحظورين ({usersList.filter(u => u.status !== "active").length})
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#D1E3D6] bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-[#E8FAF0] text-[#05291A] text-[13px] font-extrabold border-b border-[#D1E3D6]">
                      <th className="p-4">User ID & الاسم</th>
                      <th className="p-4">الرتبة الحالية</th>
                      <th className="p-4">تغيير السريع للرتبة</th>
                      <th className="p-4">رصيد نقاط SP</th>
                      <th className="p-4">حالة الحساب</th>
                      <th className="p-4 text-center">إجراءات التعديل الشامل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[13px]">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-[#F7FAF8] transition-colors">
                        {/* User Info */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono bg-neutral-100 px-2 py-0.5 rounded text-[#526B5E] font-bold">{user.id}</span>
                            <span className="font-extrabold text-[#05291A] text-[14px]">{user.name}</span>
                          </div>
                          <div className="text-[11px] text-[#526B5E] mt-0.5">{user.email}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">انضمام: {user.joinDate}</div>
                        </td>

                        {/* Current Role Badge (PURE TEXT - NO EMOJIS/ICONS) */}
                        <td className="p-4">
                          {user.role === "admin" && (
                            <span className="inline-block bg-[#E8FAF0] text-[#056B38] border border-[#056B38]/30 px-3 py-1 rounded-full text-[11px] font-extrabold">
                              مدير النظام (Admin)
                            </span>
                          )}
                          {user.role === "moderator" && (
                            <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full text-[11px] font-bold">
                              مشرف ومراقب محتوى
                            </span>
                          )}
                          {user.role === "developer" && (
                            <span className="inline-block bg-emerald-50 text-[#056B38] border border-emerald-200 px-3 py-1 rounded-full text-[11px] font-bold">
                              مطور برمجيات
                            </span>
                          )}
                          {user.role === "client" && (
                            <span className="inline-block bg-gray-100 text-gray-700 border border-gray-200 px-3 py-1 rounded-full text-[11px] font-bold">
                              عميل / صاحب عمل
                            </span>
                          )}
                        </td>

                        {/* Quick Role Change Selector */}
                        <td className="p-4">
                          <CustomAdminDropdown
                            value={user.role}
                            options={[
                              { value: "developer", label: "مطور برمجيات" },
                              { value: "client", label: "عميل / صاحب عمل" },
                              { value: "moderator", label: "مشرف ومراقب" },
                              { value: "admin", label: "مدير نظام (Admin)" },
                            ]}
                            onChange={(newRole) => handleUpdateUserRole(user.id, newRole)}
                          />
                        </td>

                        {/* SP Points & Quick Adjustment */}
                        <td className="p-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[#05291A] text-[14px]">{user.skillPoints} SP</span>
                              <span className="text-[10px] text-gray-400 font-mono">(الثقة: {user.trustScore})</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateUserSp(user.id, 50)}
                                className="px-2 py-0.5 rounded-md bg-[#E8FAF0] hover:bg-[#D4F5E0] text-[#056B38] border border-[#D1E3D6] text-[10px] font-extrabold cursor-pointer transition-colors"
                              >
                                +50 SP
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateUserSp(user.id, 100)}
                                className="px-2 py-0.5 rounded-md bg-[#E8FAF0] hover:bg-[#D4F5E0] text-[#056B38] border border-[#D1E3D6] text-[10px] font-extrabold cursor-pointer transition-colors"
                              >
                                +100 SP
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateUserSp(user.id, -50)}
                                className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-100 text-[#C62828] border border-red-200 text-[10px] font-extrabold cursor-pointer transition-colors"
                              >
                                -50 SP
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="p-4">
                          {user.status === "active" && (
                            <span className="inline-block bg-[#E8FAF0] text-[#056B38] px-3 py-1 rounded-full text-[11px] font-bold">
                              نشط ومفعل
                            </span>
                          )}
                          {user.status === "suspended" && (
                            <span className="inline-block bg-[#FFF8E1] text-[#9A6500] px-3 py-1 rounded-full text-[11px] font-bold">
                              موقوف مؤقتاً
                            </span>
                          )}
                          {user.status === "banned" && (
                            <span className="inline-block bg-[#FFEBEE] text-[#C62828] px-3 py-1 rounded-full text-[11px] font-bold">
                              مبند نهائياً
                            </span>
                          )}
                        </td>

                        {/* Full User Edit & Moderation Actions */}
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUserModal(user)}
                              className="px-3.5 py-1.5 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-extrabold text-[11px] transition-colors cursor-pointer shadow-2xs"
                            >
                              تعديل البيانات بالكامل
                            </button>

                            {user.status === "active" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSuspendUser(user.id)}
                                  className="px-3 py-1.5 rounded-full bg-[#FFF8E1] hover:bg-amber-100 text-[#9A6500] font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  إيقاف مؤقت
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleBanUser(user.id)}
                                  className="px-3 py-1.5 rounded-full bg-[#FFEBEE] hover:bg-red-100 text-[#C62828] font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  بند دائم
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUnbanUser(user.id)}
                                className="px-4 py-1.5 rounded-full bg-[#E8FAF0] hover:bg-[#D4F5E0] text-[#056B38] font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                فك الحظر والتفعيل
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COMPLAINTS & DIRECT REPORTED USER TARGET CARDS */}
        {activeTab === "complaints" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  جدول الشكاوى وتحديد المستخدمين المشكو في حقهم
                </h2>
                <p className="text-[13px] text-[#526B5E]">
                  مربوط بكل تذكرة بروفايل المستخدم المشتكى عليه ورقم حسابه لاتخاذ قرارات البند والإيقاف المباشرة.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className={`${activeChatTicket ? "lg:col-span-6" : "lg:col-span-12"} space-y-4`}>
                {complaintsList.map((complaint) => (
                  <div
                    key={complaint.id}
                    className={`rounded-[28px] border bg-white p-6 shadow-xs space-y-5 transition-all ${
                      activeChatTicket?.id === complaint.id
                        ? "border-[#056B38] ring-2 ring-[#056B38]/20 bg-[#F7FAF8]"
                        : "border-[#D1E3D6]"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="px-3 py-1 rounded-full bg-[#E8FAF0] text-[#056B38] font-extrabold text-[12px]">
                          تذكرة #{complaint.id}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                          {complaint.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#526B5E]">{complaint.date}</span>
                        {complaint.status === "resolved" ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#E8FAF0] text-[#056B38] text-[10px] font-bold">
                            تم التسوية ✓
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                            قيد التحقيق
                          </span>
                        )}
                      </div>
                    </div>

                    {/* DETAILED REPORTED USER TARGET CARD (الشكوى على انه يوزر بالضبط) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F7FAF8] p-4 rounded-[20px] border border-[#D1E3D6]">
                      {/* Complainant User */}
                      <div className="space-y-1 bg-white p-3 rounded-xl border border-gray-100">
                        <div className="text-[10px] font-bold text-[#526B5E]">الطرف الشاكي:</div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">{complaint.complainantName}</div>
                        <div className="text-[11px] text-[#526B5E]">{complaint.complainantEmail}</div>
                        <div className="text-[10px] text-[#056B38] font-bold pt-1">
                          درجة الثقة: {complaint.complainantTrust} / 100
                        </div>
                      </div>

                      {/* Reported Target User */}
                      <div className="space-y-1.5 bg-red-50/70 p-3 rounded-xl border border-red-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-red-700">المستخدم المشتكى عليه:</span>
                          <span className="text-[9px] font-mono bg-red-200 text-red-900 px-1.5 py-0.5 rounded font-bold">{complaint.reportedId}</span>
                        </div>
                        <div className="font-extrabold text-red-950 text-[13px]">{complaint.reportedName}</div>
                        <div className="text-[11px] text-red-800">{complaint.reportedEmail}</div>
                        
                        <div className="flex items-center justify-between text-[10px] text-red-900 font-bold pt-1">
                          <span>الثقة: {complaint.reportedTrust}/100</span>
                          <span>الشكاوى المرفوعة عليه: {complaint.reportedReportsCount} شكاوى</span>
                        </div>

                        {/* Direct Ban Action for Target User */}
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleBanReportedUserFromComplaint(complaint.reportedId, complaint.reportedName)}
                            className="w-full py-1.5 rounded-lg bg-[#C62828] hover:bg-red-800 text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>حظر المستخدم المشتكى عليه ({complaint.reportedName})</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-[13px] text-[#05291A] leading-relaxed bg-white p-3 rounded-xl border border-gray-100">
                      {complaint.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveChatTicket(complaint)}
                        className="px-4 py-2 rounded-full bg-[#05291A] hover:bg-[#056B38] text-white font-bold text-[12px] transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        <span>فتح شات التذكرة الفوري ({complaint.chatHistory.length})</span>
                      </button>

                      {complaint.status !== "resolved" && (
                        <button
                          type="button"
                          onClick={() => handleResolveComplaint(complaint.id)}
                          className="px-4 py-2 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white font-bold text-[11px] transition-all cursor-pointer"
                        >
                          تسوية التذكرة ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* LIVE TICKET CHAT DRAWER */}
              {activeChatTicket && (
                <div className="lg:col-span-6 rounded-[28px] border-2 border-[#056B38] bg-white shadow-xl flex flex-col h-[650px] overflow-hidden animate-in fade-in duration-250 sticky top-24">
                  <div className="bg-[#05291A] text-white p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#056B38] text-white flex items-center justify-center font-extrabold text-[13px] border border-emerald-400">
                        {activeChatTicket.id}
                      </div>
                      <div>
                        <div className="font-extrabold text-[15px] flex items-center gap-2">
                          <span>شات التذكرة المباشر</span>
                          <span className="text-[10px] bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/40">
                            حي
                          </span>
                        </div>
                        <div className="text-[11px] text-emerald-200">
                          الشاكي: {activeChatTicket.complainantName} ↔ المشتكى عليه: {activeChatTicket.reportedName} ({activeChatTicket.reportedId})
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveChatTicket(null)}
                      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F7FAF8]">
                    {activeChatTicket.chatHistory.map((msg) => {
                      const isAdmin = msg.sender === "admin";
                      const isComplainant = msg.sender === "complainant";

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isAdmin ? "items-center" : isComplainant ? "items-start" : "items-end"
                          }`}
                        >
                          <div className="text-[10px] text-[#526B5E] mb-1 font-bold px-1">
                            {msg.senderName} ({msg.time})
                          </div>
                          <div
                            className={`max-w-[85%] p-3.5 rounded-[18px] text-[12px] leading-relaxed shadow-2xs ${
                              isAdmin
                                ? "bg-[#056B38] text-white font-bold rounded-xl border border-emerald-400/30"
                                : isComplainant
                                ? "bg-white border border-[#D1E3D6] text-[#05291A] rounded-tr-none"
                                : "bg-red-50 border border-red-200 text-red-950 rounded-tl-none font-medium"
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendTicketMessage} className="p-3 bg-white border-t border-[#D1E3D6] flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      placeholder="اكتب قرار أو رد الإدارة الرسمي هنا..."
                      className="flex-1 h-11 rounded-full border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                    />
                    <button
                      type="submit"
                      className="px-5 h-11 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[12px] font-extrabold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs"
                    >
                      <span>إرسال</span>
                      <Send className="w-4 h-4 rotate-180" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM AUDIT & ACTIVITY LOGS STREAM (فين الـ LOGS) */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                  <Terminal className="w-6 h-6 text-[#056B38]" />
                  <span>سجلات النظام والعمليات الإدارية (System Audit Logs)</span>
                </h2>
                <p className="text-[13px] text-[#526B5E] mt-0.5">
                  تتبع الأنشطة الأمنية، إجراءات الحظر، تعديلات مفاتيح الـ API، وحركات النظام لحظياً.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter("all")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    logCategoryFilter === "all" ? "bg-[#056B38] text-white" : "bg-[#F7FAF8] text-[#526B5E] border border-[#D1E3D6]"
                  }`}
                >
                  الكل ({systemLogsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter("أمنية")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    logCategoryFilter === "أمنية" ? "bg-[#C62828] text-white" : "bg-[#F7FAF8] text-[#526B5E] border border-[#D1E3D6]"
                  }`}
                >
                  أمنية
                </button>
                <button
                  type="button"
                  onClick={() => setLogCategoryFilter("AI Engine")}
                  className={`px-4 py-1.5 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    logCategoryFilter === "AI Engine" ? "bg-[#056B38] text-white" : "bg-[#F7FAF8] text-[#526B5E] border border-[#D1E3D6]"
                  }`}
                >
                  AI Engine
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-[#D1E3D6] bg-white overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse font-body">
                  <thead>
                    <tr className="bg-[#05291A] text-white text-[13px] font-extrabold">
                      <th className="p-4">Log ID & الإجراء</th>
                      <th className="p-4">التصنيف</th>
                      <th className="p-4">القائم بالإجراء</th>
                      <th className="p-4">عنوان IP</th>
                      <th className="p-4">التفاصيل السجلية</th>
                      <th className="p-4">التوقيت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-[13px]">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#F7FAF8] transition-colors font-medium">
                        <td className="p-4">
                          <div className="font-extrabold text-[#05291A] text-[13px]">{log.action}</div>
                          <span className="text-[10px] font-mono bg-neutral-100 px-2 py-0.5 rounded text-[#526B5E]">{log.id}</span>
                        </td>

                        <td className="p-4">
                          <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold ${
                            log.category === "أمنية"
                              ? "bg-red-100 text-red-900 border border-red-200"
                              : log.category === "AI Engine"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                              : "bg-blue-50 text-blue-800"
                          }`}>
                            {log.category}
                          </span>
                        </td>

                        <td className="p-4 font-bold text-[#05291A]">{log.performedBy}</td>
                        <td className="p-4 text-[#526B5E] font-mono text-[12px]">{log.ipAddress}</td>
                        <td className="p-4 text-[#05291A] max-w-sm leading-relaxed">{log.details}</td>
                        <td className="p-4 text-[#526B5E] whitespace-nowrap">{log.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM CONTROLS & MAINTENANCE MODE */}
        {activeTab === "system" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-8 space-y-8 shadow-xs">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#05291A] font-heading">
                  التحكم في حالة النظام والوصول المباشر
                </h2>
                <p className="text-[13px] text-[#526B5E] mt-1">
                  تفعيل أو تعطيل وضع الصيانة، ومفاتيح التسجيل والدخول السريع عبر المنصة.
                </p>
              </div>

              <div className="space-y-6 divide-y divide-gray-100">
                <div className="flex items-center justify-between pt-4">
                  <div className="space-y-1">
                    <div className="font-extrabold text-[#05291A] text-[16px] flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#056B38]" />
                      <span>وضع الصيانة العام للموقع (System Maintenance Mode)</span>
                    </div>
                    <p className="text-[13px] text-[#526B5E] max-w-xl">
                      عند التفعيل، سيتم إعادة توجيه كافة الزوار والعملاء لصفحة الصيانة المؤقتة مع السماح للإدارة فقط بالدخول.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const nextVal = !systemSettings.isMaintenanceMode;
                      updateSystemSettings({ isMaintenanceMode: nextVal });
                      addToast(nextVal ? "تم تفعيل وضع الصيانة العام للمنصة" : "تم إلغاء وضع الصيانة وإتاحة المنصة للجميع", nextVal ? "warn" : "success");
                    }}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      systemSettings.isMaintenanceMode ? "bg-[#C62828]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        systemSettings.isMaintenanceMode ? "-translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* GENERAL QUICK REGISTRATION & AUTO LOGIN SWITCHES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between p-4 bg-[#F7FAF8] rounded-2xl border border-[#D1E3D6]">
                    <div className="space-y-1">
                      <div className="font-extrabold text-[#05291A] text-[14px]">
                        سماح التسجيل السريع العام (Quick Registration)
                      </div>
                      <p className="text-[11px] text-[#526B5E]">
                        الانضمام الفوري للمطورين والعملاء بدون موافقة يدوية.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !systemSettings.isQuickRegistrationOpen;
                        updateSystemSettings({ isQuickRegistrationOpen: nextVal });
                        addToast(nextVal ? "تم تفعيل التسجيل السريع للجميع" : "تم إيقاف التسجيل السريع مؤقتاً", "info");
                      }}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        systemSettings.isQuickRegistrationOpen ? "bg-[#056B38]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          systemSettings.isQuickRegistrationOpen ? "-translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-[#F7FAF8] rounded-2xl border border-[#D1E3D6]">
                    <div className="space-y-1">
                      <div className="font-extrabold text-[#05291A] text-[14px]">
                        مبدل الحسابات السريع (Quick Auto Login)
                      </div>
                      <p className="text-[11px] text-[#526B5E]">
                        تمكين محاكي الأدوار السريع للتجربة بين الحسابات.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = !systemSettings.isQuickLoginOpen;
                        updateSystemSettings({ isQuickLoginOpen: nextVal });
                        addToast(nextVal ? "تم إتاحة التبديل السريع بين الحسابات" : "تم إغلاق التبديل السريع", "info");
                      }}
                      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        systemSettings.isQuickLoginOpen ? "bg-[#056B38]" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                          systemSettings.isQuickLoginOpen ? "-translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* DETAILED QUICK SIGN-IN INTEGRATIONS MANAGEMENT SECTION */}
                <div className="pt-6 border-t border-gray-100 space-y-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-[18px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                        <span>إدارة شبكة خيارات التسجيل السريع والـ OAuth</span>
                      </h3>
                      <p className="text-[12px] text-[#526B5E]">
                        انقر على أيقونة المنصة للتعديل، أو استخدم مفتاح التفعيل السريع للتحكم في ظهورها وإغلاقها.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveQuickSignInSettings}
                      className="px-6 py-2.5 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[12px] font-extrabold transition-all cursor-pointer shadow-md"
                    >
                      حفظ كافة الإعدادات
                    </button>
                  </div>

                  {/* PLATFORMS ICON CARDS GRID (8 CARDS) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    
                    {/* Google */}
                    <div
                      onClick={() => setActivePlatformConfig("google")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isGoogleAuthEnabled
                          ? activePlatformConfig === "google" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "google"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isGoogleAuthEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <GoogleIcon className="w-5 h-5" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isGoogleAuthEnabled;
                            updateSystemSettings({ isGoogleAuthEnabled: next });
                            addToast(next ? "تم تفعيل التسجيل بـ Google" : "تم تعطيل التسجيل بـ Google", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isGoogleAuthEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isGoogleAuthEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">Google</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isGoogleAuthEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isGoogleAuthEnabled ? "مفعلة" : "معطلة (رمادي)"}
                        </span>
                      </div>
                    </div>

                    {/* Facebook */}
                    <div
                      onClick={() => setActivePlatformConfig("facebook")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isFacebookAuthEnabled
                          ? activePlatformConfig === "facebook" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "facebook"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isFacebookAuthEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <FacebookIcon className="w-5 h-5" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isFacebookAuthEnabled;
                            updateSystemSettings({ isFacebookAuthEnabled: next });
                            addToast(next ? "تم تفعيل التسجيل بـ Facebook" : "تم تعطيل التسجيل بـ Facebook", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isFacebookAuthEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isFacebookAuthEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">Facebook</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isFacebookAuthEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isFacebookAuthEnabled ? "مفعلة" : "معطلة (رمادي)"}
                        </span>
                      </div>
                    </div>

                    {/* Discord */}
                    <div
                      onClick={() => setActivePlatformConfig("discord")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isDiscordAuthEnabled
                          ? activePlatformConfig === "discord" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "discord"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isDiscordAuthEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <DiscordIcon className="w-5 h-5" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isDiscordAuthEnabled;
                            updateSystemSettings({ isDiscordAuthEnabled: next });
                            addToast(next ? "تم تفعيل التسجيل بـ Discord" : "تم تعطيل التسجيل بـ Discord", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isDiscordAuthEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isDiscordAuthEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">Discord</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isDiscordAuthEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isDiscordAuthEnabled ? "مفعلة" : "معطلة (رمادي)"}
                        </span>
                      </div>
                    </div>

                    {/* LinkedIn */}
                    <div
                      onClick={() => setActivePlatformConfig("linkedin")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isLinkedinAuthEnabled
                          ? activePlatformConfig === "linkedin" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "linkedin"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isLinkedinAuthEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <LinkedinIcon className="w-5 h-5" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isLinkedinAuthEnabled;
                            updateSystemSettings({ isLinkedinAuthEnabled: next });
                            addToast(next ? "تم تفعيل التسجيل بـ LinkedIn" : "تم تعطيل التسجيل بـ LinkedIn", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isLinkedinAuthEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isLinkedinAuthEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">LinkedIn</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isLinkedinAuthEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isLinkedinAuthEnabled ? "مفعلة" : "معطلة (رمادي)"}
                        </span>
                      </div>
                    </div>

                    {/* X (Twitter) */}
                    <div
                      onClick={() => setActivePlatformConfig("x")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isXAuthEnabled
                          ? activePlatformConfig === "x" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "x"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isXAuthEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <XIcon className="w-5 h-5" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isXAuthEnabled;
                            updateSystemSettings({ isXAuthEnabled: next });
                            addToast(next ? "تم تفعيل التسجيل بـ X (Twitter)" : "تم تعطيل التسجيل بـ X", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isXAuthEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isXAuthEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">X (Twitter)</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isXAuthEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isXAuthEnabled ? "مفعلة" : "معطلة (رمادي)"}
                        </span>
                      </div>
                    </div>

                    {/* GitHub */}
                    <div
                      onClick={() => setActivePlatformConfig("github")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isGithubAuthEnabled
                          ? activePlatformConfig === "github" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "github"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isGithubAuthEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <GithubIcon className="w-5 h-5" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isGithubAuthEnabled;
                            updateSystemSettings({ isGithubAuthEnabled: next });
                            addToast(next ? "تم تفعيل التسجيل بـ GitHub" : "تم تعطيل التسجيل بـ GitHub", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isGithubAuthEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isGithubAuthEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">GitHub</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isGithubAuthEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isGithubAuthEnabled ? "مفعلة" : "معطلة (رمادي)"}
                        </span>
                      </div>
                    </div>

                    {/* Phone OTP */}
                    <div
                      onClick={() => setActivePlatformConfig("phone")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isPhoneOtpEnabled
                          ? activePlatformConfig === "phone" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "phone"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isPhoneOtpEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <Globe className="w-5 h-5 text-[#056B38]" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isPhoneOtpEnabled;
                            updateSystemSettings({ isPhoneOtpEnabled: next });
                            addToast(next ? "تم تفعيل تسجيل الهاتف بـ OTP" : "تم تعطيل تسجيل الهاتف", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isPhoneOtpEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isPhoneOtpEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">Phone OTP</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isPhoneOtpEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isPhoneOtpEnabled ? "مفعلة" : "معطلة (رمادي)"}
                        </span>
                      </div>
                    </div>

                    {/* One-Click Demo */}
                    <div
                      onClick={() => setActivePlatformConfig("demo")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isOneClickDemoEnabled
                          ? activePlatformConfig === "demo" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "demo"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isOneClickDemoEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <Zap className="w-5 h-5 text-[#056B38]" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isOneClickDemoEnabled;
                            updateSystemSettings({ isOneClickDemoEnabled: next });
                            addToast(next ? "تم تفعيل التسجيل التجريبي الفوري" : "تم تعطيل التسجيل التجريبي", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isOneClickDemoEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isOneClickDemoEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">Demo Register</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isOneClickDemoEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isOneClickDemoEnabled ? "مفعلة" : "معطلة (رمادي)"}
                        </span>
                      </div>
                    </div>

                    {/* SMTP Email Server Control Card */}
                    <div
                      onClick={() => setActivePlatformConfig("smtp")}
                      className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer space-y-2 relative ${
                        !systemSettings.isSmtpEnabled
                          ? activePlatformConfig === "smtp" ? "border-gray-400 bg-gray-200/80" : "border-gray-200 bg-gray-100/90 opacity-60"
                          : activePlatformConfig === "smtp"
                          ? "border-[#056B38] bg-[#E8FAF0] shadow-sm"
                          : "border-[#D1E3D6] bg-white hover:border-[#056B38]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-gray-100 shadow-2xs"
                          style={{ filter: systemSettings.isSmtpEnabled ? "none" : "grayscale(100%) opacity(0.4)" }}
                        >
                          <Mail className="w-5 h-5 text-[#056B38]" />
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const next = !systemSettings.isSmtpEnabled;
                            updateSystemSettings({ isSmtpEnabled: next });
                            addToast(next ? "تم تفعيل خدمة إرسال الإيميلات (SMTP)" : "تم تعطيل إرسال الإيميلات من المنصة", "info");
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                            systemSettings.isSmtpEnabled ? "bg-[#056B38]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              systemSettings.isSmtpEnabled ? "-translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="font-extrabold text-[#05291A] text-[13px]">SMTP Server</div>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                          systemSettings.isSmtpEnabled ? "bg-emerald-100 text-[#056B38]" : "bg-gray-200 text-gray-600"
                        }`}>
                          {systemSettings.isSmtpEnabled ? "مفعلة (شغالة)" : "معطلة (مغلقة)"}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* EXPANDED PLATFORM CONFIGURATION DRAWER */}
                  {activePlatformConfig && (
                    <div className="p-5 rounded-2xl border-2 border-[#056B38] bg-white space-y-4 animate-in fade-in zoom-in-95 duration-200 shadow-sm">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-extrabold text-[#05291A]">
                            تعديل إعدادات الربط الخاصة بـ: <span className="text-[#056B38] capitalize font-mono font-bold">{activePlatformConfig}</span>
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActivePlatformConfig(null)}
                          className="text-[12px] font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
                        >
                          إغلاق النافذة ✕
                        </button>
                      </div>

                      {activePlatformConfig === "smtp" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-extrabold text-[#05291A]">SMTP Host (سيرفر البريد)</label>
                            <input
                              type="text"
                              value={smtpHost}
                              onChange={(e) => setSmtpHost(e.target.value)}
                              placeholder="smtp.gmail.com أو mail.scora.app"
                              className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-extrabold text-[#05291A]">Port (المنفذ)</label>
                            <input
                              type="text"
                              value={smtpPort}
                              onChange={(e) => setSmtpPort(e.target.value)}
                              placeholder="587 أو 465"
                              className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-extrabold text-[#05291A]">SMTP Username (اسم المستخدم)</label>
                            <input
                              type="text"
                              value={smtpUser}
                              onChange={(e) => setSmtpUser(e.target.value)}
                              placeholder="notifications@scora.app"
                              className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-extrabold text-[#05291A]">SMTP Password (كلمة السر)</label>
                            <input
                              type="password"
                              value={smtpPass}
                              onChange={(e) => setSmtpPass(e.target.value)}
                              placeholder="••••••••"
                              className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-extrabold text-[#05291A]">From Email (بريد المرسل)</label>
                            <input
                              type="text"
                              value={smtpFromEmail}
                              onChange={(e) => setSmtpFromEmail(e.target.value)}
                              placeholder="no-reply@scora.app"
                              className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[12px] font-extrabold text-[#05291A]">From Name (اسم المرسل)</label>
                            <input
                              type="text"
                              value={smtpFromName}
                              onChange={(e) => setSmtpFromName(e.target.value)}
                              placeholder="منصة سكورا — Scora Platform"
                              className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-body text-[#05291A] outline-none focus:border-[#056B38]"
                            />
                          </div>
                        </div>
                      )}

                      {activePlatformConfig === "google" && (
                        <div className="space-y-2">
                          <label className="block text-[12px] font-extrabold text-[#05291A]">Google OAuth Client ID</label>
                          <input
                            type="text"
                            value={googleClientId}
                            onChange={(e) => setGoogleClientId(e.target.value)}
                            placeholder="apps.googleusercontent.com"
                            className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                          />
                        </div>
                      )}

                      {activePlatformConfig === "facebook" && (
                        <div className="space-y-2">
                          <label className="block text-[12px] font-extrabold text-[#05291A]">Facebook App ID</label>
                          <input
                            type="text"
                            value={facebookAppId}
                            onChange={(e) => setFacebookAppId(e.target.value)}
                            placeholder="fb-app-id-..."
                            className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                          />
                        </div>
                      )}

                      {activePlatformConfig === "discord" && (
                        <div className="space-y-2">
                          <label className="block text-[12px] font-extrabold text-[#05291A]">Discord Client ID</label>
                          <input
                            type="text"
                            value={discordClientId}
                            onChange={(e) => setDiscordClientId(e.target.value)}
                            placeholder="discord-client-id"
                            className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                          />
                        </div>
                      )}

                      {activePlatformConfig === "linkedin" && (
                        <div className="space-y-2">
                          <label className="block text-[12px] font-extrabold text-[#05291A]">LinkedIn Client ID</label>
                          <input
                            type="text"
                            value={linkedinClientId}
                            onChange={(e) => setLinkedinClientId(e.target.value)}
                            placeholder="li-client-id"
                            className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                          />
                        </div>
                      )}

                      {activePlatformConfig === "x" && (
                        <div className="space-y-2">
                          <label className="block text-[12px] font-extrabold text-[#05291A]">X (Twitter) Client ID</label>
                          <input
                            type="text"
                            value={xClientId}
                            onChange={(e) => setXClientId(e.target.value)}
                            placeholder="x-client-id"
                            className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                          />
                        </div>
                      )}

                      {activePlatformConfig === "github" && (
                        <div className="space-y-2">
                          <label className="block text-[12px] font-extrabold text-[#05291A]">GitHub Client ID</label>
                          <input
                            type="text"
                            value={githubClientId}
                            onChange={(e) => setGithubClientId(e.target.value)}
                            placeholder="gh-oauth-client-id"
                            className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                          />
                        </div>
                      )}

                      {activePlatformConfig === "phone" && (
                        <div className="space-y-2">
                          <label className="block text-[12px] font-extrabold text-[#05291A]">مزود خدمة الـ SMS/WhatsApp OTP</label>
                          <input
                            type="text"
                            value={phoneOtpProvider}
                            onChange={(e) => setPhoneOtpProvider(e.target.value)}
                            placeholder="Twilio / Unifonic Gateway"
                            className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] font-mono text-[#05291A] outline-none focus:border-[#056B38]"
                          />
                        </div>
                      )}

                      {activePlatformConfig === "demo" && (
                        <div className="space-y-2">
                          <label className="block text-[12px] font-extrabold text-[#05291A]">الرتبة الافتراضية للتسجيل السريع التجريبي</label>
                          <CustomAdminDropdown
                            value={demoDefaultRole}
                            options={[
                              { value: "developer", label: "مطور برمجيات (Developer)" },
                              { value: "client", label: "عميل / صاحب عمل (Client)" },
                            ]}
                            onChange={(newRole) => setDemoDefaultRole(newRole)}
                            className="w-full max-w-sm"
                          />
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleSaveQuickSignInSettings}
                          className="px-5 py-2 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[12px] font-extrabold cursor-pointer transition-colors shadow-2xs"
                        >
                          حفظ وتحديث معطيات {activePlatformConfig}
                        </button>
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AI ASSISTANT & API KEYS SETTINGS */}
        {activeTab === "ai" && (
          <form onSubmit={handleSaveAiSettings} className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-[#05291A]">تشغيل مساعد AI على مستوى المنصة</h3>
                <p className="mt-1 text-[13px] text-[#526B5E]">عند الإغلاق يختفي المساعد من جميع الحسابات في المزامنة التالية.</p>
              </div>
              <button type="button" onClick={async () => {
                const enabled = !systemSettings.isAiAssistantEnabled;
                const result = await setAiAssistantEnabled(enabled);
                if (!result.ok) { addToast("تعذر تعديل حالة AI", "warn"); return; }
                updateSystemSettings({ isAiAssistantEnabled: enabled });
                addToast(enabled ? "تم تشغيل مساعد AI" : "تم إيقاف مساعد AI لكل المستخدمين", "success");
              }} className={`relative h-8 w-16 rounded-full transition-colors ${systemSettings.isAiAssistantEnabled ? "bg-[#056B38]" : "bg-gray-300"}`}>
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${systemSettings.isAiAssistantEnabled ? "right-9" : "right-1"}`} />
              </button>
            </div>
            <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-8 space-y-6 shadow-xs">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                  <Bot className="w-6 h-6 text-[#056B38]" />
                  <span>تعديل إعدادات الـ AI Assistant والـ Trust Engine API Keys</span>
                </h2>
                <p className="text-[13px] text-[#526B5E] mt-1">
                  ربط وتعديل الـ API URL Base، والمفاتيح السرية لمساعد SSD ونماذج تقييم الكود في SCORA.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    API URL Base (مُوفر خدمة الذكاء الاصطناعي)
                  </label>
                  <div className="relative">
                    <Globe className="w-4 h-4 text-[#526B5E] absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={aiBaseUrl}
                      onChange={(e) => setAiBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      className="w-full h-11 rounded-xl border border-[#D1E3D6] bg-white pr-10 pl-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] dir-ltr text-left font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    AI Secret API Key (مفتاح الـ API السري)
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-[#526B5E] absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full h-11 rounded-xl border border-[#D1E3D6] bg-white pr-10 pl-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] dir-ltr text-left font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    نموذج التقييم (Trust Engine AI Model)
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => setIsAiModelDropdownOpen(!isAiModelDropdownOpen)}
                    className="w-full h-12 rounded-full border-2 border-[#056B38] bg-white px-5 text-[13px] text-[#05291A] font-extrabold flex items-center justify-between cursor-pointer shadow-2xs hover:bg-[#E8FAF0] transition-colors"
                  >
                    <span>{aiModelLabels[aiModel] || aiModel}</span>
                    <ChevronDown className={`w-4 h-4 text-[#056B38] transition-transform duration-200 ${isAiModelDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isAiModelDropdownOpen && (
                    <div className="absolute top-full right-0 left-0 mt-2 z-50 bg-white rounded-[20px] border-2 border-[#056B38] shadow-2xl p-2 space-y-1 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                      {Object.entries(aiModelLabels).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setAiModel(key);
                            setIsAiModelDropdownOpen(false);
                          }}
                          className={`w-full text-right px-4 py-2.5 rounded-[12px] text-[13px] font-bold transition-colors cursor-pointer flex items-center justify-between ${
                            aiModel === key
                              ? "bg-[#056B38] text-white"
                              : "text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38]"
                          }`}
                        >
                          <span>{label}</span>
                          {aiModel === key && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[13px] font-extrabold transition-all cursor-pointer shadow-md"
                >
                  حفظ إعدادات الـ AI والـ API Keys
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 6: SCORA SP & TRUST POINT PARAMETERS */}
        {activeTab === "trust" && (
          <form onSubmit={handleSaveTrustRules} className="space-y-6 animate-in fade-in duration-200">
            <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-8 space-y-6 shadow-xs">
              <div>
                <h2 className="text-[22px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                  <Zap className="w-6 h-6 text-[#056B38]" />
                  <span>تعديل ومعاملات نقاط الثقة والـ SP (Skill Points Engine)</span>
                </h2>
                <p className="text-[13px] text-[#526B5E] mt-1">
                  تحديد قيم النقاط المكتسبة، غرامات مخالفة الجودة، ومعدل تحويل الـ SP إلى العملة المحلية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    درجة الثقة المكتسبة لكل تقييم ناجح (Base Trust Points)
                  </label>
                  <input
                    type="number"
                    value={baseTrust}
                    onChange={(e) => setBaseTrust(Number(e.target.value))}
                    className="w-full h-11 rounded-xl border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    خصم نقاط الثقة عند مخالفة الجودة أو الغش (Penalty Points)
                  </label>
                  <input
                    type="number"
                    value={penaltyPoints}
                    onChange={(e) => setPenaltyPoints(Number(e.target.value))}
                    className="w-full h-11 rounded-xl border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] font-bold text-[#C62828]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    معدل تحويل نقطة المهارة SP بالجنيه المصري (1 SP = X EGP)
                  </label>
                  <input
                    type="number"
                    value={spRate}
                    onChange={(e) => setSpRate(Number(e.target.value))}
                    className="w-full h-11 rounded-xl border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-extrabold text-[#05291A]">
                    الحد الأدنى لدرجة الثقة للمشاريع الكبيرة (Minimum Trust Threshold)
                  </label>
                  <input
                    type="number"
                    value={minTrust}
                    onChange={(e) => setMinTrust(Number(e.target.value))}
                    className="w-full h-11 rounded-xl border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="px-8 py-3 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[13px] font-extrabold transition-all cursor-pointer shadow-md"
                >
                  حفظ قواعد نظام الثقة والـ SP
                </button>
              </div>
            </div>
          </form>
        )}

        {/* FULL REAL USER EDIT MODAL DIALOG OVERLAY */}
        {editingUser && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 dir-rtl" dir="rtl">
            <div className="bg-white rounded-[28px] border-2 border-[#056B38] w-full max-w-xl p-6 md:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
              
              <div className="flex items-center justify-between border-b border-[#D1E3D6] pb-4">
                <div>
                  <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                    تعديل بيانات حساب المستخدم الشاملة
                  </h3>
                  <p className="text-[12px] text-[#526B5E]">
                    المعرف: <span className="font-mono font-bold text-[#056B38]">{editingUser.id}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#05291A] font-extrabold flex items-center justify-center cursor-pointer text-[14px]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveFullUserEdit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="block text-[12px] font-extrabold text-[#05291A]">اسم المستخدم بالكامل</label>
                    <input
                      type="text"
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] font-bold"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label className="block text-[12px] font-extrabold text-[#05291A]">البريد الإلكتروني</label>
                    <input
                      type="email"
                      required
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] font-bold"
                    />
                  </div>

                  {/* Role Selector */}
                  <div className="space-y-1">
                    <label className="block text-[12px] font-extrabold text-[#05291A]">الرتبة ونوع الحساب</label>
                    <CustomAdminDropdown
                      value={editForm.role}
                      options={[
                        { value: "developer", label: "مطور برمجيات" },
                        { value: "client", label: "عميل / صاحب عمل" },
                        { value: "moderator", label: "مشرف ومراقب محتوى" },
                        { value: "admin", label: "مدير النظام (Admin)" },
                      ]}
                      onChange={(newRole) => setEditForm({ ...editForm, role: newRole })}
                      className="w-full"
                    />
                  </div>

                  {/* Account Status */}
                  <div className="space-y-1">
                    <label className="block text-[12px] font-extrabold text-[#05291A]">حالة الحساب والتفعيل</label>
                    <CustomAdminDropdown
                      value={editForm.status}
                      options={[
                        { value: "active", label: "نشط ومفعل" },
                        { value: "suspended", label: "موقوف مؤقتاً" },
                        { value: "banned", label: "مبند نهائياً" },
                      ]}
                      onChange={(newStatus) => setEditForm({ ...editForm, status: newStatus })}
                      className="w-full"
                    />
                  </div>

                  {/* Exact SP Points Field */}
                  <div className="space-y-1">
                    <label className="block text-[12px] font-extrabold text-[#05291A]">رصيد نقاط الـ SP الحالية</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.skillPoints}
                      onChange={(e) => setEditForm({ ...editForm, skillPoints: Number(e.target.value) })}
                      className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] font-bold font-mono"
                    />
                  </div>

                  {/* Exact Trust Score Field */}
                  <div className="space-y-1">
                    <label className="block text-[12px] font-extrabold text-[#05291A]">درجة معامل الثقة (0 - 100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.trustScore}
                      onChange={(e) => setEditForm({ ...editForm, trustScore: Number(e.target.value) })}
                      className="w-full h-10 rounded-xl border border-[#D1E3D6] bg-white px-3.5 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] font-bold font-mono"
                    />
                  </div>

                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#05291A] text-[12px] font-extrabold transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[12px] font-extrabold transition-all cursor-pointer shadow-md"
                  >
                    حفظ وتحديث بيانات المستخدم
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}
