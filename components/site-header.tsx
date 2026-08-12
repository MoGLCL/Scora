"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-provider";
import {
  LayoutDashboard,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Briefcase,
  UserCheck
} from "lucide-react";

export function SiteHeader() {
  const pathname = usePathname();
  const { userRole, setUserRole, developer, client, addToast } = useProfile();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Navigation Links: Exact 7 links from Figma export
  const navLinks = [
    { label: "الرئيسية", href: "/" },
    { label: "مشاريع", href: "/projects" },
    { label: "القوانين", href: "/laws" },
    { label: "الخصوصية", href: "/privacy" },
    { label: "عن المنصة", href: "/about" },
    { label: "خطط", href: "/pricing" },
    { label: "الدعم", href: "/support" },
  ];

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const currentUserName = userRole === "developer" ? developer.fullName : client.fullName;
  const currentUserEmail = userRole === "developer" ? developer.email : client.email;
  const currentUserAvatar = userRole === "developer" ? developer.avatarUrl : client.avatarUrl;
  const currentUserRoleLabel = userRole === "developer" ? "حساب مطور" : userRole === "client" ? "حساب عميل (Client)" : "حساب زائر";

  return (
    <header className="w-full border-b border-[#D1E3D6]/80 bg-white sticky top-0 z-50">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-6 md:px-10 relative">
        
        {/* Right Side: Logo (.Scora LTR with darker green rounded dot tight against S baseline) */}
        <Link
          href="/"
          className="inline-flex items-baseline font-heading text-[24px] font-extrabold leading-[35px] text-[#056B38] select-none cursor-pointer hover:opacity-95 transition-opacity z-10"
          dir="ltr"
        >
          <span className="w-[4.5px] h-[4.5px] rounded-full bg-[#04331B] inline-block self-end mb-[4px] mr-[0.5px] shrink-0" />
          <span>Scora</span>
        </Link>

        {/* Center: Navigation Links - Exact 7 links from Figma (13px, Tajawal, Bold, #526B5E) */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-8 z-10">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[13px] font-bold font-body leading-[19px] transition-colors ${
                  isActive
                    ? "text-[#056B38]"
                    : "text-[#526B5E] hover:text-[#056B38]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Left Side: Guest Action Button OR Interactive User Profile Dropdown Menu */}
        <div className="flex items-center gap-3 z-10">
          {userRole === "guest" ? (
            /* Guest View: w-[140px] h-[44px] rounded-[12px] bg-[#056B38] text-white */
            <div className="flex items-center gap-2">
              <Link
                href="/register"
                className="inline-flex w-[140px] h-[44px] items-center justify-center rounded-[12px] bg-[#056B38] hover:bg-[#08592E] text-[13px] font-bold font-body text-white leading-[19px] transition-all shadow-xs cursor-pointer active:scale-95"
              >
                إنشاء حساب
              </Link>
            </div>
          ) : (
            /* Logged In User View (Developer / Client / Admin) — DESKTOP ONLY (Hidden on mobile since bottom tabs has drop-up profile) */
            <div className="hidden lg:block relative" ref={profileMenuRef}>
              
              {/* Profile Trigger Button (Avatar Only with Green Online Dot) */}
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#D1E3D6] bg-[#F7FAF8] hover:bg-[#E8FAF0] transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#056B38]"
                title={currentUserName}
              >
                {currentUserAvatar ? (
                  <img
                    src={currentUserAvatar}
                    alt={currentUserName}
                    className="h-full w-full rounded-full object-cover border border-[#C5E8D1]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#E8FAF0] font-bold text-[#056B38] text-[14px]">
                    {getInitials(currentUserName)}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>

              {/* POPOVER DROPDOWN MENU (Centered under avatar) */}
              {isProfileMenuOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-[20px] border border-[#D1E3D6] bg-white p-3 shadow-xl space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  
                  {/* Dropdown Header */}
                  <div className="p-2 bg-[#E8FAF0] rounded-[14px] border border-[#D1E3D6]/60 mb-2 space-y-1 text-right">
                    <div className="text-[14px] font-bold text-[#05291A]">{currentUserName}</div>
                    <div className="text-[11px] text-[#526B5E] truncate">{currentUserEmail}</div>
                    <div className="inline-block text-[10px] font-bold bg-[#056B38] text-white px-2 py-0.5 rounded-full">
                      {currentUserRoleLabel}
                    </div>
                  </div>

                  {/* Main Links — Show Admin Panel Link ONLY when signed in as system admin */}
                  {userRole === "admin" && (
                    <Link
                      href="/admin"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0] transition-colors border border-[#D1E3D6]"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                      <span>لوحة الإدارة (Admin Panel)</span>
                    </Link>
                  )}

                  <Link
                    href="/dashboard"
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#056B38]" />
                    <span>لوحة التحكم (Dashboard)</span>
                  </Link>

                  <Link
                    href={userRole === "developer" ? "/profile" : "/client-profile"}
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
                  >
                    <User className="w-4 h-4 text-[#056B38]" />
                    <span>عرض الملف الشخصي</span>
                  </Link>

                  <Link
                    href={userRole === "developer" ? "/profile/edit" : "/client-profile/edit"}
                    onClick={() => setIsProfileMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#056B38]" />
                    <span>تعديل البيانات والملف</span>
                  </Link>

                  {/* Logout Button */}
                  <div className="pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setUserRole("guest");
                        addToast("تم تسجيل الخروج بنجاح", "info");
                        window.location.href = "/";
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </header>
  );
}
