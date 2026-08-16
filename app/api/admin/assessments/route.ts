import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const sessions = await query<{
    id: number;
    public_id: string;
    developer_id: number;
    status: string;
    model: string | null;
    score: number | null;
    trust_awarded: number | null;
    sp_awarded: number | null;
    started_at: Date;
    submitted_at: Date | null;
    reviewed_at: Date | null;
    review_reason: string | null;
    developer_name: string;
    developer_email: string;
    job_title: string | null;
    is_verified: number;
  }>(`
    SELECT 
      das.id, das.public_id, das.developer_id, das.status, das.model, das.score,
      das.trust_awarded, das.sp_awarded, das.started_at, das.submitted_at,
      das.reviewed_at, das.review_reason,
      u.full_name as developer_name, u.email as developer_email,
      d.job_title, d.is_verified
    FROM developer_assessment_sessions das
    JOIN developers d ON d.id = das.developer_id
    JOIN users u ON u.id = d.user_id
    ORDER BY das.id DESC
    LIMIT 100
  `);

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      publicId: s.public_id,
      developerId: s.developer_id,
      developerName: s.developer_name,
      developerEmail: s.developer_email,
      jobTitle: s.job_title || "مطور برمجيات",
      isVerified: Boolean(s.is_verified),
      status: s.status,
      model: s.model,
      score: s.score,
      trustAwarded: s.trust_awarded,
      spAwarded: s.sp_awarded,
      startedAt: new Date(s.started_at).toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      submittedAt: s.submitted_at
        ? new Date(s.submitted_at).toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
      reviewedAt: s.reviewed_at
        ? new Date(s.reviewed_at).toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : null,
      reviewReason: s.review_reason,
    }))
  );
}
