"use client";

import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  CategoryScale,
} from "chart.js";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import { Eye, Users, UserPlus, Briefcase, Sparkles, PieChart, Clock, FolderTree } from "lucide-react";

// Register Chart.js components
ChartJS.register(LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler, ArcElement, CategoryScale);

export interface TimelineDataPoint {
  day: string;
  formattedDate: string;
  visits: number;
  visitors: number;
  newUsers: number;
  newProjects: number;
  newProposals: number;
}

interface AdminProgressiveChartProps {
  timeline: TimelineDataPoint[];
  totals?: {
    users: number;
    developers: number;
    clients: number;
    admins: number;
    active_accounts: number;
    online_now: number;
    suspended_accounts: number;
    banned_accounts: number;
    projects: number;
    open_projects: number;
    in_progress_projects: number;
    completed_projects: number;
    closed_projects: number;
    proposals: number;
    assessments_count?: number;
    reviews_count?: number;
  };
  hourlyToday?: { hour: number; hourLabel: string; visits: number }[];
  categories?: { category: string; count: number }[];
}

export function AdminProgressiveChart({
  timeline = [],
  totals,
  hourlyToday = [],
  categories = [],
}: AdminProgressiveChartProps) {
  const [range, setRange] = useState<7 | 14 | 30>(14);
  const [activeMetrics, setActiveMetrics] = useState<{
    visits: boolean;
    visitors: boolean;
    users: boolean;
    activity: boolean;
  }>({
    visits: true,
    visitors: true,
    users: true,
    activity: true,
  });

  // Slice timeline based on selected range
  const slicedData = useMemo(() => {
    if (!timeline || timeline.length === 0) return [];
    return timeline.slice(-range);
  }, [timeline, range]);

  const labels = useMemo(() => slicedData.map((d) => d.formattedDate), [slicedData]);
  const count = Math.max(1, slicedData.length);

  const datasets = useMemo(() => {
    const ds = [];

    if (activeMetrics.visits) {
      ds.push({
        label: "مشاهدات الصفحات (Page Views)",
        data: slicedData.map((d, idx) => ({ x: idx, y: d.visits })),
        borderColor: "#056B38", // Scora Emerald
        backgroundColor: "rgba(5, 107, 56, 0.08)",
        borderWidth: 2.5,
        fill: true,
        cubicInterpolationMode: "monotone" as const,
        tension: 0.2,
        pointRadius: range <= 14 ? 3.5 : 2,
        pointHoverRadius: 6,
        pointBackgroundColor: "#056B38",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
      });
    }

    if (activeMetrics.visitors) {
      ds.push({
        label: "الزوار الفريدون (Unique Visitors)",
        data: slicedData.map((d, idx) => ({ x: idx, y: d.visitors })),
        borderColor: "#0284C7", // Sky Blue
        backgroundColor: "rgba(2, 132, 199, 0.06)",
        borderWidth: 2.2,
        fill: true,
        cubicInterpolationMode: "monotone" as const,
        tension: 0.2,
        pointRadius: range <= 14 ? 3.5 : 2,
        pointHoverRadius: 6,
        pointBackgroundColor: "#0284C7",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
      });
    }

    if (activeMetrics.users) {
      ds.push({
        label: "تسجيلات جديدة (New Users)",
        data: slicedData.map((d, idx) => ({ x: idx, y: d.newUsers })),
        borderColor: "#8B5CF6", // Purple
        backgroundColor: "rgba(139, 92, 246, 0.06)",
        borderWidth: 2,
        fill: false,
        cubicInterpolationMode: "monotone" as const,
        tension: 0.2,
        pointRadius: range <= 14 ? 3.5 : 2,
        pointHoverRadius: 6,
        pointBackgroundColor: "#8B5CF6",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
      });
    }

    if (activeMetrics.activity) {
      ds.push({
        label: "المشاريع والعروض (Activity)",
        data: slicedData.map((d, idx) => ({ x: idx, y: d.newProjects + d.newProposals })),
        borderColor: "#D97706", // Amber
        backgroundColor: "rgba(217, 119, 6, 0.06)",
        borderWidth: 2,
        fill: false,
        cubicInterpolationMode: "monotone" as const,
        tension: 0.2,
        pointRadius: range <= 14 ? 3.5 : 2,
        pointHoverRadius: 6,
        pointBackgroundColor: "#D97706",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
      });
    }

    return ds;
  }, [slicedData, activeMetrics, range]);

  const lineOptions: any = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          rtl: true,
          backgroundColor: "#05291A",
          titleColor: "#E8FAF0",
          bodyColor: "#FFFFFF",
          borderColor: "#056B38",
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          cornerRadius: 14,
          titleFont: {
            family: "inherit",
            weight: "bold",
            size: 13,
          },
          bodyFont: {
            family: "inherit",
            weight: "normal",
            size: 12,
          },
          callbacks: {
            title: (items: any) => {
              const idx = items[0]?.parsed?.x;
              if (idx !== undefined && slicedData[idx]) {
                return `التاريخ: ${slicedData[idx].day} (${slicedData[idx].formattedDate})`;
              }
              return "";
            },
            label: (context: any) => {
              const name = context.dataset.label || "";
              const val = context.parsed.y ?? 0;
              return `  ${name}: ${val.toLocaleString("ar-EG")}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: count - 1,
          grid: {
            color: "rgba(0, 0, 0, 0.04)",
          },
          ticks: {
            stepSize: 1,
            autoSkip: true,
            maxTicksLimit: range <= 7 ? 7 : range <= 14 ? 14 : 10,
            callback: (val: number) => {
              const index = Math.round(val);
              return labels[index] || "";
            },
            font: {
              family: "inherit",
              size: 11,
              weight: "600",
            },
            color: "#526B5E",
          },
        },
        y: {
          beginAtZero: true,
          suggestedMin: 0,
          grid: {
            color: "rgba(0, 0, 0, 0.05)",
          },
          ticks: {
            precision: 0,
            font: {
              family: "inherit",
              size: 11,
              weight: "600",
            },
            color: "#526B5E",
          },
        },
      },
    };
  }, [count, range, labels, slicedData]);

  // Aggregate stats for the current range
  const rangeTotals = useMemo(() => {
    return slicedData.reduce(
      (acc, curr) => ({
        visits: acc.visits + curr.visits,
        visitors: acc.visitors + curr.visitors,
        newUsers: acc.newUsers + curr.newUsers,
        activity: acc.activity + curr.newProjects + curr.newProposals,
      }),
      { visits: 0, visitors: 0, newUsers: 0, activity: 0 }
    );
  }, [slicedData]);

  // 1. Roles Breakdown Data
  const rolesDoughnutData = useMemo(() => {
    const devs = totals?.developers ?? 0;
    const clients = totals?.clients ?? 0;
    const admins = totals?.admins ?? 0;
    const total = devs + clients + admins;
    if (total === 0) {
      return {
        labels: ["لا توجد حسابات"],
        datasets: [{ data: [1], backgroundColor: ["#E5E7EB"], borderWidth: 0 }],
      };
    }
    return {
      labels: ["مطورون برمجيات", "أصحاب مشاريع وعملاء", "إدارة المنصة"],
      datasets: [
        {
          data: [devs, clients, admins],
          backgroundColor: ["#056B38", "#0284C7", "#8B5CF6"],
          borderColor: "#FFFFFF",
          borderWidth: 2,
        },
      ],
    };
  }, [totals]);

  // 2. Account Statuses Data
  const statusesDoughnutData = useMemo(() => {
    const active = totals?.active_accounts ?? 0;
    const suspended = totals?.suspended_accounts ?? 0;
    const banned = totals?.banned_accounts ?? 0;
    const total = active + suspended + banned;
    if (total === 0) {
      return {
        labels: ["لا توجد بيانات"],
        datasets: [{ data: [1], backgroundColor: ["#E5E7EB"], borderWidth: 0 }],
      };
    }
    return {
      labels: ["نشط ومتاح", "موقوف مؤقتاً", "محظور نهائياً"],
      datasets: [
        {
          data: [active, suspended, banned],
          backgroundColor: ["#10B981", "#F59E0B", "#EF4444"],
          borderColor: "#FFFFFF",
          borderWidth: 2,
        },
      ],
    };
  }, [totals]);

  // 3. Project Statuses Data
  const projectStatusesDoughnutData = useMemo(() => {
    const open = totals?.open_projects ?? 0;
    const inProgress = totals?.in_progress_projects ?? 0;
    const completed = totals?.completed_projects ?? 0;
    const closed = totals?.closed_projects ?? 0;
    const total = open + inProgress + completed + closed;
    if (total === 0) {
      return {
        labels: ["لا توجد مشاريع"],
        datasets: [{ data: [1], backgroundColor: ["#E5E7EB"], borderWidth: 0 }],
      };
    }
    return {
      labels: ["مفتوح للتقديم", "قيد التنفيذ", "مكتمل ومسلّم", "مغلق"],
      datasets: [
        {
          data: [open, inProgress, completed, closed],
          backgroundColor: ["#056B38", "#0284C7", "#10B981", "#6B7280"],
          borderColor: "#FFFFFF",
          borderWidth: 2,
        },
      ],
    };
  }, [totals]);

  // 4. Hourly Today Bar Chart Data
  const hourlyBarData = useMemo(() => {
    return {
      labels: hourlyToday.map((h) => h.hourLabel),
      datasets: [
        {
          label: "زيارات اليوم حسب الساعة",
          data: hourlyToday.map((h) => h.visits),
          backgroundColor: "rgba(5, 107, 56, 0.75)",
          hoverBackgroundColor: "#056B38",
          borderRadius: 6,
        },
      ],
    };
  }, [hourlyToday]);

  const doughnutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          font: { family: "inherit", size: 11, weight: "bold" },
          color: "#05291A",
          boxWidth: 12,
          padding: 12,
        },
      },
      tooltip: {
        rtl: true,
        backgroundColor: "#05291A",
        padding: 10,
        cornerRadius: 12,
      },
    },
  };

  const barOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        rtl: true,
        backgroundColor: "#05291A",
        padding: 10,
        cornerRadius: 12,
        callbacks: {
          label: (context: any) => `  الزيارات: ${context.parsed.y} زيارة`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: "inherit", size: 10 }, color: "#526B5E" },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0, 0, 0, 0.04)" },
        ticks: { precision: 0, font: { family: "inherit", size: 10 }, color: "#526B5E" },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* ─── Main Trend Line Chart ─── */}
      <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-6">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#056B38] animate-pulse" />
              <h2 className="text-xl font-extrabold text-[#05291A] flex items-center gap-2">
                <span>حركة الزيارات والتفاعل اللحظي</span>
                <span className="rounded-full bg-[#E8FAF0] px-2.5 py-0.5 text-xs font-bold text-[#056B38] border border-[#D1E3D6]">
                  Real-time Analytics
                </span>
              </h2>
            </div>
            <p className="mt-1 text-xs text-[#526B5E]">
              إحصائيات متصلة ومباشرة من قاعدة بيانات المنصة تعرض حركة الزيارات والتسجيلات والتفاعل.
            </p>
          </div>

          {/* Range Selector */}
          <div className="flex items-center rounded-2xl bg-[#F7FAF8] p-1 border border-[#D1E3D6]">
            {([7, 14, 30] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                  range === r
                    ? "bg-[#056B38] text-white shadow-2xs"
                    : "text-[#526B5E] hover:text-[#05291A]"
                }`}
              >
                {r === 7 ? "آخر 7 أيام" : r === 14 ? "آخر 14 يوماً" : "آخر 30 يوماً"}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Toggles & Range Summary Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Visits Metric */}
          <button
            type="button"
            onClick={() => setActiveMetrics((m) => ({ ...m, visits: !m.visits }))}
            className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
              activeMetrics.visits
                ? "border-[#056B38] bg-[#E8FAF0]/70 text-[#056B38] shadow-2xs ring-1 ring-[#056B38]/20"
                : "border-[#D1E3D6] bg-[#F7FAF8] text-neutral-400 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-[#056B38]" /> مشاهدات الصفحات
              </span>
              <span className="h-2 w-2 rounded-full bg-[#056B38]" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-[#05291A]">
              {rangeTotals.visits.toLocaleString("ar-EG")}
              <span className="text-[10px] font-normal text-[#526B5E] mr-1">خلال الفترة</span>
            </div>
          </button>

          {/* Visitors Metric */}
          <button
            type="button"
            onClick={() => setActiveMetrics((m) => ({ ...m, visitors: !m.visitors }))}
            className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
              activeMetrics.visitors
                ? "border-sky-500 bg-sky-50 text-sky-700 shadow-2xs ring-1 ring-sky-500/20"
                : "border-[#D1E3D6] bg-[#F7FAF8] text-neutral-400 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-sky-600" /> الزوار الفريدون
              </span>
              <span className="h-2 w-2 rounded-full bg-sky-500" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-[#05291A]">
              {rangeTotals.visitors.toLocaleString("ar-EG")}
              <span className="text-[10px] font-normal text-[#526B5E] mr-1">خلال الفترة</span>
            </div>
          </button>

          {/* Registrations Metric */}
          <button
            type="button"
            onClick={() => setActiveMetrics((m) => ({ ...m, users: !m.users }))}
            className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
              activeMetrics.users
                ? "border-purple-400 bg-purple-50 text-purple-700 shadow-2xs ring-1 ring-purple-400/20"
                : "border-[#D1E3D6] bg-[#F7FAF8] text-neutral-400 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <UserPlus className="h-3.5 w-3.5 text-purple-600" /> تسجيلات جديدة
              </span>
              <span className="h-2 w-2 rounded-full bg-purple-500" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-[#05291A]">
              {rangeTotals.newUsers.toLocaleString("ar-EG")}
              <span className="text-[10px] font-normal text-[#526B5E] mr-1">مستخدم جديد</span>
            </div>
          </button>

          {/* Projects / Activity Metric */}
          <button
            type="button"
            onClick={() => setActiveMetrics((m) => ({ ...m, activity: !m.activity }))}
            className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
              activeMetrics.activity
                ? "border-amber-400 bg-amber-50 text-amber-800 shadow-2xs ring-1 ring-amber-400/20"
                : "border-[#D1E3D6] bg-[#F7FAF8] text-neutral-400 opacity-60 hover:opacity-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 text-amber-600" /> مشاريع وعروض
              </span>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </div>
            <div className="mt-2 text-xl font-extrabold text-[#05291A]">
              {rangeTotals.activity.toLocaleString("ar-EG")}
              <span className="text-[10px] font-normal text-[#526B5E] mr-1">حركة نشاط</span>
            </div>
          </button>
        </div>

        {/* Chart Canvas Area */}
        <div className="relative h-[320px] w-full pt-2">
          {slicedData.length > 0 ? (
            <Line data={{ datasets } as any} options={lineOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-[#526B5E]">
              لا توجد بيانات إحصائية مسجلة حتى الآن.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#526B5E] border-t border-neutral-100 pt-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[#056B38]" />
            <span>انقر على أي من البطاقات أعلاه لإظهار أو إخفاء مسارها البياني.</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span>النطاق المعروض: {range} يوماً</span>
            <span>التحديث: لحظي ومباشر</span>
          </div>
        </div>
      </div>

      {/* ─── Breakdown Doughnut Charts Grid (3 Columns) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Roles */}
        <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-extrabold text-[#05291A] text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4 text-[#056B38]" /> توزيع أدوار المستخدمين
            </h3>
            <span className="text-xs font-bold text-[#526B5E]">{totals?.users ?? 0} مستخدم</span>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <Doughnut data={rolesDoughnutData} options={doughnutOptions} />
          </div>
        </div>

        {/* 2. Account Statuses */}
        <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-extrabold text-[#05291A] text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4 text-emerald-600" /> توزيع حالة الحسابات
            </h3>
            <span className="text-xs font-bold text-[#526B5E]">
              {(totals?.active_accounts ?? 0) + (totals?.suspended_accounts ?? 0) + (totals?.banned_accounts ?? 0)} حساب
            </span>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <Doughnut data={statusesDoughnutData} options={doughnutOptions} />
          </div>
        </div>

        {/* 3. Project Statuses */}
        <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-extrabold text-[#05291A] text-sm flex items-center gap-2">
              <PieChart className="h-4 w-4 text-sky-600" /> توزيع حالات المشاريع
            </h3>
            <span className="text-xs font-bold text-[#526B5E]">{totals?.projects ?? 0} مشروع</span>
          </div>
          <div className="h-56 relative flex items-center justify-center">
            <Doughnut data={projectStatusesDoughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* ─── Hourly Today Bar Chart ─── */}
      <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-extrabold text-[#05291A] text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#056B38]" /> توزيع الزيارات بالساعة لليوم الحالي (Hourly Distribution)
          </h3>
          <span className="text-xs font-bold text-[#526B5E]">خلال الـ 24 ساعة</span>
        </div>
        <div className="h-48 relative">
          <Bar data={hourlyBarData} options={barOptions} />
        </div>
      </div>

      {/* ─── Project Categories Breakdown ─── */}
      {categories && categories.length > 0 && (
        <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="font-extrabold text-[#05291A] text-base flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-[#056B38]" /> توزيع المشاريع حسب التصنيف البرمجي
            </h3>
            <span className="text-xs font-bold text-[#526B5E]">{categories.length} تصنيفات</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] p-3.5 flex items-center justify-between"
              >
                <span className="text-xs font-bold text-[#05291A] truncate">{cat.category}</span>
                <span className="font-black text-[#056B38] bg-[#E8FAF0] px-2 py-0.5 rounded-lg border border-[#D1E3D6] text-xs">
                  {cat.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
