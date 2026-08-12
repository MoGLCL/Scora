"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, Briefcase, Code, ShieldCheck, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";

export default function DashboardPage() {
  const { userRole, developer, client } = useProfile();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  useEffect(() => {
    const load = () => fetch("/api/dashboard", { cache: "no-store" }).then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.stats) setStats(data.stats); });
    load();
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, []);
  const isDeveloper = userRole === "developer";
  const cards = isDeveloper ? [
    { label: "التقييمات المجتازة", value: stats?.assessments ?? 0, icon: Code },
    { label: "نقاط الثقة", value: `${stats?.trustScore ?? 0}%`, icon: ShieldCheck },
    { label: "رصيد SP", value: `${stats?.skillPoints ?? 0} SP`, icon: Award },
    { label: "العروض المقدمة", value: stats?.proposals ?? 0, icon: Briefcase },
  ] : [
    { label: "المشاريع المفتوحة", value: stats?.openProjects ?? 0, icon: Briefcase },
    { label: "إجمالي المشاريع", value: stats?.projects ?? 0, icon: Code },
    { label: "العروض المستلمة", value: stats?.proposals ?? 0, icon: Award },
    { label: "المطورون المتقدمون", value: stats?.developers ?? 0, icon: Users },
  ];
  return <div className="min-h-screen bg-[#F7FAF8] flex flex-col" dir="rtl">
    <SiteHeader />
    <main className="mx-auto w-full max-w-[1296px] flex-1 px-6 py-10 space-y-8">
      <section className="rounded-[28px] border border-[#D1E3D6] bg-gradient-to-b from-[#E8FAF0] to-white p-8">
        <h1 className="text-3xl font-extrabold text-[#05291A]">مرحباً، {isDeveloper ? developer.fullName : client.fullName}</h1>
        <p className="mt-2 text-[#526B5E]">البيانات هنا مباشرة من قاعدة البيانات وتتحدث تلقائياً.</p>
      </section>
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => <div key={label} className="rounded-[22px] border border-[#D1E3D6] bg-white p-6">
          <Icon className="h-6 w-6 text-[#056B38]" /><div className="mt-5 text-sm font-bold text-[#526B5E]">{label}</div>
          <div className="mt-1 text-3xl font-extrabold text-[#05291A]">{stats ? value : "—"}</div>
        </div>)}
      </section>
      <section className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 text-center">
        <h2 className="text-xl font-extrabold text-[#05291A]">لا توجد أنشطة حديثة مسجلة</h2>
        <p className="mt-2 text-sm text-[#526B5E]">أول ما يحصل نشاط حقيقي في حسابك هيظهر هنا؛ مش هنألف أحداث عشان الصفحة تبان مشغولة 😄</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href={isDeveloper ? "/projects" : "/projects/new"} className="rounded-full bg-[#056B38] px-6 py-3 text-sm font-bold text-white">{isDeveloper ? "تصفح المشاريع" : "إنشاء مشروع"}</Link>
          <Link href={isDeveloper ? "/profile/edit" : "/client-profile/edit"} className="rounded-full border border-[#D1E3D6] px-6 py-3 text-sm font-bold text-[#05291A]">تعديل الملف</Link>
        </div>
      </section>
    </main><SiteFooter />
  </div>;
}
