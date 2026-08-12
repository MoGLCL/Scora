import {notFound,redirect} from "next/navigation";
import {verifySession} from "@/lib/dal";
import {query,queryOne} from "@/lib/db";
import {readJsonValue} from "@/lib/json-value";
import {DeveloperAssessmentForm} from "@/components/developer-assessment-form";

export default async function Page({params}:{params:Promise<{id:string}>}){
  const auth=await verifySession();if(!auth)redirect("/login");if(auth.role!=="developer")redirect("/dashboard");
  const{id}=await params;
  const session=await queryOne<{id:number;developer_id:number;status:string;remaining_seconds:number}>("SELECT das.id,das.developer_id,das.status,GREATEST(0,TIMESTAMPDIFF(SECOND,CURRENT_TIMESTAMP,das.expires_at)) remaining_seconds FROM developer_assessment_sessions das JOIN developers d ON d.id=das.developer_id WHERE das.public_id=? AND d.user_id=?",[id,auth.userId]);
  if(!session)notFound();if(session.status!=="in_progress")redirect("/developer-assessment/pending");
  const questions=await query<{public_id:string;kind:string;skill:string;question_text:string;options_json:unknown;draft_text:string|null}>("SELECT q.public_id,q.kind,q.skill,q.question_text,q.options_json,a.draft_text FROM developer_assessment_questions q LEFT JOIN developer_assessment_answers a ON a.question_id=q.id AND a.developer_id=? WHERE q.session_id=? ORDER BY q.position",[session.developer_id,session.id]);
  const initialAnswers=Object.fromEntries(questions.filter(q=>q.draft_text!==null).map(q=>[q.public_id,q.draft_text||""]));
  const initialRemaining=Number(session.remaining_seconds??3600);
  return <main dir="rtl" className="mx-auto max-w-5xl px-6 py-12"><h1 className="text-3xl font-extrabold">اختبار اعتماد المطور</h1><p className="mb-8 mt-2 text-gray-600">تم إنشاء الاختبار بواسطة AI حسب مهاراتك. يتم حفظ كل إجابة تلقائيًا، ولا يمكن تغيير الاختبار بعد بدء الجلسة.</p><DeveloperAssessmentForm publicId={id} initialAnswers={initialAnswers} initialRemaining={initialRemaining} questions={questions.map(q=>({publicId:q.public_id,kind:q.kind,skill:q.skill,text:q.question_text,options:q.options_json===null?null:readJsonValue<string[]>(q.options_json)}))}/></main>;
}
