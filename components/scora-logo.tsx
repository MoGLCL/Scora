import Link from "next/link";

export interface ScoraLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon" | "text";
  theme?: "emerald" | "white" | "dark";
  href?: string;
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
}

export function ScoraLogoIcon({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none transition-transform duration-200 group-hover:scale-105 ${className}`}
    >
      <defs>
        {/* Outer Brand Emerald Gradient */}
        <linearGradient id="scora_grad_bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#056B38" />
          <stop offset="50%" stopColor="#0A8F4D" />
          <stop offset="100%" stopColor="#044E28" />
        </linearGradient>

        {/* Highlight Gradient for the Spark */}
        <linearGradient id="scora_spark_grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#D4F5E0" />
        </linearGradient>

        {/* Soft Drop Shadow for inner depth */}
        <filter id="scora_glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#04331B" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Rounded Modern Squircle / Hexagon Container */}
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="11"
        fill="url(#scora_grad_bg)"
        stroke="#10B981"
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* Futuristic Geometric 'S' + Code Spark Symbol */}
      <g filter="url(#scora_glow)">
        {/* Top Arc of S (Code Bracket Angle) */}
        <path
          d="M26 13.5C26 13.5 24 11 19.5 11C15 11 13 13.5 13 16.5C13 20.5 27 19.5 27 24C27 27.5 24.5 29.5 19.5 29.5C15 29.5 13 27 13 27"
          stroke="url(#scora_spark_grad)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Terminal Chevron Slash Accent */}
        <circle cx="20" cy="20.2" r="1.8" fill="#A7F3D0" />
      </g>

      {/* Top Right Mini Verification Spark */}
      <circle cx="28.5" cy="11.5" r="1.8" fill="#34D399" />
    </svg>
  );
}

export function ScoraLogo({
  size = "md",
  variant = "full",
  theme = "emerald",
  href,
  className = "",
  showBadge = false,
  badgeText = "PRO",
}: ScoraLogoProps) {
  const iconSizes = {
    sm: 28,
    md: 38,
    lg: 46,
    xl: 54,
  };

  const textSizes = {
    sm: "text-[21px] tracking-tight",
    md: "text-[27px] tracking-tight",
    lg: "text-[33px] tracking-tight",
    xl: "text-[39px] tracking-tight",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5 ml-0.5",
    md: "w-2 h-2 ml-0.5",
    lg: "w-2.5 h-2.5 ml-1",
    xl: "w-3 h-3 ml-1",
  };

  const isDark = theme === "white";

  const textColor = isDark
    ? "text-white"
    : theme === "dark"
    ? "text-[#05291A]"
    : "text-[#056B38]";

  const content = (
    <div
      className={`inline-flex items-center gap-1 select-none font-heading font-black group transition-all ${className}`}
      dir="ltr"
    >
      {(variant === "full" || variant === "icon") && (
        <ScoraLogoIcon size={iconSizes[size]} />
      )}

      {(variant === "full" || variant === "text") && (
        <div className="flex items-baseline leading-none">
          <span className={`font-black ${textSizes[size]} ${textColor} transition-colors`}>
            cora
          </span>
          <span className={`${dotSizes[size]} rounded-full bg-[#10B981] inline-block shadow-2xs group-hover:scale-125 transition-transform`} />

          {showBadge && (
            <span className="ml-1.5 text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#C5E8D1] leading-none">
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
