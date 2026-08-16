import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProposalActions } from "@/components/proposal-actions";
import { verifySession } from "@/lib/dal";
import { query, queryOne } from "@/lib/db";
import {
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  Clock,
  Inbox
} from "lucide-react";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const s = await verifySession();
  if (!s) redirect("/login");
  if (s.role !== "client" && !s.isAdmin) redirect("/dashboard");

  const { id } = await params;
  const projectId = Number(id);
  if (!Number.isInteger(projectId) || projectId <= 0) notFound();

  const project = await queryOne<{
    id: number;
    title: string;
    status: string;
    budget_from: number;
    budget_to: number;
    deadline_days: number | null;
  }>(
    `SELECT p.id, p.title, p.status, p.budget_from, p.budget_to, p.deadline_days 
     FROM projects p 
     JOIN clients c ON c.id = p.client_id 
     WHERE p.id = ? AND (c.user_id = ? OR ? = 1)`,
    [projectId, s.userId, s.isAdmin ? 1 : 0]
  );
  if (!project) notFound();

  const proposals = await query<{
    id: number;
    price: number;
    delivery_days: number;
    cover_text: string | null;
    status: string;
    developer_user_id: number;
    name: string;
    username: string | null;
    job_title: string | null;
    trust_score: number;
    avatar_url: string | null;
  }>(
    `SELECT pr.id, pr.price, pr.delivery_days, pr.cover_text, pr.status,
            d.user_id developer_user_id, d.display_name name, u.username,
            d.job_title, d.trust_score, d.avatar_url
     FROM proposals pr 
     JOIN developers d ON d.id = pr.developer_id 
     JOIN users u ON u.id = d.user_id
     WHERE pr.project_id = ? 
     ORDER BY pr.created_at DESC`,
    [project.id]
  );

  return (
    <div className="min-h-dvh bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-8 md:py-14 w-full flex-1 space-y-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] font-bold text-[#526B5E]">
          <Link href={`/projects/${project.id}`} className="hover:text-[#056B38] transition-colors flex items-center gap-1">
            <ArrowRight className="w-4 h-4" />
            <span>العودة لصفحة المشروع</span>
          </Link>
          <span>/</span>
          <span className="text-[#056B38]">العروض المتقدمة</span>
        </div>

        {/* Hero Card */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-10 space-y-4 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>عروض المطورين المتقدمة ({proposals.length} عروض)</span>
              </div>
              <h1 className="text-[26px] md:text-[34px] font-extrabold text-[#05291A] font-heading leading-tight break-words [overflow-wrap:anywhere]">
                {project.title}
              </h1>
            </div>

            <Link
              href={`/projects/${project.id}`}
              className="h-[42px] px-5 rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 text-[#05291A] text-[13px] font-bold transition-all inline-flex items-center gap-1.5 shadow-2xs self-start md:self-auto cursor-pointer"
            >
              <span>معاينة صفحة المشروع</span>
            </Link>
          </div>
        </div>

        {/* Proposals List */}
        <div className="space-y-4">
          {proposals.length > 0 ? (
            proposals.map((p) => (
              <article
                key={p.id}
                className="p-6 md:p-8 rounded-[24px] border border-[#D1E3D6] bg-white space-y-4 shadow-2xs hover:border-[#056B38]/60 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-3.5">
                    <Link href={`/profile/${p.username || p.developer_user_id}`}>
                      {p.avatar_url ? (
                        <img
                          src={p.avatar_url}
                          alt={p.name}
                          className="w-12 h-12 rounded-full object-cover border border-[#C5E8D1]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#E8FAF0] text-[#056B38] font-black flex items-center justify-center border border-[#C5E8D1]">
                          {p.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>
                    <div>
                      <Link
                        href={`/profile/${p.username || p.developer_user_id}`}
                        className="text-[16px] font-extrabold text-[#05291A] hover:text-[#056B38] transition-colors flex items-center gap-1.5"
                      >
                        <span className="break-words [overflow-wrap:anywhere]">{p.name}</span>
                        {p.username && <span className="text-[12px] text-[#526B5E] font-normal">(@{p.username})</span>}
                        <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                      </Link>
                      <div className="text-[12px] text-[#526B5E]">
                        {p.job_title || "مطور برمجيات"} · Trust Score: {p.trust_score}%
                      </div>
                    </div>
                  </div>

                  <ProposalActions id={p.id} userId={p.developer_user_id} status={p.status} />
                </div>

                <p className="text-[14px] text-[#05291A] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] bg-[#F7FAF8] p-4 rounded-2xl border border-neutral-100">
                  {p.cover_text || "لا توجد تفاصيل إضافية"}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] font-bold pt-1">
                  <div className="text-[#056B38] font-heading text-[16px]">
                    العرض المقترح: {Number(p.price).toLocaleString("ar-EG")} ج.م
                  </div>
                  <div className="text-[#526B5E] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#056B38]" />
                    <span>مدة التسليم: {p.delivery_days} أيام</span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="p-12 text-center rounded-[28px] border border-dashed border-[#D1E3D6] bg-[#F7FAF8] space-y-3">
              <div className="w-14 h-14 rounded-full bg-white border border-[#D1E3D6] flex items-center justify-center mx-auto text-[#526B5E]">
                <Inbox className="w-7 h-7" />
              </div>
              <h3 className="text-[17px] font-extrabold text-[#05291A]">لا توجد عروض مضافة على هذا المشروع حتى الآن</h3>
              <p className="text-[13px] text-[#526B5E] max-w-md mx-auto">
                سيظهر هنا كل عرض يقدمه المطورون المعتمدون مع تفاصيل خطة العمل والعرض المالي وإمكانية التوظيف المباشر.
              </p>
            </div>
          )}
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
