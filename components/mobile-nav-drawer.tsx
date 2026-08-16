"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export interface MobileNavDrawerProps {
  navLinks: { label: string; href: string }[];
  isGuest: boolean;
}

export function MobileNavDrawer({ navLinks, isGuest }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setIsOpen(false);
  }

  // Lock page scroll and close on Escape while open
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      {/* Trigger — mobile/tablet only */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex lg:hidden h-11 w-11 items-center justify-center rounded-full border border-[#D1E3D6] bg-white text-[#05291A] shadow-2xs transition-all hover:border-[#056B38] hover:bg-[#E8FAF0] focus:outline-none focus:ring-2 focus:ring-[#056B38]/20 active:scale-95 cursor-pointer"
        aria-label="فتح قائمة التنقل"
        aria-expanded={isOpen}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Panel — anchored to the right edge (RTL leading edge) */}
      <div
        dir="rtl"
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 z-[70] flex h-full w-[86%] max-w-[340px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full invisible pointer-events-none"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-[#D1E3D6] p-4">
          <span className="font-heading text-[15px] font-black text-[#05291A]">القائمة</span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#D1E3D6] bg-white text-[#05291A] transition-colors hover:bg-[#E8FAF0] cursor-pointer"
            aria-label="إغلاق القائمة"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Links */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`block rounded-[14px] px-4 py-3.5 text-[14px] font-bold transition-colors ${
                  isActive
                    ? "border border-[#C5E8D1] bg-[#E8FAF0] text-[#056B38]"
                    : "text-[#05291A] hover:bg-[#F7FAF8] hover:text-[#056B38]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Guest CTAs — guests have no bottom tab bar links */}
        {isGuest && (
          <div className="space-y-2 border-t border-[#D1E3D6] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              className="flex h-12 items-center justify-center rounded-[14px] border border-[#056B38] text-[14px] font-bold text-[#056B38] transition-colors hover:bg-[#E8FAF0]"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              onClick={() => setIsOpen(false)}
              className="flex h-12 items-center justify-center rounded-[14px] bg-[#056B38] text-[14px] font-bold text-white transition-colors hover:bg-[#08592E]"
            >
              إنشاء حساب
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
