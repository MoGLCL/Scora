import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query, queryOne } from "@/lib/db";
import { verifySession, listDeveloperPortfolioProjects } from "@/lib/dal";
import { VerifiedBadge } from "@/components/verified-badge";
import { UserStatusIndicator, AvatarStatusBadge } from "@/components/user-status-indicator";
import { RequestVerificationButton } from "@/components/request-verification-button";
import {
  MessageSquare,
  Plus,
  Edit3,
  Star,
  Layers,
  ExternalLink,
  Code2,
  Briefcase,
  CheckCircle2,
  FolderGit2,
  ShieldCheck,
  FileCheck,
  Users,
  TrendingUp,
  MapPin
} from "lucide-react";
import type { AppRole } from "@/lib/types";

function budget(from: number | null, to: number | null): string {
  if (from && to) return `${from.toLocaleString("ar-EG")} — ${to.toLocaleString("ar-EG")} ج.م`;
  if (from) return `من ${from.toLocaleString("ar-EG")} ج.م`;
  if (to) return `حتى ${to.toLocaleString("ar-EG")} ج.م`;
  return "ميزانية قابلة للتفاوض";
}

function initialsOf(name: string): string {
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2)).toUpperCase();
}

function formatArabicRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(Math.max(0, diffMs) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffDays === 0) {
    if (diffHour === 0) {
      if (diffMin <= 2) return "الآن";
      return `منذ ${diffMin} دقيقة`;
    }
    return `منذ ${diffHour} ساعة`;
  }
  if (diffDays === 1) return "أمس";
  if (diffDays === 2) return "منذ يومين";
  if (diffDays <= 10) return `منذ ${diffDays} أيام`;
  if (diffDays <= 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  if (diffDays <= 60) return "منذ شهر";
  if (diffDays <= 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
  return d.toLocaleDateString("ar-EG");
}

function CircularScoreGauge({ score }: { score: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="text-[11px] font-bold text-[#526B5E] mb-1">Trust Score</div>
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="#E8FAF0"
            strokeWidth="3.5"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="#056B38"
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-xs font-black text-[#05291A]">{score}%</span>
      </div>
      <span className="mt-1 text-[10px] font-extrabold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
        {score >= 80 ? "مرتفع" : score >= 50 ? "متوسط" : "مبتدئ"}
      </span>
    </div>
  );
}

interface ActivityEvent {
  title: string;
  time: string;
  timestamp: number;
  icon: typeof CheckCircle2;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const username = (await params).username.toLowerCase();
  const viewer = await verifySession();

  const user = await queryOne<{
    id: number;
    full_name: string;
    username: string;
    role: AppRole;
    is_verified: 0 | 1;
    created_at: Date;
    last_seen_at: Date | null;
  }>(
    "SELECT id, full_name, username, role, is_verified, created_at, last_seen_at FROM users WHERE username = ? AND status != 'banned'",
    [username]
  );
  if (!user) notFound();

  let dev =
    user.role === "developer"
      ? await queryOne<{
          id: number;
          display_name: string;
          job_title: string | null;
          bio: string | null;
          location: string | null;
          trust_score: number;
          skill_points: number;
          avatar_url: string | null;
          is_verified: 0 | 1;
        }>(
          "SELECT id, display_name, job_title, bio, location, trust_score, skill_points, avatar_url, is_verified FROM developers WHERE user_id = ?",
          [user.id]
        )
      : null;

  let client =
    user.role === "client"
      ? await queryOne<{
          id: number;
          display_name: string;
          account_type: "personal" | "company";
          company_name: string | null;
          tax_id: string | null;
          industry: string | null;
          company_size: string | null;
          website: string | null;
          location: string | null;
          avatar_url: string | null;
          is_verified: 0 | 1;
        }>(
          "SELECT id, display_name, account_type, company_name, tax_id, industry, company_size, website, location, avatar_url, is_verified FROM clients WHERE user_id = ?",
          [user.id]
        )
      : null;

  if (user.role === "developer" && !dev) {
    dev = {
      id: 0,
      display_name: user.full_name,
      job_title: "مطور برمجيات",
      bio: null,
      location: "القاهرة، مصر",
      trust_score: 50,
      skill_points: 0,
      avatar_url: null,
      is_verified: user.is_verified,
    };
  }

  if (user.role === "client" && !client) {
    client = {
      id: 0,
      display_name: user.full_name,
      account_type: "personal",
      company_name: null,
      tax_id: null,
      industry: null,
      company_size: null,
      website: null,
      location: "القاهرة، مصر",
      avatar_url: null,
      is_verified: user.is_verified,
    };
  }

  // Developer Verification Rule: Trust Score >= 90% gets badge automatically, unless admin explicitly removed it (0).
  // Trust Score < 90% only gets badge if admin explicitly granted it (1).
  const isDevVerified =
    user.role === "developer"
      ? Boolean(dev && (dev.trust_score >= 90 ? dev.is_verified !== 0 : dev.is_verified === 1))
      : false;

  const isClientVerified =
    user.role === "client" ? Boolean(client?.is_verified || user.is_verified) : false;

  const isVerified = isDevVerified || isClientVerified;
  const isOwnProfile = Boolean(viewer && viewer.userId === user.id);

  // Developer Portfolio Projects
  const portfolioProjects = dev && dev.id > 0 ? await listDeveloperPortfolioProjects(dev.id) : [];

  // Developer Verified Skills (REAL from DB)
  const devSkills =
    user.role === "developer"
      ? (
          await query<{ name: string }>(
            `SELECT s.name 
               FROM developer_skills ds 
               JOIN skills s ON s.id = ds.skill_id 
               JOIN developers d ON d.id = ds.developer_id 
              WHERE d.user_id = ? 
              ORDER BY ds.sp DESC, ds.created_at ASC`,
            [user.id]
          )
        ).map((s) => s.name)
      : [];

  // Completed Assessments Count (REAL from DB)
  const assessmentCountRow =
    user.role === "developer" && dev && dev.id > 0
      ? await queryOne<{ count: number }>(
          "SELECT COUNT(*) as count FROM developer_assessment_sessions WHERE developer_id = ? AND status IN ('approved','completed')",
          [dev.id]
        )
      : null;
  const completedAssessmentsCount = assessmentCountRow?.count || (devSkills.length > 0 ? 1 : 0);

  // Client Projects (REAL from DB)
  const clientRecord = client && client.id > 0 ? client : (isOwnProfile ? await queryOne<{ id: number }>("SELECT id FROM clients WHERE user_id = ?", [user.id]) : null);
  const clientProjects = clientRecord
    ? await query<{
        id: number;
        title: string;
        description: string | null;
        budget_from: number | null;
        budget_to: number | null;
        deadline_days: number | null;
        skills_json: string[] | string | null;
        posted_at: Date;
        status: string;
      }>(
        "SELECT id, title, description, budget_from, budget_to, deadline_days, skills_json, posted_at, status FROM projects WHERE client_id = ? ORDER BY posted_at DESC",
        [clientRecord.id]
      )
    : [];

  const avatar = dev?.avatar_url ?? client?.avatar_url ?? null;
  const isCompany = client?.account_type === "company";
  const displayName = isCompany ? (client?.company_name || user.full_name) : (dev?.display_name || user.full_name);
  const canChat = viewer && viewer.userId !== user.id && viewer.role !== user.role;

  const completedProjectsCount = clientProjects.filter((p) => p.status === "completed").length;
  const clientTrustCalculated = Math.min(100, 50 + (completedProjectsCount * 10) + (isVerified ? 10 : 0));
  const trustScore = dev ? dev.trust_score : clientTrustCalculated;
  const skillPoints = dev ? dev.skill_points : 0;
  const headline = dev
    ? (dev.job_title || "Frontend Developer")
    : isCompany
    ? `شركة ${client?.industry ? `(${client.industry})` : "برمجية"}`
    : "صاحب عمل / عميل";
  const locationText = dev?.location || client?.location || "القاهرة، مصر";

  // ─── Live & Real Recent Activities ──────────────────────────────
  const activities: ActivityEvent[] = [];

  if (user.role === "developer" && dev && dev.id > 0) {
    // 1. Projects added
    const devProjects = await query<{ title: string; created_at: Date }>(
      "SELECT title, created_at FROM developer_projects WHERE developer_id = ? ORDER BY created_at DESC LIMIT 3",
      [dev.id]
    );
    for (const dp of devProjects) {
      activities.push({
        title: `أضفت مشروع "${dp.title}" إلى المعرض`,
        time: formatArabicRelativeTime(dp.created_at),
        timestamp: new Date(dp.created_at).getTime(),
        icon: FolderGit2,
      });
    }

    // 2. Reviews received on projects
    const devReviews = await query<{ rating: number; created_at: Date; full_name: string }>(
      `SELECT r.rating, r.created_at, u.full_name 
         FROM developer_project_reviews r 
         JOIN users u ON u.id = r.reviewer_user_id 
         JOIN developer_projects p ON p.id = r.project_id 
        WHERE p.developer_id = ? 
        ORDER BY r.created_at DESC LIMIT 3`,
      [dev.id]
    );
    for (const dr of devReviews) {
      activities.push({
        title: `تقييم جديد (${dr.rating} نجوم) من ${dr.full_name}`,
        time: formatArabicRelativeTime(dr.created_at),
        timestamp: new Date(dr.created_at).getTime(),
        icon: Users,
      });
    }

    // 3. Assessment sessions
    const devAssessments = await query<{ status: string; score: number | null; started_at: Date; submitted_at: Date | null }>(
      "SELECT status, score, started_at, submitted_at FROM developer_assessment_sessions WHERE developer_id = ? ORDER BY started_at DESC LIMIT 3",
      [dev.id]
    );
    for (const da of devAssessments) {
      if (da.status === "approved" || da.status === "completed") {
        activities.push({
          title: `اجتزت اختبار تقييم المهارات بنجاح${da.score ? ` (${da.score}%)` : ""}`,
          time: formatArabicRelativeTime(da.submitted_at || da.started_at),
          timestamp: new Date(da.submitted_at || da.started_at).getTime(),
          icon: CheckCircle2,
        });
      } else if (da.status === "in_progress") {
        activities.push({
          title: "بدأت جلسة تقييم مهارات برمجية",
          time: formatArabicRelativeTime(da.started_at),
          timestamp: new Date(da.started_at).getTime(),
          icon: CheckCircle2,
        });
      }
    }

    // 4. Proposals submitted
    const devProposals = await query<{ title: string; created_at: Date; status: string }>(
      `SELECT pr.title, p.created_at, p.status 
         FROM proposals p 
         JOIN projects pr ON pr.id = p.project_id 
        WHERE p.developer_id = ? 
        ORDER BY p.created_at DESC LIMIT 3`,
      [dev.id]
    );
    for (const dp of devProposals) {
      activities.push({
        title: `قدمت عرضاً على مشروع "${dp.title}"`,
        time: formatArabicRelativeTime(dp.created_at),
        timestamp: new Date(dp.created_at).getTime(),
        icon: Briefcase,
      });
    }
  }

  if (user.role === "client" && clientRecord && clientRecord.id > 0) {
    // 1. Projects posted
    for (const cp of clientProjects.slice(0, 3)) {
      activities.push({
        title: `نشرت مشروع "${cp.title}"`,
        time: formatArabicRelativeTime(cp.posted_at),
        timestamp: new Date(cp.posted_at).getTime(),
        icon: Briefcase,
      });
    }
  }

  // Support Tickets created
  const userTickets = await query<{ subject: string; created_at: Date }>(
    "SELECT subject, created_at FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 2",
    [user.id]
  );
  for (const ut of userTickets) {
    activities.push({
      title: `تذكرة دعم: "${ut.subject}"`,
      time: formatArabicRelativeTime(ut.created_at),
      timestamp: new Date(ut.created_at).getTime(),
      icon: CheckCircle2,
    });
  }

  // Account & Verification milestones
  if (isVerified) {
    activities.push({
      title: "تم توثيق الحساب ومنح شارة التحقق الرسمية",
      time: formatArabicRelativeTime(user.created_at),
      timestamp: new Date(user.created_at).getTime() + 1000,
      icon: ShieldCheck,
    });
  }

  activities.push({
    title: "تم إنشاء الحساب والانضمام إلى مجتمع Scora",
    time: formatArabicRelativeTime(user.created_at),
    timestamp: new Date(user.created_at).getTime(),
    icon: TrendingUp,
  });

  // Sort chronologically descending and pick top 4
  const recentActivities = activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 4);

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body" dir="rtl">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 sm:px-6 py-8 space-y-6">
        
        {/* ───────────────────────────────────────────────────────────── */}
        {/* TOP PROFILE HEADER BANNER CARD */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* User Info (Avatar + Details) */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full overflow-hidden border-2 border-[#D1E3D6] bg-[#E8FAF0] flex items-center justify-center text-[#056B38] font-black text-2xl sm:text-3xl shadow-2xs">
                  {avatar ? (
                    <img src={avatar} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span>{initialsOf(displayName)}</span>
                  )}
                </div>
                <AvatarStatusBadge lastSeenAt={user.last_seen_at} size="lg" />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-mono font-bold text-[#056B38] flex items-center gap-1.5">
                  <span>@{user.username}</span>
                  <span className="text-neutral-300">·</span>
                  <UserStatusIndicator lastSeenAt={user.last_seen_at} size="sm" showRelativeTime={true} />
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#05291A]">{displayName}</h1>
                  {isVerified && (
                    <VerifiedBadge
                      type={user.role === "developer" ? "developer" : isCompany ? "company" : "client"}
                      showLabel
                    />
                  )}
                </div>

                <div className="text-xs font-bold text-[#526B5E] flex items-center gap-2 flex-wrap pt-0.5">
                  <span>{headline}</span>
                  <span>|</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#056B38]" />
                    <span>{locationText}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right / Left Actions & Gauges */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 self-end lg:self-center">
              
              {/* Gauges Block */}
              {user.role === "developer" ? (
                <div className="flex items-center gap-6 bg-[#F7FAF8] p-3.5 rounded-2xl border border-[#D1E3D6]">
                  <CircularScoreGauge score={trustScore} />

                  <div className="flex flex-col items-center justify-center border-r border-[#D1E3D6] pr-6">
                    <div className="text-[11px] font-bold text-[#526B5E]">Skill Points (SP)</div>
                    <div className="mt-1 text-2xl font-black text-[#05291A] flex items-baseline gap-1">
                      <span>{skillPoints}</span>
                      <span className="text-xs font-bold text-[#526B5E]">SP</span>
                    </div>
                    <span className="mt-1 text-[10px] font-bold text-[#056B38] bg-[#E8FAF0] px-2 py-0.5 rounded-full border border-[#C5E8D1]">
                      +0 هذا الشهر
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 bg-[#F7FAF8] p-3.5 rounded-2xl border border-[#D1E3D6]">
                  <CircularScoreGauge score={trustScore} />
                  <div className="text-right pr-1">
                    <div className="text-[12px] font-black text-[#05291A]">موثوقية العميل (Trust)</div>
                    <div className="text-[10px] text-[#526B5E] max-w-[150px] leading-tight mt-0.5 font-bold">
                      {isOwnProfile
                        ? "يزداد معدل الموثوقية مع كل تسليم مشروع ناجح"
                        : trustScore >= 80
                        ? "عميل موثوق ومعتمد في المنصة"
                        : "حساب عميل معتمد في سكورا"}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-row sm:flex-col gap-2.5 justify-end">
                {isOwnProfile ? (
                  <>
                    {user.role === "developer" ? (
                      <Link
                        href="/portfolio/new"
                        className="rounded-xl bg-[#056B38] hover:bg-[#005B27] px-4 py-2.5 font-black text-white text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة مشروع</span>
                      </Link>
                    ) : (
                      <Link
                        href="/projects/new"
                        className="rounded-xl bg-[#056B38] hover:bg-[#005B27] px-4 py-2.5 font-black text-white text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>نشر مشروع جديد</span>
                      </Link>
                    )}

                    <Link
                      href="/settings?tab=profile"
                      className="rounded-xl border border-[#D1E3D6] bg-white hover:bg-[#F7FAF8] text-[#05291A] px-4 py-2.5 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#056B38]" />
                      <span>تعديل الملف</span>
                    </Link>
                  </>
                ) : (
                  canChat && (
                    <Link
                      href={user.username ? `/chat?with=${user.username}` : `/chat?with=${user.id}`}
                      className="rounded-xl bg-[#056B38] hover:bg-[#005B27] px-6 py-3 font-black text-white text-xs transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>بدء محادثة</span>
                    </Link>
                  )
                )}
              </div>

            </div>

          </div>

          {dev?.bio && (
            <p className="mt-6 text-xs sm:text-sm leading-relaxed text-[#526B5E] border-t border-neutral-100 pt-4 font-semibold">
              {dev.bio}
            </p>
          )}
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 4 BENTO METRIC CARDS ROW */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-[22px] border border-[#D1E3D6] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#526B5E] block">
                {user.role === "developer" ? "التقييمات المكتملة" : "المشاريع المطروحة"}
              </span>
              <span className="text-2xl font-black text-[#05291A] block">
                {user.role === "developer" ? completedAssessmentsCount : clientProjects.length}
              </span>
              <span className="text-[11px] text-[#526B5E] block">
                {user.role === "developer" ? "اختبار مكتمل" : "مشروع متاح"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 border border-[#C5E8D1]">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-[22px] border border-[#D1E3D6] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#526B5E] block">
                {user.role === "developer" ? "المشاريع المنشورة" : "المشاريع المكتملة"}
              </span>
              <span className="text-2xl font-black text-[#05291A] block">
                {user.role === "developer" ? portfolioProjects.length : clientProjects.filter(p => p.status === "completed").length}
              </span>
              <span className="text-[11px] text-[#526B5E] block">
                {user.role === "developer" ? "مشروع منشور" : "تم تسليمه"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 border border-[#C5E8D1]">
              <FolderGit2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-[22px] border border-[#D1E3D6] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#526B5E] block">
                {user.role === "developer" ? "Skill Points (SP)" : "المشاريع المفتوحة"}
              </span>
              <span className="text-2xl font-black text-[#05291A] block">
                {user.role === "developer" ? skillPoints : clientProjects.filter(p => p.status === "open").length}
              </span>
              <span className="text-[11px] text-[#056B38] font-bold block">
                {user.role === "developer" ? "+0 هذا الشهر" : "مشروع متاح للتنفيذ"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 border border-[#C5E8D1]">
              {user.role === "developer" ? <Star className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-5 rounded-[22px] border border-[#D1E3D6] shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-[#526B5E] block">Trust Score</span>
              <span className="text-2xl font-black text-[#05291A] block">{trustScore}%</span>
              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 inline-block">
                {trustScore >= 80 ? "مرتفع" : trustScore >= 50 ? "متوسط" : "مبتدئ"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 border border-[#C5E8D1]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* SHOWCASE SECTION (Projects / Portfolio) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-[#D1E3D6] shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#05291A]">
                {user.role === "developer" ? "المشاريع والأعمال البرمجية" : "المشاريع وفرص العمل المطروحة"}
              </h2>
              <p className="text-xs text-[#526B5E] mt-0.5">
                {user.role === "developer"
                  ? "المشاريع المنشورة بواسطة المطور. يمكنك تقديمها للتقييم والتعليق عليها لدعم رصيد الـ SP الخاص بك."
                  : "المشاريع المنشورة من قبل صاحب العمل للتعاقد والتنفيذ بواسطة مطوري سكورا المعتمدين."}
              </p>
            </div>

            {isOwnProfile && (
              <Link
                href={user.role === "developer" ? "/portfolio/new" : "/projects/new"}
                className="px-4 py-2 rounded-xl bg-[#E8FAF0] hover:bg-[#D4F5E0] text-[#056B38] border border-[#C5E8D1] text-xs font-black transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{user.role === "developer" ? "إضافة مشروع جديد" : "نشر مشروع جديد"}</span>
              </Link>
            )}
          </div>

          {user.role === "developer" ? (
            portfolioProjects.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#D1E3D6] bg-[#F7FAF8] p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center mx-auto border border-[#C5E8D1]">
                  <Code2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-[#05291A]">لا توجد مشاريع بعد</h3>
                  <p className="text-xs text-[#526B5E] max-w-md mx-auto leading-relaxed">
                    قم بإضافة مشاريعك ونماذج أعمالك لتقييمها من قبل الزوار والعملاء والحصول على نقاط مهارة (SP) إضافية.
                  </p>
                </div>
                {isOwnProfile && (
                  <div className="pt-2">
                    <Link
                      href="/portfolio/new"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>إضافة أول مشروع الآن</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {portfolioProjects.map((p) => (
                  <Link
                    href={`/portfolio/${p.id}`}
                    key={p.id}
                    className="group rounded-[24px] border border-[#D1E3D6] bg-white overflow-hidden transition-all hover:border-[#056B38] hover:shadow-md flex flex-col justify-between"
                  >
                    {p.coverImageUrl ? (
                      <div className="h-48 w-full overflow-hidden bg-neutral-100 border-b border-[#D1E3D6]">
                        <img
                          src={p.coverImageUrl}
                          alt={p.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="h-32 w-full bg-gradient-to-br from-[#E8FAF0] to-[#F7FAF8] border-b border-[#D1E3D6] flex items-center justify-center text-[#056B38]">
                        <Layers className="w-10 h-10 opacity-40" />
                      </div>
                    )}

                    <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-black text-[#05291A] group-hover:text-[#056B38] transition-colors">
                            {p.title}
                          </h3>
                          {p.previewUrl && (
                            <ExternalLink className="w-4 h-4 text-[#526B5E] opacity-60 group-hover:opacity-100" />
                          )}
                        </div>

                        {p.description && (
                          <p className="mt-2 line-clamp-2 text-xs text-[#526B5E] leading-relaxed">
                            {p.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{p.averageRating > 0 ? p.averageRating : "جديد"}</span>
                          <span className="text-[10px] text-amber-900/60">({p.reviewCount} تقييم)</span>
                        </div>

                        {p.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {p.technologies.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="rounded-full bg-[#F0F5F2] text-[#056B38] px-2 py-0.5 text-[11px] font-bold"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            /* Client Projects List */
            clientProjects.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-[#D1E3D6] bg-[#F7FAF8] p-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center mx-auto border border-[#C5E8D1]">
                  <Briefcase className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-[#05291A]">لا توجد مشاريع مفتوحة بعد</h3>
                  <p className="text-xs text-[#526B5E] max-w-md mx-auto leading-relaxed">
                    اطرح مشاريعك البرمجية لاستقبال عروض العمل من نخبة المطورين المعتمدين في مصر.
                  </p>
                </div>
                {isOwnProfile && (
                  <div className="pt-2">
                    <Link
                      href="/projects/new"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-xs transition-all shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>نشر أول مشروع الآن</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {clientProjects.map((p) => {
                  let skills: string[] = [];
                  try {
                    skills = Array.isArray(p.skills_json)
                      ? p.skills_json
                      : JSON.parse(p.skills_json || "[]");
                  } catch {}

                  return (
                    <Link
                      href={`/projects/${p.id}`}
                      key={p.id}
                      className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 transition hover:border-[#056B38] hover:shadow-md"
                    >
                      <h3 className="text-base font-extrabold text-[#05291A]">{p.title}</h3>
                      <p className="mt-2 line-clamp-3 text-xs text-[#526B5E] leading-relaxed">{p.description}</p>
                      <div className="mt-4 font-bold text-xs text-[#056B38]">
                        {budget(p.budget_from, p.budget_to)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {skills.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-[#F0F5F2] text-[#056B38] px-2.5 py-0.5 text-[11px] font-bold"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )
          )}
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* BOTTOM TWO-COLUMN SECTION (Passport + Recent Activities) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6">
          
          {/* Column 1: Passport (Dev) OR Client Trust History (Client) */}
          <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-[#D1E3D6] shadow-xs space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-[#05291A]">
                    {user.role === "developer"
                      ? "Developer Passport"
                      : isCompany
                      ? "بطاقة توثيق واعتماد الشركة"
                      : "سجل توثيق العميل (Client Profile)"}
                  </h2>
                  <p className="text-xs text-[#526B5E] mt-0.5">
                    {user.role === "developer"
                      ? "ملفك المهني على Scora الذي يعكس مهاراتك وثقتك وتطورك المستمر."
                      : "سجل اعتمادات الحساب وتوثيقات المنصة وإنجاز المشاريع المكتملة."}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {isOwnProfile && user.role === "developer" && !isDevVerified && (
                    <RequestVerificationButton trustScore={trustScore} />
                  )}

                  <Link
                    href={isOwnProfile ? "/settings?tab=profile" : `#`}
                    className="px-3 py-1.5 rounded-xl border border-[#D1E3D6] text-xs font-bold text-[#05291A] hover:bg-[#F7FAF8] flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <span>{isOwnProfile ? "تعديل" : "عرض الملف"}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#526B5E]" />
                  </Link>
                </div>
              </div>

              {/* Metrics Banner */}
              {user.role === "developer" ? (
                <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] grid grid-cols-3 text-center divide-x divide-x-reverse divide-[#D1E3D6]">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#526B5E] block">Trust Score</span>
                    <span className="text-base font-black text-[#05291A] block">{trustScore}%</span>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                      {trustScore >= 80 ? "مرتفع" : trustScore >= 50 ? "متوسط" : "مبتدئ"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#526B5E] block">Skill Points</span>
                    <span className="text-base font-black text-[#05291A] block">{skillPoints}</span>
                    <span className="text-[10px] font-bold text-[#056B38] block">+0 هذا الشهر</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#526B5E] block">Verified Skills</span>
                    <span className="text-base font-black text-[#05291A] block">{devSkills.length}</span>
                    <span className="text-[10px] text-[#526B5E] block">مهارات موثقة</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] grid grid-cols-3 text-center divide-x divide-x-reverse divide-[#D1E3D6]">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#526B5E] block">Trust Score</span>
                    <span className="text-base font-black text-[#05291A] block">{trustScore}%</span>
                    <span className="text-[10px] font-bold bg-[#E8FAF0] text-[#056B38] px-2 py-0.5 rounded-full border border-[#D1E3D6]">
                      {isOwnProfile ? "يزداد مع تسليم المشاريع" : trustScore >= 80 ? "موثوقية عالية" : "حساب معتمد"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#526B5E] block">المشاريع المكتملة</span>
                    <span className="text-base font-black text-[#05291A] block">{completedProjectsCount}</span>
                    <span className="text-[10px] font-bold text-[#056B38] block">تم تسليمها بنجاح</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#526B5E] block">حالة التوثيق</span>
                    <span className="text-base font-black text-[#05291A] block">
                      {isVerified ? "موثق" : "نشط"}
                    </span>
                    <span className="text-[10px] text-[#526B5E] block">
                      حساب معتمد
                    </span>
                  </div>
                </div>
              )}

              {/* Verified Skills / Tags */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-black text-[#05291A] block">
                  {user.role === "developer" ? "المهارات الموثقة" : "مجالات التخصص ونشاط المشاريع"}
                </span>
                
                {user.role === "developer" ? (
                  devSkills.length === 0 ? (
                    <div className="text-xs text-[#526B5E] p-4 bg-[#F7FAF8] rounded-2xl border border-dashed border-[#D1E3D6] text-center">
                      لم تتم إضافة مهارات موثقة بعد. يمكنك إضافتها من صفحة تعديل الملف.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {devSkills.map((skill) => (
                        <span
                          key={skill}
                          className="bg-[#F7FAF8] border border-[#D1E3D6] text-[#05291A] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:border-[#056B38] transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#056B38]" />
                          <span>{skill}</span>
                        </span>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {[client?.industry || "تكنولوجيا المعلومات وتطوير البرمجيات", "إدارة وتوظيف المشاريع", "حساب دفع وضمان معتمد"].map((skill) => (
                      <span
                        key={skill}
                        className="bg-[#F7FAF8] border border-[#D1E3D6] text-[#05291A] px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#056B38]" />
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Column 2: Recent Activities */}
          <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-[#D1E3D6] shadow-xs space-y-5 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black text-[#05291A] mb-4">آخر النشاطات</h2>
              <div className="space-y-3.5">
                {recentActivities.map((act, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs pb-3 border-b border-neutral-100 last:border-0 last:pb-0"
                  >
                    <span className="text-[#526B5E] text-[11px] font-bold">{act.time}</span>
                    <div className="flex items-center gap-2 font-bold text-[#05291A]">
                      <span>{act.title}</span>
                      <div className="w-7 h-7 rounded-lg bg-[#E8FAF0] text-[#056B38] flex items-center justify-center shrink-0 border border-[#C5E8D1]">
                        <act.icon className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="text-xs font-bold text-[#056B38] hover:underline flex items-center gap-1 pt-2 self-start"
            >
              <span>عرض كل النشاطات</span>
              <span>←</span>
            </Link>
          </section>

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
