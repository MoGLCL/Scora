const proofItems = [
  { label: "بروفايل المبرمج", desc: "سجل شغل بيتحدّث باستمرار" },
  { label: "درجة الثقة", desc: "إشارة واضحة تقدر تفهمها" },
  { label: "نقط المهارة", desc: "نقط مبنية على شغلك" },
];

export function Proof() {
  return (
    <section className="mx-auto max-w-[1296px] px-6 md:px-8">
      <div className="border-t border-line pt-12">
        <div className="flex flex-col gap-10 lg:flex-row-reverse lg:items-start lg:justify-between">
          <dl className="flex flex-col gap-8 sm:flex-row sm:gap-0">
            {proofItems.map((item, i) => (
              <div
                key={item.label}
                className={`sm:w-[190px] sm:shrink-0 ${
                  i > 0 ? "sm:border-e sm:border-line sm:pe-6 sm:me-6" : ""
                }`}
              >
                <dt className="text-[15px] font-bold text-primary">
                  {item.label}
                </dt>
                <dd className="mt-3 text-[13px] leading-[19px] text-muted">
                  {item.desc}
                </dd>
              </div>
            ))}
          </dl>

          <div className="max-w-[440px]">
            <h2 className="text-[28px] text-ink">الثقة مش مجرد كلام.</h2>
            <p className="mt-3 text-[16px] leading-[24px] text-muted">
              كل إشارة في سكورا وراها دليل تقني تقدر تفهمه وتراجعه.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
