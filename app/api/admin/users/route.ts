import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import type { AccountStatus, AppRole } from "@/lib/types";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const rows = await query<{
    id: number;
    username: string;
    email: string;
    full_name: string;
    phone: string | null;
    role: AppRole;
    is_admin: 0 | 1;
    status: AccountStatus;
    created_at: Date;
    last_seen_at: Date | null;
    suspended_until: Date | null;
    dev_id: number | null;
    skill_points: number | null;
    trust_score: number | null;
    approval_status: string | null;
    rejection_reason: string | null;
    is_verified: 0 | 1 | null;
    job_title: string | null;
    headline: string | null;
    bio: string | null;
    country: string | null;
    city: string | null;
    location: string | null;
    experience_years: number | null;
    github_url: string | null;
    linkedin_url: string | null;
    portfolio_url: string | null;
    company_name: string | null;
    client_website: string | null;
    assessment_public_id: string | null;
    assessment_session_status: string | null;
    reassessment_request_id: number | null;
    reassessment_status: string | null;
    reassessment_note: string | null;
    reports_count: number;
    projects_count: number;
    proposals_count: number;
  }>(`
    SELECT 
      u.id, u.username, u.email, u.full_name, u.phone, u.role, u.is_admin, u.status, u.created_at, u.last_seen_at, u.suspended_until,
      d.id as dev_id, d.skill_points, d.trust_score, d.approval_status, d.rejection_reason,
      COALESCE(u.is_verified, d.is_verified, c.is_verified, 0) as is_verified,
      d.job_title, d.headline, d.bio, d.country, d.city, d.location, d.experience_years,
      d.github_url, d.linkedin_url, d.portfolio_url,
      c.company_name, c.website as client_website,
      (SELECT das.public_id FROM developer_assessment_sessions das
       WHERE das.developer_id=d.id AND das.status IN ('admin_review','approved','rejected')
       ORDER BY FIELD(das.status,'admin_review','approved','rejected'), das.submitted_at DESC, das.id DESC
       LIMIT 1) assessment_public_id,
      (SELECT das.status FROM developer_assessment_sessions das WHERE das.developer_id=d.id ORDER BY das.id DESC LIMIT 1) assessment_session_status,
      (SELECT rr.id FROM developer_reassessment_requests rr WHERE rr.developer_id=d.id ORDER BY rr.id DESC LIMIT 1) reassessment_request_id,
      (SELECT rr.status FROM developer_reassessment_requests rr WHERE rr.developer_id=d.id ORDER BY rr.id DESC LIMIT 1) reassessment_status,
      (SELECT rr.note FROM developer_reassessment_requests rr WHERE rr.developer_id=d.id ORDER BY rr.id DESC LIMIT 1) reassessment_note,
      (SELECT COUNT(*) FROM support_tickets st WHERE st.reported_user_id = u.id) reports_count,
      (SELECT COUNT(*) FROM projects p JOIN clients cl ON cl.id=p.client_id WHERE cl.user_id = u.id) projects_count,
      (SELECT COUNT(*) FROM proposals pr JOIN developers dev ON dev.id=pr.developer_id WHERE dev.user_id = u.id) proposals_count
    FROM users u
    LEFT JOIN developers d ON d.user_id = u.id
    LEFT JOIN clients c ON c.user_id = u.id
    ORDER BY u.id DESC
  `);

  // Fetch developer skills for all developers in one go
  const devSkillsRows = await query<{
    developer_id: number;
    skill_name: string;
    skill_name_ar: string | null;
    level: string;
    sp: number;
  }>(`
    SELECT ds.developer_id, s.name as skill_name, s.name_ar as skill_name_ar, ds.level, ds.sp
    FROM developer_skills ds
    JOIN skills s ON s.id = ds.skill_id
  `);

  const devSkillsMap = new Map<number, { name: string; nameAr: string | null; level: string; sp: number }[]>();
  for (const ds of devSkillsRows) {
    const list = devSkillsMap.get(ds.developer_id) || [];
    list.push({
      name: ds.skill_name,
      nameAr: ds.skill_name_ar,
      level: ds.level,
      sp: Number(ds.sp),
    });
    devSkillsMap.set(ds.developer_id, list);
  }

  const now = Date.now();

  return NextResponse.json(
    rows.map((row) => {
      const joined = new Date(row.created_at).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const lastSeenTime = row.last_seen_at ? new Date(row.last_seen_at).getTime() : null;
      const isOnline = Boolean(lastSeenTime && now - lastSeenTime <= 15 * 60 * 1000);

      const skills = row.dev_id ? devSkillsMap.get(row.dev_id) || [] : [];

      return {
        id: String(row.id),
        username: row.username,
        name: row.full_name,
        email: row.email,
        phone: row.phone ?? "",
        role: row.role,
        isAdmin: Boolean(row.is_admin),
        status: row.status,
        skillPoints: Number(row.skill_points ?? 0),
        trustScore: Number(row.trust_score ?? 0),
        reportsCount: Number(row.reports_count),
        projectsCount: Number(row.projects_count),
        proposalsCount: Number(row.proposals_count),
        joinDate: joined,
        joinedDate: joined,
        createdAt: new Date(row.created_at).toISOString(),
        lastSeenAt: row.last_seen_at ? new Date(row.last_seen_at).toISOString() : null,
        isOnline,
        isVerified: Boolean(row.is_verified),
        jobTitle: row.job_title ?? "",
        headline: row.headline ?? "",
        bio: row.bio ?? "",
        country: row.country ?? "",
        city: row.city ?? "",
        location: row.location ?? "",
        experienceYears: row.experience_years !== null ? Number(row.experience_years) : null,
        githubUrl: row.github_url ?? "",
        linkedinUrl: row.linkedin_url ?? "",
        portfolioUrl: row.portfolio_url ?? "",
        companyName: row.company_name ?? "",
        clientWebsite: row.client_website ?? "",
        approvalStatus: row.approval_status,
        rejectionReason: row.rejection_reason,
        assessmentPublicId: row.assessment_public_id,
        assessmentSessionStatus: row.assessment_session_status,
        reassessmentRequestId: row.reassessment_request_id,
        reassessmentStatus: row.reassessment_status,
        reassessmentNote: row.reassessment_note,
        suspendedUntil: row.suspended_until ? new Date(row.suspended_until).toISOString() : null,
        skills,
      };
    })
  );
}
