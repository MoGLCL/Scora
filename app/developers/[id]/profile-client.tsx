import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import type { DeveloperRow } from "@/lib/types";

export function DeveloperProfileClient({ developer }: { developer: DeveloperRow & { skills: string[] } }) {
  return <div className="min-h-screen bg-[#F7FAF8] flex flex-col" dir="rtl">
    <SiteHeader />
    <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-12">
      <Link href="/developers" className="text-sm font-bold text-[#056B38]">العودة إلى دليل المطورين</Link>
      <section className="mt-5 rounded-[28px] border border-[#D1E3D6] bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#05291A]">{developer.display_name}</h1>
            <p className="mt-2 text-[#526B5E]">{developer.job_title || "مطور برمجيات"}</p>
            <p className="mt-1 text-sm text-[#526B5E]">{developer.location || developer.city || ""}</p>
          </div>
          <div className="rounded-2xl bg-[#E8FAF0] px-5 py-3 text-center">
            <div className="text-xs text-[#526B5E]">نقاط الثقة</div>
            <div className="text-2xl font-extrabold text-[#056B38]">{developer.trust_score}%</div>
          </div>
        </div>
        {developer.bio && <p className="mt-8 leading-8 text-[#526B5E]">{developer.bio}</p>}
        <div className="mt-8 flex flex-wrap gap-2">{developer.skills.map((skill) =>
          <span key={skill} className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-[#05291A]">{skill}</span>
        )}</div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}
