"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ExternalLink,
  ImageOff,
  Loader2,
  Star,
  Clock,
  Calendar,
  Code2,
  CheckCircle2,
  Layers,
  Sparkles
} from "lucide-react";
import { GithubIcon } from "@/components/auth/social-icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import { savePortfolioReview } from "@/lib/actions/portfolio";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { PortfolioProjectDetail } from "@/lib/portfolio-types";

export function PortfolioDetailClient({
  project,
  canReview,
  isOwner,
}: {
  project: PortfolioProjectDetail;
  canReview: boolean;
  isOwner: boolean;
}) {
  const { addToast } = useProfile();
  const [selectedImage, setSelectedImage] = useState(project.images[0]?.url ?? null);
  const [rating, setRating] = useState(project.currentUserReview?.rating ?? 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(project.currentUserReview?.comment ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const submitReview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rating) return;
    setIsSaving(true);
    const result = await savePortfolioReview({ projectId: project.id, rating, comment });
    setIsSaving(false);
    addToast(result.ok ? "تم حفظ تقييمك ومنح نقاط الـ SP للمطور" : result.error ?? "تعذر حفظ التقييم", result.ok ? "success" : "warn");
    if (result.ok) window.location.reload();
  };

  const activeStarRating = hoverRating || rating;

  return (
    <div className="min-h-screen bg-[#F7FAF8] text-[#05291A] font-body" dir="rtl">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1180px] px-5 py-8 md:px-8 md:py-12">
        {/* Breadcrumb Navigation */}
        <Link
          href={project.developerUsername ? `/profile/${project.developerUsername}` : `/developers/${project.developerId}`}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#056B38] hover:underline"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          <span>العودة إلى ملف المطور ({project.developerName})</span>
        </Link>

        <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          
          {/* Main Showcase Section */}
          <section className="min-w-0 rounded-[32px] border border-[#D1E3D6] bg-white p-6 sm:p-8 shadow-xs space-y-7">
            
            {/* Header Title & Actions */}
            <div className="flex flex-col gap-4 border-b border-[#E5EEE8] pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs font-bold text-[#056B38] bg-[#E8FAF0] border border-[#C5E8D1] px-3 py-1 rounded-full">
                    معرض الأعمال البرمجية
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                      project.projectStatus === "in_progress"
                        ? "bg-sky-50 text-sky-800 border border-sky-200"
                        : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        project.projectStatus === "in_progress" ? "bg-sky-500 animate-pulse" : "bg-emerald-500"
                      }`}
                    />
                    <span>
                      {project.projectStatus === "in_progress" ? "قيد التطوير والتحديث" : "مكتمل ومنشور"}
                    </span>
                  </span>

                  {/* Open Source Badge */}
                  {project.isOpenSource && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      <Code2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>مفتوح المصدر (Open Source)</span>
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-[#05291A] tracking-tight">{project.title}</h1>

                <div className="mt-2.5 flex items-center gap-2 text-xs text-[#526B5E]">
                  <span>بواسطة المطور:</span>
                  <Link
                    href={project.developerUsername ? `/profile/${project.developerUsername}` : `/developers/${project.developerId}`}
                    className="font-black text-[#056B38] hover:underline inline-flex items-center gap-1"
                  >
                    <span>{project.developerName}</span>
                    {project.developerUsername && <span className="text-[11px] font-mono text-[#526B5E]">(@{project.developerUsername})</span>}
                  </Link>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {project.previewUrl && (
                  <a
                    href={project.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-[#056B38] hover:bg-[#005B27] px-5 text-xs font-black text-white transition shadow-xs cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>المعاينة الحية</span>
                  </a>
                )}
                {project.githubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#D1E3D6] bg-white hover:bg-[#E8FAF0] px-4 text-xs font-black text-[#05291A] transition cursor-pointer"
                  >
                    <GithubIcon className="h-4 w-4 text-[#056B38]" />
                    <span>GitHub Repo</span>
                  </a>
                )}
              </div>
            </div>

            {/* Images Gallery */}
            <div>
              <div className="overflow-hidden rounded-[24px] bg-[#E8FAF0] border border-[#D1E3D6]">
                {selectedImage ? (
                  <Image
                    src={selectedImage}
                    alt={project.title}
                    width={1280}
                    height={720}
                    unoptimized
                    className="aspect-video h-auto max-h-[580px] w-full object-contain bg-black/5"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-[#526B5E]">
                    <ImageOff className="h-12 w-12 opacity-50" />
                  </div>
                )}
              </div>

              {project.images.length > 1 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {project.images.map((image) => (
                    <button
                      type="button"
                      key={image.id}
                      onClick={() => setSelectedImage(image.url)}
                      className={`relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition cursor-pointer ${
                        selectedImage === image.url ? "border-[#056B38] shadow-xs" : "border-[#D1E3D6] hover:border-[#056B38]/50"
                      }`}
                    >
                      <Image src={image.url} alt={image.altText ?? project.title} fill unoptimized sizes="120px" className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Execution Lifecycle Info Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#F7FAF8] rounded-[20px] border border-[#D1E3D6]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-[#D1E3D6] flex items-center justify-center text-[#056B38] shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#526B5E]">مدة التنفيذ:</div>
                  <div className="text-xs font-black text-[#05291A]">{project.executionTime || "غير محددة"}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-[#D1E3D6] flex items-center justify-center text-[#056B38] shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#526B5E]">تاريخ البداية:</div>
                  <div className="text-xs font-black text-[#05291A]">{project.startDate || "غير محدد"}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-[#D1E3D6] flex items-center justify-center text-[#056B38] shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-[#526B5E]">نوع المصدر:</div>
                  <div className="text-xs font-black text-[#05291A]">{project.isOpenSource ? "مفتوح المصدر" : "مغلق / خاص"}</div>
                </div>
              </div>
            </div>

            {/* Project Description (Markdown Rendered) */}
            <div className="space-y-3 pt-2">
              <h2 className="text-lg font-black text-[#05291A] flex items-center gap-2">
                <Code2 className="w-5 h-5 text-[#056B38]" />
                <span>تفاصيل ومعمارية المشروع</span>
              </h2>

              <div className="p-6 rounded-[24px] bg-[#F7FAF8] border border-[#D1E3D6]">
                {project.description ? (
                  <MarkdownRenderer content={project.description} />
                ) : (
                  <p className="text-xs text-[#526B5E] italic">لا يوجد وصف إضافي للمشروع.</p>
                )}
              </div>
            </div>

            {/* Technologies */}
            {project.technologies.length > 0 && (
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black text-[#05291A]">التقنيات واللغات المستخدمة:</h3>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full bg-[#E8FAF0] border border-[#C5E8D1] px-3.5 py-1.5 text-xs font-black text-[#056B38]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </section>

          {/* Sidebar Section: Ratings & Reviews */}
          <aside className="space-y-6">
            
            {/* Overall Rating Box */}
            <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-3">
              <p className="text-xs font-bold text-[#526B5E]">التقييم العام للمشروع</p>
              
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black text-[#056B38]">
                  {project.averageRating > 0 ? project.averageRating.toFixed(1) : "—"}
                </span>
                <div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={`h-4 w-4 ${
                          value <= Math.round(project.averageRating)
                            ? "fill-amber-400 text-amber-500"
                            : "text-[#D1E3D6]"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-[#526B5E] font-bold">{project.reviewCount} تقييم مسجل</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 font-bold leading-relaxed flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>كل نجمة تقييم تمنحها للمشروع تزيد رصيد نقاط المهارة (SP) للمطور لدعم ملفه!</span>
              </div>
            </section>

            {/* Rate & Review Form */}
            {canReview && (
              <form
                onSubmit={submitReview}
                className="space-y-4 rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs"
              >
                <div>
                  <h2 className="text-base font-black text-[#05291A]">تقييم المشروع</h2>
                  <p className="text-xs text-[#526B5E] mt-0.5">شارك رأيك وقيّم جودة العمل البرمجي.</p>
                </div>

                {/* Stars Interactive Selector */}
                <div>
                  <label className="mb-2 block text-xs font-black text-[#05291A]">
                    اختر عدد النجوم:
                  </label>
                  <div className="flex items-center gap-1.5 p-3 bg-[#F7FAF8] rounded-2xl border border-[#D1E3D6] justify-center">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setRating(val)}
                        onMouseEnter={() => setHoverRating(val)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            val <= activeStarRating
                              ? "fill-amber-400 text-amber-500"
                              : "text-neutral-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Textarea */}
                <div>
                  <label htmlFor="review-comment" className="mb-1.5 block text-xs font-black text-[#05291A]">
                    تعليقك أو مراجعتك (اختياري):
                  </label>
                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="ما رأيك في الكود، التصميم، أو الأداء؟"
                    className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs leading-relaxed outline-none focus:border-[#056B38] bg-[#F7FAF8]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!rating || isSaving}
                  className="w-full h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{project.currentUserReview ? "تحديث التقييم" : "إرسال التقييم"}</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {!canReview && !isOwner && (
              <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 text-xs leading-relaxed text-[#526B5E] shadow-xs text-center">
                <p>سجّل الدخول بحسابك لتقييم المشروع وإضافة تعليق ومنح نقاط الـ SP.</p>
                <Link
                  href="/login"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-[#056B38] px-5 font-bold text-white text-xs"
                >
                  تسجيل الدخول
                </Link>
              </div>
            )}

            {/* Reviews List */}
            <section className="space-y-3">
              <h2 className="text-sm font-black text-[#05291A]">التقييمات والتعليقات ({project.reviews.length})</h2>

              {project.reviews.length > 0 ? (
                <div className="space-y-3">
                  {project.reviews.map((rev) => (
                    <article
                      key={rev.id}
                      className="rounded-[20px] border border-[#D1E3D6] bg-white p-4 shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="relative h-8 w-8 rounded-full bg-[#E8FAF0] border border-[#C5E8D1] flex items-center justify-center text-[#056B38] text-xs font-bold overflow-hidden shrink-0">
                            {rev.reviewerAvatarUrl ? (
                              <Image src={rev.reviewerAvatarUrl} alt={rev.reviewerName} fill unoptimized sizes="32px" className="object-cover" />
                            ) : (
                              <span>{rev.reviewerName.slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-black text-[#05291A]">{rev.reviewerName}</p>
                            <p className="text-[10px] text-[#526B5E]">{rev.reviewerRole}</p>
                          </div>
                        </div>

                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <Star
                              key={val}
                              className={`h-3.5 w-3.5 ${
                                val <= rev.rating ? "fill-amber-400 text-amber-500" : "text-neutral-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-[#365647] leading-relaxed bg-[#F7FAF8] p-3 rounded-xl border border-[#D1E3D6]/50">
                          {rev.comment}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#D1E3D6] bg-white p-6 text-center text-xs text-[#526B5E]">
                  لا توجد مراجعات أو تقييمات بعد؛ كن أول من يقيّم هذا المشروع!
                </div>
              )}
            </section>

          </aside>

        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
