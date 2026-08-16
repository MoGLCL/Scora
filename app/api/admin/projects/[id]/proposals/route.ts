import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const { id } = await params;
  const projectId = Number(id);

  const proposals = await query<{
    id: number;
    developer_id: number;
    price: number;
    delivery_days: number;
    cover_text: string | null;
    status: string;
    created_at: Date;
    developer_name: string;
    developer_email: string;
    trust_score: number | null;
    skill_points: number | null;
  }>(`
    SELECT 
      pr.id, pr.developer_id, pr.price, pr.delivery_days, pr.cover_text, pr.status, pr.created_at,
      u.full_name as developer_name, u.email as developer_email,
      d.trust_score, d.skill_points
    FROM proposals pr
    JOIN developers d ON d.id = pr.developer_id
    JOIN users u ON u.id = d.user_id
    WHERE pr.project_id = ?
    ORDER BY pr.id DESC
  `, [projectId]);

  return NextResponse.json(
    proposals.map((p) => ({
      id: p.id,
      developerId: p.developer_id,
      developerName: p.developer_name,
      developerEmail: p.developer_email,
      trustScore: Number(p.trust_score || 0),
      skillPoints: Number(p.skill_points || 0),
      price: Number(p.price),
      deliveryDays: Number(p.delivery_days),
      coverText: p.cover_text || "",
      status: p.status,
      createdAt: new Date(p.created_at).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }))
  );
}
