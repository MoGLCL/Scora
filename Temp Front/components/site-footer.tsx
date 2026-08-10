import Link from "next/link";

const footerLinks = [
  { label: "بتشتغل إزاي", href: "/#how-it-works" },
  { label: "للمبرمجين", href: "/profile" },
  { label: "للشركات", href: "/client-profile" },
  { label: "الخصوصية", href: "/privacy" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-[1296px] flex-col gap-8 px-6 py-10 md:flex-row md:items-start md:justify-between md:px-8">
        <div>
          {/* Logo (.Scora LTR with darker green rounded dot #04331B tight against S baseline - Figma Specs) */}
          <Link
            href="/"
            className="inline-flex items-baseline font-heading text-[24px] font-extrabold leading-[35px] text-[#056B38] select-none cursor-pointer"
            dir="ltr"
          >
            <span className="w-1 h-1 rounded-full bg-[#04331B] inline-block self-end mb-[3px] mr-[0.5px] shrink-0" />
            <span>Scora</span>
          </Link>
          <p className="mt-2 text-[13px] text-muted">
            منصة توظيف تقني معمولة على الثقة.
          </p>
        </div>

        <div className="md:text-end">
          <nav className="flex flex-wrap gap-x-8 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[13px] text-ink transition-colors hover:text-[#0E6D3B]"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-3 text-[11px] text-muted">© CodeLuck 2026</p>
        </div>
      </div>
    </footer>
  );
}
