"use client";

export function formatArabicLastSeen(date: Date | string | null): string {
  if (!date) return "غير متصل";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "غير متصل";

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(Math.max(0, diffMs) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffMin < 2) return "متصل الآن";
  if (diffMin < 60) return `آخر ظهور منذ ${diffMin} دقيقة`;
  if (diffHour < 24) return `آخر ظهور منذ ${diffHour} ساعة`;
  if (diffDays === 1) return "آخر ظهور بالأمس";
  if (diffDays <= 7) return `آخر ظهور منذ ${diffDays} أيام`;
  return `آخر ظهور في ${d.toLocaleDateString("ar-EG")}`;
}

export function isUserOnline(lastSeenAt: Date | string | null): boolean {
  if (!lastSeenAt) return false;
  const d = new Date(lastSeenAt);
  if (isNaN(d.getTime())) return false;
  return Date.now() - d.getTime() < 2.5 * 60 * 1000;
}

export interface UserStatusIndicatorProps {
  lastSeenAt?: Date | string | null;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showRelativeTime?: boolean;
  className?: string;
}

export function UserStatusIndicator({
  lastSeenAt,
  isOnline: explicitIsOnline,
  size = "md",
  showLabel = true,
  showRelativeTime = false,
  className = "",
}: UserStatusIndicatorProps) {
  const online =
    typeof explicitIsOnline === "boolean"
      ? explicitIsOnline
      : isUserOnline(lastSeenAt ?? null);

  const dotSizes = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3.5 w-3.5",
  };

  const textSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
      title={online ? "متصل الآن على المنصة" : formatArabicLastSeen(lastSeenAt ?? null)}
    >
      {online ? (
        <span className={`relative flex ${dotSizes[size]}`}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className={`relative inline-flex rounded-full ${dotSizes[size]} bg-emerald-500 ring-2 ring-white`} />
        </span>
      ) : (
        <span className={`inline-flex rounded-full ${dotSizes[size]} bg-neutral-300 ring-2 ring-white`} />
      )}

      {showLabel && (
        <span
          className={`font-bold transition-colors ${
            online ? "text-[#056B38]" : "text-[#526B5E]"
          } ${textSizes[size]}`}
        >
          {online
            ? "متصل الآن"
            : showRelativeTime
            ? formatArabicLastSeen(lastSeenAt ?? null)
            : "غير متصل"}
        </span>
      )}
    </div>
  );
}

export function AvatarStatusBadge({
  isOnline,
  lastSeenAt,
  size = "md",
}: {
  isOnline?: boolean;
  lastSeenAt?: Date | string | null;
  size?: "sm" | "md" | "lg";
}) {
  const online =
    typeof isOnline === "boolean" ? isOnline : isUserOnline(lastSeenAt ?? null);

  const badgeSizes = {
    sm: "h-2.5 w-2.5 ring-[1.5px]",
    md: "h-3.5 w-3.5 ring-2",
    lg: "h-4 w-4 ring-2",
  };

  return (
    <span
      className={`absolute bottom-0 right-0 rounded-full ring-white shadow-2xs ${badgeSizes[size]} ${
        online ? "bg-emerald-500" : "bg-neutral-300"
      }`}
      title={online ? "متصل الآن" : formatArabicLastSeen(lastSeenAt ?? null)}
    />
  );
}
