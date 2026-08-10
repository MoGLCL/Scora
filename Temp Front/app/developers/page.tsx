"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Search, SlidersHorizontal, ChevronDown, Check, AlertTriangle, ShieldCheck } from "lucide-react";

interface DeveloperCardData {
  id: string;
  initials: string;
  name: string;
  isVerified: boolean;
  role: string;
  location: string;
  experience: string;
  trustScore: number;
  skillPoints: number;
  trustBadge?: string;
  trustLevel: "high" | "medium" | "low";
  skills: string[];
  availability: string;
  availabilityType: "available" | "busy" | "soon";
}

const initialDevelopers: DeveloperCardData[] = [
  {
    id: "1",
    initials: "MW",
    name: "محمد وائل الغنام",
    isVerified: true,
    role: "مهندس برمجيات",
    location: "القاهرة",
    experience: "خبرة 5 سنين",
    trustScore: 92,
    skillPoints: 820,
    trustLevel: "high",
    skills: ["React", "TypeScript", "Node.js", "Python"],
    availability: "متاح الأسبوع ده",
    availabilityType: "available",
  },
  {
    id: "2",
    initials: "MH",
    name: "منة حسن",
    isVerified: true,
    role: "مهندسة بيانات",
    location: "الإسكندرية",
    experience: "خبرة 4 سنين",
    trustScore: 88,
    skillPoints: 760,
    trustLevel: "high",
    skills: ["Python", "SQL", "Airflow"],
    availability: "متاحة خلال أسبوعين",
    availabilityType: "soon",
  },
  {
    id: "3",
    initials: "MA",
    name: "محمد عبدالحليم",
    isVerified: true,
    role: "مهندس Backend",
    location: "الجيزة",
    experience: "خبرة 6 سنين",
    trustScore: 95,
    skillPoints: 910,
    trustLevel: "high",
    skills: ["Go", "Node.js", "AWS"],
    availability: "متاح دلوقتي",
    availabilityType: "available",
  },
  {
    id: "4",
    initials: "MK",
    name: "مامون خالد",
    isVerified: false,
    role: "مطور Java",
    location: "المنصورة",
    experience: "خبرة 3 سنين",
    trustScore: 72,
    skillPoints: 590,
    trustBadge: "شايب كود",
    trustLevel: "medium",
    skills: ["Java", "Spring", "SQL"],
    availability: "متاح الشهر ده",
    availabilityType: "soon",
  },
  {
    id: "5",
    initials: "MA",
    name: "محمود احمد",
    isVerified: false,
    role: "مطور PHP",
    location: "السويس",
    experience: "خبرة سنتين",
    trustScore: 61,
    skillPoints: 420,
    trustBadge: "مخاطر صغيرة",
    trustLevel: "low",
    skills: ["PHP", "Laravel", "MySQL"],
    availability: "مشغول حالياً",
    availabilityType: "busy",
  },
  {
    id: "6",
    initials: "MK",
    name: "محمد خالد",
    isVerified: false,
    role: "مطور Flutter",
    location: "القاهرة",
    experience: "خبرة سنة",
    trustScore: 47,
    skillPoints: 310,
    trustBadge: "مخاطر صغيرة",
    trustLevel: "low",
    skills: ["Flutter", "Dart", "Firebase"],
    availability: "متاحة بعد شهر",
    availabilityType: "busy",
  },
];

export default function DevelopersDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"trust" | "sp">("trust");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // Filtered and Sorted Developers
  const filteredDevelopers = useMemo(() => {
    return initialDevelopers
      .filter((dev) => {
        // Search query filter
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          dev.name.toLowerCase().includes(query) ||
          dev.role.toLowerCase().includes(query) ||
          dev.location.toLowerCase().includes(query) ||
          dev.skills.some((s) => s.toLowerCase().includes(query));

        if (!matchesSearch) return false;

        // Quick filter tags
        if (activeQuickFilter === "90+") return dev.trustScore >= 90;
        if (activeQuickFilter === "available") return dev.availabilityType === "available";
        if (activeQuickFilter === "React") return dev.skills.includes("React");
        if (activeQuickFilter === "TypeScript") return dev.skills.includes("TypeScript");

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "trust") return b.trustScore - a.trustScore;
        return b.skillPoints - a.skillPoints;
      });
  }, [searchQuery, activeQuickFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-6 md:px-8 py-10 md:py-14 w-full flex-1">
        
        {/* Main Heading Section */}
        <div className="text-right mb-8">
          <div className="text-[13px] font-bold text-[#0E6D3B] mb-1">
            اكتشف المبرمجين
          </div>
          <h1 className="text-[34px] md:text-[42px] font-bold text-ink font-heading leading-tight mb-2">
            دوّر على المبرمج المناسب
          </h1>
          <p className="text-[15px] text-muted max-w-2xl">
            شوف المهارات، درجة الثقة، ونقط المهارة قبل ما تبدأ الكلام.
          </p>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="space-y-4 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Search Input Box */}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="دوّر بالمهارة، الدول، أو اسم المبرمج"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[52px] rounded-full border border-neutral-200/80 bg-white pl-5 pr-12 text-[14px] text-ink focus:outline-none focus:border-[#0E6D3B] focus:ring-2 focus:ring-[#0E6D3B]/10 transition-all shadow-2xs"
              />
              <Search className="absolute right-4 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>

            {/* Filter Toggle Button */}
            <button
              type="button"
              onClick={() => setShowFiltersModal(!showFiltersModal)}
              className="inline-flex h-[52px] items-center gap-2 rounded-full bg-[#0E6D3B] hover:bg-[#005B27] px-6 text-[14px] font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>الفلاتر +</span>
            </button>

            {/* Custom Styled Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSortMenu(!showSortMenu)}
                className="h-[52px] rounded-full border border-neutral-200/80 bg-white px-6 text-[14px] font-bold text-ink hover:bg-neutral-50 transition-all flex items-center gap-3 cursor-pointer shadow-2xs active:scale-95"
              >
                <span>
                  {sortBy === "trust" ? "ترتيب: درجة الثقة" : "ترتيب: نقط المهارة"}
                </span>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showSortMenu ? "rotate-180" : ""}`} />
              </button>

              {showSortMenu && (
                <div className="absolute left-0 mt-2 w-52 rounded-2xl border border-neutral-200/80 bg-white p-2 shadow-xl z-50 text-right animate-in fade-in zoom-in-95 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("trust");
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[14px] font-bold rounded-xl transition-colors cursor-pointer ${
                      sortBy === "trust" ? "bg-[#EBF7EF] text-[#0E6D3B]" : "text-ink hover:bg-neutral-50"
                    }`}
                  >
                    <span>درجة الثقة</span>
                    {sortBy === "trust" && <Check className="w-4 h-4 text-[#0E6D3B]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSortBy("sp");
                      setShowSortMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-[14px] font-bold rounded-xl transition-colors cursor-pointer ${
                      sortBy === "sp" ? "bg-[#EBF7EF] text-[#0E6D3B]" : "text-ink hover:bg-neutral-50"
                    }`}
                  >
                    <span>نقط المهارة</span>
                    {sortBy === "sp" && <Check className="w-4 h-4 text-[#0E6D3B]" />}
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Quick Filter Tag Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[12px] font-bold text-muted ml-2">فلترة سريعة:</span>
            
            <button
              type="button"
              onClick={() => setActiveQuickFilter("all")}
              className={`rounded-full px-5 py-2 text-[13px] font-bold transition-all cursor-pointer ${
                activeQuickFilter === "all"
                  ? "bg-[#0E6D3B] text-white shadow-2xs"
                  : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
              }`}
            >
              كل المستويات
            </button>

            <button
              type="button"
              onClick={() => setActiveQuickFilter("90+")}
              className={`rounded-full px-5 py-2 text-[13px] font-bold transition-all cursor-pointer ${
                activeQuickFilter === "90+"
                  ? "bg-[#0E6D3B] text-white shadow-2xs"
                  : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
              }`}
            >
              90+ ثقة
            </button>

            <button
              type="button"
              onClick={() => setActiveQuickFilter("available")}
              className={`rounded-full px-5 py-2 text-[13px] font-bold transition-all cursor-pointer ${
                activeQuickFilter === "available"
                  ? "bg-[#0E6D3B] text-white shadow-2xs"
                  : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
              }`}
            >
              متاح دلوقتي
            </button>

            <button
              type="button"
              onClick={() => setActiveQuickFilter("TypeScript")}
              className={`rounded-full px-5 py-2 text-[13px] font-bold transition-all cursor-pointer ${
                activeQuickFilter === "TypeScript"
                  ? "bg-[#0E6D3B] text-white shadow-2xs"
                  : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
              }`}
            >
              TypeScript
            </button>

            <button
              type="button"
              onClick={() => setActiveQuickFilter("React")}
              className={`rounded-full px-5 py-2 text-[13px] font-bold transition-all cursor-pointer ${
                activeQuickFilter === "React"
                  ? "bg-[#0E6D3B] text-white shadow-2xs"
                  : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
              }`}
            >
              React
            </button>
          </div>
        </div>

        {/* Results Counter Subtitle */}
        <div className="flex items-center justify-between text-[13px] mb-6">
          <div className="font-bold text-ink text-[16px]">
            {filteredDevelopers.length} مبرمج مناسب
          </div>
          <div className="text-muted">
            النتائج مفلترة حسب درجة الثقة
          </div>
        </div>

        {/* Developers Card List */}
        <div className="space-y-4">
          {filteredDevelopers.map((dev) => (
            <div
              key={dev.id}
              className="rounded-[28px] border border-neutral-200/80 bg-white p-6 transition-all hover:border-[#0E6D3B]/40 hover:shadow-[0_4px_25px_rgb(0,0,0,0.04)]"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                {/* 1. Developer Avatar & Details (Right side in RTL) */}
                <div className="flex items-center gap-5 min-w-[320px]">
                  {/* Avatar Circle */}
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#EBF7EF] border border-[#C5E8D1] font-bold text-[#0E6D3B] text-[20px]">
                    {dev.initials}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[20px] font-bold text-ink font-heading">
                        {dev.name}
                      </h3>
                      {dev.isVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0E6D3B]">
                          <Check className="w-3.5 h-3.5" />
                          <span>موثوق</span>
                        </span>
                      )}
                      {dev.trustBadge && (
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          dev.trustLevel === "medium" ? "bg-[#FFF8E1] text-[#9A6500]" : "bg-[#FFEBEE] text-[#C62828]"
                        }`}>
                          {dev.trustBadge}
                        </span>
                      )}
                    </div>

                    <p className="text-[14px] font-semibold text-neutral-600 mt-0.5">
                      {dev.role}
                    </p>
                    <p className="text-[13px] text-muted">
                      {dev.location} · {dev.experience}
                    </p>
                  </div>
                </div>

                {/* 2. Metric Badges (Trust & SP) */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="rounded-2xl bg-neutral-50 border border-neutral-100 p-3.5 text-center min-w-[100px]">
                    <div className="text-[11px] text-muted font-medium mb-0.5">نقط المهارة</div>
                    <div className="text-[18px] font-bold text-ink">{dev.skillPoints} SP</div>
                  </div>

                  <div className={`rounded-2xl p-3.5 text-center min-w-[100px] border ${
                    dev.trustLevel === "high"
                      ? "bg-[#EBF7EF] border-[#C5E8D1] text-[#0E6D3B]"
                      : dev.trustLevel === "medium"
                      ? "bg-[#FFF8E1] border-[#FFE082] text-[#9A6500]"
                      : "bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828]"
                  }`}>
                    <div className="text-[11px] font-medium opacity-80 mb-0.5">درجة الثقة</div>
                    <div className="text-[18px] font-bold">{dev.trustScore} / 100</div>
                  </div>
                </div>

                {/* 3. Skills & Availability (Middle) */}
                <div className="flex flex-col gap-3 min-w-[240px]">
                  <div>
                    <div className="text-[11px] font-bold text-muted mb-1.5">المهارات</div>
                    <div className="flex flex-wrap gap-1.5">
                      {dev.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-[#EBF7EF] px-3.5 py-1 text-[12px] font-bold text-[#0E6D3B]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="inline-flex items-center justify-center rounded-full bg-[#EBF7EF] px-4 py-1.5 text-[12px] font-bold text-[#0E6D3B] self-start">
                    {dev.availability}
                  </div>
                </div>

                {/* 4. Action Buttons (Left side in RTL) */}
                <div className="flex flex-col gap-2 w-full lg:w-auto shrink-0">
                  <Link
                    href="/profile"
                    className="inline-flex h-[44px] items-center justify-center rounded-full bg-[#0E6D3B] hover:bg-[#005B27] px-6 text-[13px] font-bold text-white transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    شوف البروفايل
                  </Link>
                  <Link
                    href="/hire-developer"
                    className="inline-flex h-[44px] items-center justify-center rounded-full border border-neutral-300 bg-white px-6 text-[13px] font-bold text-ink hover:bg-neutral-50 transition-all cursor-pointer"
                  >
                    تواصل
                  </Link>
                </div>

              </div>
            </div>
          ))}
        </div>

        {/* Clear High-Contrast Skeleton Loading Section */}
        <div className="space-y-4 pt-8">
          <div className="flex items-center gap-2 text-[13px] font-bold text-[#0E6D3B] mb-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#0E6D3B] animate-ping inline-block" />
            <span>لسه بنحمّل بيانات مبرمجين كمان...</span>
          </div>

          {/* Skeleton Card 1 */}
          <div className="rounded-[28px] border border-neutral-200/80 bg-white p-6 shadow-2xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 animate-pulse">
              
              {/* Avatar & Text Lines */}
              <div className="flex items-center gap-5 min-w-[320px]">
                <div className="h-16 w-16 rounded-full bg-neutral-200/80 shrink-0" />
                <div className="space-y-2">
                  <div className="h-5 w-36 bg-neutral-200/90 rounded-md" />
                  <div className="h-4 w-28 bg-neutral-200/60 rounded-md" />
                  <div className="h-3 w-20 bg-neutral-200/40 rounded-md" />
                </div>
              </div>

              {/* Metric Boxes */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-[64px] w-[104px] rounded-2xl bg-neutral-100 border border-neutral-200/60" />
                <div className="h-[64px] w-[104px] rounded-2xl bg-[#EBF7EF] border border-[#C5E8D1]" />
              </div>

              {/* Skill Tag Pills */}
              <div className="flex flex-col gap-2.5 min-w-[240px]">
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-[#EBF7EF] rounded-full" />
                  <div className="h-7 w-20 bg-[#EBF7EF] rounded-full" />
                  <div className="h-7 w-14 bg-[#EBF7EF] rounded-full" />
                </div>
                <div className="h-7 w-28 bg-[#EBF7EF] rounded-full" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full lg:w-auto shrink-0">
                <div className="h-[44px] w-[130px] rounded-full bg-[#0E6D3B]/20" />
                <div className="h-[44px] w-[130px] rounded-full bg-neutral-200/60" />
              </div>

            </div>
          </div>

          {/* Skeleton Card 2 */}
          <div className="rounded-[28px] border border-neutral-200/80 bg-white p-6 shadow-2xs opacity-80">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 animate-pulse">
              
              {/* Avatar & Text Lines */}
              <div className="flex items-center gap-5 min-w-[320px]">
                <div className="h-16 w-16 rounded-full bg-neutral-200/80 shrink-0" />
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-neutral-200/90 rounded-md" />
                  <div className="h-4 w-32 bg-neutral-200/60 rounded-md" />
                  <div className="h-3 w-24 bg-neutral-200/40 rounded-md" />
                </div>
              </div>

              {/* Metric Boxes */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="h-[64px] w-[104px] rounded-2xl bg-neutral-100 border border-neutral-200/60" />
                <div className="h-[64px] w-[104px] rounded-2xl bg-[#EBF7EF] border border-[#C5E8D1]" />
              </div>

              {/* Skill Tag Pills */}
              <div className="flex flex-col gap-2.5 min-w-[240px]">
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-[#EBF7EF] rounded-full" />
                  <div className="h-7 w-16 bg-[#EBF7EF] rounded-full" />
                  <div className="h-7 w-20 bg-[#EBF7EF] rounded-full" />
                </div>
                <div className="h-7 w-32 bg-[#EBF7EF] rounded-full" />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full lg:w-auto shrink-0">
                <div className="h-[44px] w-[130px] rounded-full bg-[#0E6D3B]/20" />
                <div className="h-[44px] w-[130px] rounded-full bg-neutral-200/60" />
              </div>

            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
