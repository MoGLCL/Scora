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

export async function startDeveloperAssessment() {
  const s=await verifySession(); if(!s||s.role!=="developer") return {ok:false as const,error:"غير مصرح"};
  const dev=await queryOne<{id:number}>("SELECT id FROM developers WHERE user_id=?",[s.userId]);
  if(!dev) return {ok:false as const,error:"ملف المطور غير موجود"};
  if(!s.onboardingCompleted) return {ok:false as const,error:"أكمل بياناتك أولًا"};
  const existing=await queryOne<{public_id:string;status:string}>("SELECT public_id,status FROM developer_assessment_sessions WHERE developer_id=? AND status IN ('generating','in_progress','admin_review') ORDER BY id DESC LIMIT 1",[dev.id]);
  if(existing) redirect(existing.status==="in_progress"?`/developer-assessment/${existing.public_id}`:"/developer-assessment/pending");
  const skills=(await query<{name:string}>("SELECT sk.name FROM developer_skills ds JOIN skills sk ON sk.id=ds.skill_id WHERE ds.developer_id=?",[dev.id])).map(x=>x.name);
  if(!skills.length) return {ok:false as const,error:"لا توجد مهارات مسجلة للاختبار"};
  const previousQuestions=(await query<{question_text:string}>("SELECT q.question_text FROM developer_assessment_questions q JOIN developer_assessment_sessions das ON das.id=q.session_id WHERE das.developer_id=? ORDER BY q.id DESC LIMIT 30",[dev.id])).map(row=>row.question_text);
  const publicId=`assess_${randomUUID()}`;
  const assessmentSessionId=await transaction(async c=>{
    const [r]=await c.execute("INSERT INTO developer_assessment_sessions(public_id,developer_id,status,duration_seconds) VALUES(?,?,'generating',?)",[publicId,dev.id,3600]);
    await c.execute("UPDATE developers SET approval_status='assessment_in_progress' WHERE id=?",[dev.id]);
    await c.execute("INSERT INTO notifications(user_id,body) SELECT id,? FROM users WHERE is_admin=1 AND status='active'",[`بدأ مطور جديد طلب الاعتماد، ويجري الآن إنشاء اختباره بالذكاء الاصطناعي (${publicId}).`]);
    return Number((r as {insertId:number}).insertId);
  });
  let generated;
  try {
    generated=await generateAssessment(skills,publicId,previousQuestions);
  } catch(error) {
    console.error("[developer-assessment:generation]",error);
    await transaction(async c=>{
      await c.execute("UPDATE developer_assessment_sessions SET status='generation_failed',last_saved_at=CURRENT_TIMESTAMP WHERE id=? AND status='generating'",[assessmentSessionId]);
      await c.execute("INSERT INTO notifications(user_id,body) SELECT id,? FROM users WHERE is_admin=1 AND status='active'",[`تعذر إنشاء اختبار المطور (${publicId}). راجع إعدادات OpenRouter وسجل السيرفر.`]);
    });
    const code=error instanceof Error?error.message:"UNKNOWN";
    return{ok:false as const,error:code==="OPENROUTER_NOT_CONFIGURED"?"الأدمن لم يضبط OpenRouter بعد":code.startsWith("OPENROUTER_")?`خدمة OpenRouter رفضت الطلب (${code.replace("OPENROUTER_","")})`:"رد نموذج AI لم يطابق صيغة الاختبار المطلوبة. تم تسجيل السبب في السيرفر"};
  }
  await transaction(async c=>{for(const [i,q] of generated.assessment.questions.entries())await c.execute("INSERT INTO developer_assessment_questions(session_id,public_id,kind,skill,question_text,options_json,expected_answer_json,max_score,position) VALUES(?,?,?,?,?,?,?,?,?)",[assessmentSessionId,`q_${randomUUID()}`,q.kind,q.skill,q.question,JSON.stringify(q.options??null),JSON.stringify(q.expectedAnswer),q.maxScore,i+1]);await c.execute("UPDATE developer_assessment_sessions SET status='in_progress',model=?,prompt_json=?,raw_generation_json=?,expires_at=DATE_ADD(CURRENT_TIMESTAMP,INTERVAL ? SECOND),last_saved_at=CURRENT_TIMESTAMP WHERE id=? AND status='generating'",[generated.model,JSON.stringify({prompt:generated.prompt,skills}),JSON.stringify(generated.raw),3600,assessmentSessionId]);await appendTrustEvent({sessionPublicId:publicId,developerId:dev.id,assessmentPublicId:publicId,type:SkillEventType.ASSESSMENT_STARTED,source:"SERVER",payload:{assessmentId:publicId,taskCount:generated.assessment.questions.length,timeLimitMs:3600000}},c)});
  redirect(`/developer-assessment/${publicId}`);
}

const Submission=z.record(z.string(),z.string().trim().min(1).max(20000));
export async function submitDeveloperAssessment(publicId:string,answers:Record<string,string>){
  const s=await verifySession();if(!s||s.role!=="developer")return{ok:false as const,error:"غير مصرح"};
  const session=await queryOne<{id:number;developer_id:number;status:string;started_at:Date}>("SELECT das.id,das.developer_id,das.status,das.started_at FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE das.public_id=? AND d.user_id=?",[publicId,s.userId]);
  if(!session||session.status!=="in_progress")return{ok:false as const,error:"الاختبار غير متاح"};
  const parsed=Submission.safeParse(Object.fromEntries(Object.entries(answers).map(([key,value])=>[key,typeof value==="string"?value:String(value)])));if(!parsed.success)return{ok:false as const,error:"أجب عن كل الأسئلة"};
  const questions=await query<{id:number;public_id:string;kind:string;skill:string;question_text:string;expected_answer_json:unknown;max_score:number}>("SELECT id,public_id,kind,skill,question_text,expected_answer_json,max_score FROM developer_assessment_questions WHERE session_id=? ORDER BY position",[session.id]);
  if(questions.length!==Object.keys(parsed.data).length||questions.some(q=>!parsed.data[q.public_id]))return{ok:false as const,error:"أجب عن كل الأسئلة"};
  const graded:Array<{q:(typeof questions)[number];answer:string;grade:Awaited<ReturnType<typeof gradeAssessmentAnswer>>}>=[];try{for(const q of questions)graded.push({q,answer:parsed.data[q.public_id],grade:await gradeAssessmentAnswer({kind:q.kind,skill:q.skill,question:q.question_text,expectedAnswer:readJsonValue(q.expected_answer_json),answer:parsed.data[q.public_id],maxScore:q.max_score})})}catch{return{ok:false as const,error:"تعذر تقييم الإجابات من خدمة AI. لم يتم تسليم اختبار ناقص، حاول مرة أخرى"}}
  await transaction(async c=>{for(const {q,answer,grade} of graded){await c.execute("INSERT INTO developer_assessment_answers(question_id,developer_id,answer_text,score,feedback) VALUES(?,?,?,?,?)",[q.id,session.developer_id,answer,grade.score,grade.feedback]);if(q.kind==="interview"){await appendTrustEvent({sessionPublicId:publicId,developerId:session.developer_id,assessmentPublicId:publicId,type:InterviewEventType.INTERVIEW_ANSWER_RECEIVED,source:"SERVER",payload:{interviewId:publicId,questionId:q.public_id,responseMs:Math.max(0,Date.now()-new Date(session.started_at).getTime()),wordCount:answer.trim().split(/\s+/).length,transcriptRef:null,recordingRef:null}},c);await appendTrustEvent({sessionPublicId:publicId,developerId:session.developer_id,assessmentPublicId:publicId,type:InterviewEventType.INTERVIEW_ANSWER_SCORED,source:"AI_SERVICE",payload:{interviewId:publicId,questionId:q.public_id,correctness:grade.correctness,depth:grade.depth,specificity:grade.specificity,consistencyWithCode:grade.consistency,graderModel:grade.model,graderConfidence:grade.confidence}},c)}}await c.execute("UPDATE developer_assessment_sessions SET status='admin_review',submitted_at=CURRENT_TIMESTAMP WHERE id=?",[session.id]);await c.execute("UPDATE developers SET approval_status='admin_review' WHERE id=?",[session.developer_id]);await appendTrustEvent({sessionPublicId:publicId,developerId:session.developer_id,assessmentPublicId:publicId,type:SkillEventType.ASSESSMENT_SUBMITTED,source:"SERVER",payload:{assessmentId:publicId,tasksCompleted:questions.length,tasksTotal:questions.length,totalDurationMs:Math.max(0,Date.now()-new Date(session.started_at).getTime())}},c)});
  revalidatePath("/admin");redirect("/developer-assessment/pending");
}
