import "server-only";

import { createSkillPointsActionToken } from "@/lib/ai/assistant-action";
import { query, queryOne } from "@/lib/db";
import type { AppRole } from "@/lib/types";

export type AssistantPageContext = {
  title?: string;
  category?: string;
  description?: string;
  budgetFrom?: number;
  budgetTo?: number;
  deadlineDays?: number;
  skills?: string[];
  deliverables?: string[];
};

export type AssistantDeveloperCard = {
  kind: "developer";
  userId: number;
  name: string;
  username: string;
  role: string;
  trustScore: number;
  skillPoints: number;
  skills: string[];
  profileUrl: string;
};

export type AssistantProjectCard = {
  kind: "project";
  id: number;
  title: string;
  description: string;
  budgetFrom: number;
  budgetTo: number;
  deadlineDays: number | null;
  skills: string[];
  projectUrl: string;
};

export type AssistantAdminReport = {
  kind: "admin_report";
  today: Record<string, number>;
  yesterday: Record<string, number>;
  differences: Record<string, number>;
  recentAudit: Array<{ action: string; status: string; createdAt: string }>;
};

export type AssistantPendingAdminAction = {
  type: "adjust_skill_points";
  token: string;
  target: { userId: number; name: string; username: string; currentSkillPoints: number };
  delta: number;
  nextSkillPoints: number;
  expiresAt: number;
};

export type AssistantContext = {
  role: AppRole;
  isAdmin: boolean;
  pathname: string;
  page: AssistantPageContext | null;
  currentProject: AssistantProjectCard | null;
  developers: AssistantDeveloperCard[];
  projects: AssistantProjectCard[];
  adminReport: AssistantAdminReport | null;
  pendingAdminAction: AssistantPendingAdminAction | null;
};

const MAX_TEXT = 4_000;

function parseList(value: unknown, max = 12) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, max);
}

export function sanitizePageContext(value: unknown): AssistantPageContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const numberValue = (key: string, min: number, max: number) => {
    const n = Number(source[key]);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : undefined;
  };
  return {
    title: typeof source.title === "string" ? source.title.trim().slice(0, 240) : undefined,
    category: typeof source.category === "string" ? source.category.trim().slice(0, 160) : undefined,
    description: typeof source.description === "string" ? source.description.trim().slice(0, MAX_TEXT) : undefined,
    budgetFrom: numberValue("budgetFrom", 0, 100_000_000),
    budgetTo: numberValue("budgetTo", 0, 100_000_000),
    deadlineDays: numberValue("deadlineDays", 0, 3650),
    skills: parseList(source.skills),
    deliverables: parseList(source.deliverables),
  };
}

function listFromJson(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalize(value: string) {
  return value.toLocaleLowerCase("ar-EG").replace(/[إأآ]/g, "ا").replace(/ى/g, "ي").trim();
}

function wantsDevelopers(message: string) {
  const text = normalize(message);
  return /مطور|مطوري|افضل|ترشيح|مبرمج|developer|developers|freelanc/.test(text);
}

function wantsProjects(message: string, role: AppRole) {
  const text = normalize(message);
  return role === "developer" || /مشروع|شغل|وظيف|فرص|project|work|job/.test(text);
}

function wantsAdminReport(message: string) {
  const text = normalize(message);
  return /جرد|فرق|فروقات|امس|امبارح|انهارده|اليوم|تقرير|احصائ|inventory|compare|yesterday|today/.test(text);
}

function extractSkillPointDelta(message: string): number | null {
  const text = normalize(message);
  if (!/sp|سكورا|نقط|skill.?point|مهار/.test(text) || !/قلل|خفض|خصم|زود|ارفع|عدل|غير|انقص/.test(text)) return null;
  const amount = text.match(/(?:بمقدار|ب|قدر|الى|لحد)\s*(\d{1,5})/i)?.[1] ?? text.match(/\d{1,5}/)?.[0];
  if (!amount) return null;
  const value = Math.min(10_000, Number(amount));
  if (!Number.isFinite(value) || value === 0) return null;
  return /قلل|خفض|خصم|انقص/.test(text) ? -value : value;
}

async function getDevelopers(message: string): Promise<{ cards: AssistantDeveloperCard[]; target: AssistantPendingAdminAction | null }> {
  const rows = await query<{
    user_id: number; display_name: string; username: string | null; job_title: string | null;
    trust_score: number; skill_points: number; skills: string | null;
  }>(`SELECT d.user_id, d.display_name, u.username, d.job_title, d.trust_score, d.skill_points,
             GROUP_CONCAT(s.name ORDER BY ds.sp DESC SEPARATOR ',') AS skills
      FROM developers d JOIN users u ON u.id=d.user_id
      LEFT JOIN developer_skills ds ON ds.developer_id=d.id
      LEFT JOIN skills s ON s.id=ds.skill_id
      WHERE u.status='active' AND u.onboarding_completed_at IS NOT NULL AND d.approval_status='approved'
      GROUP BY d.id ORDER BY d.trust_score DESC, d.skill_points DESC LIMIT 50`);

  const cards = rows.slice(0, 8).map((row) => ({
    kind: "developer" as const,
    userId: Number(row.user_id),
    name: row.display_name,
    username: row.username ?? String(row.user_id),
    role: row.job_title ?? "مطور برمجيات",
    trustScore: Number(row.trust_score ?? 0),
    skillPoints: Number(row.skill_points ?? 0),
    skills: row.skills ? row.skills.split(",").filter(Boolean) : [],
    profileUrl: `/profile/${encodeURIComponent(row.username ?? String(row.user_id))}`,
  }));

  const delta = extractSkillPointDelta(message);
  if (delta === null) return { cards, target: null };
  const text = normalize(message);
  const candidates = rows.filter((row) => {
    const haystack = normalize(`${row.display_name} ${row.username ?? ""}`);
    return haystack.split(/\s+/).some((part) => part.length > 2 && text.includes(part));
  });
  if (candidates.length !== 1) return { cards, target: null };
  const candidate = candidates[0];
  const current = Number(candidate.skill_points ?? 0);
  const next = Math.max(0, current + delta);
  const expiresAt = Date.now() + 5 * 60_000;
  const token = createSkillPointsActionToken({
    actorUserId: 0,
    targetUserId: Number(candidate.user_id),
    delta,
    expectedSkillPoints: current,
    expiresAt,
  });
  return {
    cards,
    target: {
      type: "adjust_skill_points",
      token,
      target: { userId: Number(candidate.user_id), name: candidate.display_name, username: candidate.username ?? String(candidate.user_id), currentSkillPoints: current },
      delta,
      nextSkillPoints: next,
      expiresAt,
    },
  };
}

async function getViewerSkills(userId: number) {
  const rows = await query<{ name: string }>(
    `SELECT s.name FROM developer_skills ds
     JOIN developers d ON d.id=ds.developer_id
     JOIN skills s ON s.id=ds.skill_id
     WHERE d.user_id=? ORDER BY ds.sp DESC`,
    [userId]
  );
  return rows.map((row) => normalize(row.name));
}

async function getProjects(viewerSkills: string[] = []): Promise<AssistantProjectCard[]> {
  const rows = await query<{
    id: number; title: string; description: string | null; budget_from: number | null; budget_to: number | null;
    deadline_days: number | null; skills_json: string | null;
  }>(`SELECT id,title,description,budget_from,budget_to,deadline_days,skills_json
      FROM projects WHERE status='open' ORDER BY posted_at DESC LIMIT 30`);
  const projects = rows.map((row) => ({
    kind: "project" as const,
    id: Number(row.id),
    title: row.title,
    description: (row.description ?? "").slice(0, 500),
    budgetFrom: Number(row.budget_from ?? 0),
    budgetTo: Number(row.budget_to ?? 0),
    deadlineDays: row.deadline_days == null ? null : Number(row.deadline_days),
    skills: listFromJson(row.skills_json),
    projectUrl: `/projects/${row.id}`,
  }));
  if (!viewerSkills.length) return projects;
  return projects
    .map((project) => ({
      project,
      score: project.skills.reduce((total, skill) => total + (viewerSkills.includes(normalize(skill)) ? 1 : 0), 0),
    }))
    .sort((left, right) => right.score - left.score)
    .map(({ project }) => project);
}

async function getCurrentProject(pathname: string, userId: number, isAdmin: boolean) {
  const match = pathname.match(/^\/projects\/(\d+)(?:\/.*)?$/);
  if (!match) return null;
  const projectId = Number(match[1]);
  const row = await queryOne<{
    id: number; title: string; description: string | null; budget_from: number | null; budget_to: number | null;
    deadline_days: number | null; skills_json: string | null; client_user_id: number; status: string;
  }>(`SELECT p.id,p.title,p.description,p.budget_from,p.budget_to,p.deadline_days,p.skills_json,p.status,c.user_id client_user_id
      FROM projects p JOIN clients c ON c.id=p.client_id WHERE p.id=?`, [projectId]);
  if (!row) return null;
  if (!isAdmin && row.client_user_id !== userId && row.status !== "open") return null;
  return {
    kind: "project" as const,
    id: Number(row.id),
    title: row.title,
    description: (row.description ?? "").slice(0, 2_000),
    budgetFrom: Number(row.budget_from ?? 0),
    budgetTo: Number(row.budget_to ?? 0),
    deadlineDays: row.deadline_days == null ? null : Number(row.deadline_days),
    skills: listFromJson(row.skills_json),
    projectUrl: `/projects/${row.id}`,
  };
}

async function getAdminReport(): Promise<AssistantAdminReport> {
  const [today, yesterday, audit] = await Promise.all([
    queryOne<Record<string, number>>(`SELECT
      (SELECT COUNT(*) FROM users WHERE DATE(created_at)=CURDATE()) users,
      (SELECT COUNT(*) FROM projects WHERE DATE(posted_at)=CURDATE()) projects,
      (SELECT COUNT(*) FROM proposals WHERE DATE(created_at)=CURDATE()) proposals,
      (SELECT COUNT(*) FROM messages WHERE DATE(created_at)=CURDATE()) messages,
      (SELECT COUNT(*) FROM support_tickets WHERE DATE(created_at)=CURDATE()) tickets`),
    queryOne<Record<string, number>>(`SELECT
      (SELECT COUNT(*) FROM users WHERE DATE(created_at)=DATE_SUB(CURDATE(),INTERVAL 1 DAY)) users,
      (SELECT COUNT(*) FROM projects WHERE DATE(posted_at)=DATE_SUB(CURDATE(),INTERVAL 1 DAY)) projects,
      (SELECT COUNT(*) FROM proposals WHERE DATE(created_at)=DATE_SUB(CURDATE(),INTERVAL 1 DAY)) proposals,
      (SELECT COUNT(*) FROM messages WHERE DATE(created_at)=DATE_SUB(CURDATE(),INTERVAL 1 DAY)) messages,
      (SELECT COUNT(*) FROM support_tickets WHERE DATE(created_at)=DATE_SUB(CURDATE(),INTERVAL 1 DAY)) tickets`),
    query<{ action: string; status: string; created_at: Date }>(`SELECT action,status,created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 8`),
  ]);
  const keys = ["users", "projects", "proposals", "messages", "tickets"];
  const current = Object.fromEntries(keys.map((key) => [key, Number(today?.[key] ?? 0)]));
  const previous = Object.fromEntries(keys.map((key) => [key, Number(yesterday?.[key] ?? 0)]));
  return {
    kind: "admin_report",
    today: current,
    yesterday: previous,
    differences: Object.fromEntries(keys.map((key) => [key, current[key] - previous[key]])),
    recentAudit: audit.map((row) => ({ action: row.action, status: row.status, createdAt: new Date(row.created_at).toISOString() })),
  };
}

export async function buildAssistantContext(input: {
  userId: number;
  role: AppRole;
  isAdmin: boolean;
  pathname?: string;
  page?: AssistantPageContext | null;
  message: string;
}): Promise<AssistantContext> {
  const pathname = (input.pathname ?? "/").slice(0, 300);
  const needsDevelopers = wantsDevelopers(input.message) || (input.isAdmin && extractSkillPointDelta(input.message) !== null);
  const needsProjects = wantsProjects(input.message, input.role);
  const needsReport = input.isAdmin && wantsAdminReport(input.message);
  const [developerData, viewerSkills, currentProject, adminReport] = await Promise.all([
    needsDevelopers ? getDevelopers(input.message) : Promise.resolve({ cards: [], target: null }),
    input.role === "developer" ? getViewerSkills(input.userId) : Promise.resolve([]),
    getCurrentProject(pathname, input.userId, input.isAdmin),
    needsReport ? getAdminReport() : Promise.resolve(null),
  ]);
  const projects = needsProjects ? await getProjects(viewerSkills) : [];

  if (developerData.target) {
    developerData.target.token = createSkillPointsActionToken({
      actorUserId: input.userId,
      targetUserId: developerData.target.target.userId,
      delta: developerData.target.delta,
      expectedSkillPoints: developerData.target.target.currentSkillPoints,
      expiresAt: developerData.target.expiresAt,
    });
  }

  return {
    role: input.role,
    isAdmin: input.isAdmin,
    pathname,
    page: input.page ?? null,
    currentProject,
    developers: developerData.cards,
    projects: projects.slice(0, input.role === "developer" ? 8 : 6),
    adminReport,
    pendingAdminAction: developerData.target,
  };
}
