"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Bot, Briefcase, Search, ShieldCheck, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { updateUserForAdmin } from "@/lib/actions/admin";
import { setAiAssistantEnabled, setQuickRegistrationEnabled } from "@/lib/actions/settings";
import { useProfile } from "@/components/profile-provider";
import type { AccountStatus, AppRole } from "@/lib/types";

interface UserItem { id: string; name: string; email: string; role: AppRole; isAdmin: boolean; status: AccountStatus; skillPoints: number; trustScore: number; joinDate: string; reportsCount: number }
interface ProjectItem { id:number;title:string;category:string|null;budgetFrom:number;budgetTo:number;deadlineDays:number|null;status:string;postedAt:string;ownerName:string;ownerUsername:string|null;accountType:"personal"|"company";companyName:string|null;proposalsCount:number }

export default function AdminPage() {
  const { systemSettings, updateSystemSettings, addToast } = useProfile();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | AppRole | "admin" | "restricted">("all");
  const [tab,setTab]=useState<"users"|"projects"|"stats"|"settings">("users");
  const [stats,setStats]=useState<{totals?:{users:number;active:number;visits:number;visitors:number};daily?:{day:string;visits:number}[];settings?:Record<string,boolean>}>({});
  const [quickRegistration,setQuickRegistration]=useState(true);
  const load = () => fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()).then(setUsers).catch(() => addToast("تعذر تحميل المستخدمين", "warn"));
  const loadProjects = () => fetch("/api/admin/projects", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()).then(setProjects).catch(() => addToast("تعذر تحميل المشاريع", "warn"));
  useEffect(() => {
    load();
    loadProjects();
    const loadStats = () => fetch("/api/admin/stats", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        setStats(data);
        if (typeof data.settings?.quick_registration_enabled === "boolean") setQuickRegistration(data.settings.quick_registration_enabled);
      })
      .catch(() => undefined);
    loadStats();

    // Keep read-only counters live without replacing the editable users list.
    // Replacing it on a timer can overwrite an admin's in-progress interaction.
    const timer = window.setInterval(loadStats, 5000);
    return () => window.clearInterval(timer);
  }, []);
  const visible = useMemo(() => users.filter((u) => {
    const match = !search || `${u.id} ${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    return match && (filter === "all" || filter === "restricted" ? filter === "all" || u.status !== "active" : filter === "admin" ? u.isAdmin : u.role === filter);
  }), [users, search, filter]);
  const update = async (id: string, changes: { role?: AppRole; isAdmin?: boolean; status?: AccountStatus }) => {
    const result = await updateUserForAdmin({ userId: id, ...changes });
    if (!result.ok) return addToast(result.error, "warn");
    await load(); addToast("تم حفظ التعديل في قاعدة البيانات", "success");
  };
  return <div className="min-h-screen bg-[#F7FAF8] flex flex-col" dir="rtl"><SiteHeader />
    <main className="mx-auto w-full max-w-[1296px] flex-1 px-6 py-10 space-y-7">
      <nav className="flex flex-wrap gap-2 rounded-2xl border bg-white p-2">{([['users','المستخدمون'],['projects','المشاريع'],['stats','الإحصائيات'],['settings','الإعدادات']] as const).map(([k,l])=><button type="button" key={k} onClick={()=>setTab(k)} className={`rounded-xl px-5 py-3 font-bold ${tab===k?'bg-[#056B38] text-white':'text-[#526B5E]'}`}>{l}</button>)}</nav>
      <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-7 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-3xl font-extrabold text-[#05291A]">لوحة الإدارة</h1><p className="mt-2 text-sm text-[#526B5E]">بيانات حقيقية من قاعدة البيانات، وتتحدث الإحصائيات تلقائياً بدون إعادة تحميل الصفحة.</p></div>
        <div className="flex gap-3"><Stat icon={Users} label="المستخدمون" value={users.length} /><Stat icon={Ban} label="المقيدون" value={users.filter((u) => u.status !== "active").length} /></div>
      </section>
      {tab==="settings"&&<><section className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 flex items-center justify-between">
        <div><h2 className="font-extrabold text-[#05291A] flex items-center gap-2"><Bot className="h-5 w-5" />مساعد AI</h2><p className="mt-1 text-xs text-[#526B5E]">إيقافه يخفيه من كل الحسابات.</p></div>
        <button type="button" onClick={async () => { const enabled=!systemSettings.isAiAssistantEnabled; const r=await setAiAssistantEnabled(enabled); if(r.ok){updateSystemSettings({isAiAssistantEnabled:enabled}); addToast("تم حفظ حالة AI", "success");}else addToast(r.error,"warn");}} className={`h-9 rounded-full px-5 text-sm font-bold text-white ${systemSettings.isAiAssistantEnabled?"bg-[#056B38]":"bg-gray-500"}`}>{systemSettings.isAiAssistantEnabled?"مفعّل":"متوقف"}</button>
      </section><section className="rounded-[24px] border bg-white p-6 flex items-center justify-between"><div><h2 className="font-extrabold">التسجيل السريع</h2><p className="text-xs text-[#526B5E]">السماح بإنشاء حسابات جديدة من صفحة التسجيل.</p></div><button type="button" onClick={async()=>{const next=!quickRegistration;const r=await setQuickRegistrationEnabled(next);if(r.ok){setQuickRegistration(next);addToast("تم حفظ إعداد التسجيل السريع","success")}else addToast(r.error,"warn")}} className={`rounded-full px-5 py-2 font-bold text-white ${quickRegistration?'bg-[#056B38]':'bg-gray-500'}`}>{quickRegistration?'مفتوح':'متوقف'}</button></section></>}
      {tab==="stats"&&<section className="rounded-[24px] border bg-white p-6"><div className="grid gap-3 md:grid-cols-4"><Stat icon={Users} label="كل الحسابات" value={stats.totals?.users??0}/><Stat icon={ShieldCheck} label="نشط آخر 15 دقيقة" value={stats.totals?.active??0}/><Stat icon={Users} label="الزيارات" value={stats.totals?.visits??0}/><Stat icon={Users} label="الزوار" value={stats.totals?.visitors??0}/></div><div className="mt-8 flex h-52 items-end gap-3 border-b border-l p-4">{stats.daily?.map(d=>{const max=Math.max(1,...(stats.daily?.map(x=>x.visits)||[1]));return <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold">{d.visits}</span><div className="w-full rounded-t bg-[#056B38]" style={{height:`${Math.max(6,d.visits/max*150)}px`}}/><span className="text-[10px]">{new Date(d.day).toLocaleDateString('ar-EG',{weekday:'short'})}</span></div>})}</div></section>}
      {tab==="projects"&&<section className="space-y-4"><div className="flex items-center justify-between rounded-[22px] border bg-white p-5"><div><h2 className="flex items-center gap-2 text-xl font-extrabold"><Briefcase className="h-5 w-5 text-[#056B38]"/>المشاريع المنشورة</h2><p className="mt-1 text-sm text-[#526B5E]">كل مشروع مرتبط بصاحب الحساب الحقيقي من قاعدة البيانات.</p></div><span className="rounded-full bg-[#E8FAF0] px-4 py-2 font-bold text-[#056B38]">{projects.length} مشروع</span></div><div className="grid gap-4">{projects.length?projects.map(project=><article key={project.id} className="rounded-[22px] border border-[#D1E3D6] bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><Link href={`/projects/${project.id}`} className="text-lg font-extrabold text-[#05291A] hover:text-[#056B38]">#{project.id} · {project.title}</Link><p className="mt-1 text-sm text-[#526B5E]">{project.accountType==="company"?`شركة: ${project.companyName||project.ownerName}`:`عميل: ${project.ownerName}`} {project.ownerUsername?`· @${project.ownerUsername}`:""}</p></div><span className="rounded-full bg-[#E8FAF0] px-3 py-1 text-xs font-bold text-[#056B38]">{project.status}</span></div><div className="mt-4 flex flex-wrap gap-4 text-sm"><span>الميزانية: {project.budgetFrom===project.budgetTo?`${project.budgetFrom.toLocaleString("ar-EG")} ج.م`:`${project.budgetFrom.toLocaleString("ar-EG")} - ${project.budgetTo.toLocaleString("ar-EG")} ج.م`}</span><span>العروض: {project.proposalsCount}</span><span>المدة: {project.deadlineDays?`${project.deadlineDays} يوم`:"غير محددة"}</span>{project.category&&<span>التصنيف: {project.category}</span>}</div></article>):<div className="rounded-[22px] border bg-white p-10 text-center text-[#526B5E]">لا توجد مشاريع منشورة حتى الآن.</div>}</div></section>}
      {tab==="users"&&<section className="space-y-4">
        <div className="rounded-[22px] border border-[#D1E3D6] bg-white p-4 flex flex-col gap-3 md:flex-row md:justify-between">
          <div className="relative md:w-80"><Search className="absolute right-3 top-3 h-4 w-4 text-[#526B5E]"/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="الاسم أو البريد أو ID" className="h-10 w-full rounded-full border border-[#D1E3D6] pr-10 pl-4 text-sm"/></div>
          <div className="flex flex-wrap gap-2">{(["all","developer","client","admin","restricted"] as const).map((x)=><button key={x} onClick={()=>setFilter(x)} className={`rounded-full px-4 py-2 text-xs font-bold ${filter===x?"bg-[#056B38] text-white":"bg-[#F7FAF8] text-[#526B5E]"}`}>{x==="all"?"الكل":x==="developer"?"المطورون":x==="client"?"العملاء":x==="admin"?"الإدارة":"المقيدون"}</button>)}</div>
        </div>
        <div className="grid gap-3">{visible.length ? visible.map((u)=><article key={u.id} className="rounded-[20px] border border-[#D1E3D6] bg-white p-5 grid gap-4 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-center">
          <div><div className="font-extrabold text-[#05291A]">#{u.id} · {u.name}</div><div className="text-xs text-[#526B5E]">{u.email} · انضم {u.joinDate}</div></div>
          <div className="flex gap-2"><select value={u.role} onChange={(e)=>update(u.id,{role:e.target.value as AppRole})} className="h-10 rounded-xl border border-[#D1E3D6] px-3"><option value="developer">مطور</option><option value="client">عميل</option></select><button onClick={()=>update(u.id,{isAdmin:!u.isAdmin})} className={`h-10 rounded-xl px-3 text-xs font-bold ${u.isAdmin?"bg-[#056B38] text-white":"border border-[#D1E3D6]"}`}>{u.isAdmin?"أدمن":"منح أدمن"}</button></div>
          <select value={u.status} onChange={(e)=>update(u.id,{status:e.target.value as AccountStatus})} className="h-10 rounded-xl border border-[#D1E3D6] px-3"><option value="active">نشط</option><option value="suspended">موقوف</option><option value="banned">محظور</option></select>
          <div className="text-xs text-[#526B5E]">Trust {u.trustScore} · SP {u.skillPoints}</div>
        </article>):<div className="rounded-[22px] border border-[#D1E3D6] bg-white p-10 text-center text-[#526B5E]">لا توجد نتائج حقيقية مطابقة.</div>}</div>
      </section>}
    </main><SiteFooter /></div>;
}

function Stat({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: number }) { return <div className="rounded-2xl bg-[#E8FAF0] px-5 py-3"><Icon className="h-4 w-4 text-[#056B38]"/><div className="mt-1 text-xs text-[#526B5E]">{label}</div><div className="text-xl font-extrabold text-[#05291A]">{value}</div></div> }
