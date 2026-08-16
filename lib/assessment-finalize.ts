// Requires notifications.link_url (scripts/migrate-v13.js). Fallback INSERT without link_url if column missing.
import "server-only";
import { createHash } from "node:crypto";
import { query, queryOne, transaction } from "@/lib/db";
import { readJsonValue } from "@/lib/json-value";
import { gradeAssessmentAnswer } from "@/lib/openrouter";
import { appendTrustEvent } from "@/lib/trust-events";
import { SkillEventType } from "@scora/trust-core";

export async function finalizeAssessmentSession(sessionId: number, developerId: number) {
  const session = await queryOne<{
    id: number;
    public_id: string;
    model: string | null;
    duration_seconds: number;
    status: string;
    started_at: Date;
    evidence_snapshot_hash: string | null;
  }>(
    "SELECT id, public_id, model, duration_seconds, status, started_at, evidence_snapshot_hash FROM developer_assessment_sessions WHERE id=?",
    [sessionId]
  );
  if (!session) return;

  // If already locked, ensure queue state is consistent (repair partial failures)
  if (session.evidence_snapshot_hash) {
    if (session.status !== "admin_review") {
      await transaction(async (c) => {
        await c.execute(
          "UPDATE developer_assessment_sessions SET status='admin_review', current_phase='completed', submitted_at=COALESCE(submitted_at,CURRENT_TIMESTAMP) WHERE id=?",
          [sessionId]
        );
        await c.execute("UPDATE developers SET approval_status='admin_review' WHERE id=?", [developerId]);
      });
    }
    return;
  }

  // 1. Gather all questions
  const questions = await query<{
    id: number;
    public_id: string;
    kind: string;
    skill: string;
    question_text: string;
    expected_answer_json: unknown;
    max_score: number;
    draft_text: string | null;
    answer_type: string | null;
    client_state_json: unknown;
  }>(
    "SELECT q.id, q.public_id, q.kind, q.skill, q.question_text, q.expected_answer_json, q.max_score, a.draft_text, a.answer_type, a.client_state_json FROM developer_assessment_questions q LEFT JOIN developer_assessment_answers a ON a.question_id=q.id AND a.developer_id=? WHERE q.session_id=? ORDER BY q.position",
    [developerId, sessionId]
  );

  // 2. Gather interview rounds
  const interviews = await query<{
    id: number;
    public_id: string;
    position: number;
    question_text: string;
    response_transcript: string | null;
    audio_url: string | null;
    asked_at: Date;
    answered_at: Date | null;
  }>(
    "SELECT id, public_id, position, question_text, response_transcript, audio_url, asked_at, answered_at FROM developer_interview_rounds WHERE session_id=? ORDER BY position",
    [sessionId]
  );

  // 3. Gather trust event hash chain
  const events = await query<{
    event_id: string;
    event_type: string;
    layer: string;
    source: string;
    chain_position: number;
    occurred_at: number;
    payload_json: unknown;
    event_hash: string;
  }>(
    "SELECT event_id, event_type, layer, source, chain_position, occurred_at, payload_json, event_hash FROM trust_events WHERE session_public_id=? ORDER BY chain_position",
    [session.public_id]
  );

  // 4. Construct Immutable Evidence Snapshot
  const snapshotData = {
    snapshotVersion: "1.0-evidence-locked",
    sessionPublicId: session.public_id,
    developerId,
    timestamp: new Date().toISOString(),
    sessionMetadata: {
      model: session.model,
      durationSeconds: session.duration_seconds,
      startedAt: session.started_at,
      completedAt: new Date().toISOString(),
    },
    questions: questions.map((q) => ({
      questionId: q.public_id,
      kind: q.kind,
      skill: q.skill,
      text: q.question_text,
      maxScore: q.max_score,
      answer: q.draft_text?.trim() || "لم تتم الإجابة",
      answerType: q.answer_type || (q.kind === "code" ? "code" : q.kind === "mcq" ? "mcq" : "text"),
      clientState: readJsonValue(q.client_state_json),
    })),
    interview: interviews.map((round) => ({
      roundId: round.public_id,
      position: round.position,
      questionText: round.question_text,
      transcript: round.response_transcript,
      audioUrl: round.audio_url,
      askedAt: round.asked_at,
      answeredAt: round.answered_at,
    })),
    eventHashChain: events.map((e) => ({
      eventId: e.event_id,
      eventType: e.event_type,
      layer: e.layer,
      source: e.source,
      chainPosition: e.chain_position,
      occurredAt: e.occurred_at,
      payload: readJsonValue(e.payload_json),
      hash: e.event_hash,
    })),
  };

  const snapshotJsonString = JSON.stringify(snapshotData);
  const snapshotHash = createHash("sha256").update(snapshotJsonString).digest("hex");

  // 5. Score answers conservatively as preliminary data
  const graded = await Promise.all(
    questions.map(async (q) => {
      const answer = q.draft_text?.trim() || "لم تتم الإجابة";
      const grade = await gradeAssessmentAnswer({
        kind: q.kind,
        skill: q.skill,
        question: q.question_text,
        expectedAnswer: readJsonValue(q.expected_answer_json),
        answer,
        maxScore: q.max_score,
      });
      return { q, answer, grade };
    })
  );

  await transaction(async (c) => {
    for (const { q, answer, grade } of graded) {
      await c.execute(
        "INSERT INTO developer_assessment_answers(question_id,developer_id,answer_text,draft_text,answer_type,score,feedback) VALUES(?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE answer_text=VALUES(answer_text),draft_text=VALUES(draft_text),score=VALUES(score),feedback=VALUES(feedback),answered_at=CURRENT_TIMESTAMP",
        [
          q.id,
          developerId,
          answer,
          answer,
          q.kind === "code" ? "code" : q.kind === "mcq" ? "mcq" : "text",
          grade.score,
          grade.feedback,
        ]
      );
    }

    // Append ASSESSMENT_SUBMITTED to hash chain
    await appendTrustEvent(
      {
        sessionPublicId: session.public_id,
        developerId,
        assessmentPublicId: session.public_id,
        type: SkillEventType.ASSESSMENT_SUBMITTED,
        source: "SERVER",
        payload: {
          snapshotHash,
          questionsCount: questions.length,
          interviewTurnsCount: interviews.length,
        },
      },
      c
    );

    // Lock session & snapshot
    await c.execute(
      "UPDATE developer_assessment_sessions SET status='admin_review', current_phase='completed', submitted_at=COALESCE(submitted_at,CURRENT_TIMESTAMP), last_saved_at=CURRENT_TIMESTAMP, evidence_snapshot_json=?, evidence_snapshot_hash=?, snapshot_locked_at=CURRENT_TIMESTAMP WHERE id=?",
      [snapshotJsonString, snapshotHash, sessionId]
    );

    await c.execute("UPDATE developers SET approval_status='admin_review' WHERE id=?", [developerId]);

    const notifyBody = `تم قفل حزمة الأدلة لاختبار مطور جديد (${session.public_id}). جاهز للمراجعة في لوحة الإدارة.`;
    const notifyLink = `/admin/developers/${session.public_id}/review`;
    try {
      await c.execute(
        "INSERT INTO notifications(user_id, body, link_url) SELECT id, ?, ? FROM users WHERE is_admin=1 AND status='active'",
        [notifyBody, notifyLink]
      );
    } catch {
      // Fallback if migrate-v13 link_url column missing — still complete the submission
      await c.execute(
        "INSERT INTO notifications(user_id, body) SELECT id, ? FROM users WHERE is_admin=1 AND status='active'",
        [`${notifyBody} — ${notifyLink}`]
      );
    }
  });
}
