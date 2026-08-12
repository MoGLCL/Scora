import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { query } from "@/lib/db";
import { getCurrentDeveloper, verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";

export default async function AssessmentsPage() {
  const session=await verifySession(); if(!session) redirect("/login");
  const developer=await getCurrentDeveloper();
  const rows=developer?await query<{id:number;title:string;category:string|null;difficulty:string;status:string;score:number|null;sp_awarded:number|null}>("SELECT id,title,category,difficulty,status,score,sp_awarded FROM assessments WHERE developer_id=? ORDER BY created_at DESC",[developer.id]):[];
  return <div className="min-h-screen bg-[#F7FAF8] flex flex-col" dir="rtl"><SiteHeader/><main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-10"><h1 className="text-3xl font-extrabold text-[#05291A]">التقييمات البرمجية</h1><p className="mt-2 text-[#526B5E]">السجلات المعروضة محفوظة فعلياً في قاعدة البيانات.</p><div className="mt-8 grid gap-4">{rows.length?rows.map((a)=><article key={a.id} className="rounded-[22px] border border-[#D1E3D6] bg-white p-6"><h2 className="font-extrabold text-[#05291A]">{a.title}</h2><div className="mt-3 flex flex-wrap gap-3 text-sm text-[#526B5E]"><span>{a.category||"بدون تصنيف"}</span><span>{a.difficulty}</span><span>{a.status}</span>{a.score!==null&&<span>النتيجة: {a.score}%</span>}{a.sp_awarded!==null&&<span>{a.sp_awarded} SP</span>}</div></article>):<div className="rounded-[22px] border border-[#D1E3D6] bg-white p-10 text-center text-[#526B5E]">لا توجد تقييمات مسجلة لحسابك حالياً.</div>}</div></main><SiteFooter/></div>;
}
