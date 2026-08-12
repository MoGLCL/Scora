/**
 * Row shapes as stored in MySQL. Column names stay snake_case to match the
 * database; mapping to camelCase happens in the DAL so the UI keeps its
 * existing prop names.
 */

export type AppRole = "developer" | "client" | "admin";
export type AccountStatus = "active" | "suspended" | "banned";
export type Availability = "available" | "busy" | "soon";
export type ProjectStatus = "open" | "in_progress" | "completed" | "closed";
export type ProposalStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string | null;
  phone_verified: 0 | 1;
  role: AppRole;
  status: AccountStatus;
  suspended_until: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DeveloperRow {
  id: number;
  user_id: number;
  display_name: string;
  job_title: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  availability: Availability;
  hourly_rate_min: number | null;
  hourly_rate_max: number | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  trust_score: number;
  skill_points: number;
  is_verified: 0 | 1;
  experience_years: number | null;
  avatar_url: string | null;
}

export interface ClientRow {
  id: number;
  user_id: number;
  display_name: string;
  company_name: string | null;
  industry: string | null;
  website: string | null;
  phone: string | null;
  location: string | null;
  avatar_url: string | null;
}

export interface ProjectRow {
  id: number;
  client_id: number;
  title: string;
  category: string | null;
  description: string | null;
  budget_from: number | null;
  budget_to: number | null;
  deadline_days: number | null;
  status: ProjectStatus;
  skills_json: string[] | null;
  deliverables_json: string[] | null;
  posted_at: Date;
}

export interface ProposalRow {
  id: number;
  project_id: number;
  developer_id: number;
  price: number;
  delivery_days: number;
  cover_text: string | null;
  status: ProposalStatus;
  created_at: Date;
}

/** Developer shaped for the discovery cards in app/developers/page.tsx. */
export interface DeveloperCard {
  id: string;
  initials: string;
  name: string;
  isVerified: boolean;
  role: string;
  location: string;
  experience: string;
  trustScore: number;
  skillPoints: number;
  trustLevel: "high" | "medium" | "low";
  skills: string[];
  availability: string;
  availabilityType: Availability;
  avatarUrl: string | null;
}

/** Project shaped for the listing cards in app/projects/page.tsx. */
export interface ProjectCard {
  id: string;
  title: string;
  clientName: string;
  budget: string;
  postedTime: string;
  tags: string[];
  description: string;
  applicants: number;
}
