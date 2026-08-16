export function PageSkeleton() {
  return <div className="min-h-dvh bg-[#F7FAF8] px-6 py-10" dir="rtl">
    <div className="mx-auto max-w-[1296px] animate-pulse space-y-8">
      <div className="h-40 rounded-[28px] bg-[#E3ECE6]" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 rounded-[22px] bg-white border border-[#E3ECE6]" />)}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="h-80 rounded-[24px] bg-white border border-[#E3ECE6] lg:col-span-2" />
        <div className="h-80 rounded-[24px] bg-white border border-[#E3ECE6]" />
      </div>
    </div>
  </div>;
}
