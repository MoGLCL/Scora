import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import type { AccountStatus, AppRole } from "@/lib/types";

export async function GET() {
  const session = await verifySession();
  if (!session?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const rows = await query<{
    id: number; email: string; full_name: string; phone:string|null; role: AppRole; is_admin: 0 | 1; status: AccountStatus;
    created_at: Date; suspended_until:Date|null; skill_points: number | null; trust_score: number | null; reports_count: number; approval_status:string|null; rejection_reason:string|null; assessment_public_id:string|null; assessment_session_status:string|null; reassessment_request_id:number|null; reassessment_status:string|null; reassessment_note:string|null;
  }>(`SELECT u.id, u.email, u.full_name, u.phone, u.role, u.is_admin, u.status, u.created_at, u.suspended_until,
             d.skill_points, d.trust_score, d.approval_status, d.rejection_reason,
             (SELECT das.public_id FROM developer_assessment_sessions das WHERE das.developer_id=d.id AND das.status='admin_review' ORDER BY das.id DESC LIMIT 1) assessment_public_id,
             (SELECT das.status FROM developer_assessment_sessions das WHERE das.developer_id=d.id ORDER BY das.id DESC LIMIT 1) assessment_session_status,
             (SELECT rr.id FROM developer_reassessment_requests rr WHERE rr.developer_id=d.id ORDER BY rr.id DESC LIMIT 1) reassessment_request_id,
             (SELECT rr.status FROM developer_reassessment_requests rr WHERE rr.developer_id=d.id ORDER BY rr.id DESC LIMIT 1) reassessment_status,
             (SELECT rr.note FROM developer_reassessment_requests rr WHERE rr.developer_id=d.id ORDER BY rr.id DESC LIMIT 1) reassessment_note,
             (SELECT COUNT(*) FROM support_tickets st WHERE st.reported_user_id = u.id) reports_count
      FROM users u LEFT JOIN developers d ON d.user_id = u.id ORDER BY u.id DESC`);
  return NextResponse.json(rows.map((row) => {
    const joined = new Date(row.created_at).toLocaleDateString("ar-EG");
    return { id: String(row.id), name: row.full_name, email: row.email, phone:row.phone??"", role: row.role, isAdmin: Boolean(row.is_admin),
      status: row.status, skillPoints: Number(row.skill_points ?? 0), trustScore: Number(row.trust_score ?? 0),
      reportsCount: Number(row.reports_count), joinDate: joined, joinedDate: joined, approvalStatus:row.approval_status, rejectionReason:row.rejection_reason, assessmentPublicId:row.assessment_public_id, assessmentSessionStatus:row.assessment_session_status, reassessmentRequestId:row.reassessment_request_id, reassessmentStatus:row.reassessment_status, reassessmentNote:row.reassessment_note, suspendedUntil:row.suspended_until?new Date(row.suspended_until).toISOString():null };
  }));
}
