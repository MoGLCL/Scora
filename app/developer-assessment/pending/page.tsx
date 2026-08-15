import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Code2,
  FileText,
  HelpCircle,
  Scale,
  ShieldCheck,
  User,
  Zap
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { verifySession } from "@/lib/dal";
import { queryOne } from "@/lib/db";
import { AdmissionStatus } from "@/components/admission-status";

export default async function Page() {
  const session = await verifySession();
  if (!session) redirect("/login");
  if (session.role !== "developer") redirect("/dashboard");
  const developer = await queryOne<{ approval_status: string }>("SELECT approval_status FROM developers WHERE user_id=?", [session.userId]);
  if (!developer) redirect("/complete-profile");
  if (developer.approval_status === "approved") redirect("/profile");

  return (
    <div className="min-h-screen bg-[#F7FAF8] flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1100px] px-6 py-10 w-full flex-1 space-y-8">
        {/* Page Top Header Banner */}
        <div className="bg-white rounded-[32px] border border-[#D1E3D6] p-8 md:p-10 shadow-xs text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8FAF0] text-[#056B38] text-xs font-extrabold border border-[#D1E3D6]">
            <ShieldCheck className="w-4 h-4 text-[#056B38]" />
            <span>بوابة اعتماد المطورين وتقييم المهارات</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#05291A] font-heading leading-tight">
            حالة اعتماد الحساب والشروط البرمجية
          </h1>

          <p className="text-sm text-[#526B5E] max-w-2xl mx-auto leading-relaxed">
            مرحباً بك في سكورا. تهدف عملية التقييم بالذكاء الاصطناعي إلى فحص مهاراتك البرمجية وبناء درجة السكورا الحقيقية الخاصة بك لتوصيلك بأفضل المشاريع والعملاء في مصر والشرق الأوسط.
          </p>
        </div>

        {/* Live Admission Status Control */}
        <AdmissionStatus />

        {/* Platform Rules & Guidelines Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
            <BookOpen className="h-5 w-5 text-[#056B38]" />
            <h2 className="text-xl font-extrabold text-[#05291A]">الشروط والقواعد البرمجية لاعتماد المطورين</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {/* Rule Card 1 */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold">
                <Code2 className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-[#05291A] text-base">1. تقييم AI اللحظي</h3>
              <p className="text-xs text-[#526B5E] leading-relaxed">
                يُولد الاختبار أسئلة سيناريوهات ومقابلات تقنية حية بناءً على المهارات المسجلة في ملفك. مدة الاختبار 60 دقيقة.
              </p>
            </div>

            {/* Rule Card 2 */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-[#05291A] text-base">2. درجة السكورا والموثوقية</h3>
              <p className="text-xs text-[#526B5E] leading-relaxed">
                تُحسب نقاط السكورا (Trust Score) ونقاط المهارة (SP) بناءً على دقة الإجابات، النزاهة الكودية، وسرعة الاستجابة.
              </p>
            </div>

            {/* Rule Card 3 */}
            <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="font-extrabold text-[#05291A] text-base">3. الالتزام بالعقود</h3>
              <p className="text-xs text-[#526B5E] leading-relaxed">
                تلتزم المنصة بحفظ مستحقاتك المالية وتوفير بيئة توظيف آمنة وحماية تسليم المشاريع وفق القانون المنظم.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Navigation Footer Bar */}
        <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-[#526B5E]">
            <HelpCircle className="h-4 w-4 text-[#056B38]" />
            <span>تحتاج لتعديل مهاراتك قبل الاختبار أو التواصل مع الدعم الفني؟</span>
          </div>

          <div className="flex flex-wrap gap-3 text-xs font-extrabold">
            <Link
              href="/profile/edit"
              className="rounded-full border border-[#D1E3D6] bg-[#F7FAF8] hover:bg-[#E8FAF0] text-[#05291A] px-5 py-2.5 transition-all flex items-center gap-1.5"
            >
              <User className="h-3.5 w-3.5 text-[#056B38]" />
              <span>تعديل المهارات والملف الشخصي</span>
            </Link>

            <Link
              href="/laws"
              className="rounded-full border border-[#D1E3D6] bg-[#F7FAF8] hover:bg-[#E8FAF0] text-[#05291A] px-5 py-2.5 transition-all flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-[#056B38]" />
              <span>قوانين وشروط المنصة</span>
            </Link>

            <Link
              href="/support"
              className="rounded-full bg-[#056B38] hover:bg-[#005B27] text-white px-5 py-2.5 transition-all shadow-xs"
            >
              الدعم الفني والخدمة
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
