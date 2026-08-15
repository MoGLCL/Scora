import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (session.role === "developer") {
    const stats = await queryOne<{ trustScore: number; skillPoints: number; assessments: number; proposals: number }>(
      `SELECT d.trust_score trustScore, d.skill_points skillPoints,
        (SELECT COUNT(*) FROM developer_assessment_sessions das WHERE das.developer_id=d.id AND das.status='approved') assessments,
        (SELECT COUNT(*) FROM proposals p WHERE p.developer_id=d.id) proposals
       FROM developers d WHERE d.user_id=?`, [session.userId]);
    return NextResponse.json({ role: session.role, stats: stats ?? { trustScore: 0, skillPoints: 0, assessments: 0, proposals: 0 } });
  }
  if (session.role === "client") {
    const stats = await queryOne<{ projects: number; openProjects: number; proposals: number; developers: number }>(
      `SELECT COUNT(DISTINCT p.id) projects, COUNT(DISTINCT CASE WHEN p.status='open' THEN p.id END) openProjects,
        COUNT(DISTINCT pr.id) proposals, COUNT(DISTINCT pr.developer_id) developers
       FROM clients c LEFT JOIN projects p ON p.client_id=c.id LEFT JOIN proposals pr ON pr.project_id=p.id
       WHERE c.user_id=?`, [session.userId]);
    return NextResponse.json({ role: session.role, stats: stats ?? { projects: 0, openProjects: 0, proposals: 0, developers: 0 } });
  }
  return NextResponse.json({ role: session.role, stats: {} });
}
