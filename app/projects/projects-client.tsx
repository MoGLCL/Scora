"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Search,
  Briefcase,
  Clock,
  DollarSign,
  ChevronLeft,
  ArrowUpRight,
  ShieldCheck,
  Code
} from "lucide-react";

export interface ProjectCardData {
  id: string;
  title: string;
  clientName: string;
  budget: string;
  postedTime: string;
  tags: string[];
  description: string;
  applicants: number;
}

export function ProjectsClient({ projects: initialProjects }: { projects: ProjectCardData[] }) {
  const [projectsList, setProjectsList] = useState<ProjectCardData[]>(initialProjects);
  const [searchQuery, setSearchQuery] = useState("");

  // Realtime Polling: auto-sync active projects list without refreshing
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          if (data.ok && Array.isArray(data.projects) && isMounted) {
            setProjectsList(data.projects);
          }
        }
      } catch {
        // Silently handle any network glitches
      }
    }, 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const visibleProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projectsList;
    return projectsList.filter((project) =>
      project.title.toLowerCase().includes(query) ||
      project.clientName.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query) ||
      project.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [projectsList, searchQuery]);

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-16 w-full flex-1 space-y-12">
        
        {/* HERO SECTION */}
        <div className="rounded-[28px] bg-gradient-to-b from-[#E8FAF0] to-white border border-[#D1E3D6] p-8 md:p-12 space-y-6 text-center shadow-2xs">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[12px] font-bold text-[#056B38] border border-[#D1E3D6]">
            <Briefcase className="w-4 h-4 text-[#056B38]" />
            <span>سوق المشاريع التقنية · Scora Projects</span>
          </div>

          <h1 className="text-[32px] md:text-[44px] font-extrabold text-[#05291A] font-heading leading-tight max-w-3xl mx-auto">
            استكشف أحدث المشاريع وطلبات التوظيف البرمجية
          </h1>

          <p className="text-[15px] text-[#526B5E] max-w-2xl mx-auto leading-relaxed">
            مشاريع حقيقية من شركات وعملاء موثوقين، مشفوعة بطلب مهام وتقييمات كود جادة مع ضمان حقوق الجميع.
          </p>

          <div className="max-w-xl mx-auto relative pt-2">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-[#526B5E] absolute right-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مشروع حسب المهارة، التقنية، أو العنوان..."
                className="w-full h-[52px] rounded-full border border-[#D1E3D6] bg-white pr-12 pl-6 text-[14px] text-[#05291A] outline-none focus:border-[#056B38] shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* PROJECTS LIST */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[24px] font-extrabold text-[#05291A] font-heading">
              المشاريع المتاحة حالياً ({visibleProjects.length})
            </h2>
            <Link
              href="/projects/new"
              className="rounded-full bg-[#056B38] hover:bg-[#08592E] text-white px-6 py-2.5 text-[13px] font-bold transition-all shadow-xs"
            >
              + أضف مشروعاً جديداً
            </Link>
          </div>

          <div className="space-y-4">
            {visibleProjects.length ? visibleProjects.map((proj) => (
              <div
                key={proj.id}
                className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 md:p-8 space-y-4 hover:border-[#056B38] hover:shadow-md transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] font-bold text-[#056B38] bg-[#E8FAF0] px-3 py-1 rounded-full">
                        {proj.clientName}
                      </span>
                      <span className="text-[12px] text-[#526B5E] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{proj.postedTime}</span>
                      </span>
                    </div>

                    <h3 className="text-[20px] font-extrabold text-[#05291A] mt-2 font-heading">
                      {proj.title}
                    </h3>
                  </div>

                  <div className="text-left md:text-right">
                    <div className="text-[18px] font-black text-[#056B38] font-heading">
                      {proj.budget}
                    </div>
                    <div className="text-[12px] text-[#526B5E] mt-0.5">
                      {proj.applicants} عروض متقدمة
                    </div>
                  </div>
                </div>

                <p className="text-[14px] text-[#526B5E] line-clamp-2 leading-relaxed">
                  {proj.description}
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-neutral-100">
                  <div className="flex flex-wrap gap-2">
                    {proj.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full bg-[#F7FAF8] text-[#526B5E] text-[12px] font-bold border border-[#D1E3D6]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <Link
                    href={`/projects/${proj.id}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#056B38] hover:text-[#08592E] transition-colors"
                  >
                    <span>عرض التفاصيل والتقديم</span>
                    <ChevronLeft className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )) : (
              <div className="text-center py-16 rounded-[24px] border border-[#D1E3D6] bg-neutral-50/50 space-y-3">
                <Briefcase className="w-12 h-12 text-[#526B5E] mx-auto opacity-50" />
                <h3 className="text-[18px] font-bold text-[#05291A]">لا توجد مشاريع مطابقة</h3>
                <p className="text-[13px] text-[#526B5E]">
                  جرب تغيير كلمات البحث أو استكشف المهارات المتاحة.
                </p>
              </div>
            )}
          </div>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
