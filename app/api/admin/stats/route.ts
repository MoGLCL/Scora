import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { query, queryOne } from "@/lib/db";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  // 1. Core Summary Totals
  const totals = await queryOne<{
    users: number;
    developers: number;
    clients: number;
    admins: number;
    active_accounts: number;
    online_now: number;
    suspended_accounts: number;
    banned_accounts: number;
    pending_reviews: number;
    pending_reassessments: number;
    verified_developers: number;
    projects: number;
    open_projects: number;
    in_progress_projects: number;
    completed_projects: number;
    closed_projects: number;
    proposals: number;
    visits: number;
    visitors: number;
    assessments_count: number;
    reviews_count: number;
  }>(
    `SELECT 
      (SELECT COUNT(*) FROM users) as users,
      (SELECT COUNT(*) FROM users WHERE role='developer') as developers,
      (SELECT COUNT(*) FROM users WHERE role='client') as clients,
      (SELECT COUNT(*) FROM users WHERE is_admin=1) as admins,
      (SELECT COUNT(*) FROM users WHERE status='active') as active_accounts,
      (SELECT COUNT(*) FROM users WHERE last_seen_at >= NOW() - INTERVAL 15 MINUTE) as online_now,
      (SELECT COUNT(*) FROM users WHERE status='suspended') as suspended_accounts,
      (SELECT COUNT(*) FROM users WHERE status='banned') as banned_accounts,
      (SELECT COUNT(*) FROM developers WHERE approval_status='admin_review') as pending_reviews,
      (SELECT COUNT(*) FROM developer_reassessment_requests WHERE status='pending') as pending_reassessments,
      (SELECT COUNT(*) FROM developers WHERE is_verified=1) as verified_developers,
      (SELECT COUNT(*) FROM projects) as projects,
      (SELECT COUNT(*) FROM projects WHERE status='open') as open_projects,
      (SELECT COUNT(*) FROM projects WHERE status='in_progress') as in_progress_projects,
      (SELECT COUNT(*) FROM projects WHERE status='completed') as completed_projects,
      (SELECT COUNT(*) FROM projects WHERE status='closed') as closed_projects,
      (SELECT COUNT(*) FROM proposals) as proposals,
      (SELECT COUNT(*) FROM page_views) as visits,
      (SELECT COUNT(DISTINCT COALESCE(user_id, CONCAT('guest-', id))) FROM page_views) as visitors,
      (SELECT COUNT(*) FROM developer_assessment_sessions) as assessments_count,
      (SELECT COUNT(*) FROM reviews) as reviews_count`
  );

  // 2. Daily Page Views & Visitors (Last 30 Days)
  const viewsRows = await query<{ day: string; visits: number; visitors: number }>(
    `SELECT DATE_FORMAT(viewed_at, '%Y-%m-%d') as day,
            COUNT(*) as visits,
            COUNT(DISTINCT COALESCE(user_id, CONCAT('guest-', id))) as visitors
     FROM page_views
     WHERE viewed_at >= CURDATE() - INTERVAL 30 DAY
     GROUP BY DATE_FORMAT(viewed_at, '%Y-%m-%d')
     ORDER BY day ASC`
  );

  // 3. Daily User Registrations (Last 30 Days)
  const usersRows = await query<{ day: string; new_users: number }>(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day,
            COUNT(*) as new_users
     FROM users
     WHERE created_at >= CURDATE() - INTERVAL 30 DAY
     GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
     ORDER BY day ASC`
  );

  // 4. Daily Projects Posted (Last 30 Days)
  const projectsRows = await query<{ day: string; new_projects: number }>(
    `SELECT DATE_FORMAT(posted_at, '%Y-%m-%d') as day,
            COUNT(*) as new_projects
     FROM projects
     WHERE posted_at >= CURDATE() - INTERVAL 30 DAY
     GROUP BY DATE_FORMAT(posted_at, '%Y-%m-%d')
     ORDER BY day ASC`
  );

  // 5. Daily Proposals Submitted (Last 30 Days)
  const proposalsRows = await query<{ day: string; new_proposals: number }>(
    `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day,
            COUNT(*) as new_proposals
     FROM proposals
     WHERE created_at >= CURDATE() - INTERVAL 30 DAY
     GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
     ORDER BY day ASC`
  );

  // 6. Build Continuous 30-Day Timeline (Fill missing days with 0s)
  const viewsMap = new Map(viewsRows.map((r) => [r.day, { visits: Number(r.visits), visitors: Number(r.visitors) }]));
  const usersMap = new Map(usersRows.map((r) => [r.day, Number(r.new_users)]));
  const projectsMap = new Map(projectsRows.map((r) => [r.day, Number(r.new_projects)]));
  const proposalsMap = new Map(proposalsRows.map((r) => [r.day, Number(r.new_proposals)]));

  const timeline: {
    day: string;
    formattedDate: string;
    visits: number;
    visitors: number;
    newUsers: number;
    newProjects: number;
    newProposals: number;
  }[] = [];

  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    const viewData = viewsMap.get(dayStr) || { visits: 0, visitors: 0 };
    const newUsers = usersMap.get(dayStr) || 0;
    const newProjects = projectsMap.get(dayStr) || 0;
    const newProposals = proposalsMap.get(dayStr) || 0;

    const formattedDate = d.toLocaleDateString("ar-EG", {
      month: "short",
      day: "numeric",
    });

    timeline.push({
      day: dayStr,
      formattedDate,
      visits: viewData.visits,
      visitors: viewData.visitors,
      newUsers,
      newProjects,
      newProposals,
    });
  }

  // 7. Top Visited Platform Paths
  const topPaths = await query<{ path: string; visits: number; visitors: number }>(
    `SELECT path,
            COUNT(*) as visits,
            COUNT(DISTINCT COALESCE(user_id, CONCAT('guest-', id))) as visitors
     FROM page_views
     GROUP BY path
     ORDER BY visits DESC
     LIMIT 8`
  );

  // 8. Hourly visits for today
  const hourlyRows = await query<{ hour: number; visits: number }>(
    `SELECT HOUR(viewed_at) as hour, COUNT(*) as visits
     FROM page_views
     WHERE DATE(viewed_at) = CURDATE()
     GROUP BY HOUR(viewed_at)
     ORDER BY hour ASC`
  );
  const hourlyMap = new Map(hourlyRows.map((r) => [Number(r.hour), Number(r.visits)]));
  const hourlyToday = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    hourLabel: `${h}:00`,
    visits: hourlyMap.get(h) || 0,
  }));

  // 9. Categories Breakdown
  const categoriesRows = await query<{ category: string | null; count: number }>(
    `SELECT COALESCE(category, 'أخرى') as category, COUNT(*) as count
     FROM projects
     GROUP BY COALESCE(category, 'أخرى')
     ORDER BY count DESC`
  );

  // 10. Platform Settings
  const settingsRows = await query<{ setting_key: string; setting_value: string }>(
    "SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('ai_assistant_enabled','quick_registration_enabled')"
  );
  const settings = Object.fromEntries(settingsRows.map((row) => [row.setting_key, row.setting_value !== "false"]));

  return NextResponse.json({
    totals: totals
      ? {
          users: Number(totals.users),
          developers: Number(totals.developers),
          clients: Number(totals.clients),
          admins: Number(totals.admins),
          active_accounts: Number(totals.active_accounts),
          online_now: Number(totals.online_now),
          suspended_accounts: Number(totals.suspended_accounts),
          banned_accounts: Number(totals.banned_accounts),
          pending_reviews: Number(totals.pending_reviews),
          pending_reassessments: Number(totals.pending_reassessments),
          verified_developers: Number(totals.verified_developers),
          projects: Number(totals.projects),
          open_projects: Number(totals.open_projects),
          in_progress_projects: Number(totals.in_progress_projects),
          completed_projects: Number(totals.completed_projects),
          closed_projects: Number(totals.closed_projects),
          proposals: Number(totals.proposals),
          visits: Number(totals.visits),
          visitors: Number(totals.visitors),
          assessments_count: Number(totals.assessments_count),
          reviews_count: Number(totals.reviews_count),
        }
      : {
          users: 0,
          developers: 0,
          clients: 0,
          admins: 0,
          active_accounts: 0,
          online_now: 0,
          suspended_accounts: 0,
          banned_accounts: 0,
          pending_reviews: 0,
          pending_reassessments: 0,
          verified_developers: 0,
          projects: 0,
          open_projects: 0,
          in_progress_projects: 0,
          completed_projects: 0,
          closed_projects: 0,
          proposals: 0,
          visits: 0,
          visitors: 0,
          assessments_count: 0,
          reviews_count: 0,
        },
    timeline,
    topPaths: topPaths.map((p) => ({
      path: p.path,
      visits: Number(p.visits),
      visitors: Number(p.visitors),
    })),
    hourlyToday,
    categories: categoriesRows.map((c) => ({
      category: c.category || "أخرى",
      count: Number(c.count),
    })),
    settings,
  });
}
