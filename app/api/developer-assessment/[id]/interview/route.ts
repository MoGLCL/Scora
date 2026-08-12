import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { verifySession } from "@/lib/dal";
import { query, queryOne, transaction } from "@/lib/db";
import { generateInterviewTurn } from "@/lib/openrouter";
import { finalizeAssessmentSession } from "@/lib/assessment-finalize";

const AUDIO_DIR = path.join(process.cwd(), "public", "uploads", "interviews"),
  MAX_AUDIO = 12 * 1024 * 1024;

async function context(publicId: string, userId: number) {
  return queryOne<{
    id: number;
    developer_id: number;
    status: string;
    current_phase: string;
    interview_expires_at: Date | null;
    interview_duration_seconds: number;
  }>(
    "SELECT das.id,das.developer_id,das.status,das.current_phase,das.interview_expires_at,das.interview_duration_seconds FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE das.public_id=? AND d.user_id=?",
    [publicId, userId]
  );
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifySession();
  if (!auth || auth.role !== "developer") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params,
    session = await context(id, auth.userId);
  if (!session) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  const rounds = await query<{ public_id: string; question_text: string; response_transcript: string | null; audio_url: string | null }>(
    "SELECT public_id,question_text,response_transcript,audio_url FROM developer_interview_rounds WHERE session_id=? ORDER BY position",
    [session.id]
  );
  return NextResponse.json({
    rounds,
    remainingSeconds: session.interview_expires_at
      ? Math.max(0, Math.floor((new Date(session.interview_expires_at).getTime() - Date.now()) / 1000))
      : session.interview_duration_seconds
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifySession();
  if (!auth || auth.role !== "developer") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const { id } = await params,
    session = await context(id, auth.userId);
  if (!session || session.status !== "in_progress") return NextResponse.json({ error: "الجلسة غير متاحة" }, { status: 409 });

  let expires = session.interview_expires_at;
  if (session.current_phase !== "interview") {
    expires = new Date(Date.now() + session.interview_duration_seconds * 1000);
    await transaction(async (c) => {
      await c.execute("UPDATE developer_assessment_sessions SET current_phase='interview',interview_expires_at=? WHERE id=?", [expires, session.id]);
    });
  }

  if (expires && new Date(expires).getTime() <= Date.now()) {
    await finalizeAssessmentSession(session.id, session.developer_id);
    return NextResponse.json({ expired: true }, { status: 409 });
  }

  const form = await request.formData(),
    roundId = String(form.get("roundId") || ""),
    transcript = String(form.get("transcript") || "").trim(),
    audio = form.get("audio");

  if (roundId) {
    const round = await queryOne<{ id: number }>(
      "SELECT id FROM developer_interview_rounds WHERE session_id=? AND public_id=? AND answered_at IS NULL",
      [session.id, roundId]
    );
    if (!round) return NextResponse.json({ error: "جولة غير صالحة" }, { status: 400 });
    let audioUrl: null | string = null;
    if (audio instanceof File && audio.size) {
      if (audio.size > MAX_AUDIO) return NextResponse.json({ error: "التسجيل أكبر من الحد المسموح" }, { status: 413 });
      await mkdir(AUDIO_DIR, { recursive: true });
      const ext = audio.type.includes("ogg") ? "ogg" : "webm",
        filename = `${randomUUID()}.${ext}`;
      await writeFile(path.join(AUDIO_DIR, filename), Buffer.from(await audio.arrayBuffer()));
      audioUrl = `/uploads/interviews/${filename}`;
    }
    await transaction(async (c) => {
      await c.execute("UPDATE developer_interview_rounds SET response_transcript=?,audio_url=?,answered_at=CURRENT_TIMESTAMP WHERE id=?", [
        transcript || null,
        audioUrl,
        round.id
      ]);
    });
  }

  const skills = (
    await query<{ name: string }>(
      "SELECT sk.name FROM developer_skills ds JOIN skills sk ON sk.id=ds.skill_id WHERE ds.developer_id=?",
      [session.developer_id]
    )
  ).map((x) => x.name);
  const answers = await query<{ kind: string; question_text: string; draft_text: string | null }>(
    "SELECT q.kind,q.question_text,a.draft_text FROM developer_assessment_questions q LEFT JOIN developer_assessment_answers a ON a.question_id=q.id AND a.developer_id=? WHERE q.session_id=?",
    [session.developer_id, session.id]
  );
  const turns = await query<{ question_text: string; response_transcript: string | null }>(
    "SELECT question_text,response_transcript FROM developer_interview_rounds WHERE session_id=? ORDER BY position",
    [session.id]
  );
  const secondsRemaining = Math.max(0, Math.floor((new Date(expires!).getTime() - Date.now()) / 1000));

  // Race OpenRouter AI generation against 3s timeout for instant UI response
  let next: { question: string; shouldContinue: boolean };
  try {
    next = await Promise.race([
      generateInterviewTurn({
        skills,
        code: answers.find((a) => a.kind === "code")?.draft_text || "",
        assessmentAnswers: Object.fromEntries(answers.map((a) => [a.question_text, a.draft_text || ""])),
        turns: turns.map((t) => ({ question: t.question_text, answer: t.response_transcript })),
        secondsRemaining
      }),
      new Promise<{ question: string; shouldContinue: boolean }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              question: "وضح بالتفصيل آلية اختبار كفاءة الكود الذي قمت بكتابته والأساليب البرمجية المتبعة للحفاظ على جودة وأمان النظام؟",
              shouldContinue: true
            }),
          3000
        )
      )
    ]);
  } catch {
    next = {
      question: "وضح بالتفصيل آلية اختبار كفاءة الكود الذي قمت بكتابته والأساليب البرمجية المتبعة للحفاظ على جودة وأمان النظام؟",
      shouldContinue: true
    };
  }

  if (!next.shouldContinue && turns.length >= 2) {
    await finalizeAssessmentSession(session.id, session.developer_id);
    return NextResponse.json({ complete: true });
  }

  const publicRoundId = `int_${randomUUID()}`,
    position = turns.length + 1;
  await transaction(async (c) => {
    await c.execute("INSERT INTO developer_interview_rounds(session_id,public_id,position,question_text) VALUES(?,?,?,?)", [
      session.id,
      publicRoundId,
      position,
      next.question
    ]);
  });

  return NextResponse.json({
    round: { public_id: publicRoundId, question_text: next.question, response_transcript: null, audio_url: null },
    remainingSeconds: secondsRemaining
  });
}
