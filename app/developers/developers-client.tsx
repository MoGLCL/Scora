"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { SiteHeader } from "@/components/site-header";
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  ArrowLeft,
  MessageSquare,
  Zap,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { AvatarStatusBadge } from "@/components/user-status-indicator";

export interface DeveloperCardData {
  id: string;
  userId: number;
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
  avatarUrl?: string | null;
  lastSeenAt?: Date | string | null;
}

export function DevelopersDirectoryClient({
  developers: initialDevelopers,
}: {
  developers: DeveloperCardData[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"trust" | "sp">("trust");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [minimumTrust, setMinimumTrust] = useState(0);
  const [availabilityOnly, setAvailabilityOnly] = useState(false);

  // Quick Filters Horizontal Scroll Arrows State
  const quickFiltersRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!quickFiltersRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = quickFiltersRef.current;
    const absScroll = Math.abs(scrollLeft);
    const maxScroll = scrollWidth - clientWidth - 4;
    setCanScrollRight(absScroll > 4);
    setCanScrollLeft(absScroll < maxScroll);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll]);

  const handleScroll = (direction: "left" | "right") => {
    if (!quickFiltersRef.current) return;
    const scrollAmount = 180;
    const delta = direction === "left" ? -scrollAmount : scrollAmount;
    quickFiltersRef.current.scrollBy({ left: delta, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

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
        if (dev.trustScore < minimumTrust) return false;
        if (availabilityOnly && dev.availabilityType !== "available") return false;

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
  }, [initialDevelopers, searchQuery, activeQuickFilter, sortBy, minimumTrust, availabilityOnly]);

  return (
    <div className="min-h-dvh bg-background flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1296px] px-4 sm:px-6 md:px-8 py-10 md:py-14 w-full flex-1">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input Box */}
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="دوّر بالمهارة، الدول، أو اسم المبرمج"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[48px] sm:h-[52px] rounded-full border border-neutral-200/80 bg-white pl-5 pr-12 text-[14px] text-ink focus:outline-none focus:border-[#0E6D3B] focus:ring-2 focus:ring-[#0E6D3B]/10 transition-all shadow-2xs"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 pointer-events-none" />
            </div>

            {/* Mobile Controls Group: Dual buttons side-by-side on mobile, inline on sm+ */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {/* Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setShowFiltersModal(!showFiltersModal)}
                className={`flex-1 sm:flex-initial inline-flex h-[48px] sm:h-[52px] items-center justify-center gap-2 rounded-full px-5 sm:px-6 text-[13px] sm:text-[14px] font-bold transition-all shadow-xs cursor-pointer active:scale-95 whitespace-nowrap ${
                  showFiltersModal || minimumTrust > 0 || availabilityOnly
                    ? "bg-[#005B27] text-white ring-2 ring-[#005B27]/20"
                    : "bg-[#0E6D3B] hover:bg-[#005B27] text-white"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>الفلاتر +</span>
              </button>

              {/* Custom Styled Sort Dropdown */}
              <div className="relative flex-1 sm:flex-initial">
                <button
                  type="button"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="w-full sm:w-auto h-[48px] sm:h-[52px] rounded-full border border-neutral-200/80 bg-white px-4 sm:px-6 text-[13px] sm:text-[14px] font-bold text-ink hover:bg-neutral-50 transition-all flex items-center justify-between sm:justify-start gap-2.5 cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                >
                  <span>
                    {sortBy === "trust" ? "درجة الثقة" : "نقط المهارة"}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${showSortMenu ? "rotate-180" : ""}`} />
                </button>

                {showSortMenu && (
                  <div className="absolute left-0 sm:left-0 right-0 sm:right-auto mt-2 sm:w-52 rounded-2xl border border-neutral-200/80 bg-white p-2 shadow-xl z-50 text-right animate-in fade-in zoom-in-95 duration-150">
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
          </div>

          {showFiltersModal && (
            <div className="rounded-[24px] border border-[#D1E3D6] bg-gradient-to-b from-[#F9FCFA] to-white p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#056B38]" />
                  <span className="text-[14px] font-black text-[#05291A]">خيارات الفلترة الدقيقة</span>
                </div>
                {(minimumTrust > 0 || availabilityOnly) && (
                  <button
                    type="button"
                    onClick={() => {
                      setMinimumTrust(0);
                      setAvailabilityOnly(false);
                    }}
                    className="inline-flex items-center gap-1 text-[12px] font-bold text-[#056B38] hover:text-[#08592E] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>تصفير الفلاتر</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Minimum Trust Slider Card */}
                <div className="rounded-2xl border border-[#D1E3D6] bg-white p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                      <span className="text-[13px] font-bold text-[#05291A]">الحد الأدنى لدرجة الثقة</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#E8FAF0] text-[#056B38] font-mono font-black text-[12px] border border-[#C5E8D1]" dir="ltr">
                      {minimumTrust > 0 ? `+${minimumTrust}%` : "0% (الكل)"}
                    </span>
                  </div>

                  {/* Slider with RTL direction and active dynamic fill */}
                  <div className="space-y-1.5" dir="rtl">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={minimumTrust}
                      onChange={(e) => setMinimumTrust(Number(e.target.value))}
                      className="w-full cursor-pointer h-2.5 rounded-full appearance-none transition-all"
                      dir="rtl"
                      style={{
                        background: `linear-gradient(to left, #056B38 0%, #056B38 ${minimumTrust}%, #E2E8F0 ${minimumTrust}%, #E2E8F0 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-[11px] font-bold text-neutral-400 font-mono" dir="rtl">
                      <span className={minimumTrust === 0 ? "text-[#056B38] font-black" : ""}>0%</span>
                      <span className={minimumTrust >= 25 ? "text-[#056B38] font-black" : ""}>25%</span>
                      <span className={minimumTrust >= 50 ? "text-[#056B38] font-black" : ""}>50%</span>
                      <span className={minimumTrust >= 75 ? "text-[#056B38] font-black" : ""}>75%</span>
                      <span className={minimumTrust === 100 ? "text-[#056B38] font-black" : ""}>100%</span>
                    </div>
                  </div>
                </div>

                {/* 2. Availability Toggle Card (Interactive Switch) */}
                <button
                  type="button"
                  onClick={() => setAvailabilityOnly(!availabilityOnly)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-right cursor-pointer shadow-2xs select-none ${
                    availabilityOnly
                      ? "bg-[#E8FAF0] border-[#056B38] ring-2 ring-[#056B38]/10"
                      : "bg-white border-[#D1E3D6] hover:border-neutral-300 hover:bg-[#F9FCFA]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3 shrink-0">
                      {availabilityOnly && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-3 w-3 ${
                          availabilityOnly ? "bg-emerald-500" : "bg-neutral-300"
                        }`}
                      />
                    </span>
                    <div>
                      <div className="text-[13.5px] font-black text-[#05291A]">
                        المتاحون للعمل الآن فقط
                      </div>
                      <div className="text-[11px] font-bold text-[#526B5E]">
                        إخفاء المبرمجين المشغولين بمشاريع أخرى
                      </div>
                    </div>
                  </div>

                  {/* iOS Style Pill Switch */}
                  <div
                    className={`w-12 h-6.5 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                      availabilityOnly ? "bg-[#056B38]" : "bg-neutral-200"
                    }`}
                  >
                    <div
                      className={`bg-white w-4.5 h-4.5 rounded-full shadow-md transform transition-transform duration-200 ${
                        availabilityOnly ? "-translate-x-5.5" : "translate-x-0"
                      }`}
                    />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Quick Filter Tag Pills with Scroll Arrow Navigation */}
          <div className="relative flex items-center gap-2 pt-1">
            <span className="text-[12px] font-bold text-muted shrink-0 ml-1">فلترة سريعة:</span>
            
            {/* Scroll Right Button (Scroll to start in RTL) */}
            <button
              type="button"
              onClick={() => handleScroll("right")}
              className={`h-8 w-8 rounded-full border border-[#D1E3D6] bg-white hover:bg-[#E8FAF0] text-[#05291A] hover:text-[#056B38] flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer ${
                canScrollRight ? "opacity-100 scale-100" : "opacity-35 pointer-events-none"
              }`}
              aria-label="تمرير لليمين"
              title="تمرير لليمين"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Scrollable Container with Touch Swipe & Smooth Momentum */}
            <div
              ref={quickFiltersRef}
              onScroll={checkScroll}
              className="flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain py-1 scroll-smooth flex-1 min-w-0"
            >
              <button
                type="button"
                onClick={() => setActiveQuickFilter("all")}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                  activeQuickFilter === "all"
                    ? "bg-[#0E6D3B] text-white shadow-2xs font-black"
                    : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
                }`}
              >
                كل المستويات
              </button>

              <button
                type="button"
                onClick={() => setActiveQuickFilter("90+")}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                  activeQuickFilter === "90+"
                    ? "bg-[#0E6D3B] text-white shadow-2xs font-black"
                    : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
                }`}
              >
                90+ ثقة
              </button>

              <button
                type="button"
                onClick={() => setActiveQuickFilter("available")}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                  activeQuickFilter === "available"
                    ? "bg-[#0E6D3B] text-white shadow-2xs font-black"
                    : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
                }`}
              >
                متاح دلوقتي
              </button>

              <button
                type="button"
                onClick={() => setActiveQuickFilter("TypeScript")}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                  activeQuickFilter === "TypeScript"
                    ? "bg-[#0E6D3B] text-white shadow-2xs font-black"
                    : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
                }`}
              >
                TypeScript
              </button>

              <button
                type="button"
                onClick={() => setActiveQuickFilter("React")}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-[12px] sm:text-[13px] font-bold transition-all cursor-pointer ${
                  activeQuickFilter === "React"
                    ? "bg-[#0E6D3B] text-white shadow-2xs font-black"
                    : "bg-[#EBF7EF] text-[#0E6D3B] hover:bg-[#D8F0E1]"
                }`}
              >
                React
              </button>
            </div>

            {/* Scroll Left Button (Scroll to end in RTL) */}
            <button
              type="button"
              onClick={() => handleScroll("left")}
              className={`h-8 w-8 rounded-full border border-[#D1E3D6] bg-white hover:bg-[#E8FAF0] text-[#05291A] hover:text-[#056B38] flex items-center justify-center shrink-0 shadow-2xs transition-all cursor-pointer ${
                canScrollLeft ? "opacity-100 scale-100" : "opacity-35 pointer-events-none"
              }`}
              aria-label="تمرير لليسار"
              title="تمرير لليسار"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results Counter Subtitle */}
        <div className="flex items-center justify-between text-[13px] mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="font-bold text-ink text-[16px]">
              {filteredDevelopers.length} مبرمج مناسب
            </div>
            <span className="text-muted hidden sm:inline">·</span>
            <div className="text-muted hidden sm:inline">
              النتائج مفلترة حسب درجة الثقة
            </div>
          </div>
        </div>

        {/* Developers Directory List */}
        {filteredDevelopers.length === 0 ? (
          <div className="p-12 rounded-[28px] border border-neutral-200 bg-white text-center space-y-3">
            <div className="text-[18px] font-extrabold text-[#05291A]">مفيش مبرمجين مناسبين دلوقتي</div>
            <p className="text-[13px] text-[#526B5E]">يا إما الفلاتر شديدة شوية، يا إما المنصة لسه بتصحى من النوم. جرّب تخفف البحث.</p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {filteredDevelopers.map((dev) => {
              const trustBgClass =
                dev.trustScore >= 85
                  ? "bg-[#E8FAF0] border-[#C5E8D1] text-[#056B38]"
                  : dev.trustScore >= 65
                  ? "bg-[#FFF8E1] border-[#FFE082] text-[#9A6500]"
                  : "bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828]";

              return (
                <div
                  key={dev.id}
                  className="group rounded-2xl sm:rounded-[22px] border border-[#D1E3D6] bg-white p-4 sm:p-5 lg:p-6 transition-all duration-200 hover:border-[#056B38] hover:shadow-md hover:bg-[#F9FCFA] flex flex-col xl:flex-row xl:items-center justify-between gap-4 lg:gap-5"
                >
                  {/* 1. Identity & Avatar (Right in RTL) */}
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 xl:w-[35%]">
                    <div className="relative shrink-0">
                      {dev.avatarUrl ? (
                        <Image
                          src={dev.avatarUrl}
                          alt={dev.name}
                          width={60}
                          height={60}
                          className="w-12 h-12 sm:w-14 sm:h-14 lg:w-15 lg:h-15 rounded-2xl object-cover border border-[#C5E8D1] shadow-2xs"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-12 w-12 sm:h-14 sm:h-14 lg:w-15 lg:h-15 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EBF7EF] to-[#D4F2E1] border border-[#C5E8D1] font-black text-[#056B38] text-[17px] lg:text-[20px] shadow-2xs">
                          {dev.initials}
                        </div>
                      )}
                      <AvatarStatusBadge lastSeenAt={dev.lastSeenAt} size="md" />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/developers/${dev.id}`}
                          className="text-[16px] sm:text-[18px] lg:text-[20px] font-black text-[#05291A] font-heading hover:text-[#056B38] transition-colors truncate"
                        >
                          {dev.name}
                        </Link>
                        {dev.isVerified && <VerifiedBadge type="developer" size="md" />}
                        {dev.availabilityType === "available" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>متاح</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[13px] sm:text-[14px] lg:text-[15px] text-[#526B5E] truncate">
                        <span className="font-bold text-[#3B5446]">{dev.role}</span>
                        {dev.location && (
                          <>
                            <span className="text-neutral-300">·</span>
                            <span className="flex items-center gap-1 text-[11px] sm:text-[12px] lg:text-[13px]">
                              <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                              <span>{dev.location}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Skills Strip (Middle) */}
                  {dev.skills && dev.skills.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0 xl:flex-1">
                      {dev.skills.slice(0, 5).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-xl bg-[#F7FAF8] border border-[#D1E3D6] px-3 py-1 lg:px-3.5 lg:py-1.5 text-[11px] sm:text-[12px] lg:text-[13px] font-bold text-[#05291A] shadow-2xs"
                        >
                          {skill}
                        </span>
                      ))}
                      {dev.skills.length > 5 && (
                        <span className="text-[11px] sm:text-[12px] font-bold text-neutral-400 px-1">
                          +{dev.skills.length - 5}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 3. Metrics + Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                    {/* Badges: Grid on mobile, flex on sm+ */}
                    <div className="grid grid-cols-2 sm:flex items-center gap-2">
                      <div
                        className={`inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-xl lg:rounded-2xl text-[12px] sm:text-[13px] lg:text-[14px] border ${trustBgClass}`}
                      >
                        <ShieldCheck className="w-4 h-4 lg:w-4.5 lg:h-4.5 shrink-0 text-[#056B38]" />
                        <span className="font-bold text-[#526B5E]">الثقة:</span>
                        <span className="font-black font-mono" dir="ltr">{dev.trustScore}%</span>
                      </div>

                      <div className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-2 lg:px-3.5 lg:py-2.5 rounded-xl lg:rounded-2xl text-[12px] sm:text-[13px] lg:text-[14px] bg-[#F7FAF8] border border-[#D1E3D6]">
                        <Zap className="w-4 h-4 lg:w-4.5 lg:h-4.5 text-amber-500 fill-amber-500 shrink-0" />
                        <span className="font-bold text-[#526B5E]">النقاط:</span>
                        <span className="font-black font-mono text-[#05291A]" dir="ltr">{dev.skillPoints} SP</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/developers/${dev.id}`}
                        className="flex-1 sm:flex-initial h-10 lg:h-11 px-4 lg:px-5 rounded-xl lg:rounded-2xl bg-[#056B38] hover:bg-[#08592E] text-white text-[13px] lg:text-[14px] font-black inline-flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
                      >
                        <span>عرض الملف</span>
                        <ArrowLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                      </Link>
                      <Link
                        href={`/chat?with=${dev.userId}`}
                        className="h-10 w-11 lg:h-11 lg:w-11 rounded-xl lg:rounded-2xl border border-[#D1E3D6] bg-white hover:bg-[#E8FAF0] hover:border-[#056B38] text-[#056B38] inline-flex items-center justify-center transition-all shadow-2xs cursor-pointer shrink-0"
                        title="محادثة وتوظيف"
                      >
                        <MessageSquare className="w-4 h-4 lg:w-4.5 lg:h-4.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
