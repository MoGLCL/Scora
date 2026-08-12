import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { queryOne } from "@/lib/db";

export async function GET() {
  const s = await verifySession();
  if (!s || s.role !== "developer") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const developer = await queryOne<{ id:number; approval_status: string }>(
    "SELECT id,approval_status FROM developers WHERE user_id=?",
    [s.userId]
  );
  if (!developer) {
    return NextResponse.json({ error: "DEVELOPER_NOT_FOUND" }, { status: 404 });
  }

  const status = developer.approval_status;
  if (status === "approved") {
    await createSession(s.userId, s.role, s.onboardingCompleted, s.isAdmin, true);
  }

  const latest = await queryOne<{ public_id: string; status: string }>(
    "SELECT das.public_id, das.status FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE d.user_id=? ORDER BY das.id DESC LIMIT 1",
    [s.userId]
  );
  const reassessment = await queryOne<{status:string;decision_reason:string|null}>("SELECT status,decision_reason FROM developer_reassessment_requests WHERE developer_id=? ORDER BY id DESC LIMIT 1",[developer.id]);

  const isPendingOrInProgress = status === "pending" || status === "assessment_in_progress";
  const needsGeneration =
    isPendingOrInProgress &&
    (!latest || latest.status === "expired" || latest.status === "generation_failed");

  return NextResponse.json({
    status,
    sessionStatus: latest?.status ?? null,
    assessmentUrl: latest?.status === "in_progress" ? `/developer-assessment/${latest.public_id}` : null,
    needsGeneration,
    generationFailed: latest?.status === "generation_failed",
    reassessmentStatus: reassessment?.status ?? null,
    reassessmentReason: reassessment?.decision_reason ?? null,
  });
}
