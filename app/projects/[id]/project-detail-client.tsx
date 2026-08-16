"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { submitProposal } from "@/lib/actions/profile";
import {
  acceptProposal,
  rejectProposal,
  unhireDeveloper,
  undoRejectProposal,
} from "@/lib/actions/proposals";
import {
  toggleProjectProposalsStatus,
  cancelProject,
  deleteProject,
} from "@/lib/actions/projects";
import {
  Briefcase,
  Clock,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  Send,
  ArrowRight,
  User,
  Sparkles,
  MessageSquare,
  Lock,
  Unlock,
  XCircle,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Settings,
  RotateCcw,
  UserCheck
} from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";

export interface ProposalComment {
  id: string;
  numericId?: number;
  developerId?: number;
  developerUserId: number;
  devName: string;
  devUsername?: string;
  avatarUrl?: string | null;
  role: string;
  trustScore: number;
  status?: string;
  isVerified?: boolean;
  proposedPrice: string;
  deliveryDays: string;
  deliverablesText: string;
  timeAgo: string;
}

export interface ProjectDetail {
  id: string;
  title: string;
  clientUserId?: number;
  status?: string;
  budgetFrom?: number;
  budgetTo?: number;
  hiredDeveloper?: {
    name: string;
    username: string;
    userId: number;
  } | null;
  clientName: string;
  clientLocation: string;
  clientRating: string;
  isClientVerified?: boolean;
  clientProjectsCount: number;
  budgetRange: string;
  postedDate: string;
  deadline: string;
  tags: string[];
  description: string;
  deliverables: string[];
}

export function ProjectDetailClient({
  project,
  initialProposals,
  currentUserId,
}: {
  project: ProjectDetail;
  initialProposals: ProposalComment[];
  currentUserId?: number | null;
}) {
  const router = useRouter();
  const { userRole, isAdmin, addToast } = useProfile();

  // Project Management State
  const [projectStatus, setProjectStatus] = useState<string>(project.status || "open");
  const [isManagingProject, setIsManagingProject] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUnhireModal, setShowUnhireModal] = useState(false);

  // Proposal Form State
  const [proposedPrice, setProposedPrice] = useState("");
  const [deliveryDays, setDeliveryDays] = useState("");
  const [proposalCover, setProposalCover] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  // Initial Public Proposal Comments Feed
  const [proposalsFeed, setProposalsFeed] = useState<ProposalComment[]>(initialProposals);

  // Accepted / Hired Developer State
  const acceptedInFeed = proposalsFeed.find((p) => p.status === "accepted");
  const initialHired = project.hiredDeveloper || (acceptedInFeed
    ? {
        name: acceptedInFeed.devName,
        username: acceptedInFeed.devUsername || String(acceptedInFeed.developerUserId),
        userId: acceptedInFeed.developerUserId,
      }
    : null);

  const [hiredDev, setHiredDev] = useState<{
    name: string;
    username: string;
    userId: number;
  } | null>(initialHired?.name ? initialHired : null);

  const isProjectOwner =
    Boolean(currentUserId && project.clientUserId && currentUserId === project.clientUserId);
  const canManageProposals = isProjectOwner || isAdmin;

  // Toggle open / closed status for proposals
  const handleToggleStatus = async () => {
    const nextStatus = projectStatus === "open" ? "closed" : "open";
    setIsManagingProject(true);
    try {
      const res = await toggleProjectProposalsStatus(Number(project.id), nextStatus);
      if (!res.ok) {
        addToast(res.error ?? "تعذر تغيير حالة استقبال العروض", "warn");
        return;
      }
      setProjectStatus(nextStatus);
      addToast(
        nextStatus === "open"
          ? "تم فتح استقبال عروض المطورين على المشروع بنجاح"
          : "تم إغلاق استقبال العروض على هذا المشروع مؤقتاً",
        "success"
      );
    } finally {
      setIsManagingProject(false);
    }
  };

  // Cancel project
  const handleCancelProject = async () => {
    setIsManagingProject(true);
    try {
      const res = await cancelProject(Number(project.id));
      if (!res.ok) {
        addToast(res.error ?? "تعذر إلغاء المشروع", "warn");
        return;
      }
      setProjectStatus("closed");
      setShowCancelModal(false);
      addToast("تم إلغاء المشروع وإغلاق استقبال العروض", "info");
    } finally {
      setIsManagingProject(false);
    }
  };

  // Delete project completely
  const handleDeleteProject = async () => {
    setIsManagingProject(true);
    try {
      const res = await deleteProject(Number(project.id));
      if (!res.ok) {
        addToast(res.error ?? "تعذر حذف المشروع", "warn");
        return;
      }
      addToast("تم حذف المشروع وجميع عروضه نهائياً بنجاح", "success");
      router.push("/dashboard");
    } finally {
      setIsManagingProject(false);
      setShowDeleteModal(false);
    }
  };

  const hasAlreadySubmitted = Boolean(
    currentUserId && proposalsFeed.some((p) => p.developerUserId === currentUserId)
  );

  const minProposalFloor = Math.max(1250, Math.floor((project.budgetFrom || 1250) * 0.5));
  const numericPrice = Number(proposedPrice) || 0;
  const isBelowFloor = numericPrice > 0 && numericPrice < minProposalFloor;
  const scoraCommission = Math.round(numericPrice * 0.20);
  const netEarnings = Math.max(0, numericPrice - scoraCommission);

  // Realtime Polling: auto-sync proposals and project status without refresh
  React.useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${project.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.ok && isMounted) {
            if (Array.isArray(data.proposals)) {
              setProposalsFeed(data.proposals);
            }
            if (data.project) {
              setProjectStatus(data.project.status);
              if (data.project.hiredDeveloper) {
                setHiredDev(data.project.hiredDeveloper);
              } else if (data.project.status === "open") {
                setHiredDev(null);
              }
            }
          }
        }
      } catch {
        // Silently handle temporary network drops
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [project.id]);

  // Proposal Submission by Developer
  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedPrice || !proposalCover.trim()) {
      addToast("يرجى كتابة تفاصيل ما تستطيع تنفيذه والقيمة المقترحة إجباريًا", "warn");
      return;
    }
    if (numericPrice < minProposalFloor) {
      addToast(
        `العرض المالي (${numericPrice.toLocaleString("ar-EG")} ج.م) أقل من الحد الأدنى المقبول لهذا المشروع (${minProposalFloor.toLocaleString("ar-EG")} ج.م). تلتزم سكورا بالتسعير العادل لحماية قيمة المطورين وجودة العمل.`,
        "warn"
      );
      return;
    }
    if (proposalCover.trim().length < 25) {
      addToast("تفاصيل خطة العمل قصيرة جدًا (اكتب 25 حرفاً على الأقل لشرح ما ستقدمه والتقنيات المقترحة)", "warn");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitProposal({
        projectId: project.id,
        amount: Number(proposedPrice),
        deliveryDays: Number(deliveryDays || 7),
        coverLetter: proposalCover.trim(),
      });

      if (!res.ok) {
        addToast(res.error ?? "تعذّر إرسال العرض", "warn");
        return;
      }

      setProposalsFeed([res.proposal, ...proposalsFeed]);
      addToast("تمت إضافة عرضك بنجاح في قائمة تعليقات العروض المتقدمة!", "success");
      setProposalCover("");
      setProposedPrice("");
      setDeliveryDays("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Accept Proposal
  const handleAcceptProposal = async (proposalId: number) => {
    setActionBusyId(proposalId);
    try {
      const res = await acceptProposal(proposalId);
      if (!res.ok) {
        addToast(res.error ?? "تعذر قبول العرض", "warn");
        return;
      }
      setProjectStatus("in_progress");
      const targetProp = proposalsFeed.find(
        (p) => p.numericId === proposalId || Number(p.id) === proposalId
      );
      if (targetProp) {
        setHiredDev({
          name: res.developerName || targetProp.devName,
          username:
            res.developerUsername || targetProp.devUsername || String(targetProp.developerUserId),
          userId: targetProp.developerUserId,
        });
      }
      setProposalsFeed((prev) =>
        prev.map((p) => {
          if (p.numericId === proposalId || Number(p.id) === proposalId) {
            return { ...p, status: "accepted" };
          }
          return p;
        })
      );
      addToast(
        `تم قبول وتوظيف المطور @${res.developerUsername || res.developerName} بنجاح! تم إغلاق استقبال عروض أخرى.`,
        "success"
      );
    } finally {
      setActionBusyId(null);
    }
  };

  // Unhire / Release Developer and reopen project for bidding
  const handleUnhireDeveloper = async () => {
    if (
      !window.confirm(
        "هل أنت متأكد من رغبتك في إلغاء توظيف المطور الحالي وإعادة فتح المشروع لاختيار عروض أخرى؟"
      )
    )
      return;
    setIsManagingProject(true);
    try {
      const res = await unhireDeveloper(Number(project.id));
      if (!res.ok) {
        addToast(res.error ?? "تعذر إلغاء التوظيف", "warn");
        return;
      }
      setProjectStatus("open");
      setHiredDev(null);
      setProposalsFeed((prev) =>
        prev.map((p) => (p.status === "accepted" ? { ...p, status: "pending" } : p))
      );
      addToast(
        "تم إلغاء التوظيف وإعادة فتح المشروع لاختيار مطور آخر بنجاح!",
        "info"
      );
    } finally {
      setIsManagingProject(false);
    }
  };

  // Reject Proposal
  const handleRejectProposal = async (proposalId: number) => {
    setActionBusyId(proposalId);
    try {
      const res = await rejectProposal(proposalId);
      if (!res.ok) {
        addToast(res.error ?? "تعذر رفض العرض", "warn");
        return;
      }
      setProposalsFeed((prev) =>
        prev.map((p) => {
          if (p.numericId === proposalId || Number(p.id) === proposalId) {
            return { ...p, status: "rejected" };
          }
          return p;
        })
      );
      addToast("تم رفض العرض", "info");
    } finally {
      setActionBusyId(null);
    }
  };

  // Undo Reject Proposal
  const handleUndoRejectProposal = async (proposalId: number) => {
    setActionBusyId(proposalId);
    try {
      const res = await undoRejectProposal(proposalId);
      if (!res.ok) {
        addToast(res.error ?? "تعذر إلغاء الرفض", "warn");
        return;
      }
      setProposalsFeed((prev) =>
        prev.map((p) => {
          if (p.numericId === proposalId || Number(p.id) === proposalId) {
            return { ...p, status: "pending" };
          }
          return p;
        })
      );
      addToast("تم إلغاء الرفض واستعادة العرض بنجاح!", "success");
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-14 w-full flex-1 space-y-10">
        
        {/* BREADCRUMB & TOP HEADER */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#526B5E]">
            <Link href="/projects" className="hover:text-[#056B38] transition-colors flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              <span>العودة لقائمة المشاريع</span>
            </Link>
            <span>/</span>
            <span className="text-[#056B38]">تفاصيل المشروع والعروض المتقدمة</span>
          </div>

          {/* PROJECT TITLE CARD */}
          <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-10 space-y-6 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-4 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[12px] font-bold border ${
                      projectStatus === "in_progress"
                        ? "bg-emerald-50 text-[#056B38] border-emerald-300"
                        : projectStatus === "completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : projectStatus === "closed"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-white text-[#056B38] border-[#D1E3D6]"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {projectStatus === "in_progress"
                        ? "المشروع قيد التنفيذ مع مطور معتمد · In Progress"
                        : projectStatus === "completed"
                        ? "تم اكتمال المشروع · Completed"
                        : projectStatus === "closed"
                        ? "مغلق لتلقي العروض · Closed"
                        : "مفتوح لتلقي العروض · Open for Proposals"}
                    </span>
                  </span>

                  <span className="text-[12px] font-bold text-[#526B5E] bg-white/80 px-3 py-1 rounded-full border border-[#D1E3D6] inline-flex items-center gap-1.5">
                    <span>{project.clientName}</span>
                    {project.isClientVerified && <VerifiedBadge type="client" size="sm" />}
                  </span>
                </div>

                <h1 className="text-[26px] md:text-[36px] font-extrabold text-[#05291A] font-heading leading-tight break-words [overflow-wrap:anywhere]">
                  {project.title}
                </h1>

                {/* HIRED DEVELOPER PROMINENT BANNER (Shows Developer Username) */}
                {hiredDev && (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#056B38] text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[15px] font-extrabold text-[#05291A] flex items-center gap-1.5 flex-wrap">
                          <span>تم قبول وتوظيف المطور:</span>
                          <Link
                            href={`/profile/${hiredDev.username || hiredDev.userId}`}
                            className="text-[#056B38] underline hover:text-[#08592E] font-black"
                          >
                            @{hiredDev.username || hiredDev.name}
                          </Link>
                        </div>
                        <div className="text-[12px] text-[#526B5E]">
                          المشروع قيد التنفيذ حالياً، وتم إغلاق قبول عروض أخرى تلقائياً.
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/chat?user=${hiredDev.userId}`}
                        className="h-[36px] px-4 rounded-xl border border-[#056B38]/30 bg-white text-[#056B38] text-[12px] font-bold hover:bg-[#E8FAF0] transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>محادثة المطور</span>
                      </Link>

                      {canManageProposals && (
                        <button
                          type="button"
                          disabled={isManagingProject}
                          onClick={handleUnhireDeveloper}
                          className="h-[36px] px-3.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[12px] font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                          <span>إلغاء التوظيف وإعادة الاختيار</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Owner Management Toolbar on Hero */}
                {canManageProposals && !hiredDev && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-[#526B5E] ml-1">إجراءات صاحب المشروع:</span>
                    
                    {/* Toggle Open/Closed Proposals */}
                    {projectStatus === "open" ? (
                      <button
                        type="button"
                        disabled={isManagingProject}
                        onClick={handleToggleStatus}
                        className="h-[34px] px-3.5 rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[12px] font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>إيقاف استقبال العروض</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isManagingProject}
                        onClick={handleToggleStatus}
                        className="h-[34px] px-3.5 rounded-full border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[12px] font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Unlock className="w-3.5 h-3.5 text-emerald-700" />
                        <span>إعادة فتح التقديم</span>
                      </button>
                    )}

                    {/* Cancel Project */}
                    {projectStatus !== "closed" && (
                      <button
                        type="button"
                        disabled={isManagingProject}
                        onClick={handleCancelProject}
                        className="h-[34px] px-3.5 rounded-full border border-neutral-300 bg-white hover:bg-neutral-100 text-[#05291A] text-[12px] font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5 text-neutral-600" />
                        <span>إلغاء المشروع</span>
                      </button>
                    )}

                    {/* Delete Project */}
                    <button
                      type="button"
                      disabled={isManagingProject}
                      onClick={() => setShowDeleteModal(true)}
                      className="h-[34px] px-3.5 rounded-full border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[12px] font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>حذف نهائي</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Budget & Time Details */}
              <div className="bg-white p-5 rounded-[20px] border border-[#D1E3D6] text-right md:text-left shrink-0 space-y-1.5 shadow-2xs">
                <div className="text-[12px] font-bold text-[#526B5E]">الميزانية التقديرية</div>
                <div className="text-[22px] font-extrabold text-[#056B38] font-heading">{project.budgetRange}</div>
                <div className="text-[12px] text-[#526B5E] flex items-center gap-1 justify-end">
                  <Clock className="w-3.5 h-3.5 text-[#056B38]" />
                  <span>زمن التسليم المطلوب: {project.deadline}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT (PROJECT DETAILS + ADD PROPOSAL FORM & PUBLIC PROPOSALS FEED) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column (2 Cols): Scope + Deliverables + Add Proposal Form + Proposals Feed */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Project Scope & Details */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-6 shadow-2xs">
              <div className="space-y-4">
                <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                  وصف المشروع ونطاق العمل
                </h3>
                <p className="text-[14px] text-[#526B5E] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {project.description}
                </p>
              </div>

              {/* Required Skills Tags */}
              {project.tags.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <h4 className="text-[14px] font-bold text-[#05291A]">المهارات والتقنيات المطلوبة:</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3.5 py-1.5 rounded-full bg-[#E8FAF0] text-[#056B38] text-[12px] font-bold border border-[#C5E8D1] break-words [overflow-wrap:anywhere] max-w-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables Checklist */}
              {project.deliverables.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <h4 className="text-[14px] font-bold text-[#05291A]">المخرجات والتسليمات المطلوبة:</h4>
                  <div className="space-y-2">
                    {project.deliverables.map((del, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-[13px] text-[#526B5E]">
                        <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0 mt-0.5" />
                        <span className="break-words [overflow-wrap:anywhere]">{del}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ADD PROPOSAL / BIDDING FORM (SHOWN FOR DEVELOPERS BUT PREVENTED FOR OWNER) */}
            {isProjectOwner ? (
              <div className="rounded-[24px] border border-[#D1E3D6] bg-neutral-50 p-6 md:p-8 space-y-2 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#056B38] text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-[17px] font-extrabold text-[#05291A] font-heading">
                      أنت صاحب هذا المشروع
                    </h3>
                    <p className="text-[13px] text-[#526B5E] leading-relaxed">
                      لا يمكنك تقديم عرض على مشروع قمت بنشره بنفسك. يمكنك مراجعة طلبات وعروض المطورين المتقدمة، بدء محادثات فورية، وتوظيف المطور الأنسب أدناه.
                    </p>
                  </div>
                </div>
              </div>
            ) : userRole === "developer" ? (
              hasAlreadySubmitted ? (
                <div className="rounded-[24px] border border-emerald-300 bg-[#E8FAF0] p-6 md:p-8 space-y-3 shadow-2xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-full bg-[#056B38] text-white font-bold flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-extrabold text-[#05291A] font-heading">
                        لقد قمت بتقديم عرضك على هذا المشروع بالفعل
                      </h3>
                      <p className="text-[13px] text-[#526B5E] leading-relaxed">
                        عرضك قيد المراجعة حالياً من قبل العميل. لا يمكن إرسال أكثر من عرض لنفس المشروع. يمكنك متابعة تفاصيل عرضك أدناه أو التواصل مباشرة مع العميل عبر المحادثة الفورية.
                      </p>
                    </div>
                  </div>
                </div>
              ) : projectStatus === "open" && !hiredDev ? (
                <div className="rounded-[24px] border border-[#D1E3D6] bg-[#E8FAF0] p-6 md:p-8 space-y-6 shadow-2xs">
                  <div className="space-y-1">
                    <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading flex items-center gap-2">
                      <Send className="w-5 h-5 text-[#056B38]" />
                      <span>التقديم وإضافة عرضك على هذا المشروع</span>
                    </h3>
                    <p className="text-[13px] text-[#526B5E]">
                      قدم خطتك التفصيلية والعرض المالي لاستعراضه مباشرة أمام صاحب المشروع.
                    </p>
                  </div>

                  <form onSubmit={handleProposalSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[13px] font-bold text-[#05291A]">
                            العرض المالي المقترح (ج.م) <span className="text-red-500">*</span>
                          </label>
                          <span className="text-[11px] font-bold text-[#056B38]">
                            الحد الأدنى العادل: {minProposalFloor.toLocaleString("ar-EG")} ج.م
                          </span>
                        </div>
                        <input
                          type="number"
                          required
                          min={minProposalFloor}
                          value={proposedPrice}
                          onChange={(e) => setProposedPrice(e.target.value)}
                          placeholder={`مثال: ${project.budgetFrom || minProposalFloor}`}
                          className={`w-full h-[46px] rounded-[12px] border bg-white px-4 text-[13px] text-[#05291A] outline-none transition-all ${
                            isBelowFloor
                              ? "border-amber-400 focus:border-amber-500 bg-amber-50/30"
                              : "border-[#D1E3D6] focus:border-[#056B38]"
                          }`}
                        />
                        {isBelowFloor ? (
                          <div className="text-[11px] font-bold text-amber-700 flex items-center gap-1 pt-0.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>السعر أقل من الحد العادل المسموح به لهذا المشروع ({minProposalFloor.toLocaleString("ar-EG")} ج.م)</span>
                          </div>
                        ) : numericPrice >= minProposalFloor ? (
                          <div className="text-[11px] font-bold text-[#056B38] flex items-center gap-1 pt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#056B38] shrink-0" />
                            <span>عرض متوازن يتماشى مع معايير التسعير العادل وجودة التنفيذ</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-[#05291A]">
                          مدة التسليم المقترحة (بالأيام) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={deliveryDays}
                          onChange={(e) => setDeliveryDays(e.target.value)}
                          placeholder="مثال: 7"
                          className="w-full h-[46px] rounded-[12px] border border-[#D1E3D6] bg-white px-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
                        />
                      </div>
                    </div>

                    {/* LIVE SCORA 20% COMMISSION & NET PAYOUT BREAKDOWN */}
                    {numericPrice > 0 && (
                      <div className="rounded-2xl border border-emerald-200 bg-white p-4 space-y-3 shadow-2xs">
                        <div className="flex items-center justify-between text-[12px] font-bold text-[#526B5E] border-b border-neutral-100 pb-2">
                          <span className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-[#056B38]" />
                            <span>تفاصيل الحسبة والأرباح الصافية (Scora Fee Breakdown):</span>
                          </span>
                          <span className="text-[11px] bg-emerald-50 text-[#056B38] px-2.5 py-0.5 rounded-full border border-emerald-200">
                            عمولة المنصة 20%
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                          <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                            <div className="text-[11px] text-[#526B5E] font-medium">قيمة العرض الإجمالية</div>
                            <div className="text-[14px] font-black text-[#05291A] mt-0.5">
                              {numericPrice.toLocaleString("ar-EG")} ج.م
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                            <div className="text-[11px] text-amber-800 font-medium">رسوم المنصة والضمان (20%)</div>
                            <div className="text-[14px] font-black text-amber-900 mt-0.5">
                              -{scoraCommission.toLocaleString("ar-EG")} ج.م
                            </div>
                          </div>

                          <div className="p-2.5 rounded-xl bg-[#E8FAF0] border border-emerald-300 shadow-2xs">
                            <div className="text-[11px] text-[#056B38] font-bold">صافي ما يصلك في حسابك (80%)</div>
                            <div className="text-[16px] font-extrabold text-[#056B38] mt-0.5 font-heading">
                              {netEarnings.toLocaleString("ar-EG")} ج.م
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-[#526B5E] text-center pt-0.5">
                          تشمل عمولة Scora حماية الدفع عبر حساب الضمان (Escrow)، التحكيم الفني، والتقييم المعتمد.
                        </p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-[#05291A]">
                        ما تستطيع تنفيذه وخطة العمل (التعليق المتقدم) <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        required
                        minLength={25}
                        value={proposalCover}
                        onChange={(e) => setProposalCover(e.target.value)}
                        placeholder="اكتب بالتفصيل ما الذي ستقدمه للمشروع، التقنيات المستخدمة، ومراحل التسليم (25 حرفاً على الأقل)..."
                        className="w-full rounded-[12px] border border-[#D1E3D6] bg-white p-4 text-[13px] text-[#05291A] outline-none focus:border-[#056B38] leading-relaxed resize-none"
                      />
                    </div>

                    {/* Submit Proposal Comment Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-[52px] rounded-full bg-[#056B38] hover:bg-[#08592E] text-white text-[15px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{isSubmitting ? "جاري نشر العرض..." : "إضافة وعرض خطتي للمشروع"}</span>
                    </button>

                  </form>
                </div>
              ) : (
                <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-6 text-center space-y-2">
                  <p className="text-[14px] font-bold text-amber-900">
                    {hiredDev
                      ? `تم اعتماد وتوظيف المطور @${hiredDev.username || hiredDev.name} على هذا المشروع.`
                      : "تم إغلاق استقبال العروض على هذا المشروع حالياً."}
                  </p>
                  <p className="text-[12px] text-amber-700">
                    لا يمكن تقديم عروض جديدة في الوقت الحالي.
                  </p>
                </div>
              )
            ) : null}

            {/* PUBLIC PROPOSALS COMMENTS FEED (SHOWS HOW MANY PROPOSALS AND EACH OFFER) */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#056B38]" />
                  <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                    العروض والتعليقات المتقدمة ({proposalsFeed.length} عروض)
                  </h3>
                </div>
                <span className="text-[12px] font-bold bg-[#E8FAF0] text-[#056B38] px-3 py-1 rounded-full">
                  شفافية كاملة
                </span>
              </div>

              <div className="space-y-5">
                {proposalsFeed.length > 0 ? (
                  proposalsFeed.map((prop) => {
                    const devProfileUrl = `/profile/${prop.devUsername || prop.developerUserId}`;
                    const devChatUrl = `/chat?user=${prop.developerUserId}`;
                    const isAccepted = prop.status === "accepted";
                    const isRejected = prop.status === "rejected";

                    return (
                      <div
                        key={prop.id}
                        className={`p-5 rounded-[22px] border transition-all space-y-4 ${
                          isAccepted
                            ? "border-[#056B38] bg-[#E8FAF0]/50 shadow-xs"
                            : isRejected
                            ? "border-neutral-200 bg-neutral-50/70 opacity-70"
                            : hiredDev
                            ? "border-[#D1E3D6] bg-white opacity-85"
                            : "border-[#D1E3D6] bg-[#F7FAF8] hover:border-[#056B38]/70"
                        }`}
                      >
                        {/* Header: Clickable Dev Info */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/60 pb-3">
                          <Link
                            href={devProfileUrl}
                            className="flex items-center gap-3 group cursor-pointer"
                          >
                            {prop.avatarUrl ? (
                              <img
                                src={prop.avatarUrl}
                                alt={prop.devName}
                                className="w-11 h-11 rounded-full object-cover border border-[#C5E8D1] group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-[#E8FAF0] text-[#056B38] font-bold flex items-center justify-center border border-[#C5E8D1] group-hover:bg-[#056B38] group-hover:text-white transition-colors">
                                {prop.devName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-[#05291A] text-[15px] group-hover:text-[#056B38] transition-colors">
                                  <span>{prop.devName}</span>
                                  <span className="text-[12px] text-[#526B5E] font-normal">(@{prop.devUsername})</span>
                                  {prop.isVerified ? (
                                    <VerifiedBadge type="developer" size="sm" />
                                  ) : (
                                    <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                                  )}
                                </div>
                                <div className="text-[12px] text-[#526B5E]">{prop.role}</div>
                              </div>
                          </Link>

                          {/* Badges: Trust Score + Status + Time */}
                          <div className="flex flex-wrap items-center gap-2">
                            {isAccepted ? (
                              <span className="text-[11px] font-bold text-white bg-[#056B38] px-3 py-1 rounded-full shadow-2xs flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تم قبول وتوظيف @{prop.devUsername}</span>
                              </span>
                            ) : isRejected ? (
                              <span className="text-[11px] font-bold text-neutral-500 bg-neutral-200 px-3 py-1 rounded-full">
                                مرفوض
                              </span>
                            ) : null}

                            <span className="text-[11px] font-bold text-[#056B38] bg-[#E8FAF0] px-2.5 py-1 rounded-full border border-[#D1E3D6]">
                              Trust Score: {prop.trustScore}%
                            </span>
                            <span className="text-[11px] font-bold text-[#526B5E] bg-white px-2.5 py-1 rounded-full border border-[#D1E3D6]">
                              {prop.timeAgo}
                            </span>
                          </div>
                        </div>

                        {/* Proposal Text / Delivery Plan */}
                        <p className="text-[13px] text-[#05291A] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-white/70 p-3.5 rounded-xl border border-neutral-200/50">
                          {prop.deliverablesText}
                        </p>

                        {/* Offer Numbers: Price and Delivery */}
                        <div className="flex items-center justify-between text-[13px] font-bold">
                          <div className="text-[#056B38] font-heading text-[15px]">
                            العرض المقترح: {prop.proposedPrice}
                          </div>
                          <div className="text-[#526B5E] flex items-center gap-1">
                            <Clock className="w-4 h-4 text-[#056B38]" />
                            <span>مدة التسليم: {prop.deliveryDays}</span>
                          </div>
                        </div>

                        {/* Action Buttons Toolbar (View Profile + Chat + Accept / Reject / Unhire) */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-200/60">
                          
                          {/* Navigation & Chat Buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={devProfileUrl}
                              className="h-[36px] px-4 rounded-xl border border-[#D1E3D6] bg-white text-[#05291A] text-[12px] font-bold hover:bg-[#F7FAF8] hover:border-[#056B38]/50 transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                            >
                              <User className="w-3.5 h-3.5 text-[#056B38]" />
                              <span>الملف الشخصي والجواز</span>
                            </Link>

                            <Link
                              href={devChatUrl}
                              className="h-[36px] px-4 rounded-xl border border-[#056B38]/30 bg-[#E8FAF0] text-[#056B38] text-[12px] font-bold hover:bg-[#D4F4E2] transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#056B38]" />
                              <span>محادثة فورية</span>
                            </Link>
                          </div>

                          {/* Client / Owner Actions */}
                          {canManageProposals && (
                            <div className="flex items-center gap-2">
                              {isAccepted ? (
                                <div className="flex items-center gap-2">
                                  <span className="h-[36px] px-3.5 rounded-xl bg-[#056B38] text-white text-[12px] font-bold inline-flex items-center gap-1.5 shadow-xs">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>المطور المعتمد للمشروع (@{prop.devUsername})</span>
                                  </span>

                                  <button
                                    type="button"
                                    disabled={isManagingProject}
                                    onClick={handleUnhireDeveloper}
                                    className="h-[36px] px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[12px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                                    title="إلغاء التوظيف وإعادة فتح اختيار العروض"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                    <span>إلغاء التوظيف</span>
                                  </button>
                                </div>
                              ) : isRejected ? (
                                <div className="flex items-center gap-2">
                                  <span className="h-[36px] px-3 rounded-xl bg-neutral-100 text-neutral-500 text-[12px] font-bold inline-flex items-center">
                                    تم رفض هذا العرض
                                  </span>
                                  {!hiredDev && (
                                    <button
                                      type="button"
                                      disabled={actionBusyId !== null || isManagingProject}
                                      onClick={() => handleUndoRejectProposal(prop.numericId || Number(prop.id))}
                                      className="h-[36px] px-3.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[12px] font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                                      title="إلغاء الرفض وإعادة فتح فرصة توظيف المطور"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                                      <span>
                                        {actionBusyId === (prop.numericId || Number(prop.id))
                                          ? "جاري الاستعادة..."
                                          : "إلغاء الرفض"}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              ) : hiredDev ? (
                                <span className="h-[36px] px-3 rounded-xl bg-neutral-100 border border-neutral-200 text-[#526B5E] text-[12px] font-bold inline-flex items-center">
                                  مغلق (تم توظيف @{hiredDev.username || hiredDev.name})
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={actionBusyId !== null || isManagingProject}
                                    onClick={() => handleAcceptProposal(prop.numericId || Number(prop.id))}
                                    className="h-[36px] px-4 rounded-xl bg-[#056B38] hover:bg-[#08592E] text-white text-[12px] font-bold transition-all inline-flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>
                                      {actionBusyId === (prop.numericId || Number(prop.id))
                                        ? "جاري التوظيف..."
                                        : "قبول وتوظيف المطور"}
                                    </span>
                                  </button>

                                  <button
                                    type="button"
                                    disabled={actionBusyId !== null || isManagingProject}
                                    onClick={() => handleRejectProposal(prop.numericId || Number(prop.id))}
                                    className="h-[36px] px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[12px] font-bold transition-all inline-flex items-center cursor-pointer active:scale-95 disabled:opacity-50"
                                  >
                                    <span>رفض</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-[14px] font-bold text-[#526B5E]">لا توجد عروض مضافة على هذا المشروع حتى الآن.</p>
                    <p className="text-[12px] text-[#526B5E]">كن أول مطور يتقدم بخطته وعرضه البرمجي!</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Client Summary & Project Controls & Safety Assurance */}
          <div className="space-y-6">
            
            {/* Client Card */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-4 shadow-2xs">
              <h3 className="text-[16px] font-bold text-[#05291A]">صاحب المشروع والعميل</h3>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#E8FAF0] text-[#056B38] font-bold flex items-center justify-center text-[16px] border border-[#C5E8D1]">
                  {project.clientName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-[#05291A] text-[15px] flex items-center gap-1.5">
                    <span>{project.clientName}</span>
                    {project.isClientVerified && <VerifiedBadge type="client" size="sm" />}
                  </div>
                  <div className="text-[12px] text-[#526B5E]">{project.clientLocation || "مصر"}</div>
                </div>
              </div>

              <div className="border-t border-neutral-100 pt-3 space-y-2 text-[12px] text-[#526B5E]">
                <div className="flex items-center justify-between">
                  <span>المشاريع المنشورة:</span>
                  <span className="font-bold text-[#05291A]">{project.clientProjectsCount} مشاريع</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>تاريخ النشر:</span>
                  <span className="font-bold text-[#05291A]">{project.postedDate}</span>
                </div>
              </div>
            </div>

            {/* Dedicated Management Card for Client Owner */}
            {canManageProposals && (
              <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-4 shadow-2xs">
                <div className="flex items-center gap-2 text-[#05291A] font-bold text-[16px]">
                  <Settings className="w-5 h-5 text-[#056B38]" />
                  <span>إدارة وتحكم المشروع</span>
                </div>

                <div className="space-y-2.5 pt-1">
                  {/* If developer is hired, show option to unhire and reopen */}
                  {hiredDev ? (
                    <button
                      type="button"
                      disabled={isManagingProject}
                      onClick={handleUnhireDeveloper}
                      className="w-full h-[44px] rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[12px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4 text-amber-700" />
                      <span>إلغاء توظيف @{hiredDev.username} وإعادة فتح الاختيار</span>
                    </button>
                  ) : (
                    /* Toggle proposals open/closed */
                    <button
                      type="button"
                      disabled={isManagingProject}
                      onClick={handleToggleStatus}
                      className="w-full h-[42px] rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[#05291A] text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {projectStatus === "open" ? (
                        <>
                          <Lock className="w-4 h-4 text-amber-700" />
                          <span>إيقاف استقبال العروض مؤقتاً</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-4 h-4 text-emerald-700" />
                          <span>إعادة فتح استقبال العروض</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Cancel Project */}
                  {projectStatus !== "closed" && (
                    <button
                      type="button"
                      disabled={isManagingProject}
                      onClick={() => setShowCancelModal(true)}
                      className="w-full h-[42px] rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-[#05291A] text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4 text-neutral-600" />
                      <span>إلغاء المشروع</span>
                    </button>
                  )}

                  {/* Delete Project */}
                  <button
                    type="button"
                    disabled={isManagingProject}
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full h-[42px] rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[13px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>حذف المشروع نهائياً</span>
                  </button>
                </div>
              </div>
            )}

            {/* Platform Guarantee */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-[#F7FAF8] p-6 space-y-3">
              <div className="flex items-center gap-2 text-[#056B38] font-bold text-[14px]">
                <ShieldCheck className="w-5 h-5" />
                <span>ضمان منصة سكورا</span>
              </div>
              <p className="text-[12px] text-[#526B5E] leading-relaxed">
                يتم حجز قيمة المشروع كاملة في حساب وسيط آمن قبل بدء العمل، ولا يتم تحرير الدفعة إلا بعد مراجعة المخرجات البرمجية وموافقة الطرفين.
              </p>
            </div>

          </div>

        </div>

      </main>

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 md:p-8 space-y-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                هل أنت متأكد من إلغاء المشروع؟
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                سيتم إغلاق استقبال العروض وإلغاء هذا المشروع. يمكنك دائماً إنشاء مشاريع جديدة في أي وقت.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isManagingProject}
                onClick={handleCancelProject}
                className="flex-1 h-[46px] rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[14px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
              >
                <span>{isManagingProject ? "جاري الإلغاء..." : "نعم، إلغاء المشروع"}</span>
              </button>
              
              <button
                type="button"
                disabled={isManagingProject}
                onClick={() => setShowCancelModal(false)}
                className="flex-1 h-[46px] rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[14px] font-bold transition-all cursor-pointer"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UNHIRE CONFIRMATION MODAL */}
      {showUnhireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 md:p-8 space-y-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                إلغاء توظيف المطور
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                هل أنت متأكد من رغبتك في إلغاء توظيف المطور الحالي وإعادة فتح المشروع لاختيار عروض أخرى؟
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isManagingProject}
                onClick={handleUnhireDeveloper}
                className="flex-1 h-[46px] rounded-full bg-amber-600 hover:bg-amber-700 text-white text-[14px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
              >
                <span>{isManagingProject ? "جاري الإلغاء..." : "تأكيد إلغاء التوظيف"}</span>
              </button>
              
              <button
                type="button"
                disabled={isManagingProject}
                onClick={() => setShowUnhireModal(false)}
                className="flex-1 h-[46px] rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[14px] font-bold transition-all cursor-pointer"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 md:p-8 space-y-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-[20px] font-extrabold text-[#05291A] font-heading">
                هل أنت متأكد من حذف المشروع؟
              </h3>
              <p className="text-[13px] text-[#526B5E] leading-relaxed">
                سيتم حذف مشروع «{project.title}» وجميع العروض المتقدمة عليه بشكل نهائي من قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={isManagingProject}
                onClick={handleDeleteProject}
                className="flex-1 h-[46px] rounded-full bg-red-600 hover:bg-red-700 text-white text-[14px] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isManagingProject ? "جاري الحذف..." : "نعم، حذف نهائي"}</span>
              </button>
              
              <button
                type="button"
                disabled={isManagingProject}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 h-[46px] rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[14px] font-bold transition-all cursor-pointer"
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
