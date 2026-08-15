import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { execute, queryOne } from "@/lib/db";

export async function GET() {
  const s = await verifySession();
  if (!s || s.role !== "developer") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let developer = await queryOne<{ id: number; approval_status: string; rejection_reason: string | null }>(
    "SELECT id, approval_status, rejection_reason FROM developers WHERE user_id=?",
    [s.userId]
  );

  if (!developer) {
    await execute("INSERT INTO developers (user_id, approval_status) VALUES (?, 'pending')", [s.userId]);
    developer = await queryOne<{ id: number; approval_status: string; rejection_reason: string | null }>(
      "SELECT id, approval_status, rejection_reason FROM developers WHERE user_id=?",
      [s.userId]
    );
  }

  if (!developer) {
    return NextResponse.json({ error: "DEVELOPER_NOT_FOUND" }, { status: 404 });
  }

  let status = developer.approval_status;
  if (status === "approved") {
    await createSession(s.userId, s.role, s.onboardingCompleted, s.isAdmin, true);
  }

  const latest = await queryOne<{ public_id: string; status: string }>(
    "SELECT das.public_id, das.status FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE d.user_id=? ORDER BY das.id DESC LIMIT 1",
    [s.userId]
  );

  const reassessment = await queryOne<{ status: string; decision_reason: string | null }>(
    "SELECT status, decision_reason FROM developer_reassessment_requests WHERE developer_id=? ORDER BY id DESC LIMIT 1",
    [developer.id]
  );

  // A pending request is a view state, not a replacement for the developer's
  // last approved/rejected result. Keep the existing result in the database
  // until an admin explicitly approves a new attempt.
  if (reassessment?.status === "pending") status = "reset_requested";

  const isPendingOrInProgress = status === "pending" || status === "assessment_in_progress" || status === "reset_approved";
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
    reassessmentReason: developer.rejection_reason || reassessment?.decision_reason || null,
  });
}
