"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-provider";
import {
  Home,
  Briefcase,
  MessageSquare,
  LayoutDashboard,
  User,
  ShieldCheck,
  Settings,
  X,
  ChevronUp,
  Users,
  Crown,
  LogOut,
} from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";

export function MobileBottomTabs() {
  const pathname = usePathname();
  const { userRole, isAdmin, username, developer, client } = useProfile();

  const [isDropUpOpen, setIsDropUpOpen] = useState(false);

  const tabs = React.useMemo(() => {
    if (userRole === "developer") {
      return [
        { label: "اللوحة", href: "/dashboard", icon: LayoutDashboard },
        { label: "المشاريع", href: "/projects", icon: Briefcase },
        { label: "المطورين", href: "/developers", icon: Users },
        { label: "المحادثات", href: "/chat", icon: MessageSquare },
      ];
    }
    if (userRole === "client") {
      return [
        { label: "اللوحة", href: "/dashboard", icon: LayoutDashboard },
        { label: "المطورين", href: "/developers", icon: Users },
        { label: "مشاريعي", href: "/projects", icon: Briefcase },
        { label: "المحادثات", href: "/chat", icon: MessageSquare },
      ];
    }
    return [
      { label: "الرئيسية", href: "/", icon: Home },
      { label: "المطورين", href: "/developers", icon: Users },
      { label: "المشاريع", href: "/projects", icon: Briefcase },
      { label: "المحادثات", href: "/chat", icon: MessageSquare },
    ];
  }, [userRole]);

  const activeIndex = tabs.findIndex((tab) =>
    tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
  );

  const isProfileActive = pathname.startsWith("/profile") || pathname.startsWith("/client-profile") || pathname.startsWith("/admin");
  const safeActiveIndex = isProfileActive ? 4 : (activeIndex >= 0 ? activeIndex : 0);

  const currentUserName =
    (userRole === "developer" ? developer.fullName : client.fullName) ||
    developer.fullName ||
    client.fullName ||
    (username ? `@${username}` : "المستخدم");
  const currentUserEmail =
    (userRole === "developer" ? developer.email : client.email) ||
    developer.email ||
    client.email ||
    "";
  const roleBadgeLabel = userRole === "developer" ? "حساب مطور" : userRole === "client" ? "حساب عميل (Client)" : "مدير النظام";

  if(userRole === "guest") return <div className="fixed bottom-0 left-0 right-0 z-40 flex gap-3 border-t bg-white p-3 min-[950px]:hidden"><Link href="/login" className="flex-1 rounded-full border border-[#056B38] py-3 text-center font-bold text-[#056B38]">تسجيل الدخول</Link><Link href="/register" className="flex-1 rounded-full bg-[#056B38] py-3 text-center font-bold text-white">إنشاء حساب</Link></div>;
  return (
    <div className="block min-[950px]:hidden fixed bottom-0 left-0 right-0 z-40 font-body dir-rtl" dir="rtl">
      
      {/* DROP-UP BACKDROP OVERLAY */}
      {isDropUpOpen && (
        <div
          onClick={() => setIsDropUpOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-30 animate-in fade-in-0 duration-200"
        />
      )}

      {/* SLIDING DROP-UP POPOVER MENU (EXPANDS UPWARDS FROM BOTTOM BAR) */}
      {isDropUpOpen && (
        <div className="absolute bottom-20 left-4 right-4 z-40 bg-white rounded-[24px] border border-[#D1E3D6] p-4 shadow-2xl space-y-2 animate-in slide-in-from-bottom-6 duration-250">
          
          {/* Dropdown Header User Info */}
          <div className="p-3 bg-[#E8FAF0] rounded-[16px] border border-[#D1E3D6] space-y-1 text-right relative">
            <button
              type="button"
              onClick={() => setIsDropUpOpen(false)}
              className="absolute left-2.5 top-2.5 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-[#05291A] flex items-center justify-center cursor-pointer border border-[#D1E3D6] shadow-2xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="text-[14px] font-extrabold text-[#05291A] flex items-center gap-2 pl-8">
              <span className="truncate">{currentUserName}</span>
              {(userRole === "developer" ? developer.isVerified : client.isVerified) && (
                <VerifiedBadge type={userRole === "developer" ? "developer" : "client"} size="sm" showLabel />
              )}
            </div>
            {username && (
              <div className="text-xs font-mono font-bold text-[#056B38] flex items-center gap-1">
                <span>@{username}</span>
              </div>
            )}
            {currentUserEmail && <div className="text-[11px] text-[#526B5E] truncate">{currentUserEmail}</div>}
            <div className="inline-block text-[10px] font-black bg-[#056B38] text-white px-2.5 py-0.5 rounded-full mt-0.5">
              {roleBadgeLabel}
            </div>
          </div>

          {/* Upgrade to Pro Button */}
          <Link
            href="/pricing"
            onClick={() => setIsDropUpOpen(false)}
            className="flex items-center justify-between px-3 py-2.5 rounded-[12px] text-[13px] font-extrabold bg-gradient-to-l from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-100" />
              <span>ترقية الحساب (Upgrade)</span>
            </div>
            <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-bold">PRO</span>
          </Link>

          {/* Main Links */}
          <div className="space-y-1 pt-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsDropUpOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0] transition-colors border border-[#D1E3D6]"
              >
                <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                <span>لوحة الإدارة (Admin Panel)</span>
              </Link>
            )}

            <Link
              href="/dashboard"
              onClick={() => setIsDropUpOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-[#056B38]" />
              <span>لوحة التحكم (Dashboard)</span>
            </Link>

            <Link
              href="/chat"
              onClick={() => setIsDropUpOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-[#056B38]" />
              <span>المحادثات</span>
            </Link>

            <Link
              href={username ? `/profile/${username}` : "/complete-profile"}
              onClick={() => setIsDropUpOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
            >
              <User className="w-4 h-4 text-[#056B38]" />
              <span>عرض الملف الشخصي</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsDropUpOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
            >
              <Settings className="w-4 h-4 text-[#056B38]" />
              <span>إعدادات الحساب والأمان</span>
            </Link>
          </div>

          {/* Logout Button */}
          <div className="pt-2 border-t border-neutral-100">
            <form action="/api/auth/logout" method="post" onSubmit={() => setIsDropUpOpen(false)}>
              <button type="submit" className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer">
                <LogOut className="w-4 h-4 text-red-500" />
                <span>تسجيل الخروج</span>
              </button>
            </form>
          </div>

        </div>
      )}

      {/* FULL-WIDTH WHITE NAV BAR WITH BRAND GREEN TOP BORDER */}
      <nav className="relative w-full bg-white flex flex-row items-center h-16 border-t-2 border-[#056B38] shadow-[0_-6px_25px_rgba(0,0,0,0.08)] z-40">

        {/* ELEGANT SHALLOW WAVE NOTCH SVG & GREEN DOT (EXACTLY 20% TAB WIDTH) */}
        <div
          className="absolute -top-[2px] w-[20%] pointer-events-none z-30 flex flex-col items-center justify-start transition-all duration-300 ease-out"
          style={{
            height: "22px",
            right: `${safeActiveIndex * 20}%`,
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 20"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 C18,0 28,15 50,15 C72,15 82,0 100,0 Z"
              fill="#ffffff"
            />
            <path
              d="M0,0 C18,0 28,15 50,15 C72,15 82,0 100,0"
              fill="none"
              stroke="#056B38"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx="50" cy="5" r="3" fill="#056B38" />
          </svg>
        </div>

        {/* NAV ITEMS WITH COMFORTABLE PADDING */}
        <div className="relative w-full h-full flex flex-row items-end z-20">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = idx === safeActiveIndex;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex-1 flex flex-col items-center justify-end pb-2 cursor-pointer select-none group"
              >
                <Icon
                  className={`w-5 h-5 mb-0.5 ${
                    isActive
                      ? "text-[#056B38] stroke-[2.4]"
                      : "text-[#526B5E] stroke-[1.6] group-hover:text-[#056B38]"
                  }`}
                  style={{ transition: "color 0.2s ease" }}
                />
                <span
                  className={`text-[10px] ${
                    isActive ? "font-extrabold text-[#056B38]" : "font-semibold text-[#526B5E]"
                  }`}
                  style={{ transition: "color 0.2s ease" }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* 5TH ITEM: USER AVATAR WITH DROP-UP MENU TRIGGER */}
          <button
            type="button"
            onClick={() => setIsDropUpOpen(!isDropUpOpen)}
            className="flex-1 flex flex-col items-center justify-end pb-1.5 cursor-pointer select-none group border-none bg-transparent"
          >
            <div className={`relative w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-[11px] mb-0.5 ${
              safeActiveIndex === 4
                ? "bg-[#056B38] text-white border-2 border-emerald-400"
                : "bg-[#05291A] text-white"
            }`}>
              {currentUserName.charAt(0)}
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white" />
            </div>
            <span className={`text-[10px] flex items-center gap-0.5 ${
              safeActiveIndex === 4 ? "font-extrabold text-[#056B38]" : "font-semibold text-[#526B5E]"
            }`}>
              <span>حسابي</span>
              <ChevronUp className="w-2.5 h-2.5" />
            </span>
          </button>

        </div>
      </nav>
    </div>
  );
}
