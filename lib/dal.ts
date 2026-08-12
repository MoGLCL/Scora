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
  const user = await queryOne<{ id: number; role: UserRow["role"]; status: UserRow["status"] }>(
    "SELECT id, role, status FROM users WHERE id = ?",
    [session.userId]
  );
  if (!user || user.status === "banned") return null;
  if (user.status === "suspended") return null;
  return { userId: user.id, role: user.role };
});

export const getCurrentUser = cache(async (): Promise<UserRow | null> => {
  const session = await verifySession();
  if (!session) return null;
  return queryOne<UserRow>(
    "SELECT id, email, password_hash, full_name, role, created_at, updated_at FROM users WHERE id = ?",
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
    const rows = await query<DeveloperRow & { skills: string | null }>(
      `SELECT d.*,
              GROUP_CONCAT(s.name ORDER BY ds.sp DESC SEPARATOR ',') AS skills
       FROM developers d
       LEFT JOIN developer_skills ds ON ds.developer_id = d.id
       LEFT JOIN skills s ON s.id = ds.skill_id
       GROUP BY d.id
       ORDER BY d.trust_score DESC, d.skill_points DESC`
    );

    return rows.map((r) => ({
      id: String(r.id),
      initials: initialsOf(r.display_name),
      name: r.display_name,
      isVerified: Boolean(r.is_verified),
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
  return { ...dev, skills: skills.map((s) => s.name) };
}

function formatBudget(from: number | null, to: number | null): string {
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
      ProjectRow & { client_name: string | null; applicants: number }
    >(
      `SELECT p.*,
              COALESCE(c.company_name, c.display_name) AS client_name,
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
      budget: formatBudget(r.budget_from, r.budget_to),
      postedTime: timeAgo(r.posted_at),
      tags: Array.isArray(r.skills_json) ? r.skills_json : [],
      description: r.description ?? "",
      applicants: Number(r.applicants),
    }));
}

export async function getProjectById(id: number) {
  const row = await queryOne<
    ProjectRow & { client_name: string | null; client_location: string | null }
  >(
    `SELECT p.*, COALESCE(c.company_name, c.display_name) AS client_name,
            c.location AS client_location
     FROM projects p JOIN clients c ON c.id = p.client_id
     WHERE p.id = ?`,
    [id]
  );
  return row;
}

export async function listProposalsForProject(projectId: number) {
  return query<ProposalRow & { dev_name: string; job_title: string | null; trust_score: number }>(
    `SELECT pr.*, d.display_name AS dev_name, d.job_title, d.trust_score
     FROM proposals pr
     JOIN developers d ON d.id = pr.developer_id
     WHERE pr.project_id = ?
     ORDER BY pr.created_at DESC`,
    [projectId]
  );
}

/** Project shaped for the detail page hero + scope sections. */
export async function getProjectDetail(projectId: number) {
  const row = await queryOne<
    ProjectRow & {
      client_name: string | null;
      client_location: string | null;
      completed_count: number;
    }
  >(
    `SELECT p.*,
            COALESCE(c.company_name, c.display_name) AS client_name,
            c.location AS client_location,
            (SELECT COUNT(*) FROM projects p2
               WHERE p2.client_id = c.id AND p2.status = 'completed') AS completed_count
     FROM projects p
     JOIN clients c ON c.id = p.client_id
     WHERE p.id = ?`,
    [projectId]
  );
  if (!row) return null;
  /* Removed legacy fabricated project fallback. A missing record is a 404.
    return {
      id: String(projectId),
      title: "تطوير لوحة تحكم وتصاميم منصة SaaS تعليمية",
      clientName: "شركة التقنية الذكية",
      clientLocation: "القاهرة، مصر",
      clientRating: "4.9",
      clientProjectsCount: 8,
      budgetRange: "15,000 - 25,000 ج.م",
      postedDate: "منذ ساعتين",
      deadline: "خلال 14 يوماً",
      tags: ["React", "TypeScript", "Tailwind CSS", "Node.js"],
      description: "نبحث عن مطور ذو خبرة لبناء لوحة تحكم سريعة وعصرية لمنصة تعليمية متكاملة تتيح إدارة المستخدمين والاشتراكات بكفاءة.",
      deliverables: [
        "بناء المكونات التفاعلية باستخدام React و TypeScript",
        "ربط الـ Dashboard بالـ REST API وقواعد البيانات",
        "تحسين الأداء والتأكد من تجاوب الواجهات مع جميع الشاشات",
      ],
    };
  */

  const tags = Array.isArray(row.skills_json) ? row.skills_json : [];

  return {
    id: String(row.id),
    title: row.title,
    clientName: row.client_name ?? "",
    clientLocation: row.client_location ?? "",
    // Ratings are not modelled yet; show a neutral placeholder rather than a
    // fabricated score.
    clientRating: "—",
    clientProjectsCount: Number(row.completed_count),
    budgetRange: formatBudget(row.budget_from, row.budget_to),
    postedDate: timeAgo(row.posted_at),
    deadline: row.deadline_days ? `خلال ${row.deadline_days} يوماً` : "غير محدد",
    tags,
    description: row.description ?? "",
    // Deliverables are captured free-form in the description for now; the
    // dedicated column can be split out when the create-project form collects
    // them separately.
    deliverables: [] as string[],
  };
}

/** Proposals shaped for the public feed on the project detail page. */
export async function getProposalFeed(projectId: number) {
  const rows = await listProposalsForProject(projectId);
  return rows.map((r) => ({
    id: String(r.id),
    devName: r.dev_name,
    role: r.job_title ?? "",
    trustScore: r.trust_score,
    proposedPrice: `${Number(r.price).toLocaleString("ar-EG")} ج.م`,
    deliveryDays: `${r.delivery_days} يوماً`,
    deliverablesText: r.cover_text ?? "",
    timeAgo: timeAgo(r.created_at),
  }));
}

export async function listSkills() {
  return query<{ id: number; slug: string; name: string; name_ar: string | null }>(
    "SELECT id, slug, name, name_ar FROM skills ORDER BY name"
  );
}
