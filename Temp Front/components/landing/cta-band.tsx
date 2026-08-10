import Link from "next/link";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-[1296px] px-6 pb-20 md:px-8">
      <div className="rounded-[28px] border-[1.4px] border-primary bg-background px-6 py-12 text-center">
        <p className="text-[14px] font-bold text-primary">
          جاهز تبدأ بدليل حقيقي؟
        </p>
        <h2 className="mt-2 text-[26px] text-ink md:text-[32px]">
          ابدأ أول خطوة لتوظيف أذكى
        </h2>
        <Link
          href="/register"
          className="mt-8 inline-block rounded-full bg-primary px-14 py-4 text-[15px] font-bold text-white transition-colors hover:bg-green-800"
        >
          ابدأ مع سكورا
        </Link>
      </div>
    </section>
  );
}
