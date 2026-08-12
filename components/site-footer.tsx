import Link from "next/link";

const footerLinks = [
  { label: "إزاي بتشتغل", href: "/how-it-works" },
  { label: "المبرمجين", href: "/developers" },
  { label: "المشاريع المفتوحة", href: "/projects" },
  { label: "سياسة الخصوصية", href: "/privacy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/80 bg-white">
      <div className="mx-auto flex max-w-[1296px] flex-col gap-6 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="inline-flex items-baseline font-heading text-[22px] font-extrabold text-[#056B38] select-none cursor-pointer"
            dir="ltr"
          >
            <span className="w-1 h-1 rounded-full bg-[#04331B] inline-block self-end mb-[3px] mr-[0.5px] shrink-0" />
            <span>Scora</span>
          </Link>
          <span className="hidden sm:inline text-neutral-300">|</span>
          <p className="text-[12px] text-muted font-medium">
            منصة التقييم والتوظيف التقني الموثوقة · بواسطة <span className="font-bold text-[#056B38]">CodeLuck</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] font-bold text-ink transition-colors hover:text-[#056B38]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="text-[12px] font-semibold text-neutral-500 flex items-center gap-1 select-none" dir="ltr">
            <span>© 2026</span>
            <span className="font-extrabold text-[#05291A]">Scora</span>
            <span className="text-neutral-400">by</span>
            <span className="font-extrabold text-[#056B38]">CodeLuck</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
