"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-provider";

export function SiteHeader() {
  const pathname = usePathname();
  const { userRole, developer, client } = useProfile();

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

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="w-full border-b border-[#D1E3D6]/80 bg-white sticky top-0 z-50">
      <div className="mx-auto flex h-[80px] max-w-[1440px] items-center justify-between px-6 md:px-16 relative">
        
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

        {/* Left Side: Guest Action Button / Logged-in User Profile */}
        <div className="flex items-center gap-3 z-10">
          {userRole === "guest" ? (
            /* Guest View matching exact Figma snippet: w-[140px] h-[44px] rounded-[12px] bg-[#056B38] text-white */
            <Link
              href="/register"
              className="inline-flex w-[140px] h-[44px] items-center justify-center rounded-[12px] bg-[#056B38] hover:bg-[#08592E] text-[13px] font-bold font-body text-white leading-[19px] transition-all shadow-xs cursor-pointer active:scale-95"
            >
              إنشاء حساب
            </Link>
          ) : (
            /* Logged In User View (Developer / Client) */
            <div className="flex items-center gap-3">
              <Link
                href={userRole === "developer" ? "/profile" : "/client-profile"}
                className="flex items-center gap-2.5 rounded-full border border-[#D1E3D6] bg-[#F7FAF8] hover:bg-[#E8FAF0] p-1.5 pl-4 transition-all cursor-pointer shadow-2xs"
                title="الملف الشخصي"
              >
                {userRole === "developer" ? (
                  developer.avatarUrl ? (
                    <img
                      src={developer.avatarUrl}
                      alt={developer.fullName}
                      className="h-9 w-9 rounded-full object-cover border border-[#C5E8D1]"
                    />
                  ) : (
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#E8FAF0] border border-[#C5E8D1] font-bold text-[#056B38] text-[13px]">
                      {getInitials(developer.fullName)}
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                  )
                ) : (
                  client.avatarUrl ? (
                    <img
                      src={client.avatarUrl}
                      alt={client.fullName}
                      className="h-9 w-9 rounded-full object-cover border border-[#C5E8D1]"
                    />
                  ) : (
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#E8FAF0] border border-[#C5E8D1] font-bold text-[#056B38] text-[13px]">
                      {getInitials(client.fullName)}
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                  )
                )}

                <div className="text-right hidden sm:block">
                  <div className="text-[13px] font-bold text-[#05291A] leading-tight">
                    {userRole === "developer" ? developer.fullName : client.fullName}
                  </div>
                  <div className="text-[11px] font-medium text-[#056B38]">
                    {userRole === "developer" ? "حساب مطور" : "حساب شركة / عميل"}
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
