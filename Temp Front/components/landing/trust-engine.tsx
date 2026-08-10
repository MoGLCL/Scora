import Link from "next/link";

const signals = [
  { label: "تحدي الكود", verdict: "متأكد", value: 73 },
  { label: "الإنترفيو التقني", verdict: "قوي", value: 92 },
  { label: "جودة الكود", verdict: "متأكد", value: 75 },
];

export function TrustEngine() {
  return (
    <section className="mx-auto max-w-[1296px] px-6 py-8 md:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Panel */}
        <div className="rounded-[28px] border border-line bg-panel p-8 md:p-9">
          <p className="technical text-[11px] text-primary">
            بروفايل مبرمج / شغال
          </p>

          <p className="mt-8 text-[13px] font-bold text-muted">درجة الثقة</p>
          <p className="mt-1 flex items-baseline gap-3">
            <span className="technical text-[58px] leading-none text-green-800">
              92
            </span>
            <span className="technical text-[20px] text-primary">/ 100</span>
          </p>

          <div className="mt-6 h-2.5 w-full overflow-hidden rounded-full bg-track">
            <div className="h-full rounded-full bg-fill" style={{ width: "92%" }} />
          </div>

          <dl className="mt-10 flex flex-col gap-5">
            {signals.map((signal) => (
              <div key={signal.label}>
                <div className="flex items-center justify-between">
                  <dt className="text-[13px] text-muted">{signal.label}</dt>
                  <dd className="text-[13px] font-bold text-primary">
                    {signal.verdict}
                  </dd>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-track">
                  <div
                    className="h-full rounded-full bg-fill"
                    style={{ width: `${signal.value}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        </div>

        {/* Copy */}
        <div>
          <p className="technical text-[12px] text-primary">
            سكورا / محرك الثقة
          </p>
          <h2 className="mt-4 text-[34px] leading-[1.2] text-ink md:text-[46px]">
            درجة مفهومة،
            <br />
            مش رقم غامض.
          </h2>
          <p className="mt-6 max-w-[500px] text-[17px] leading-[27px] text-muted">
            سكورا مش ضد الذكاء الاصطناعي. إحنا بنقيس المطور فاهم الكود، يعرف
            يصلّحه، ويشرحه ولا لأ.
          </p>
          <Link
            href="/how-it-works"
            className="mt-8 inline-block text-[14px] font-bold text-primary hover:underline"
          >
            عايز تفهم الدرجة؟
          </Link>
        </div>
      </div>
    </section>
  );
}
