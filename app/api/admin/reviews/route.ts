import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const reviews = await query<{
    id: number;
    project_id: number | null;
    rating: number;
    comment: string | null;
    created_at: Date;
    reviewer_name: string;
    reviewer_email: string;
    reviewee_name: string;
    reviewee_email: string;
    project_title: string | null;
  }>(`
    SELECT 
      r.id, r.project_id, r.rating, r.comment, r.created_at,
      u1.full_name as reviewer_name, u1.email as reviewer_email,
      u2.full_name as reviewee_name, u2.email as reviewee_email,
      p.title as project_title
    FROM reviews r
    JOIN users u1 ON u1.id = r.reviewer_user_id
    JOIN users u2 ON u2.id = r.reviewee_user_id
    LEFT JOIN projects p ON p.id = r.project_id
    ORDER BY r.id DESC
    LIMIT 100
  `);

  return NextResponse.json(
    reviews.map((r) => ({
      id: r.id,
      projectId: r.project_id,
      projectTitle: r.project_title || "مشروع مستقل",
      reviewerName: r.reviewer_name,
      reviewerEmail: r.reviewer_email,
      revieweeName: r.reviewee_name,
      revieweeEmail: r.reviewee_email,
      rating: Number(r.rating),
      comment: r.comment || "",
      createdAt: new Date(r.created_at).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    }))
  );
}
