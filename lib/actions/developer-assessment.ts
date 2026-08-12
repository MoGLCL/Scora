"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { InterviewEventType, SkillEventType } from "@scora/trust-core";
import { query, queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { appendTrustEvent } from "@/lib/trust-events";
import { generateAssessment, gradeAssessmentAnswer } from "@/lib/openrouter";
import { readJsonValue } from "@/lib/json-value";
import { finalizeAssessmentSession } from "@/lib/assessment-finalize";

export async function submitAndFinalizeAssessment(publicId: string) {
  const s = await verifySession();
  if (!s || s.role !== "developer") return { ok: false as const, error: "غير مصرح لك" };
  const session = await queryOne<{ id: number; developer_id: number; status: string }>(
    "SELECT das.id, das.developer_id, das.status FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE das.public_id=? AND d.user_id=?",
    [publicId, s.userId]
  );
  if (!session) return { ok: false as const, error: "جلسة الاختبار غير موجودة" };

  await finalizeAssessmentSession(session.id, session.developer_id);
  revalidatePath("/admin");
  revalidatePath("/developer-assessment/pending");
  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function requestReassessmentByDeveloper(note?: string) {
  const s = await verifySession();
  if (!s || s.role !== "developer") return { ok: false as const, error: "غير مصرح لك بالوصول" };
  const parsedNote = z.string().trim().max(1000).optional().safeParse(note);
  if (!parsedNote.success) return { ok: false as const, error: "سبب الطلب يجب ألا يتجاوز 1000 حرف" };
  const dev = await queryOne<{ id: number; approval_status: string }>(
    "SELECT id, approval_status FROM developers WHERE user_id=?",
    [s.userId]
  );
  if (!dev) return { ok: false as const, error: "ملف المطور غير موجود" };

  const created = await transaction(async (c) => {
    await c.execute("SELECT id FROM developers WHERE id=? FOR UPDATE", [dev.id]);
    const [pendingRows] = await c.execute("SELECT id FROM developer_reassessment_requests WHERE developer_id=? AND status='pending' LIMIT 1", [dev.id]);
    if ((pendingRows as { id: number }[]).length) return false;
    await c.execute("INSERT INTO developer_reassessment_requests(developer_id,requested_by,note) VALUES(?,?,?)", [dev.id, s.userId, parsedNote.data || null]);
    await c.execute("UPDATE developers SET approval_status='reset_requested' WHERE id=?", [dev.id]);
    await c.execute(
      "INSERT INTO notifications (user_id, body) SELECT id, ? FROM users WHERE is_admin = 1 AND status = 'active'",
      [`قدم المطور #${dev.id} طلب إتاحة إعادة إجراء اختبار تقييم المهارات.`]
    );
    return true;
  });

  if (!created) return { ok: false as const, error: "تم إرسال طلب إعادة الاختبار للإدارة بالفعل وبانتظار الموافقة" };

  revalidatePath("/admin");
  revalidatePath("/developer-assessment/pending");
  return { ok: true as const };
}

export async function startDeveloperAssessment() {
  const s = await verifySession();
  if (!s || s.role !== "developer") return { ok: false as const, error: "غير مصرح لك بالوصول" };
  const dev = await queryOne<{ id: number; approval_status: string }>(
    "SELECT id, approval_status FROM developers WHERE user_id=?",
    [s.userId]
  );
  if (!dev) return { ok: false as const, error: "ملف المطور غير موجود" };
  if (!s.onboardingCompleted) return { ok: false as const, error: "أكمل بياناتك الشخصية أولًا" };
  if (!["profile_incomplete", "assessment_in_progress", "reset_approved", "pending", "approved"].includes(dev.approval_status)) {
    return {
      ok: false as const,
      error: dev.approval_status === "reset_requested" ? "طلب إعادة الاختبار ما زال قيد مراجعة الإدارة" : "لا يمكنك بدء اختبار جديد قبل موافقة الإدارة",
    };
  }

  let skills = (
    await query<{ name: string }>(
      "SELECT sk.name FROM developer_skills ds JOIN skills sk ON sk.id=ds.skill_id WHERE ds.developer_id=?",
      [dev.id]
    )
  ).map((x) => x.name);

  if (!skills.length) {
    skills = ["JavaScript", "Problem Solving"];
  }

  const previousQuestions = (
    await query<{ question_text: string }>(
      "SELECT q.question_text FROM developer_assessment_questions q JOIN developer_assessment_sessions das ON das.id=q.session_id WHERE das.developer_id=? ORDER BY q.id DESC LIMIT 30",
      [dev.id]
    )
  ).map((row) => row.question_text);

  const publicId = `assess_${randomUUID()}`;

  const sessionStart = await transaction(async (c) => {
    const [developerRows] = await c.execute("SELECT approval_status FROM developers WHERE id=? FOR UPDATE", [dev.id]);
    const lockedDeveloper = (developerRows as { approval_status: string }[])[0];
    if (!lockedDeveloper || !["profile_incomplete", "assessment_in_progress", "reset_approved", "pending", "approved"].includes(lockedDeveloper.approval_status)) return { denied: true as const };
    const [activeRows] = await c.execute("SELECT public_id,status FROM developer_assessment_sessions WHERE developer_id=? AND status IN ('generating','in_progress') ORDER BY id DESC LIMIT 1", [dev.id]);
    const active = (activeRows as { public_id: string; status: string }[])[0];
    if (active) return { existing: active };
    await c.execute("UPDATE developer_assessment_sessions SET status='expired' WHERE developer_id=? AND status NOT IN ('generating','in_progress')", [dev.id]);
    const [r] = await c.execute(
      "INSERT INTO developer_assessment_sessions(public_id,developer_id,status,duration_seconds) VALUES(?,?,'generating',?)",
      [publicId, dev.id, 3600]
    );
    await c.execute("UPDATE developers SET approval_status='assessment_in_progress' WHERE id=?", [dev.id]);
    await c.execute(
      "INSERT INTO notifications(user_id,body) SELECT id,? FROM users WHERE is_admin=1 AND status='active'",
      [`بدأ مطور جديد طلب الاعتماد، ويجري الآن إنشاء اختباره بالذكاء الاصطناعي (${publicId}).`]
    );
    return { id: Number((r as { insertId: number }).insertId) };
  });
  if ("denied" in sessionStart) return { ok: false as const, error: "لم تعد إعادة الاختبار متاحة لهذا الحساب" };
  if ("existing" in sessionStart && sessionStart.existing) {
    return sessionStart.existing.status === "in_progress"
      ? { ok: true as const, assessmentUrl: `/developer-assessment/${sessionStart.existing.public_id}` }
      : { ok: false as const, error: "يجري إنشاء اختبارك بالفعل، انتظر اكتمال توليد الأسئلة" };
  }
  const assessmentSessionId = sessionStart.id;

  let generated;
  try {
    generated = await generateAssessment(skills, publicId, previousQuestions);
  } catch (error) {
    console.error("[developer-assessment:generation]", error);
    await transaction(async (c) => {
      await c.execute(
        "UPDATE developer_assessment_sessions SET status='generation_failed',last_saved_at=CURRENT_TIMESTAMP WHERE id=? AND status='generating'",
        [assessmentSessionId]
      );
      await c.execute(
        "INSERT INTO notifications(user_id,body) SELECT id,? FROM users WHERE is_admin=1 AND status='active'",
        [`تعذر إنشاء اختبار المطور (${publicId}). راجع إعدادات OpenRouter وسجل السيرفر.`]
      );
    });
    const code = error instanceof Error ? error.message : "UNKNOWN";
    return {
      ok: false as const,
      error:
        code === "OPENROUTER_NOT_CONFIGURED"
          ? "معدات الذكاء الاصطناعي تحتاج للضبط بواسطة الأدمن"
          : code.startsWith("OPENROUTER_")
          ? `خدمة AI لم تعتمد الطلب (${code.replace("OPENROUTER_", "")})`
          : "لم يطابق رد AI صيغة الاختبار المحددة، تم تسجيل السبب بالسيرفر"
    };
  }

  await transaction(async (c) => {
    for (const [i, q] of generated.assessment.questions.entries()) {
      await c.execute(
        "INSERT INTO developer_assessment_questions(session_id,public_id,kind,skill,question_text,options_json,expected_answer_json,max_score,position) VALUES(?,?,?,?,?,?,?,?,?)",
        [
          assessmentSessionId,
          `q_${randomUUID()}`,
          q.kind,
          q.skill,
          q.question,
          JSON.stringify(q.options ?? null),
          JSON.stringify(q.expectedAnswer),
          q.maxScore,
          i + 1
        ]
      );
    }
    await c.execute(
      "UPDATE developer_assessment_sessions SET status='in_progress',model=?,prompt_json=?,raw_generation_json=?,expires_at=DATE_ADD(CURRENT_TIMESTAMP,INTERVAL ? SECOND),last_saved_at=CURRENT_TIMESTAMP WHERE id=? AND status='generating'",
      [generated.model, JSON.stringify({ prompt: generated.prompt, skills }), JSON.stringify(generated.raw), 3600, assessmentSessionId]
    );
    await appendTrustEvent(
      {
        sessionPublicId: publicId,
        developerId: dev.id,
        assessmentPublicId: publicId,
        type: SkillEventType.ASSESSMENT_STARTED,
        source: "SERVER",
        payload: { assessmentId: publicId, taskCount: generated.assessment.questions.length, timeLimitMs: 3600000 }
      },
      c
    );
  });

  revalidatePath("/developer-assessment/pending");
  return { ok: true as const, assessmentUrl: `/developer-assessment/${publicId}` };
}

const Submission = z.record(z.string(), z.string().trim().min(1).max(20000));
export async function submitDeveloperAssessment(publicId: string, answers: Record<string, string>) {
  const s = await verifySession();
  if (!s || s.role !== "developer") return { ok: false as const, error: "غير مصرح لك" };
  const session = await queryOne<{ id: number; developer_id: number; status: string; started_at: Date }>(
    "SELECT das.id,das.developer_id,das.status,das.started_at FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE das.public_id=? AND d.user_id=?",
    [publicId, s.userId]
  );
  if (!session || session.status !== "in_progress") return { ok: false as const, error: "الاختبار غير متاح حالياً" };
  const parsed = Submission.safeParse(
    Object.fromEntries(Object.entries(answers).map(([key, value]) => [key, typeof value === "string" ? value : String(value)]))
  );
  if (!parsed.success) return { ok: false as const, error: "أجب عن جميع الأسئلة المطلوبة" };
  const questions = await query<{
    id: number;
    public_id: string;
    kind: string;
    skill: string;
    question_text: string;
    expected_answer_json: unknown;
    max_score: number;
  }>("SELECT id,public_id,kind,skill,question_text,expected_answer_json,max_score FROM developer_assessment_questions WHERE session_id=? ORDER BY position", [
    session.id
  ]);
  if (questions.length !== Object.keys(parsed.data).length || questions.some((q) => !parsed.data[q.public_id])) {
    return { ok: false as const, error: "أجب عن جميع الأسئلة المطلوبة" };
  }
  const graded: Array<{ q: (typeof questions)[number]; answer: string; grade: Awaited<ReturnType<typeof gradeAssessmentAnswer>> }> = [];
  try {
    for (const q of questions) {
      graded.push({
        q,
        answer: parsed.data[q.public_id],
        grade: await gradeAssessmentAnswer({
          kind: q.kind,
          skill: q.skill,
          question: q.question_text,
          expectedAnswer: readJsonValue(q.expected_answer_json),
          answer: parsed.data[q.public_id],
          maxScore: q.max_score
        })
      });
    }
  } catch {
    return { ok: false as const, error: "تعذر تقييم الإجابات من خدمة الذكاء الاصطناعي. حاول مرة أخرى" };
  }
  await transaction(async (c) => {
    for (const { q, answer, grade } of graded) {
      await c.execute("INSERT INTO developer_assessment_answers(question_id,developer_id,answer_text,score,feedback) VALUES(?,?,?,?,?)", [
        q.id,
        session.developer_id,
        answer,
        grade.score,
        grade.feedback
      ]);
      if (q.kind === "interview") {
        await appendTrustEvent(
          {
            sessionPublicId: publicId,
            developerId: session.developer_id,
            assessmentPublicId: publicId,
            type: InterviewEventType.INTERVIEW_ANSWER_RECEIVED,
            source: "SERVER",
            payload: {
              interviewId: publicId,
              questionId: q.public_id,
              responseMs: Math.max(0, Date.now() - new Date(session.started_at).getTime()),
              wordCount: answer.trim().split(/\s+/).length,
              transcriptRef: null,
              recordingRef: null
            }
          },
          c
        );
        await appendTrustEvent(
          {
            sessionPublicId: publicId,
            developerId: session.developer_id,
            assessmentPublicId: publicId,
            type: InterviewEventType.INTERVIEW_ANSWER_SCORED,
            source: "AI_SERVICE",
            payload: {
              interviewId: publicId,
              questionId: q.public_id,
              correctness: grade.correctness,
              depth: grade.depth,
              specificity: grade.specificity,
              consistencyWithCode: grade.consistency,
              graderModel: grade.model,
              graderConfidence: grade.confidence
            }
          },
          c
        );
      }
    }
    await c.execute("UPDATE developer_assessment_sessions SET status='admin_review',submitted_at=CURRENT_TIMESTAMP WHERE id=?", [session.id]);
    await c.execute("UPDATE developers SET approval_status='admin_review' WHERE id=?", [session.developer_id]);
    await appendTrustEvent(
      {
        sessionPublicId: publicId,
        developerId: session.developer_id,
        assessmentPublicId: publicId,
        type: SkillEventType.ASSESSMENT_SUBMITTED,
        source: "SERVER",
        payload: {
          assessmentId: publicId,
          tasksCompleted: questions.length,
          tasksTotal: questions.length,
          totalDurationMs: Math.max(0, Date.now() - new Date(session.started_at).getTime())
        }
      },
      c
    );
  });
  revalidatePath("/admin");
  redirect("/developer-assessment/pending");
}
