"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  User,
  Clock,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  Send,
  MessageSquare,
  Radio,
  FileText,
} from "lucide-react";
import { CustomSelect } from "@/components/custom-select";

export interface ExtendedProjectItem {
  id: number;
  title: string;
  description?: string;
  category: string | null;
  budgetFrom: number;
  budgetTo: number;
  deadlineDays: number | null;
  status: string;
  skillsJson?: unknown;
  deliverablesJson?: unknown;
  postedAt: string;
  rawPostedAt?: string;
  clientId?: number;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  accountType?: "personal" | "company";
  companyName: string | null;
  proposalsCount: number;
}

export interface ProposalItem {
  id: number;
  developerId: number;
  developerName: string;
  developerEmail: string;
  trustScore: number;
  skillPoints: number;
  price: number;
  deliveryDays: number;
  coverText: string;
  status: string;
  createdAt: string;
}

export interface SupportTicketItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  reportedUserId: number | null;
  reportedUserName: string | null;
  reportedUserEmail: string | null;
  category: string;
  subject: string;
  description: string;
  status: "new" | "reviewing" | "resolved";
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// 1. Full Project Details & Submitted Proposals Inspector Modal
// ─────────────────────────────────────────────────────────────
export function ProjectDetailsModal({
  project,
  onClose,
  onOpenEdit,
  onOpenDelete,
  onDeleteProposal,
}: {
  project: ExtendedProjectItem;
  onClose: () => void;
  onOpenEdit: (p: ExtendedProjectItem) => void;
  onOpenDelete: (p: ExtendedProjectItem) => void;
  onDeleteProposal: (proposalId: number) => Promise<void>;
}) {
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [deletingProposalId, setDeletingProposalId] = useState<number | null>(null);
  const [proposalToDelete, setProposalToDelete] = useState<ProposalItem | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/projects/${project.id}/proposals`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (active) {
          setProposals(data);
          setLoadingProposals(false);
        }
      })
      .catch(() => {
        if (active) setLoadingProposals(false);
      });
    return () => {
      active = false;
    };
  }, [project.id]);

  const confirmDelete = async (propId: number) => {
    setDeletingProposalId(propId);
    try {
      await onDeleteProposal(propId);
      setProposals((prev) => prev.filter((p) => p.id !== propId));
      setProposalToDelete(null);
    } finally {
      setDeletingProposalId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-3xl rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-7 shadow-2xl space-y-6 my-8 max-h-[88vh] overflow-y-auto">
        {/* Header Section */}
        <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
          <div className="space-y-2 flex-1 pl-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-lg bg-[#F7FAF8] text-[#056B38] font-black text-xs px-2.5 py-1 border border-[#D1E3D6]">
                #{project.id}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  project.status === "open"
                    ? "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
                    : project.status === "in_progress"
                    ? "bg-sky-50 text-sky-800 border border-sky-200"
                    : project.status === "completed"
                    ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    : "bg-neutral-100 text-[#526B5E]"
                }`}
              >
                {project.status === "open"
                  ? "مفتوح للتقديم"
                  : project.status === "in_progress"
                  ? "قيد التنفيذ"
                  : project.status === "completed"
                  ? "مكتمل"
                  : "مغلق"}
              </span>
              {project.category && (
                <span className="rounded-full bg-[#F7FAF8] text-[#526B5E] text-xs font-bold px-3 py-1 border border-[#D1E3D6]">
                  {project.category}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-[#05291A] leading-snug">
              {project.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#526B5E] pt-0.5">
              <span>نُشر بتاريخ: <strong className="text-[#05291A]">{project.postedAt}</strong></span>
              <span>·</span>
              <span>
                بواسطة:{" "}
                <strong className="text-[#05291A]">
                  {project.companyName ? `شركة ${project.companyName}` : project.ownerName}
                </strong>
              </span>
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

        {/* 4 Stat Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {/* Budget */}
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3.5 flex flex-col justify-between">
            <span className="text-[#526B5E] font-bold flex items-center gap-1 text-[11px]">
              <DollarSign className="h-3.5 w-3.5 text-[#056B38]" /> الميزانية:
            </span>
            <div className="mt-2 font-black text-[#056B38] text-base">
              {project.budgetFrom === project.budgetTo
                ? `${project.budgetFrom.toLocaleString("ar-EG")} ج.م`
                : `${project.budgetFrom.toLocaleString("ar-EG")} - ${project.budgetTo.toLocaleString("ar-EG")} ج.م`}
            </div>
          </div>

          {/* Deadline */}
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3.5 flex flex-col justify-between">
            <span className="text-[#526B5E] font-bold flex items-center gap-1 text-[11px]">
              <Clock className="h-3.5 w-3.5 text-[#05291A]" /> المدة المتوقعة:
            </span>
            <div className="mt-2 font-black text-[#05291A] text-base">
              {project.deadlineDays ? `${project.deadlineDays} يوم` : "غير محددة"}
            </div>
          </div>

          {/* Proposals Count */}
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3.5 flex flex-col justify-between">
            <span className="text-[#526B5E] font-bold flex items-center gap-1 text-[11px]">
              <MessageSquare className="h-3.5 w-3.5 text-[#05291A]" /> العروض المقدمة:
            </span>
            <div className="mt-2 font-black text-[#05291A] text-base">
              {proposals.length} عرض
            </div>
          </div>

          {/* Client Details */}
          <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-3.5 flex flex-col justify-between">
            <span className="text-[#526B5E] font-bold flex items-center gap-1 text-[11px]">
              <User className="h-3.5 w-3.5 text-[#05291A]" /> بيانات العميل:
            </span>
            <div className="mt-2">
              <div className="font-black text-[#05291A] truncate text-xs">
                {project.ownerName}
              </div>
              {project.ownerEmail && (
                <div className="text-[10px] text-[#526B5E] font-normal truncate" title={project.ownerEmail}>
                  {project.ownerEmail}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Project Description Box */}
        {project.description && (
          <div className="space-y-2 text-xs">
            <h3 className="font-black text-[#05291A] text-sm flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-[#056B38]" /> تفاصيل ووصف المشروع
            </h3>
            <div className="rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-4 text-[#05291A] font-bold leading-relaxed whitespace-pre-wrap">
              {project.description}
            </div>
          </div>
        )}

        {/* Submitted Proposals Section */}
        <div className="space-y-3 text-xs border-t border-neutral-100 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-[#05291A] text-sm flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-[#056B38]" /> العروض المقدمة من المطورين ({proposals.length})
            </h3>
            <Link
              href={`/projects/${project.id}`}
              target="_blank"
              className="text-xs font-bold text-[#056B38] hover:underline flex items-center gap-1"
            >
              <span>فتح صفحة المشروع بالمنصة</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loadingProposals ? (
            <div className="p-8 text-center text-[#526B5E] font-bold">جاري تحميل العروض...</div>
          ) : proposals.length > 0 ? (
            <div className="space-y-3">
              {proposals.map((prop) => (
                <div
                  key={prop.id}
                  className="rounded-2xl border border-[#D1E3D6] bg-white p-4 shadow-2xs space-y-3 hover:border-[#056B38]/40 transition-all"
                >
                  {/* Proposal Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-[#056B38]/10 text-[#056B38] flex items-center justify-center font-black text-xs">
                        {prop.developerName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-black text-[#05291A] text-xs flex items-center gap-2">
                          <span>{prop.developerName}</span>
                          <span className="text-[10px] text-[#056B38] font-black bg-[#E8FAF0] px-2 py-0.5 rounded-md border border-[#D1E3D6]">
                            Trust: {prop.trustScore}%
                          </span>
                        </div>
                        <span className="text-[11px] text-[#526B5E]">{prop.developerEmail} · {prop.createdAt}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-left bg-[#F7FAF8] border border-[#D1E3D6] px-3 py-1.5 rounded-xl">
                        <span className="font-black text-[#056B38] text-sm block">
                          {prop.price.toLocaleString("ar-EG")} ج.م
                        </span>
                        <span className="text-[10px] text-[#526B5E] font-bold block">{prop.deliveryDays} يوم تسليم</span>
                      </div>

                      <button
                        type="button"
                        disabled={deletingProposalId === prop.id}
                        onClick={() => setProposalToDelete(prop)}
                        title="حذف هذا العرض"
                        className="h-9 px-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>

                  {/* Proposal Text */}
                  {prop.coverText && (
                    <div className="text-xs text-[#05291A] font-bold leading-relaxed bg-[#F7FAF8] p-3 rounded-xl border border-neutral-100">
                      {prop.coverText}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-100 bg-[#F7FAF8] p-6 text-center text-[#526B5E] font-bold">
              لم يتم تقديم أي عروض على هذا المشروع حتى الآن.
            </div>
          )}
        </div>

        {/* Action Controls Bar */}
        <div className="border-t border-neutral-100 pt-4 flex flex-wrap gap-2.5 justify-end">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenEdit(project);
            }}
            className="h-10 rounded-2xl bg-[#056B38] hover:bg-[#005B27] text-white px-5 text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Edit3 className="h-4 w-4" />
            <span>تعديل بيانات المشروع</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenDelete(project);
            }}
            className="h-10 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 px-4 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>حذف المشروع</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-2xl border border-neutral-200 bg-white hover:bg-neutral-100 text-[#05291A] px-5 text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

        {/* Custom Confirmation Modal for Deleting Proposal */}
        {proposalToDelete && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            dir="rtl"
          >
            <div className="w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <h4 className="text-lg font-black text-red-700 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  تأكيد حذف عرض المطور
                </h4>
                <button
                  type="button"
                  onClick={() => setProposalToDelete(null)}
                  className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-[#526B5E] leading-relaxed font-bold">
                  هل أنت متأكد من رغبتك في حذف العرض المقدم من المطور{" "}
                  <strong className="text-[#05291A] font-black">{proposalToDelete.developerName}</strong>؟
                </p>

                <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-900 font-bold space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span>قيمة العرض: <strong className="font-black text-red-800">{proposalToDelete.price.toLocaleString("ar-EG")} ج.م</strong></span>
                    <span>مدة التسليم: <strong className="font-black text-red-800">{proposalToDelete.deliveryDays} يوم</strong></span>
                  </div>
                  <p className="text-[11px] text-red-700 pt-1.5 border-t border-red-200">
                    سيتم حذف هذا العرض نهائياً من قائمة عروض المشروع في قاعدة البيانات.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={deletingProposalId === proposalToDelete.id}
                  onClick={() => confirmDelete(proposalToDelete.id)}
                  className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>{deletingProposalId === proposalToDelete.id ? "جاري الحذف..." : "تأكيد حذف العرض"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProposalToDelete(null)}
                  className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Edit Project Details Modal
// ─────────────────────────────────────────────────────────────
export function EditProjectModal({
  project,
  onClose,
  onSave,
}: {
  project: ExtendedProjectItem;
  onClose: () => void;
  onSave: (changes: {
    title?: string;
    description?: string;
    category?: string;
    budgetFrom?: number;
    budgetTo?: number;
    deadlineDays?: number;
    status?: "open" | "in_progress" | "completed" | "closed";
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description || "");
  const [category, setCategory] = useState(project.category || "تطوير الويب والمواقع");
  const [budgetFrom, setBudgetFrom] = useState(project.budgetFrom);
  const [budgetTo, setBudgetTo] = useState(project.budgetTo);
  const [deadlineDays, setDeadlineDays] = useState(project.deadlineDays ?? 7);
  const [status, setStatus] = useState<"open" | "in_progress" | "completed" | "closed">(
    project.status === "open" || project.status === "in_progress" || project.status === "completed" || project.status === "closed"
      ? project.status
      : "open"
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        title,
        description,
        category,
        budgetFrom,
        budgetTo,
        deadlineDays,
        status,
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
            تعديل المشروع #{project.id}
          </h3>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center transition-all cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#05291A]">
          <div className="space-y-1.5">
            <label className="block">عنوان المشروع:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-sm focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block">التصنيف:</label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val)}
                size="md"
                options={[
                  "تطوير الويب والمواقع",
                  "تطبيقات الجوال (Mobile Apps)",
                  "الذكاء الاصطناعي وتعلّم الآلة",
                  "الواجهات وتجربة المستخدم UI/UX",
                  "قواعد البيانات والسيرفرات",
                  "أخرى",
                ]}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block">حالة المشروع:</label>
              <CustomSelect
                value={status}
                onChange={(val) => {
                  if (val === "open" || val === "in_progress" || val === "completed" || val === "closed") setStatus(val);
                }}
                size="md"
                options={[
                  { value: "open", label: "مفتوح للتقديم (Open)" },
                  { value: "in_progress", label: "قيد التنفيذ (In Progress)" },
                  { value: "completed", label: "مكتمل ومسلّم (Completed)" },
                  { value: "closed", label: "مغلق / ملغي (Closed)" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block">الميزانية من (ج.م):</label>
              <input
                type="number"
                min={0}
                value={budgetFrom}
                onChange={(e) => setBudgetFrom(Number(e.target.value))}
                className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block">الميزانية إلى (ج.م):</label>
              <input
                type="number"
                min={0}
                value={budgetTo}
                onChange={(e) => setBudgetTo(Number(e.target.value))}
                className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block">المدة بالأيام:</label>
              <input
                type="number"
                min={1}
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(Number(e.target.value))}
                className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block">الوصف والتفاصيل:</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
            />
          </div>

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
// 3. Delete Project Confirmation Modal
// ─────────────────────────────────────────────────────────────
export function DeleteProjectModal({
  project,
  onClose,
  onConfirm,
}: {
  project: ExtendedProjectItem;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
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
      <div className="w-full max-w-md rounded-[28px] border border-red-200 bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="text-lg font-black text-red-700 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            حذف المشروع نهائياً
          </h3>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-[#526B5E] leading-relaxed font-bold">
            هل أنت متأكد من رغبتك في حذف المشروع{" "}
            <strong className="text-[#05291A] font-black">#{project.id} · {project.title}</strong> نهائياً؟
          </p>

          <div className="rounded-2xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 font-bold leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 text-red-900 font-black">
              <AlertTriangle className="h-4 w-4 text-red-700 shrink-0" />
              <span>تحذير: لا يمكن التراجع عن هذه العملية!</span>
            </div>
            <p>سيتم حذف المشروع وكافة العروض المقدمة عليه نهائياً من قاعدة البيانات.</p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="flex-1 h-11 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span>{loading ? "جاري الحذف..." : "تأكيد الحذف النهائي"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-6 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. Broadcast Notification Modal (إرسال إشعار جماعي)
// ─────────────────────────────────────────────────────────────
export function BroadcastNotificationModal({
  onClose,
  onSend,
}: {
  onClose: () => void;
  onSend: (targetAudience: "all" | "developers" | "clients", message: string, linkUrl?: string) => Promise<void>;
}) {
  const [targetAudience, setTargetAudience] = useState<"all" | "developers" | "clients">("all");
  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    try {
      await onSend(targetAudience, message, linkUrl || undefined);
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
            <Radio className="h-5 w-5 text-[#056B38]" />
            إرسال إشعار جماعي (Broadcast)
          </h3>
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-full bg-[#F7FAF8] hover:bg-neutral-200 text-neutral-500 hover:text-black flex items-center justify-center cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-[#05291A]">
          <p className="text-xs text-[#526B5E] leading-relaxed font-normal">
            إرسال إشعار فوري وتنبيه يظهر في قائمة إشعارات الفئة المحددة من المستخدمين عبر المنصة.
          </p>

          <div className="space-y-1.5">
            <label className="block">الفئة المستهدفة:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { key: "all", label: "جميع المستخدمين" },
                { key: "developers", label: "المطورون فقط" },
                { key: "clients", label: "العملاء فقط" },
              ] as const).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTargetAudience(item.key)}
                  className={`p-2.5 rounded-xl border text-xs font-black text-center transition-all cursor-pointer ${
                    targetAudience === item.key
                      ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] shadow-2xs ring-1 ring-[#056B38]"
                      : "border-[#D1E3D6] bg-[#F7FAF8] text-[#526B5E]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block">نص الإشعار الجماعي:</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اكتب الإشعار هنا..."
              className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10 bg-[#F7FAF8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[#526B5E]">رابط توجيه اختياري:</label>
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="مثال: /projects أو /dashboard"
              className="w-full rounded-xl border border-[#D1E3D6] p-2.5 text-xs focus:outline-none focus:border-[#056B38] bg-[#F7FAF8]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{loading ? "جاري الإرسال..." : "إرسال الإشعار الجماعي"}</span>
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
