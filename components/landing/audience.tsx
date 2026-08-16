const audiences = [
  {
    label: "للمطورين",
    title: "خلّي فهمك يبان",
    body: "حوّل شغلك الحقيقي لنقط موثّقة وبروفايل يفتحلك فرص أحسن.",
    bullets: ["تقييمات تقنية عادلة", "سجل شغل مستمر"],
  },
  {
    label: "لأصحاب المشاريع",
    title: "وظّف على أساس الدليل",
    body: "دَوّر على المبرمج المناسب، راجع بروفايله، وابدأ كلام وإنت فاهم درجة الثقة.",
    bullets: ["فلترة حسب المهارة", "نتائج تقدر تراجعها"],
  },
];

export function Audience() {
  return (
    <section className="mx-auto max-w-[1296px] px-6 py-20 md:px-8 lg:py-28">
      <div className="text-center">
        <p className="text-[15px] font-bold text-primary">
          كل واحد ليه قيمة في المعادلة
        </p>
        <h2 className="mt-3 text-[28px] text-ink md:text-[35px]">
          وظّف وانت واثق. خلّي شغلك يبان.
        </h2>
        <p className="mt-4 text-[16px] text-muted">
          تجربة أسهل للشركات، وسجل أقوى للمبرمجين.
        </p>
      </div>

      <div className="mt-14 grid gap-14 lg:grid-cols-2">
        {audiences.map((audience) => (
          <article
            key={audience.label}
            className="rounded-[26px] border border-line bg-background p-8 md:p-9"
          >
            <p className="text-[14px] font-bold text-primary">
              {audience.label}
            </p>
            <h3 className="mt-3 text-[26px] text-ink">{audience.title}</h3>
            <p className="mt-4 max-w-[470px] text-[15px] leading-[23px] text-muted">
              {audience.body}
            </p>

            <ul className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
              {audience.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="text-[13px] font-bold text-ink"
                >
                  <span aria-hidden className="text-primary">
                    
                  </span>{" "}
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
