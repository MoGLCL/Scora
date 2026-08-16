import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VerifiedBadge } from "@/components/verified-badge";
import type { DeveloperRow } from "@/lib/types";
import type { PortfolioProjectSummary } from "@/lib/portfolio-types";

export function DeveloperProfileClient({
  developer,
  isOwner,
}: {
  developer: DeveloperRow & { skills: string[]; portfolioProjects: PortfolioProjectSummary[] };
  isOwner: boolean;
}) {
  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-12">
        <Link href="/developers" className="text-sm font-bold text-[#056B38] hover:underline">
          ← العودة إلى دليل المطورين
        </Link>
        <section className="mt-5 rounded-[28px] border border-[#D1E3D6] bg-white p-8 shadow-xs">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-3xl font-extrabold text-[#05291A]">
                  {developer.display_name}
                </h1>
                {(developer.trust_score >= 90 ? developer.is_verified !== 0 : developer.is_verified === 1) && (
                  <VerifiedBadge type="developer" showLabel />
                )}
              </div>
              <p className="mt-2 text-[#526B5E] font-bold">
                {developer.job_title || "مطور برمجيات"}
              </p>
              <p className="mt-1 text-sm text-[#526B5E]">
                {developer.location || developer.city || ""}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] px-5 py-3 text-center">
                <div className="text-xs text-[#526B5E] font-bold">نقاط الثقة</div>
                <div className="text-2xl font-extrabold text-[#056B38]">
                  {developer.trust_score}%
                </div>
              </div>
              <Link
                href={`/chat?with=${developer.user_id}`}
                className="rounded-full bg-[#056B38] hover:bg-[#005B27] px-6 py-3 text-center font-bold text-white transition-all shadow-xs"
              >
                 إرسال رسالة
              </Link>
            </div>
          </div>
          {developer.bio && (
            <p className="mt-8 leading-8 text-[#526B5E] border-t border-neutral-100 pt-6">
              {developer.bio}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-2">
            {developer.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-[#05291A]"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-7 rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs md:p-8">
          <div className="flex flex-col gap-3 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black text-[#05291A]">مشاريع المطور</h2>
              <p className="mt-1 text-sm text-[#526B5E]">أعمال منشورة مع صور معاينة وتقييمات المجتمع.</p>
            </div>
            {isOwner && <Link href="/portfolio/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#056B38] px-4 text-sm font-bold text-white transition hover:bg-[#04552D]">إضافة مشروع</Link>}
          </div>
          {developer.portfolioProjects.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {developer.portfolioProjects.map((project) => (
                <Link href={`/portfolio/${project.id}`} key={project.id} className="group overflow-hidden rounded-2xl border border-[#D1E3D6] transition hover:-translate-y-0.5 hover:border-[#056B38] hover:shadow-md">
                  <div className="aspect-[16/10] overflow-hidden bg-[#E8FAF0]">{project.coverImageUrl ? <img src={project.coverImageUrl} alt={project.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-sm text-[#526B5E]">لا توجد صورة</div>}</div>
                  <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-black text-[#05291A]">{project.title}</h3><span className="shrink-0 text-sm font-bold text-amber-600">{project.averageRating ? `${project.averageRating.toFixed(1)}/5` : "جديد"}</span></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-[#526B5E]">{project.description || "مشروع في معرض الأعمال"}</p><div className="mt-3 flex flex-wrap gap-1.5">{project.technologies.slice(0, 3).map((technology) => <span key={technology} className="rounded-full bg-[#F0F5F1] px-2.5 py-1 text-[11px] font-bold text-[#365647]">{technology}</span>)}</div></div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-[#BFD3C5] px-5 py-10 text-center text-sm text-[#526B5E]">لم يضف المطور مشاريع إلى معرض أعماله بعد.</div>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
