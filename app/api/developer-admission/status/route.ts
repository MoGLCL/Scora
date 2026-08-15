import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { createSession } from "@/lib/session";
import { execute, query, queryOne } from "@/lib/db";

export async function GET() {
  const s = await verifySession();
  if (!s || s.role !== "developer") {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let developer = await queryOne<{
    id: number;
    approval_status: string;
    rejection_reason: string | null;
    job_title: string | null;
    skills_change_count: number;
  }>(
    "SELECT id, approval_status, rejection_reason, job_title, skills_change_count FROM developers WHERE user_id=?",
    [s.userId]
  );

  if (!developer) {
    await execute("INSERT INTO developers (user_id, approval_status, skills_change_count) VALUES (?, 'pending', 0)", [s.userId]);
    developer = await queryOne<{
      id: number;
      approval_status: string;
      rejection_reason: string | null;
      job_title: string | null;
      skills_change_count: number;
    }>(
      "SELECT id, approval_status, rejection_reason, job_title, skills_change_count FROM developers WHERE user_id=?",
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

  const skills = (
    await query<{ name: string }>(
      "SELECT sk.name FROM developer_skills ds JOIN skills sk ON sk.id=ds.skill_id WHERE ds.developer_id=?",
      [developer.id]
    )
  ).map((x) => x.name);

  if (reassessment?.status === "pending") status = "reset_requested";

  const isPendingOrInProgress = status === "pending" || status === "assessment_in_progress" || status === "reset_approved";
  const needsGeneration =
    isPendingOrInProgress &&
    (!latest || latest.status === "expired" || latest.status === "generation_failed");

  return NextResponse.json({
    status,
    jobTitle: developer.job_title || "Full-Stack Web Developer",
    skills,
    skillsChangeCount: developer.skills_change_count || 0,
    remainingSkillsChanges: Math.max(0, 2 - (developer.skills_change_count || 0)),
    sessionStatus: latest?.status ?? null,
    assessmentUrl: latest?.status === "in_progress" ? `/developer-assessment/${latest.public_id}` : null,
    needsGeneration,
    generationFailed: latest?.status === "generation_failed",
    reassessmentStatus: reassessment?.status ?? null,
    reassessmentReason: developer.rejection_reason || reassessment?.decision_reason || null,
  });
}
