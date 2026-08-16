import { ShieldCheck } from "lucide-react";

interface VerifiedBadgeProps {
  type?: "developer" | "client" | "admin" | "general" | "company";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function VerifiedRosetteIcon({
  className = "w-4 h-4",
  color = "#056B38",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <path
        d="M10.5858 1.58579C11.3668 0.804738 12.6332 0.804738 13.4142 1.58579L14.8284 3C15.2035 3.37508 15.6989 3.61278 16.2289 3.67232L18.2255 3.89679C19.3299 4.02095 20.1852 4.87623 20.3093 5.98061L20.5338 7.97716C20.5934 8.50723 20.8311 9.0026 21.2062 9.37768L22.6204 10.7919C23.4015 11.5729 23.4015 12.8393 22.6204 13.6203L21.2062 15.0345C20.8311 15.4096 20.5934 15.905 20.5338 16.435L20.3093 18.4316C20.1852 19.536 19.3299 20.3912 18.2255 20.5154L16.2289 20.7399C15.6989 20.7994 15.2035 21.0371 14.8284 21.4122L13.4142 22.8264C12.6332 23.6075 11.3668 23.6075 10.5858 22.8264L9.17157 21.4122C8.79649 21.0371 8.30113 20.7994 7.77106 20.7399L5.77451 20.5154C4.67013 20.3912 3.81485 19.536 3.69069 18.4316L3.46622 16.435C3.40668 15.905 3.16898 15.4096 2.7939 15.0345L1.37969 13.6203C0.598642 12.8393 0.598642 11.5729 1.37969 10.7919L2.7939 9.37768C3.16898 9.0026 3.40668 8.50723 3.46622 7.97716L3.69069 5.98061C3.81485 4.87623 4.67013 4.02095 5.77451 3.89679L7.77106 3.67232C8.30113 3.61278 8.79649 3.37508 9.17157 3L10.5858 1.58579Z"
        fill={color}
      />
      <path
        d="M8 12L11 15L16.5 9"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function VerifiedBadge({
  type = "general",
  size = "md",
  showLabel = false,
  className = "",
}: VerifiedBadgeProps) {
  const iconSizeClass =
    size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4";

  if (type === "admin") {
    return (
      <span
        title="حساب إدارة المنصة معتمد"
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#056B38] text-white font-extrabold px-2.5 py-0.5 shadow-2xs text-[11px] ${className}`}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
        {showLabel && <span>إدارة المنصة</span>}
      </span>
    );
  }

  if (type === "company") {
    return (
      <span
        title="شركة تجارية موثقة ومعتمدة في المنصة"
        className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-extrabold px-2.5 py-0.5 shadow-2xs text-[11px] ${className}`}
      >
        <VerifiedRosetteIcon className="w-3.5 h-3.5" color="#056B38" />
        {showLabel && <span>شركة موثقة</span>}
      </span>
    );
  }

  if (type === "client") {
    if (!showLabel) {
      return (
        <span title="صاحب عمل موثق" className={`inline-flex items-center shrink-0 ${className}`}>
          <VerifiedRosetteIcon className={iconSizeClass} color="#0284C7" />
        </span>
      );
    }
    return (
      <span
        title="صاحب عمل موثق الهوية والمدفوعات"
        className={`inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-900 border border-sky-200 font-extrabold px-2.5 py-0.5 shadow-2xs text-[11px] ${className}`}
      >
        <VerifiedRosetteIcon className="w-3.5 h-3.5" color="#0284C7" />
        <span>عميل موثق</span>
      </span>
    );
  }

  if (type === "developer") {
    if (!showLabel) {
      return (
        <span title="مطور معتمد وموثق في سكورا" className={`inline-flex items-center shrink-0 ${className}`}>
          <VerifiedRosetteIcon className={iconSizeClass} color="#056B38" />
        </span>
      );
    }
    return (
      <span
        title="مطور برمجيات معتمد ومجتاز لاختبارات التقييم الذكي"
        className={`inline-flex items-center gap-1.5 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#A7E2BD] font-extrabold px-2.5 py-0.5 shadow-2xs text-[11px] ${className}`}
      >
        <VerifiedRosetteIcon className="w-3.5 h-3.5" color="#056B38" />
        <span>مطور موثق</span>
      </span>
    );
  }

  // General Verified Badge
  return (
    <span
      title="حساب موثق ومعتمد في سكورا"
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
    >
      <VerifiedRosetteIcon className={iconSizeClass} color="#0284C7" />
    </span>
  );
}
