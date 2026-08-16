"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  ImagePlus,
  Loader2,
  Plus,
  X,
  Code2,
  Calendar,
  Clock,
  CheckCircle2,
  Eye,
  Edit3
} from "lucide-react";
import { GithubIcon } from "@/components/auth/social-icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useProfile } from "@/components/profile-provider";
import { createPortfolioProject } from "@/lib/actions/portfolio";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CustomSelect } from "@/components/custom-select";

export default function NewPortfolioProjectPage() {
  const { addToast, userRole, username } = useProfile();
  const router = useRouter();
  
  // Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [previewTab, setPreviewTab] = useState<"write" | "preview">("write");

  // Links & Open Source
  const [previewUrl, setPreviewUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [isOpenSource, setIsOpenSource] = useState(false);

  // Execution Lifecycle & Status
  const [projectStatus, setProjectStatus] = useState<"completed" | "in_progress">("completed");
  const [executionTime, setExecutionTime] = useState("");
  const [startDate, setStartDate] = useState("");

  // Technologies & Images
  const [technologyInput, setTechnologyInput] = useState("");
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  // Read SSD Agent draft if redirected from AI Assistant
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem("scora_ai_portfolio_draft") || sessionStorage.getItem("scora_ai_project_draft");
        if (raw) {
          const draft: Record<string, unknown> = JSON.parse(raw);
          if (typeof draft.title === "string") setTitle(draft.title);
          if (typeof draft.description === "string") setDescription(draft.description);
          if (typeof draft.previewUrl === "string") setPreviewUrl(draft.previewUrl);
          if (typeof draft.githubUrl === "string") setGithubUrl(draft.githubUrl);
          if (typeof draft.executionTime === "string") setExecutionTime(draft.executionTime);
          if (typeof draft.startDate === "string") setStartDate(draft.startDate);
          if (typeof draft.isOpenSource === "boolean") setIsOpenSource(draft.isOpenSource);
          if (draft.projectStatus === "completed" || draft.projectStatus === "in_progress") {
            setProjectStatus(draft.projectStatus);
          }
          if (Array.isArray(draft.skills)) {
            setTechnologies(draft.skills.filter((skill): skill is string => typeof skill === "string").slice(0, 20));
          }
          addToast("تمت تعبئة بيانات المشروع بواسطة مساعد SSD الذكي 🚀", "info");
          sessionStorage.removeItem("scora_ai_portfolio_draft");
        }
      } catch {
        // Storage access blocked or invalid JSON
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [addToast]);

  if (userRole !== "developer") {
    return (
      <div className="min-h-screen bg-[#F7FAF8] text-[#05291A]" dir="rtl">
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-5 text-center">
          <h1 className="text-2xl font-black">إضافة المشاريع للمطورين فقط</h1>
          <p className="mt-3 leading-7 text-[#526B5E]">سجّل الدخول بحساب مطور معتمد لإضافة مشروع إلى معرض الأعمال.</p>
          <Link href="/login" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#056B38] px-5 font-bold text-white">
            تسجيل الدخول
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const addTechnology = () => {
    const value = technologyInput.trim();
    if (value && !technologies.includes(value) && technologies.length < 20) {
      setTechnologies((current) => [...current, value]);
      setTechnologyInput("");
    }
  };

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    setDescription((prev) => {
      if (!prev) return `${prefix}نص تجريبي${suffix}`;
      const needsNewline = prefix.startsWith("#") || prefix.startsWith("-") || prefix.startsWith(">") || prefix.startsWith("`");
      const sep = needsNewline && !prev.endsWith("\n") ? "\n\n" : " ";
      return `${prev}${sep}${prefix}نص تجريبي${suffix}`;
    });
  };

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    setFiles((current) => [...current, ...next].slice(0, 8));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("previewUrl", previewUrl);
    formData.set("githubUrl", githubUrl);
    formData.set("isOpenSource", isOpenSource ? "true" : "false");
    formData.set("projectStatus", projectStatus);
    formData.set("executionTime", executionTime);
    formData.set("startDate", startDate);

    technologies.forEach((technology) => formData.append("technologies", technology));
    files.forEach((file) => formData.append("images", file));

    const result = await createPortfolioProject(formData);
    setIsSubmitting(false);

    if (!result.ok) {
      addToast(result.error ?? "تعذر حفظ المشروع", "warn");
      return;
    }

    addToast("تم نشر مشروعك في معرض الأعمال بنجاح", "success");
    router.push(`/portfolio/${result.projectId}`);
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] text-[#05291A]" dir="rtl">
      <SiteHeader />
      
      <main className="mx-auto w-full max-w-[1040px] px-5 py-8 md:px-8 md:py-12">
        <Link
          href={username ? `/profile/${username}` : "/profile"}
          className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-[#056B38] hover:underline"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" /> العودة إلى الملف الشخصي
        </Link>

        <div className="mt-4 mb-8 border-b border-[#D1E3D6] pb-6">
          <p className="text-xs font-bold text-[#056B38]">معرض الأعمال والمشاريع البرمجية</p>
          <h1 className="mt-1 text-3xl font-black text-[#05291A] md:text-4xl">إضافة مشروع جديد للمعرض</h1>
          <p className="mt-2 text-xs text-[#526B5E]">
            اعرض تفاصيل مشروعك، مدة وتاريخ التنفيذ، هل هو مفتوح المصدر، مع وصف متكامل بتنسيق Markdown لجذب التقييمات وزيادة نقاط الـ SP الخاصة بك.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_360px]">
          
          {/* Main Column */}
          <section className="space-y-6 rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs md:p-8">
            
            {/* Title */}
            <div>
              <label htmlFor="project-title" className="mb-2 block text-xs font-black text-[#05291A]">
                عنوان أو اسم المشروع *
              </label>
              <input
                id="project-title"
                required
                minLength={3}
                maxLength={255}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="مثال: منصة تجارة إلكترونية متكاملة مع بوابات دفع ذكية"
                className="h-12 w-full rounded-2xl border border-[#D1E3D6] px-4 text-xs font-bold text-[#05291A] outline-none transition focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/15 bg-[#F7FAF8]"
              />
            </div>

            {/* Description with Markdown Support */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="project-description" className="block text-xs font-black text-[#05291A]">
                  وصف المشروع بالتفصيل (يدعم Markdown) *
                </label>

                {/* Tab Switcher: Write vs Preview */}
                <div className="flex items-center gap-1 bg-[#F7FAF8] p-1 rounded-xl border border-[#D1E3D6]">
                  <button
                    type="button"
                    onClick={() => setPreviewTab("write")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      previewTab === "write" ? "bg-[#056B38] text-white" : "text-[#526B5E] hover:text-[#05291A]"
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>تحرير Markdown</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("preview")}
                    className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      previewTab === "preview" ? "bg-[#056B38] text-white" : "text-[#526B5E] hover:text-[#05291A]"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>معاينة فورية</span>
                  </button>
                </div>
              </div>

              {/* Markdown Toolbar (when in write mode) */}
              {previewTab === "write" && (
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => insertMarkdown("**", "**")}
                    className="px-3 py-1.5 rounded-lg border border-[#D1E3D6] bg-white text-xs font-black text-[#05291A] hover:bg-[#E8FAF0] transition-colors cursor-pointer shadow-2xs"
                  >
                    B عريض
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("*", "*")}
                    className="px-3 py-1.5 rounded-lg border border-[#D1E3D6] bg-white text-xs italic font-bold text-[#05291A] hover:bg-[#E8FAF0] transition-colors cursor-pointer shadow-2xs"
                  >
                    I مائل
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("## ")}
                    className="px-3 py-1.5 rounded-lg border border-[#D1E3D6] bg-white text-xs font-bold text-[#05291A] hover:bg-[#E8FAF0] transition-colors cursor-pointer shadow-2xs"
                  >
                    H2 عنوان
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("- ")}
                    className="px-3 py-1.5 rounded-lg border border-[#D1E3D6] bg-white text-xs font-bold text-[#05291A] hover:bg-[#E8FAF0] transition-colors cursor-pointer shadow-2xs"
                  >
                    • قائمة
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("```javascript\n", "\n```")}
                    className="px-3 py-1.5 rounded-lg border border-[#D1E3D6] bg-white text-xs font-mono font-bold text-[#05291A] hover:bg-[#E8FAF0] transition-colors cursor-pointer shadow-2xs"
                  >
                    &lt;/&gt; كود
                  </button>
                  <button
                    type="button"
                    onClick={() => insertMarkdown("> ")}
                    className="px-3 py-1.5 rounded-lg border border-[#D1E3D6] bg-white text-xs font-bold text-[#05291A] hover:bg-[#E8FAF0] transition-colors cursor-pointer shadow-2xs"
                  >
                    &ldquo; اقتباس
                  </button>
                </div>
              )}

              {previewTab === "write" ? (
                <textarea
                  id="project-description"
                  required
                  dir="auto"
                  style={{ unicodeBidi: "plaintext", textAlign: "right" }}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={8}
                  maxLength={10000}
                  placeholder={`اكتب تفاصيل المشروع، التحديات التي واجهتك، الحلول المعمارية، والمميزات الرئيسية...\n\n## المميزات الرئيسية:\n- ميزة رقم 1\n- ميزة رقم 2\n\n\`\`\`typescript\n// مثال على الكود المستخدم\n\`\`\``}
                  className="w-full resize-y rounded-2xl border border-[#D1E3D6] p-4 text-sm font-body font-normal text-[#05291A] leading-relaxed outline-none transition focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/15 bg-[#F7FAF8]"
                />
              ) : (
                <div className="min-h-[200px] p-5 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] overflow-y-auto">
                  {description.trim() ? (
                    <MarkdownRenderer content={description} />
                  ) : (
                    <p className="text-xs text-neutral-400 italic">لا يوجد محتوى للمعاينة بعد؛ ابدأ بكتابة الوصف في تبويب التحرير.</p>
                  )}
                </div>
              )}
            </div>

            {/* Execution Lifecycle Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
              
              {/* Project Status */}
              <div>
                <label className="mb-2 block text-xs font-black text-[#05291A]">
                  حالة المشروع الحالية *
                </label>
                <CustomSelect
                  value={projectStatus}
                  onChange={(val) => setProjectStatus(val as "completed" | "in_progress")}
                  size="lg"
                  options={[
                    { value: "completed", label: "مكتمل ومنشور (Completed)" },
                    { value: "in_progress", label: "قيد التطوير والتحديث المستمر (In Progress)" },
                  ]}
                />
              </div>

              {/* Execution Time */}
              <div>
                <label htmlFor="execution-time" className="mb-2 block text-xs font-black text-[#05291A]">
                  مدة تنفيذ المشروع
                </label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#526B5E]" />
                  <input
                    id="execution-time"
                    type="text"
                    value={executionTime}
                    onChange={(e) => setExecutionTime(e.target.value)}
                    placeholder="مثال: أسبوعان، شهر، 3 أشهر..."
                    className="h-12 w-full rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-bold outline-none bg-[#F7FAF8] focus:border-[#056B38]"
                  />
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label htmlFor="start-date" className="mb-2 block text-xs font-black text-[#05291A]">
                  تاريخ بداية العمل
                </label>
                <div className="relative">
                  <Calendar className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#526B5E]" />
                  <input
                    id="start-date"
                    type="text"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="مثال: يناير 2026 أو 2026-01-15"
                    className="h-12 w-full rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-bold outline-none bg-[#F7FAF8] focus:border-[#056B38]"
                  />
                </div>
              </div>

              {/* Open Source Switch */}
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 h-12 px-4 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] cursor-pointer hover:bg-[#E8FAF0] transition-colors">
                  <input
                    type="checkbox"
                    checked={isOpenSource}
                    onChange={(e) => setIsOpenSource(e.target.checked)}
                    className="accent-[#056B38] w-4 h-4"
                  />
                  <div className="text-xs font-black text-[#05291A] flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-[#056B38]" />
                    <span>مشروع مفتوح المصدر (Open Source)</span>
                  </div>
                </label>
              </div>

            </div>

            {/* Links: Preview URL & GitHub Repository */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
              <div>
                <label htmlFor="preview-url" className="mb-2 block text-xs font-black text-[#05291A]">
                  رابط المعاينة الحية (Live Demo)
                </label>
                <div className="relative">
                  <ExternalLink className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#526B5E]" />
                  <input
                    id="preview-url"
                    type="url"
                    value={previewUrl}
                    onChange={(event) => setPreviewUrl(event.target.value)}
                    placeholder="https://myproject.com"
                    className="h-12 w-full rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-mono font-bold outline-none bg-[#F7FAF8] focus:border-[#056B38] dir-ltr text-right"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="github-url" className="mb-2 block text-xs font-black text-[#05291A]">
                  رابط المستودع البرمجي (GitHub / GitLab)
                </label>
                <div className="relative">
                  <GithubIcon className="pointer-events-none absolute right-3.5 top-3.5 h-4 w-4 text-[#526B5E]" />
                  <input
                    id="github-url"
                    type="url"
                    value={githubUrl}
                    onChange={(event) => setGithubUrl(event.target.value)}
                    placeholder="https://github.com/username/project"
                    className="h-12 w-full rounded-2xl border border-[#D1E3D6] pr-10 pl-4 text-xs font-mono font-bold outline-none bg-[#F7FAF8] focus:border-[#056B38] dir-ltr text-right"
                  />
                </div>
              </div>
            </div>

            {/* Technologies Tags */}
            <div>
              <label htmlFor="technologies" className="mb-2 block text-xs font-black text-[#05291A]">
                التقنيات المستخدمة
              </label>
              <div className="flex gap-2">
                <input
                  id="technologies"
                  value={technologyInput}
                  onChange={(event) => setTechnologyInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTechnology();
                    }
                  }}
                  placeholder="مثال: Next.js, PostgreSQL, Tailwind CSS..."
                  className="h-12 flex-1 rounded-2xl border border-[#D1E3D6] px-4 text-xs font-bold outline-none bg-[#F7FAF8] focus:border-[#056B38]"
                />
                <button
                  type="button"
                  onClick={addTechnology}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#056B38] hover:bg-[#005B27] px-5 text-xs font-bold text-white transition cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة</span>
                </button>
              </div>
              {technologies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {technologies.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#E8FAF0] border border-[#C5E8D1] px-3.5 py-1.5 text-xs font-bold text-[#056B38]"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => setTechnologies((current) => current.filter((item) => item !== tech))}
                        className="text-neutral-400 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

          </section>

          {/* Sidebar Column: Images Upload & Submit */}
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-xs space-y-4">
              <div>
                <p className="text-xs font-black text-[#05291A]">لقطات وصور المشروع *</p>
                <p className="mt-1 text-[11px] text-[#526B5E]">
                  الصورة الأولى ستكون الغلاف الرئيسي للبطاقة (حتى 8 صور).
                </p>
              </div>

              <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#056B38]/30 bg-[#F7FAF8] p-4 text-center transition hover:border-[#056B38] hover:bg-[#E8FAF0]/40">
                <ImagePlus className="h-7 w-7 text-[#056B38]" />
                <span className="mt-2 text-xs font-bold text-[#056B38]">اختر صورًا لرفعها</span>
                <span className="mt-1 text-[10px] text-[#526B5E]">PNG, JPG, WebP حتى 6MB</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleFiles(event.target.files)}
                  className="hidden"
                />
              </label>

              {previews.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {previews.map((preview, index) => (
                    <div key={preview.url} className="relative aspect-video overflow-hidden rounded-xl border border-[#D1E3D6]">
                      <Image src={preview.url} alt="Preview" fill unoptimized sizes="(max-width: 640px) 50vw, 180px" className="object-cover" />
                      {index === 0 && (
                        <span className="absolute bottom-1 right-1 rounded-md bg-[#056B38] px-1.5 py-0.5 text-[9px] font-black text-white">
                          الغلاف
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                        className="absolute left-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/90 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري النشر...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>نشر المشروع في المعرض</span>
                  </>
                )}
              </button>
            </div>
          </aside>

        </form>
      </main>

      <SiteFooter />
    </div>
  );
}
