import { Check, ShieldCheck, Building2 } from "lucide-react";

interface VerifiedBadgeProps {
  type?: "developer" | "client" | "admin" | "general" | "company";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function VerifiedBadge({
  type = "general",
  size = "md",
  showLabel = false,
  className = "",
}: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: "h-3.5 w-3.5 text-[9px]",
    md: "h-4 w-4 text-[10px]",
    lg: "h-5 w-5 text-xs",
  };

  const iconSizes = {
    sm: "h-2.5 w-2.5",
    md: "h-3 w-3",
    lg: "h-3.5 w-3.5",
  };

  if (type === "admin") {
    return (
      <span
        title="حساب إدارة المنصة معتمد"
        className={`inline-flex items-center gap-1 rounded-full bg-[#056B38] text-white font-black px-2 py-0.5 shadow-2xs ${className}`}
      >
        <ShieldCheck className={iconSizes[size]} />
        {showLabel && <span>إدارة المنصة</span>}
      </span>
    );
  }

  if (type === "company") {
    return (
      <span
        title="شركة تجارية موثقة ومعتمدة في المنصة"
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 font-black px-2 py-0.5 shadow-2xs ${className}`}
      >
        <Building2 className={`${iconSizes[size]} text-emerald-700`} />
        {showLabel && <span>شركة موثقة</span>}
      </span>
    );
  }

  if (type === "client") {
    return (
      <span
        title="صاحب عمل موثق الهوية والمدفوعات"
        className={`inline-flex items-center gap-1 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-black px-2 py-0.5 shadow-2xs ${className}`}
      >
        <Check className={`${iconSizes[size]} text-sky-700 stroke-[3]`} />
        {showLabel && <span>عميل موثق</span>}
      </span>
    );
  }

  if (type === "developer") {
    return (
      <span
        title="مطور برمجيات معتمد ومجتاز لاختبارات التقييم الذكي"
        className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 text-[#056B38] border border-emerald-300 font-black px-2 py-0.5 shadow-2xs ${className}`}
      >
        <ShieldCheck className={`${iconSizes[size]} text-[#056B38]`} />
        {showLabel && <span>مطور موثق</span>}
      </span>
    );
  }

  // General Verified Badge
  return (
    <span
      title="حساب موثق ومعتمد في سكورا"
      className={`inline-flex items-center justify-center rounded-full bg-sky-500 text-white font-black p-0.5 shadow-xs ${sizeClasses[size]} ${className}`}
    >
      <Check className={`${iconSizes[size]} stroke-[3.5] text-white`} />
    </span>
  );
}
