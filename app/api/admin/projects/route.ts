import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const projects = await query<{
    id: number;
    title: string;
    category: string | null;
    budget_from: number;
    budget_to: number;
    deadline_days: number | null;
    status: string;
    posted_at: Date;
    owner_name: string;
    owner_username: string | null;
    account_type: "personal" | "company";
    company_name: string | null;
    proposals_count: number;
  }>(`SELECT p.id,p.title,p.category,p.budget_from,p.budget_to,p.deadline_days,p.status,p.posted_at,
             u.full_name owner_name,u.username,c.account_type,c.company_name,
             (SELECT COUNT(*) FROM proposals pr WHERE pr.project_id=p.id) proposals_count
      FROM projects p
      JOIN clients c ON c.id=p.client_id
      JOIN users u ON u.id=c.user_id
      ORDER BY p.posted_at DESC`);

  return NextResponse.json(projects.map((project) => ({
    id: project.id,
    title: project.title,
    category: project.category,
    budgetFrom: Number(project.budget_from),
    budgetTo: Number(project.budget_to),
    deadlineDays: project.deadline_days,
    status: project.status,
    postedAt: project.posted_at,
    ownerName: project.owner_name,
    ownerUsername: project.owner_username,
    accountType: project.account_type,
    companyName: project.company_name,
    proposalsCount: Number(project.proposals_count),
  })));
}
