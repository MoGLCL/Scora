import "server-only";

import { cache } from "react";
import { query, queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";
import type {
  ClientRow,
  DeveloperCard,
  DeveloperRow,
  ProjectCard,
  ProjectRow,
  ProposalRow,
  UserRow,
} from "@/lib/types";
import type { PortfolioProjectDetail, PortfolioProjectSummary } from "@/lib/portfolio-types";

/**
 * Data Access Layer.
 *
 * Every read that depends on "who is asking" goes through verifySession()
 * rather than trusting a client-supplied id. Session lookups are memoized per
 * render pass with React's cache() so a page with several server components
 * verifies once, not once per component.
 */

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;
  const user = await queryOne<{ id: number; username: string | null; role: UserRow["role"]; status: UserRow["status"]; suspended_until: Date | null; is_admin: 0 | 1; onboarding_completed_at: Date | null; approval_status: string | null }>(
    "SELECT u.id, u.username, u.role, u.status, u.suspended_until, u.is_admin, u.onboarding_completed_at, d.approval_status FROM users u LEFT JOIN developers d ON d.user_id=u.id WHERE u.id = ?",
    [session.userId]
  );
  if (!user || user.status === "banned") return null;
  if (user.status === "suspended") {
    const until = user.suspended_until;
    if (!until || new Date(until).getTime() > Date.now()) return null;
    await import("@/lib/db").then(({ execute }) => execute("UPDATE users SET status='active', suspended_until=NULL WHERE id=?", [user.id]));
  }
  return {
    userId: user.id,
    username: user.username || null,
    role: user.role,
    isAdmin: Boolean(user.is_admin),
    onboardingCompleted: Boolean(user.onboarding_completed_at),
    developerApprovalStatus: user.role === "developer" ? (user.approval_status ?? "profile_incomplete") : null,
  };
});

export const getCurrentUser = cache(async (): Promise<UserRow | null> => {
  const session = await verifySession();
  if (!session) return null;
  return queryOne<UserRow>(
    "SELECT id, email, password_hash, full_name, username, phone, phone_verified, role, is_verified, is_admin, status, suspended_until, last_login_at, onboarding_completed_at, created_at, updated_at FROM users WHERE id = ?",
    [session.userId]
  );
});

export const getCurrentDeveloper = cache(async (): Promise<DeveloperRow | null> => {
  const session = await verifySession();
  if (!session) return null;
  return queryOne<DeveloperRow>("SELECT * FROM developers WHERE user_id = ?", [
    session.userId,
  ]);
});

export const getCurrentClient = cache(async (): Promise<ClientRow | null> => {
  const session = await verifySession();
  if (!session) return null;
  return queryOne<ClientRow>("SELECT * FROM clients WHERE user_id = ?", [
    session.userId,
  ]);
});

// ─── Public reads ─────────────────────────────────────────────────────────

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function trustLevelOf(score: number): "high" | "medium" | "low" {
  if (score >= 85) return "high";
  if (score >= 65) return "medium";
  return "low";
}

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "متاح دلوقتي",
  soon: "متاح قريبًا",
  busy: "مشغول حاليًا",
};

export async function listDevelopers(): Promise<DeveloperCard[]> {
    const rows = await query<DeveloperRow & { skills: string | null; last_seen_at: Date | null }>(
      `SELECT d.*,
              u.last_seen_at,
              GROUP_CONCAT(s.name ORDER BY ds.sp DESC SEPARATOR ',') AS skills
       FROM developers d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN developer_skills ds ON ds.developer_id = d.id
       LEFT JOIN skills s ON s.id = ds.skill_id
       WHERE u.status = 'active' AND u.onboarding_completed_at IS NOT NULL AND d.approval_status='approved'
       GROUP BY d.id
       ORDER BY d.trust_score DESC, d.skill_points DESC`
    );

    return rows.map((r) => ({
      id: String(r.id),
      userId: r.user_id,
      initials: initialsOf(r.display_name),
      name: r.display_name,
      isVerified: r.trust_score >= 90 ? r.is_verified !== 0 : r.is_verified === 1,
      role: r.job_title ?? "",
      location: r.location ?? r.city ?? "",
      experience: r.experience_years ? `خبرة ${r.experience_years} سنين` : "",
      trustScore: r.trust_score,
      skillPoints: r.skill_points,
      trustLevel: trustLevelOf(r.trust_score),
      skills: r.skills ? r.skills.split(",").filter(Boolean) : [],
      availability: AVAILABILITY_LABEL[r.availability] ?? "",
      availabilityType: r.availability,
      avatarUrl: r.avatar_url,
      lastSeenAt: r.last_seen_at,
    }));
}

export async function getDeveloperById(id: number) {
  const dev = await queryOne<DeveloperRow>("SELECT * FROM developers WHERE id = ?", [id]);
  if (!dev) return null;
  const skills = await query<{ name: string }>(
    `SELECT s.name FROM developer_skills ds
     JOIN skills s ON s.id = ds.skill_id
     WHERE ds.developer_id = ? ORDER BY ds.sp DESC`,
    [id]
  );
  return {
    ...dev,
    skills: skills.map((s) => s.name),
    portfolioProjects: await listDeveloperPortfolioProjects(id),
  };
}

export async function listDeveloperPortfolioProjects(developerId: number): Promise<PortfolioProjectSummary[]> {
  const rows = await query<{
    id: number;
    title: string;
    description: string | null;
    preview_url: string | null;
    github_url: string | null;
    is_open_source: number | boolean;
    project_status: "completed" | "in_progress";
    execution_time: string | null;
    start_date: string | null;
    technologies_json: string | null;
    cover_image_url: string | null;
    average_rating: number | string | null;
    review_count: number | string;
    created_at: Date;
  }>(
    `SELECT dp.id, dp.title, dp.description, dp.preview_url, dp.github_url, dp.is_open_source,
            dp.project_status, dp.execution_time, dp.start_date, dp.technologies_json,
            (SELECT dpi.url FROM developer_project_images dpi WHERE dpi.project_id = dp.id ORDER BY dpi.sort_order, dpi.id LIMIT 1) AS cover_image_url,
            COALESCE(AVG(dpr.rating), 0) AS average_rating,
            COUNT(dpr.id) AS review_count,
            dp.created_at
     FROM developer_projects dp
     LEFT JOIN developer_project_reviews dpr ON dpr.project_id = dp.id
     WHERE dp.developer_id = ?
     GROUP BY dp.id
     ORDER BY dp.created_at DESC`,
    [developerId]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    description: row.description,
    previewUrl: row.preview_url,
    githubUrl: row.github_url,
    isOpenSource: Boolean(row.is_open_source),
    projectStatus: row.project_status || "completed",
    executionTime: row.execution_time,
    startDate: row.start_date,
    technologies: parseJsonList(row.technologies_json),
    coverImageUrl: row.cover_image_url,
    averageRating: Number(Number(row.average_rating ?? 0).toFixed(1)),
    reviewCount: Number(row.review_count),
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function getPortfolioProject(projectId: number, viewerUserId?: number | null): Promise<PortfolioProjectDetail | null> {
  const row = await queryOne<{
    id: number;
    developer_id: number;
    developer_user_id: number;
    developer_name: string;
    developer_username: string | null;
    developer_avatar_url: string | null;
    title: string;
    description: string | null;
    preview_url: string | null;
    github_url: string | null;
    is_open_source: number | boolean;
    project_status: "completed" | "in_progress";
    execution_time: string | null;
    start_date: string | null;
    technologies_json: string | null;
    average_rating: number | string | null;
    review_count: number | string;
    created_at: Date;
  }>(
    `SELECT dp.id, dp.developer_id, d.user_id AS developer_user_id, d.display_name AS developer_name,
            u.username AS developer_username, d.avatar_url AS developer_avatar_url,
            dp.title, dp.description, dp.preview_url, dp.github_url, dp.is_open_source,
            dp.project_status, dp.execution_time, dp.start_date, dp.technologies_json,
            COALESCE(AVG(dpr.rating), 0) AS average_rating, COUNT(dpr.id) AS review_count, dp.created_at
     FROM developer_projects dp
     JOIN developers d ON d.id = dp.developer_id
     JOIN users u ON u.id = d.user_id
     LEFT JOIN developer_project_reviews dpr ON dpr.project_id = dp.id
     WHERE dp.id = ?
     GROUP BY dp.id`,
    [projectId]
  );
  if (!row) return null;

  const [images, reviews, currentReview] = await Promise.all([
    query<{ id: number; url: string; alt_text: string | null }>(
      "SELECT id, url, alt_text FROM developer_project_images WHERE project_id = ? ORDER BY sort_order, id",
      [projectId]
    ),
    query<{
      id: number;
      rating: number;
      comment: string | null;
      reviewer_name: string;
      reviewer_role: string;
      reviewer_avatar_url: string | null;
      created_at: Date;
    }>(
      `SELECT dpr.id, dpr.rating, dpr.comment, u.full_name AS reviewer_name,
              CASE WHEN u.role = 'client' THEN COALESCE(c.company_name, 'عميل') ELSE COALESCE(d.job_title, 'مطور') END AS reviewer_role,
              CASE WHEN u.role = 'client' THEN c.avatar_url ELSE d.avatar_url END AS reviewer_avatar_url,
              dpr.created_at
       FROM developer_project_reviews dpr
       JOIN users u ON u.id = dpr.reviewer_user_id
       LEFT JOIN clients c ON c.user_id = u.id
       LEFT JOIN developers d ON d.user_id = u.id
       WHERE dpr.project_id = ? ORDER BY dpr.created_at DESC`,
      [projectId]
    ),
    viewerUserId
      ? queryOne<{ rating: number; comment: string | null }>(
          "SELECT rating, comment FROM developer_project_reviews WHERE project_id = ? AND reviewer_user_id = ?",
          [projectId, viewerUserId]
        )
      : Promise.resolve(null),
  ]);

  return {
    id: Number(row.id),
    developerId: Number(row.developer_id),
    developerUserId: Number(row.developer_user_id),
    developerName: row.developer_name,
    developerUsername: row.developer_username,
    developerAvatarUrl: row.developer_avatar_url,
    title: row.title,
    description: row.description,
    previewUrl: row.preview_url,
    githubUrl: row.github_url,
    isOpenSource: Boolean(row.is_open_source),
    projectStatus: row.project_status || "completed",
    executionTime: row.execution_time,
    startDate: row.start_date,
    technologies: parseJsonList(row.technologies_json),
    coverImageUrl: images[0]?.url ?? null,
    averageRating: Number(Number(row.average_rating ?? 0).toFixed(1)),
    reviewCount: Number(row.review_count),
    createdAt: new Date(row.created_at).toISOString(),
    images: images.map((image) => ({ id: Number(image.id), url: image.url, altText: image.alt_text })),
    reviews: reviews.map((review) => ({
      id: Number(review.id),
      rating: Number(review.rating),
      comment: review.comment,
      reviewerName: review.reviewer_name,
      reviewerRole: review.reviewer_role,
      reviewerAvatarUrl: review.reviewer_avatar_url,
      createdAt: new Date(review.created_at).toISOString(),
    })),
    currentUserReview: currentReview ? { rating: Number(currentReview.rating), comment: currentReview.comment } : null,
  };
}

function formatBudget(from: number | null, to: number | null): string {
  if (from && to && from === to) return `${from.toLocaleString("ar-EG")} ج.م`;
  if (from && to) return `${from.toLocaleString("ar-EG")} - ${to.toLocaleString("ar-EG")} ج.م`;
  if (from) return `من ${from.toLocaleString("ar-EG")} ج.م`;
  return "حسب الاتفاق";
}

/** Relative time in Arabic, computed server-side to avoid locale drift. */
export function timeAgo(date: Date | string): string {
  const then = new Date(date).getTime();
  const mins = Math.max(1, Math.floor((Date.now() - then) / 60000));
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return `منذ ${Math.floor(days / 30)} شهر`;
}

export async function listProjects(): Promise<ProjectCard[]> {
    const rows = await query<
      ProjectRow & { client_name: string | null; applicants: number; is_client_verified: 0 | 1 }
    >(
      `SELECT p.*,
              COALESCE(c.company_name, c.display_name) AS client_name,
              COALESCE(c.is_verified, (SELECT is_verified FROM users WHERE id=c.user_id), 0) AS is_client_verified,
              (SELECT COUNT(*) FROM proposals pr WHERE pr.project_id = p.id) AS applicants
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.status = 'open'
       ORDER BY p.posted_at DESC`
    );

    return rows.map((r) => ({
      id: String(r.id),
      title: r.title,
      clientName: r.client_name ?? "",
      isClientVerified: Boolean(r.is_client_verified),
      budget: formatBudget(r.budget_from, r.budget_to),
      postedTime: timeAgo(r.posted_at),
      tags: parseJsonList(r.skills_json),
      description: r.description ?? "",
      applicants: Number(r.applicants),
    }));
}

export async function listProposalsForProject(projectId: number) {
  return query<
    ProposalRow & {
      developer_id: number;
      dev_name: string;
      job_title: string | null;
      trust_score: number;
      developer_user_id: number;
      dev_username: string | null;
      avatar_url: string | null;
      is_verified: 0 | 1;
    }
  >(
    `SELECT pr.*, 
            d.id AS developer_id, 
            d.display_name AS dev_name, 
            d.job_title, 
            d.trust_score, 
            d.avatar_url,
            d.is_verified,
            d.user_id AS developer_user_id,
            u.username AS dev_username
     FROM proposals pr
     JOIN developers d ON d.id = pr.developer_id
     JOIN users u ON u.id = d.user_id
     WHERE pr.project_id = ?
     ORDER BY pr.created_at DESC`,
    [projectId]
  );
}

/** Project shaped for the detail page hero + scope sections. */
export async function getProjectDetail(projectId: number) {
  const row = await queryOne<
    ProjectRow & {
      client_user_id: number;
      client_name: string | null;
      client_location: string | null;
      is_client_verified: 0 | 1;
      completed_count: number;
      hired_dev_name: string | null;
      hired_dev_username: string | null;
      hired_dev_user_id: number | null;
    }
  >(
    `SELECT p.*,
            c.user_id AS client_user_id,
            COALESCE(c.company_name, c.display_name) AS client_name,
            COALESCE(c.is_verified, (SELECT is_verified FROM users WHERE id=c.user_id), 0) AS is_client_verified,
            c.location AS client_location,
            (SELECT COUNT(*) FROM projects p2 WHERE p2.client_id = c.id) AS completed_count,
            (SELECT d.display_name FROM proposals pr JOIN developers d ON d.id=pr.developer_id WHERE pr.project_id=p.id AND pr.status='accepted' LIMIT 1) AS hired_dev_name,
            (SELECT u.username FROM proposals pr JOIN developers d ON d.id=pr.developer_id JOIN users u ON u.id=d.user_id WHERE pr.project_id=p.id AND pr.status='accepted' LIMIT 1) AS hired_dev_username,
            (SELECT d.user_id FROM proposals pr JOIN developers d ON d.id=pr.developer_id WHERE pr.project_id=p.id AND pr.status='accepted' LIMIT 1) AS hired_dev_user_id
     FROM projects p
     JOIN clients c ON c.id = p.client_id
     WHERE p.id = ?`,
    [projectId]
  );
  if (!row) return null;

  const tags = parseJsonList(row.skills_json);
  const deliverables = parseJsonList(row.deliverables_json);

  return {
    id: String(row.id),
    title: row.title,
    clientUserId: Number(row.client_user_id),
    isClientVerified: Boolean(row.is_client_verified),
    status: row.status,
    hiredDeveloper: row.hired_dev_name
      ? {
          name: row.hired_dev_name,
          username: row.hired_dev_username ?? String(row.hired_dev_user_id),
          userId: Number(row.hired_dev_user_id),
        }
      : null,
    clientName: row.client_name ?? "",
    clientLocation: row.client_location ?? "",
    // Ratings are not modelled yet; show a neutral placeholder rather than a
    // fabricated score.
    clientRating: "—",
    clientProjectsCount: Number(row.completed_count),
    budgetRange: formatBudget(row.budget_from, row.budget_to),
    budgetFrom: Number(row.budget_from || 0),
    budgetTo: Number(row.budget_to || 0),
    postedDate: timeAgo(row.posted_at),
    deadline: row.deadline_days ? `خلال ${row.deadline_days} يوماً` : "غير محدد",
    tags,
    description: row.description ?? "",
    deliverables,
  };
}

/** Proposals shaped for the public feed on the project detail page. */
export async function getProposalFeed(projectId: number) {
  const rows = await listProposalsForProject(projectId);
  return rows.map((r) => ({
    id: String(r.id),
    numericId: r.id,
    developerId: r.developer_id,
    developerUserId: r.developer_user_id,
    devName: r.dev_name,
    devUsername: r.dev_username ?? String(r.developer_id),
    avatarUrl: r.avatar_url,
    isVerified: Boolean(r.is_verified),
    role: r.job_title ?? "Software Engineer",
    trustScore: r.trust_score,
    status: r.status,
    proposedPrice: `${Number(r.price).toLocaleString("ar-EG")} ج.م`,
    rawPrice: Number(r.price),
    deliveryDays: `${r.delivery_days} يوماً`,
    deliverablesText: r.cover_text ?? "",
    timeAgo: timeAgo(r.created_at),
  }));
}

function parseJsonList(value: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
