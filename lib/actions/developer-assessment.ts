"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { SkillEventType } from "@scora/trust-core";
import { query, queryOne, transaction } from "@/lib/db";
import { verifySession } from "@/lib/dal";
import { appendTrustEvent } from "@/lib/trust-events";
import { generateAssessment, generateCodeSpecificMcqs } from "@/lib/openrouter";
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

export async function updateDeveloperAssessmentSkills(input: {
  skills: string[];
  jobTitle?: string;
}) {
  const s = await verifySession();
  if (!s || s.role !== "developer") return { ok: false as const, error: "غير مصرح لك بالوصول" };

  const parsedSkills = z
    .array(z.string().trim().min(1).max(50))
    .min(1, "اختر مهارة واحدة على الأقل للاختبار")
    .max(12, "الحد الأقصى للمهارات هو 12 مهارة")
    .safeParse(input.skills);

  if (!parsedSkills.success) {
    return { ok: false as const, error: parsedSkills.error.issues[0]?.message || "بيانات المهارات غير صحيحة" };
  }

  const dev = await queryOne<{
    id: number;
    approval_status: string;
    skills_change_count: number;
    job_title: string | null;
  }>("SELECT id, approval_status, skills_change_count, job_title FROM developers WHERE user_id=?", [s.userId]);

  if (!dev) return { ok: false as const, error: "ملف المطور غير موجود" };

  if (dev.approval_status === "approved") {
    return { ok: false as const, error: "حسابك معتمد بالفعل ولا يتطلب إعادة تعديل مهارات الاختبار" };
  }

  const currentCount = dev.skills_change_count || 0;
  if (currentCount >= 2) {
    return { ok: false as const, error: "لقد استنفدت الحد الأقصى لتغيير مهارات الاختبار (مرتان فقط)" };
  }

  const skillsList = Array.from(new Set(parsedSkills.data));
  const newCount = currentCount + 1;
  const newJobTitle = input.jobTitle?.trim() || dev.job_title || "Full-Stack Web Developer";

  await transaction(async (c) => {
    // 1. Update developer job_title and increment skills_change_count
    await c.execute("UPDATE developers SET job_title=?, skills_change_count=? WHERE id=?", [
      newJobTitle,
      newCount,
      dev.id,
    ]);

    // 2. Clear old developer_skills and insert new skills
    await c.execute("DELETE FROM developer_skills WHERE developer_id=?", [dev.id]);
    for (const name of skillsList) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skill";
      const [rows] = await c.execute("SELECT id FROM skills WHERE slug=? OR name=? LIMIT 1", [slug, name]);
      let skillId: number;
      if ((rows as { id: number }[]).length > 0) {
        skillId = (rows as { id: number }[])[0].id;
      } else {
        const [insertRes] = await c.execute("INSERT INTO skills (name, slug, category) VALUES (?, ?, 'general')", [name, slug]);
        skillId = Number((insertRes as { insertId: number }).insertId);
      }
      await c.execute("INSERT INTO developer_skills (developer_id, skill_id) VALUES (?, ?)", [dev.id, skillId]);
    }

    // 3. Mark any previous failed or stale generating session as expired
    await c.execute(
      "UPDATE developer_assessment_sessions SET status='expired' WHERE developer_id=? AND status IN ('generating', 'generation_failed')",
      [dev.id]
    );
  });

  revalidatePath("/developer-assessment/pending");
  revalidatePath("/complete-profile");
  revalidatePath("/profile");

  return {
    ok: true as const,
    skills: skillsList,
    jobTitle: newJobTitle,
    skillsChangeCount: newCount,
    remainingChanges: Math.max(0, 2 - newCount),
  };
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
  if (!["approved", "rejected"].includes(dev.approval_status)) {
    return {
      ok: false as const,
      error:
        dev.approval_status === "reset_approved"
          ? "وافقت الإدارة بالفعل على إعادة الاختبار ويمكنك بدء المحاولة الجديدة الآن"
          : dev.approval_status === "reset_requested"
            ? "طلب إعادة الاختبار ما زال قيد مراجعة الإدارة"
            : "لا يمكن طلب إعادة الاختبار أثناء وجود اختبار أو مراجعة جارية",
    };
  }

  const created = await transaction(async (c) => {
    const [developerRows] = await c.execute("SELECT approval_status FROM developers WHERE id=? FOR UPDATE", [dev.id]);
    const lockedDeveloper = (developerRows as { approval_status: string }[])[0];
    if (!lockedDeveloper || !["approved", "rejected"].includes(lockedDeveloper.approval_status)) return false;
    const [pendingRows] = await c.execute("SELECT id FROM developer_reassessment_requests WHERE developer_id=? AND status='pending' LIMIT 1", [dev.id]);
    if ((pendingRows as { id: number }[]).length) return false;
    await c.execute("INSERT INTO developer_reassessment_requests(developer_id,requested_by,note) VALUES(?,?,?)", [dev.id, s.userId, parsedNote.data || null]);
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

export async function startDeveloperAssessment(input?: { track?: string; skills?: string[] }) {
  const s = await verifySession();
  if (!s || s.role !== "developer") return { ok: false as const, error: "غير مصرح لك بالوصول" };
  const dev = await queryOne<{ id: number; approval_status: string; job_title: string | null }>(
    "SELECT id, approval_status, job_title FROM developers WHERE user_id=?",
    [s.userId]
  );
  if (!dev) return { ok: false as const, error: "ملف المطور غير موجود" };
  if (!s.onboardingCompleted) return { ok: false as const, error: "أكمل بياناتك الشخصية أولًا" };

  const chosenTrack = input?.track?.trim() || dev.job_title || "Full-Stack Web Developer";

  // If specific skills were provided, register/ensure they are in developer_skills
  let skillsToUse: string[] = [];
  if (Array.isArray(input?.skills) && input.skills.length > 0) {
    skillsToUse = Array.from(new Set(input.skills.map((sk) => sk.trim()).filter(Boolean)));
    await transaction(async (c) => {
      if (input?.track) {
        await c.execute("UPDATE developers SET job_title=? WHERE id=?", [chosenTrack, dev.id]);
      }
      for (const name of skillsToUse) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "skill";
        const [rows] = await c.execute("SELECT id FROM skills WHERE slug=? OR name=? LIMIT 1", [slug, name]);
        let skillId: number;
        if ((rows as { id: number }[]).length > 0) {
          skillId = (rows as { id: number }[])[0].id;
        } else {
          const [insertRes] = await c.execute("INSERT INTO skills (name, slug, category) VALUES (?, ?, 'general')", [name, slug]);
          skillId = Number((insertRes as { insertId: number }).insertId);
        }
        await c.execute("INSERT IGNORE INTO developer_skills (developer_id, skill_id) VALUES (?, ?)", [dev.id, skillId]);
      }
    });
  } else {
    skillsToUse = (
      await query<{ name: string }>(
        "SELECT sk.name FROM developer_skills ds JOIN skills sk ON sk.id=ds.skill_id WHERE ds.developer_id=?",
        [dev.id]
      )
    ).map((x) => x.name);
  }

  if (!skillsToUse.length) {
    return { ok: false as const, error: "أضف مهارة واحدة على الأقل قبل بدء الاختبار" };
  }

  const previousQuestions = (
    await query<{ question_text: string }>(
      "SELECT q.question_text FROM developer_assessment_questions q JOIN developer_assessment_sessions das ON das.id=q.session_id WHERE das.developer_id=? ORDER BY q.id DESC LIMIT 30",
      [dev.id]
    )
  ).map((row) => row.question_text);

  const publicId = `assess_${randomUUID()}`;

  const sessionStart = await transaction(async (c) => {
    // Check if there is an active session currently running
    const [activeRows] = await c.execute(
      "SELECT public_id, status FROM developer_assessment_sessions WHERE developer_id=? AND status IN ('generating','in_progress') ORDER BY id DESC LIMIT 1",
      [dev.id]
    );
    const active = (activeRows as { public_id: string; status: string }[])[0];
    if (active) return { existing: active };

    const [r] = await c.execute(
      "INSERT INTO developer_assessment_sessions(public_id,developer_id,status,duration_seconds) VALUES(?,?,'generating',?)",
      [publicId, dev.id, 3600]
    );
    if (dev.approval_status !== "approved") {
      await c.execute("UPDATE developers SET approval_status='assessment_in_progress' WHERE id=?", [dev.id]);
    }
    await c.execute(
      "INSERT INTO notifications(user_id,body) SELECT id,? FROM users WHERE is_admin=1 AND status='active'",
      [`بدأ المطور #${dev.id} تقييم مهارات جديد (${publicId}).`]
    );
    return { id: Number((r as { insertId: number }).insertId) };
  });

  if ("existing" in sessionStart && sessionStart.existing) {
    return sessionStart.existing.status === "in_progress"
      ? { ok: true as const, assessmentUrl: `/developer-assessment/${sessionStart.existing.public_id}` }
      : { ok: false as const, error: "يجري إنشاء اختبارك بالفعل، انتظر اكتمال توليد الأسئلة" };
  }
  const assessmentSessionId = sessionStart.id;

  let generated;
  try {
    generated = await generateAssessment(skillsToUse, publicId, previousQuestions, chosenTrack);
  } catch (error) {
    console.error("[developer-assessment:generation]", error);
    await transaction(async (c) => {
      await c.execute(
        "UPDATE developer_assessment_sessions SET status='generation_failed',last_saved_at=CURRENT_TIMESTAMP WHERE id=? AND status='generating'",
        [assessmentSessionId]
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
    const durationSeconds = (generated.assessment.durationMinutes || 45) * 60;
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
      "UPDATE developer_assessment_sessions SET status='in_progress',duration_seconds=?,model=?,prompt_json=?,raw_generation_json=?,expires_at=DATE_ADD(CURRENT_TIMESTAMP,INTERVAL ? SECOND),last_saved_at=CURRENT_TIMESTAMP WHERE id=? AND status='generating'",
      [durationSeconds, generated.model, JSON.stringify({ prompt: generated.prompt, skills: skillsToUse, track: chosenTrack }), JSON.stringify(generated.raw), durationSeconds, assessmentSessionId]
    );
    await appendTrustEvent(
      {
        sessionPublicId: publicId,
        developerId: dev.id,
        assessmentPublicId: publicId,
        type: SkillEventType.ASSESSMENT_STARTED,
        source: "SERVER",
        payload: { assessmentId: publicId, taskCount: generated.assessment.questions.length, timeLimitMs: durationSeconds * 1000 }
      },
      c
    );
  });

  revalidatePath("/developer-assessment/pending");
  return { ok: true as const, assessmentUrl: `/developer-assessment/${publicId}` };
}

export async function cancelDeveloperAssessment(publicId: string) {
  const s = await verifySession();
  if (!s || s.role !== "developer") return { ok: false as const, error: "غير مصرح لك" };

  const dev = await queryOne<{ id: number; approval_status: string; assessment_cancellations: number }>(
    "SELECT id, approval_status, assessment_cancellations FROM developers WHERE user_id=?",
    [s.userId]
  );
  if (!dev) return { ok: false as const, error: "ملف المطور غير موجود" };

  if (dev.assessment_cancellations >= 1) {
    return {
      ok: false as const,
      error: "لقد استنفدت فرصة إلغاء الاختبار المسموح بها (متاحة لمرة واحدة فقط طوال فترة حسابك)."
    };
  }

  const session = await queryOne<{ id: number; status: string }>(
    "SELECT id, status FROM developer_assessment_sessions WHERE public_id=? AND developer_id=?",
    [publicId, dev.id]
  );
  if (!session || !["in_progress", "generating"].includes(session.status)) {
    return { ok: false as const, error: "لا يمكن إلغاء هذه الجلسة لأنها مكتملة أو غير مفعلة" };
  }

  await transaction(async (c) => {
    await c.execute(
      "UPDATE developer_assessment_sessions SET status='expired', current_phase='completed', last_saved_at=CURRENT_TIMESTAMP WHERE id=?",
      [session.id]
    );
    await c.execute(
      "UPDATE developers SET approval_status='profile_incomplete', assessment_cancellations=assessment_cancellations+1 WHERE id=?",
      [dev.id]
    );
    await c.execute(
      "INSERT INTO notifications (user_id, body) VALUES (?, ?)",
      [s.userId, "تم إلغاء جلسة الاختبار الحالية بنجاح (تم استهلاك فرصة الإلغاء لمرة واحدة). يمكنك الآن تعديل بياناتك أو إعادة بدء الاختبار عندما تكون مستعداً."]
    );
    await appendTrustEvent(
      {
        sessionPublicId: publicId,
        developerId: dev.id,
        assessmentPublicId: publicId,
        type: SkillEventType.TASK_SUBMITTED,
        source: "HUMAN",
        payload: { action: "CANDIDATE_CANCELLED_ONCE", previousStatus: session.status }
      },
      c
    );
  });

  revalidatePath("/developer-assessment/pending");
  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function saveDeveloperAssessmentStateAction(input: {
  publicId: string;
  currentQuestionId?: string | null;
  answers: Record<string, { value: string; type: "text" | "mcq" | "code"; clientState?: Record<string, unknown> }>;
}) {
  const auth = await verifySession();
  if (!auth || auth.role !== "developer") return { ok: false, error: "غير مصرح" };
  if (!input.publicId || !input.publicId.startsWith("assess_")) return { ok: false, error: "معرف غير صالح" };

  const session = await queryOne<{
    id: number;
    developer_id: number;
    status: string;
    current_phase: string;
    expires_at: Date | null;
    interview_expires_at: Date | null;
  }>(
    "SELECT das.id, das.developer_id, das.status, das.current_phase, das.expires_at, das.interview_expires_at FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE das.public_id=? AND d.user_id=?",
    [input.publicId, auth.userId]
  );
  if (!session || session.status !== "in_progress") return { ok: false, error: "الجلسة غير متاحة" };

  const expires = session.current_phase === "interview" ? session.interview_expires_at : session.expires_at;
  if (expires && new Date(expires).getTime() <= Date.now()) {
    await finalizeAssessmentSession(session.id, session.developer_id);
    return { ok: true, expired: true, remainingSeconds: 0 };
  }

  await transaction(async (c) => {
    for (const [questionPublicId, answer] of Object.entries(input.answers ?? {})) {
      const [rows] = await c.execute("SELECT id FROM developer_assessment_questions WHERE session_id=? AND public_id=?", [
        session.id,
        questionPublicId
      ]);
      const question = (rows as { id: number }[])[0];
      if (question) {
        await c.execute(
          "INSERT INTO developer_assessment_answers(question_id,developer_id,draft_text,answer_type,client_state_json) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE draft_text=VALUES(draft_text),answer_type=VALUES(answer_type),client_state_json=VALUES(client_state_json),updated_at=CURRENT_TIMESTAMP",
          [question.id, session.developer_id, answer.value, answer.type, JSON.stringify(answer.clientState ?? {})]
        );
      }
    }
    await c.execute(
      "UPDATE developer_assessment_sessions SET current_question_public_id=COALESCE(?,current_question_public_id),last_saved_at=CURRENT_TIMESTAMP WHERE id=?",
      [input.currentQuestionId ?? null, session.id]
    );
  });

  const remainingSeconds = expires ? Math.max(0, Math.floor((new Date(expires).getTime() - Date.now()) / 1000)) : 0;
  return { ok: true, remainingSeconds };
}

export async function submitCodeAndGenerateNextQuestionsAction(input: {
  publicId: string;
  code: string;
}) {
  const auth = await verifySession();
  if (!auth || auth.role !== "developer") return { ok: false as const, error: "غير مصرح" };
  if (!input.publicId || !input.publicId.startsWith("assess_")) return { ok: false as const, error: "معرف غير صالح" };

  const session = await queryOne<{
    id: number;
    developer_id: number;
    status: string;
    expires_at: Date | null;
  }>(
    "SELECT das.id, das.developer_id, das.status, das.expires_at FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE das.public_id=? AND d.user_id=?",
    [input.publicId, auth.userId]
  );
  if (!session || session.status !== "in_progress") return { ok: false as const, error: "الجلسة غير متاحة" };

  // 1. Find the code question in this session
  const codeQuestion = await queryOne<{
    id: number;
    public_id: string;
    skill: string;
    question_text: string;
  }>(
    "SELECT id, public_id, skill, question_text FROM developer_assessment_questions WHERE session_id=? AND kind='code' ORDER BY position LIMIT 1",
    [session.id]
  );

  if (codeQuestion) {
    // Save the submitted code
    await transaction(async (c) => {
      await c.execute(
        "INSERT INTO developer_assessment_answers(question_id,developer_id,draft_text,answer_type,client_state_json) VALUES(?,?,?,'code',?) ON DUPLICATE KEY UPDATE draft_text=VALUES(draft_text),answer_type='code',updated_at=CURRENT_TIMESTAMP",
        [codeQuestion.id, session.developer_id, input.code.trim() || "// No code submitted", JSON.stringify({ submittedStage: "code_challenge" })]
      );
    });
  }

  // 2. Check if Code Comprehension MCQs were already generated
  const existingCodeMcqs = await query<{ id: number }>(
    "SELECT id FROM developer_assessment_questions WHERE session_id=? AND skill LIKE '%Code Comprehension%'",
    [session.id]
  );

  if (existingCodeMcqs.length === 0 && codeQuestion && input.code.trim().length > 20) {
    // Dynamically generate MCQs targeting the candidate's exact written code!
    try {
      const generatedCodeMcqs = await generateCodeSpecificMcqs({
        skill: codeQuestion.skill,
        code: input.code,
        originalTask: codeQuestion.question_text
      });

      const maxPosRow = await queryOne<{ max_pos: number }>(
        "SELECT COALESCE(MAX(position), 0) max_pos FROM developer_assessment_questions WHERE session_id=?",
        [session.id]
      );
      let currentPos = Number(maxPosRow?.max_pos ?? 1);

      await transaction(async (c) => {
        for (const q of generatedCodeMcqs.questions) {
          currentPos += 1;
          await c.execute(
            "INSERT INTO developer_assessment_questions(session_id,public_id,kind,skill,question_text,options_json,expected_answer_json,max_score,position) VALUES(?,?,?,?,?,?,?,?,?)",
            [
              session.id,
              `q_${randomUUID()}`,
              "mcq",
              q.skill,
              q.question,
              JSON.stringify(q.options),
              JSON.stringify(q.expectedAnswer),
              q.maxScore || 15,
              currentPos
            ]
          );
        }
      });
    } catch (err) {
      console.warn("[submitCodeAndGenerateNextQuestionsAction] Failed to generate code MCQs:", err);
    }
  }

  // 3. Retrieve all updated questions and draft answers
  const questions = await query<{
    public_id: string;
    kind: string;
    skill: string;
    question_text: string;
    options_json: unknown;
    draft_text: string | null;
  }>(
    "SELECT q.public_id, q.kind, q.skill, q.question_text, q.options_json, a.draft_text FROM developer_assessment_questions q LEFT JOIN developer_assessment_answers a ON a.question_id = q.id AND a.developer_id = ? WHERE q.session_id = ? ORDER BY q.position",
    [session.developer_id, session.id]
  );

  const formattedQuestions = questions.map((q) => ({
    publicId: q.public_id,
    kind: q.kind,
    skill: q.skill,
    text: q.question_text,
    options: q.options_json === null ? null : readJsonValue<string[]>(q.options_json)
  }));

  const answers = Object.fromEntries(
    questions.filter((q) => q.draft_text !== null).map((q) => [q.public_id, q.draft_text || ""])
  );

  const remainingSeconds = session.expires_at
    ? Math.max(0, Math.floor((new Date(session.expires_at).getTime() - Date.now()) / 1000))
    : 0;

  return {
    ok: true as const,
    questions: formattedQuestions,
    answers,
    remainingSeconds
  };
}
