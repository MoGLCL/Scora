"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ChevronUp
} from "lucide-react";

export function MobileBottomTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const { userRole, setUserRole, developer, client } = useProfile();

  const [isDropUpOpen, setIsDropUpOpen] = useState(false);

  const tabs = [
    { label: "الرئيسية", href: "/", icon: Home },
    { label: "المشاريع", href: "/projects", icon: Briefcase },
    { label: "المحادثات", href: "/chat", icon: MessageSquare },
    { label: "اللوحة", href: "/dashboard", icon: LayoutDashboard },
  ];

  const activeIndex = tabs.findIndex((tab) =>
    tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)
  );

  const isProfileActive = pathname.startsWith("/profile") || pathname.startsWith("/client-profile") || pathname.startsWith("/admin");
  const safeActiveIndex = isProfileActive ? 4 : (activeIndex >= 0 ? activeIndex : 0);

  const currentUserName = userRole === "developer" ? developer.fullName : userRole === "client" ? client.fullName : "حساب مدير الإدارة";
  const currentUserEmail = userRole === "developer" ? developer.email : userRole === "client" ? client.email : "admin@scora.dev";
  const roleBadgeLabel = userRole === "developer" ? "مطور برمجيات" : userRole === "client" ? "عميل" : "مدير النظام";

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
        <div className="absolute bottom-20 left-4 right-4 z-40 bg-white rounded-[28px] border-2 border-[#056B38] p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-6 duration-250">
          
          {/* Header User Info */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-[#056B38] text-white flex items-center justify-center font-extrabold text-[15px] border-2 border-emerald-400 shrink-0">
                {currentUserName.charAt(0)}
              </div>
              <div className="space-y-0.5">
                <div className="font-extrabold text-[#05291A] text-[14px]">{currentUserName}</div>
                <div className="text-[11px] text-[#526B5E]">{currentUserEmail}</div>
                <span className="inline-block px-2 py-0.5 rounded-full bg-[#056B38] text-white text-[9px] font-bold">
                  {roleBadgeLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDropUpOpen(false)}
              className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-[#05291A] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Menu Links */}
          <div className="space-y-1">
            {userRole === "admin" && (
              <Link
                href="/admin"
                onClick={() => setIsDropUpOpen(false)}
                className="flex items-center gap-3 p-3 rounded-[14px] bg-[#E8FAF0] text-[#056B38] font-bold text-[13px] border border-[#D1E3D6]"
              >
                <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                <span>لوحة الإدارة (Admin Panel)</span>
              </Link>
            )}

            <Link
              href={userRole === "developer" ? "/profile" : "/client-profile"}
              onClick={() => setIsDropUpOpen(false)}
              className="flex items-center gap-3 p-2.5 rounded-[12px] text-[#05291A] font-bold text-[13px] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
            >
              <User className="w-4 h-4 text-[#056B38]" />
              <span>عرض الملف الشخصي</span>
            </Link>

            <Link
              href="/dashboard"
              onClick={() => setIsDropUpOpen(false)}
              className="flex items-center gap-3 p-2.5 rounded-[12px] text-[#05291A] font-bold text-[13px] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-[#056B38]" />
              <span>لوحة التحكم (Dashboard)</span>
            </Link>

            <Link
              href={userRole === "developer" ? "/profile/edit" : "/client-profile/edit"}
              onClick={() => setIsDropUpOpen(false)}
              className="flex items-center gap-3 p-2.5 rounded-[12px] text-[#05291A] font-bold text-[13px] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
            >
              <Settings className="w-4 h-4 text-[#056B38]" />
              <span>تعديل البيانات والملف</span>
            </Link>
          </div>

          {/* Logout Action */}
          <div className="pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                setUserRole("guest");
                setIsDropUpOpen(false);
                router.push("/");
              }}
              className="w-full py-2.5 rounded-[12px] bg-red-50 hover:bg-red-100 text-red-600 font-bold text-[13px] transition-colors cursor-pointer"
            >
              تسجيل الخروج
            </button>
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
