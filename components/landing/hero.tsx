import Link from "next/link";

function PassportCard() {
  return (
    <div className="rounded-[24px] bg-green-800 p-6 md:p-7">
      <p className="text-end font-heading text-[20px] font-bold text-white">
        .Scora
      </p>

      <div className="mt-5 flex items-center gap-5">
        <div className="flex size-[88px] shrink-0 items-center justify-center rounded-full border-2 border-avatar-ring bg-avatar">
          <span className="font-heading text-[20px] font-bold text-primary">
            MW
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-heading text-[25px] font-bold text-white">
            محمد وائل الغنام 
          </p>
          <p className="mt-1 text-[13px] text-green-100">
            مهندس برمجيات · القاهرة
          </p>
        </div>
      </div>

      <dl className="mt-6 flex flex-wrap gap-4">
        <div className="min-w-[150px] flex-1 rounded-[14px]">
          <dt className="text-[11px] font-medium text-green-100">درجة الثقة</dt>
          <dd className="technical mt-1 text-[22px] text-white">92 / 100</dd>
        </div>
        <div className="min-w-[150px] flex-1 rounded-[14px]">
          <dt className="text-[11px] font-medium text-green-100">نقط المهارة</dt>
          <dd className="technical mt-1 text-[22px] text-white">820 SP</dd>
        </div>
      </dl>
    </div>
  );
}

export function Hero() {
  return (
    <section className="mx-auto max-w-[1296px] px-4 sm:px-6 md:px-8 py-14 lg:py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Copy */}
        <div>
          <p className="technical text-[12px] text-primary">
            سكورا / توظيف بثقة
          </p>
          <h1 className="mt-4 text-[38px] leading-[1.15] text-ink md:text-[54px]">
            اعرف مين فاهم
            <br />
            الكود بجد.
          </h1>
          <p className="mt-6 max-w-[500px] text-[18px] leading-[28px] text-muted">
            وظّف مبرمجين فاهمين شغلهم، مش بس حافظين كلام. سكورا بيجمع التقييمات،
            جودة الكود، والإنترفيو في بروفايل واحد.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-6">
            <Link
              href="/register"
              className="rounded-full bg-primary px-10 py-4 text-[15px] font-bold text-white transition-colors hover:bg-green-800"
            >
              ابدأ ببلاش
            </Link>
            <Link
              href="/developers"
              className="text-[15px] font-bold text-primary hover:underline"
            >
              شوف المبرمجين
            </Link>
          </div>

          <p className="mt-5 text-[12px] text-muted">
            للمبرمجين والشركات اللي بتبني منتج تقني
          </p>
        </div>

        {/* Visual */}
        <div>
          <div className="rounded-[28px] border-[1.2px] border-line bg-background p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <p className="technical text-[11px] text-primary">
                بروفايل مبرمج / شغال
              </p>
              <span className="rounded-full bg-green-100 px-4 py-1.5 text-[11px] font-bold text-primary">
                 متوثّق من SCORA
              </span>
            </div>

            <div className="mt-6">
              <PassportCard />
            </div>
          </div>

          <p className="mt-4 text-[13px] text-muted">
            بروفايل مبرمج سهل تراجعه، وبيتحدّث مع كل تقييم جديد.
          </p>
        </div>
      </div>
    </section>
  );
}
