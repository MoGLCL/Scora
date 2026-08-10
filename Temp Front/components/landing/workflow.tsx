const steps = [
  { number: "01", title: "دَوّر", desc: "فلتر حسب المهارة" },
  { number: "02", title: "اختبره", desc: "كود، إنترفيو، وتحليل" },
  { number: "03", title: "اتأكد", desc: "مراجعة بشرية لو احتاج" },
  { number: "04", title: "وظّف", desc: "بروفايل مهني تقدر تراجعه" },
];

export function Workflow() {
  return (
    <section className="mx-auto max-w-[1296px] px-6 py-20 md:px-8 lg:py-28">
      <div className="text-center">
        <p className="text-[15px] font-bold text-primary">
          رحلة واحدة من أول اختبار لحد التوظيف
        </p>
        <h2 className="mt-3 text-[28px] text-ink md:text-[35px]">
          من أول إشارة لقرار أوضح
        </h2>
        <p className="mt-4 text-[16px] text-muted">
          إحنا بنبسّط الموضوع في خطوات يفهمها الكل.
        </p>
      </div>

      <ol className="relative mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {/* Connecting line — desktop only, sits behind the step markers */}
        <div
          aria-hidden
          className="absolute inset-x-[12%] top-[35px] hidden h-0.5 bg-line lg:block"
        />

        {steps.map((step) => (
          <li key={step.number} className="relative text-center">
            <div className="mx-auto flex size-[70px] items-center justify-center rounded-full border-2 border-primary bg-background">
              <span className="technical text-[15px] text-primary">
                {step.number}
              </span>
            </div>
            <h3 className="mt-5 text-[20px] text-ink">{step.title}</h3>
            <p className="mt-2 text-[13px] leading-[19px] text-muted">
              {step.desc}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
