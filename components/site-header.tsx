"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-provider";
import { NotificationsMenu } from "@/components/notifications-menu";
import { ChatMenu } from "@/components/chat-menu";
import {
  LayoutDashboard,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  MessageSquare,
  Crown
} from "lucide-react";
import { VerifiedBadge } from "@/components/verified-badge";
import { ScoraLogo } from "@/components/scora-logo";

export function SiteHeader() {
  const pathname = usePathname();
  const { userRole, isAdmin, username, developer, client } = useProfile();

  const [activeDropdown, setActiveDropdown] = useState<"profile" | "chat" | "notifications" | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Role-Customized Navigation Links
  const navLinks = React.useMemo(() => {
    if (userRole === "developer") {
      return [
        { label: "لوحة التحكم", href: "/dashboard" },
        { label: "تصفح المشاريع", href: "/projects" },
        { label: "المطورين", href: "/developers" },
        { label: "التقييمات والاختبارات", href: "/assessments" },
        { label: "القوانين", href: "/laws" },
        { label: "الدعم", href: "/support" },
      ];
    }
    if (userRole === "client") {
      return [
        { label: "لوحة التحكم", href: "/dashboard" },
        { label: "تصفح المطورين", href: "/developers" },
        { label: "مشاريعي", href: "/projects" },
        { label: "القوانين", href: "/laws" },
        { label: "الدعم", href: "/support" },
      ];
    }
    if (isAdmin) {
      return [
        { label: "المشاريع", href: "/projects" },
        { label: "المطورين", href: "/developers" },
        { label: "التقييمات", href: "/assessments" },
        { label: "القوانين", href: "/laws" },
        { label: "الدعم", href: "/support" },
      ];
    }
    // Guest Links
    return [
      { label: "الرئيسية", href: "/" },
      { label: "المطورين", href: "/developers" },
      { label: "المشاريع", href: "/projects" },
      { label: "عن المنصة", href: "/about" },
      { label: "خطط", href: "/pricing" },
      { label: "القوانين", href: "/laws" },
      { label: "الدعم", href: "/support" },
    ];
  }, [isAdmin, userRole]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

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

  const currentUserAvatar = userRole === "developer" ? developer.avatarUrl : client.avatarUrl;
  const currentUserRoleLabel = userRole === "developer" ? "حساب مطور" : userRole === "client" ? "حساب عميل (Client)" : "حساب زائر";

  return (
    <header className="w-full border-b border-[#D1E3D6]/80 bg-white sticky top-0 z-50">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-6 md:px-10 relative">
        
        {/* Right Side: Logo (Centered on mobile before login) */}
        <div
          className={`z-10 flex items-center ${
            userRole === "guest" ? "w-full justify-center sm:w-auto sm:justify-start" : ""
          }`}
        >
          <ScoraLogo
            href={userRole !== "guest" ? "/dashboard" : "/"}
            size="md"
            variant="full"
          />
        </div>

        {/* Center: Navigation Links - Perfectly Centered Horizontally and Vertically */}
        <nav className="hidden xl:flex items-center gap-7 2xl:gap-8 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10">
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

        {/* Left Side: Actions */}
        <div className="flex items-center gap-3 md:gap-4 z-10">
          
          {/* If Signed In */}
          {userRole !== "guest" ? (
            <div className="flex items-center gap-3 relative" ref={profileMenuRef}>
              
              {/* Messages Dropdown */}
              <ChatMenu
                isOpen={activeDropdown === "chat"}
                onToggle={() => setActiveDropdown((prev) => (prev === "chat" ? null : "chat"))}
                onClose={() => setActiveDropdown(null)}
              />

              {/* Notifications Dropdown */}
              <NotificationsMenu
                isOpen={activeDropdown === "notifications"}
                onToggle={() => setActiveDropdown((prev) => (prev === "notifications" ? null : "notifications"))}
                onClose={() => setActiveDropdown(null)}
              />

              {/* User Avatar / Button - Desktop only (mobile uses bottom tabs menu) */}
              <button
                type="button"
                onClick={() => setActiveDropdown((prev) => (prev === "profile" ? null : "profile"))}
                className="hidden min-[950px]:flex h-11 w-11 items-center justify-center rounded-full border border-[#D1E3D6] hover:border-[#056B38] hover:bg-[#E8FAF0] transition-all bg-white focus:outline-none focus:ring-2 focus:ring-[#056B38]/20 cursor-pointer shadow-2xs active:scale-95"
                title="الملف الشخصي والحساب"
                aria-label="الملف الشخصي والحساب"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-[#E8FAF0] text-[#056B38] font-bold text-xs flex items-center justify-center border border-[#C5E8D1]">
                  {currentUserAvatar ? (
                    <img
                      src={currentUserAvatar}
                      alt={currentUserName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(currentUserName || "Scora")}</span>
                  )}
                </div>
              </button>

              {/* Dropdown Menu */}
              {activeDropdown === "profile" && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-[20px] border border-[#D1E3D6] bg-white p-3 shadow-xl space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  
                  {/* Dropdown Header */}
                  <div className="p-3 bg-[#E8FAF0] rounded-[16px] border border-[#D1E3D6] mb-2 space-y-1 text-right">
                    <div className="text-[14px] font-extrabold text-[#05291A] flex items-center justify-between">
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
                      {currentUserRoleLabel}
                    </div>
                  </div>

                  {/* Upgrade to Pro Button */}
                  <Link
                    href="/pricing"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-[12px] text-[13px] font-extrabold bg-gradient-to-l from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-all shadow-2xs mb-2"
                  >
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-100" />
                      <span>ترقية الحساب (Upgrade)</span>
                    </div>
                    <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-bold">PRO</span>
                  </Link>

                  {/* Main Links — Show Admin Panel Link ONLY when signed in as system admin */}
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setActiveDropdown(null)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold bg-[#E8FAF0] text-[#056B38] hover:bg-[#D4F5E0] transition-colors border border-[#D1E3D6]"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#056B38]" />
                      <span>لوحة الإدارة (Admin Panel)</span>
                    </Link>
                  )}

                  <Link
                    href="/dashboard"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#056B38]" />
                    <span>لوحة التحكم (Dashboard)</span>
                  </Link>

                  <Link
                    href="/chat"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 text-[#056B38]" />
                    <span>المحادثات</span>
                  </Link>

                  <Link
                    href={username ? `/profile/${username}` : "/complete-profile"}
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
                  >
                    <User className="w-4 h-4 text-[#056B38]" />
                    <span>عرض الملف الشخصي</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setActiveDropdown(null)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#056B38]" />
                    <span>إعدادات الحساب والأمان</span>
                  </Link>

                  {/* Logout Button */}
                  <div className="pt-2 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          document.cookie = "scora_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;";
                        } catch {}
                        window.location.href = "/api/auth/logout";
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[12px] text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-right"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-[44px] items-center justify-center rounded-[12px] border border-[#056B38] px-5 text-[13px] font-bold text-[#056B38] transition-colors hover:bg-[#E8FAF0]"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="inline-flex w-[140px] h-[44px] items-center justify-center rounded-[12px] bg-[#056B38] hover:bg-[#08592E] text-[13px] font-bold font-body text-white leading-[19px] transition-all shadow-xs cursor-pointer active:scale-95"
              >
                إنشاء حساب
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
