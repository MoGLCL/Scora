import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const projects = await query<{
    id: number;
    title: string;
    description: string | null;
    category: string | null;
    budget_from: number;
    budget_to: number;
    deadline_days: number | null;
    status: string;
    skills_json: unknown;
    deliverables_json: unknown;
    posted_at: Date;
    client_id: number;
    owner_name: string;
    owner_email: string;
    owner_phone: string | null;
    account_type: "personal" | "company";
    company_name: string | null;
    proposals_count: number;
  }>(`
    SELECT 
      p.id, p.title, p.description, p.category, p.budget_from, p.budget_to, p.deadline_days, p.status,
      p.skills_json, p.deliverables_json, p.posted_at, p.client_id,
      u.full_name as owner_name, u.email as owner_email, u.phone as owner_phone,
      c.account_type, c.company_name,
      (SELECT COUNT(*) FROM proposals pr WHERE pr.project_id = p.id) as proposals_count
    FROM projects p
    JOIN clients c ON c.id = p.client_id
    JOIN users u ON u.id = c.user_id
    ORDER BY p.id DESC
  `);

  return NextResponse.json(
    projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description || "",
      category: project.category,
      budgetFrom: Number(project.budget_from),
      budgetTo: Number(project.budget_to),
      deadlineDays: project.deadline_days,
      status: project.status,
      skillsJson: project.skills_json,
      deliverablesJson: project.deliverables_json,
      postedAt: new Date(project.posted_at).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      rawPostedAt: new Date(project.posted_at).toISOString(),
      clientId: project.client_id,
      ownerName: project.owner_name,
      ownerEmail: project.owner_email,
      ownerPhone: project.owner_phone || "",
      accountType: project.account_type,
      companyName: project.company_name,
      proposalsCount: Number(project.proposals_count),
    }))
  );
}
