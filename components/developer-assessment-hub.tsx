"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Code2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Search,
  Layers,
  ArrowLeft,
  Award,
  ShieldCheck,
  Clock,
  ChevronRight,
  Check
} from "lucide-react";
import { startDeveloperAssessment } from "@/lib/actions/developer-assessment";

export interface SkillItem {
  id: number;
  name: string;
  level?: string;
  sp?: number;
}

export interface PastAssessmentSession {
  id: number;
  publicId: string;
  status: string;
  track?: string;
  score: number | null;
  trustAwarded: number | null;
  spAwarded: number | null;
  startedAt: string;
  submittedAt: string | null;
  model: string | null;
  skills: string[];
}

const TRACKS_LIST = [
  "Frontend Engineer",
  "Backend Engineer",
  "Full-Stack Web Developer",
  "Game Developer (Unity / Unreal)",
  "Agentic AI Engineer",
  "Machine Learning & AI Engineer",
  "Mobile App Engineer (iOS/Android/Flutter)",
  "DevOps & Cloud Engineer",
  "Cybersecurity & Penetration Tester",
  "UI/UX & Product Designer",
  "Data Engineer",
  "QA & Automation Testing Engineer",
  "Systems Architect",
  "Database Administrator (DBA)"
];

const TRACK_RECOMMENDED_SKILLS: Record<string, string[]> = {
  "Frontend Engineer": [
    "JavaScript", "TypeScript", "React.js", "Next.js", "Vue.js", "Nuxt.js", "Angular", "Tailwind CSS", "HTML5", "CSS3", "Redux", "Zustand"
  ],
  "Backend Engineer": [
    "Node.js", "Express.js", "NestJS", "Python", "Django", "FastAPI", "Go", "Java", "Spring Boot", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "GraphQL", "REST APIs"
  ],
  "Full-Stack Web Developer": [
    "JavaScript", "TypeScript", "React.js", "Next.js", "Node.js", "Express.js", "PostgreSQL", "MongoDB", "Tailwind CSS", "REST APIs", "Git & GitHub"
  ],
  "Game Developer (Unity / Unreal)": [
    "C#", "C++", "Unity", "Unreal Engine", "3D Math", "Shader Programming", "Physics Engine", "Blender", "Game AI"
  ],
  "Agentic AI Engineer": [
    "Python", "LangChain", "LlamaIndex", "CrewAI", "AutoGen", "OpenAI APIs", "Anthropic APIs", "PyTorch", "FastAPI", "Ollama", "Vector DBs", "Docker"
  ],
  "Machine Learning & AI Engineer": [
    "Python", "PyTorch", "TensorFlow", "Scikit-learn", "Pandas", "NumPy", "OpenCV", "Hugging Face", "MLOps", "SQL"
  ],
  "Mobile App Engineer (iOS/Android/Flutter)": [
    "Flutter", "Dart", "React Native", "Swift", "SwiftUI", "Kotlin", "Android Jetpack", "Firebase", "REST APIs", "SQLite"
  ],
  "DevOps & Cloud Engineer": [
    "Docker", "Kubernetes", "AWS", "Google Cloud (GCP)", "Microsoft Azure", "CI/CD Actions", "Linux", "Terraform", "Ansible", "Nginx", "Prometheus", "Grafana"
  ],
  "Cybersecurity & Penetration Tester": [
    "Linux", "Python", "Wireshark", "Metasploit", "Burp Suite", "Nmap", "Network Security", "Cryptography", "Penetration Testing", "Shell / Bash"
  ],
  "UI/UX & Product Designer": [
    "Figma", "Adobe XD", "User Research", "Wireframing", "Prototyping", "Design Systems", "Tailwind CSS", "HTML5", "CSS3"
  ],
  "Data Engineer": [
    "Python", "SQL", "PostgreSQL", "Apache Spark", "Kafka", "Airflow", "Snowflake", "Docker", "AWS", "Redis", "Pandas"
  ],
  "QA & Automation Testing Engineer": [
    "Selenium", "Cypress", "Playwright", "Jest", "Vitest", "Postman", "JUnit", "Test Automation", "CI/CD Actions", "JavaScript", "Python"
  ],
  "Systems Architect": [
    "Microservices", "System Design", "Cloud Architecture", "Docker", "Kubernetes", "Design Patterns", "Kafka", "PostgreSQL", "NoSQL"
  ],
  "Database Administrator (DBA)": [
    "PostgreSQL", "MySQL", "MongoDB", "Oracle", "SQL Server", "Performance Tuning", "Replication", "Database Backup", "Redis"
  ]
};

export function DeveloperAssessmentHub({
  currentTrack,
  developerSkills,
  pastSessions,
  totalTrust,
  totalSp
}: {
  currentTrack: string;
  developerSkills: SkillItem[];
  pastSessions: PastAssessmentSession[];
  totalTrust: number;
  totalSp: number;
}) {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState<string>(currentTrack || "Full-Stack Web Developer");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    developerSkills.length > 0
      ? developerSkills.map((s) => s.name).slice(0, 5)
      : TRACK_RECOMMENDED_SKILLS[selectedTrack]?.slice(0, 5) || ["JavaScript", "TypeScript", "React.js"]
  );
  const [searchSkill, setSearchSkill] = useState("");
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Map of skills already tested with SP
  const testedSkillsMap = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const s of developerSkills) {
      if (typeof s.sp === "number" && s.sp > 0) {
        map.set(s.name.toLowerCase(), s.sp);
      }
    }
    return map;
  }, [developerSkills]);

  // Track change handler: update recommended skills
  const handleTrackChange = (newTrack: string) => {
    setSelectedTrack(newTrack);
    const recs = TRACK_RECOMMENDED_SKILLS[newTrack] || [];
    // Select first 5 recommended skills from new track
    if (recs.length > 0) {
      setSelectedSkills(recs.slice(0, 5));
    }
  };

  // Toggle single skill selection
  const toggleSkill = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((s) => s !== skillName)
        : [...prev, skillName]
    );
    setErrorMessage(null);
  };

  // Add custom skill
  const handleAddCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customSkillInput.trim();
    if (!clean) return;
    if (!selectedSkills.includes(clean)) {
      setSelectedSkills((prev) => [...prev, clean]);
    }
    setCustomSkillInput("");
    setErrorMessage(null);
  };

  // Start Assessment Handler
  const handleStartAssessment = () => {
    if (selectedSkills.length === 0) {
      setErrorMessage("يرجى اختيار مهارة واحدة على الأقل للاختبار");
      return;
    }

    startTransition(async () => {
      setErrorMessage(null);
      const res = await startDeveloperAssessment({
        track: selectedTrack,
        skills: selectedSkills,
      });

      if (!res.ok) {
        setErrorMessage(res.error || "تعذر بدء الاختبار حالياً");
      } else if (res.assessmentUrl) {
        router.push(res.assessmentUrl);
      }
    });
  };

  const availableTrackSkills = TRACK_RECOMMENDED_SKILLS[selectedTrack] || [];
  const filteredSkills = availableTrackSkills.filter((s) =>
    s.toLowerCase().includes(searchSkill.toLowerCase().trim())
  );

  return (
    <div className="space-y-10" dir="rtl">
      
      {/* Top Quick Stats Bar */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#526B5E]">درجة الثقة الحالية</div>
            <div className="text-2xl font-black text-[#056B38] mt-1">{totalTrust}%</div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#526B5E]">رصيد نقاط المهارة (SP)</div>
            <div className="text-2xl font-black text-amber-700 mt-1">{totalSp} SP</div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            <Award className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#526B5E]">إجمالي الاختبارات المكتملة</div>
            <div className="text-2xl font-black text-[#05291A] mt-1">{pastSessions.length} تقييم</div>
          </div>
          <div className="h-11 w-11 rounded-2xl bg-[#F0F5F2] text-[#05291A] flex items-center justify-center font-bold">
            <Code2 className="h-6 w-6" />
          </div>
        </div>
      </section>

      {/* Main Interactive Assessment Launcher */}
      <section className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 sm:p-8 shadow-xs space-y-7">
        <div className="border-b border-neutral-100 pb-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#E8FAF0] text-[#056B38] text-xs font-black mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>بوابة التقييم الذكي بالذكاء الاصطناعي</span>
          </div>
          <h2 className="text-2xl font-black text-[#05291A]">
            بدء تقييم مهارات جديد أو فحص تخصص وظيفي
          </h2>
          <p className="text-xs sm:text-sm text-[#526B5E] mt-1">
            اختر وظيفتك أو تخصصك البرمجي، وحدد المهارات التي ترغب باختبارها (سواء مهارة واحدة أو مجموعة مهارات معاً)، وسيقوم الذكاء الاصطناعي بتوليد أسئلة تقنية وسيناريوهات برمجية مخصصة.
          </p>
        </div>

        {/* 1. Track / Job Role Selector */}
        <div className="space-y-3">
          <label className="text-xs font-black text-[#05291A] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#056B38]" />
            <span>1. اختر التخصص / الوظيفة المستهدفة:</span>
          </label>

          <div className="flex flex-wrap gap-2">
            {TRACKS_LIST.map((track) => {
              const isSelected = selectedTrack === track;
              return (
                <button
                  key={track}
                  type="button"
                  onClick={() => handleTrackChange(track)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-[#056B38] text-white border-[#056B38] shadow-xs"
                      : "bg-[#F7FAF8] text-[#05291A] border-[#D1E3D6] hover:bg-[#E8FAF0] hover:border-[#056B38]"
                  }`}
                >
                  {track}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Skills Multi-Selection & Custom Skill Input */}
        <div className="space-y-4 pt-2 border-t border-neutral-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-black text-[#05291A] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#056B38]" />
              <span>2. حدد المهارات المراد اختبارها (Multi-Select Skills):</span>
            </label>

            {/* Quick Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchSkill}
                onChange={(e) => setSearchSkill(e.target.value)}
                placeholder="تصفية المهارات..."
                className="w-full rounded-xl border border-[#D1E3D6] pr-8 pl-3 py-1.5 text-xs bg-[#F7FAF8] focus:outline-none focus:border-[#056B38]"
              />
            </div>
          </div>

          {/* Recommended Skills Grid for Track */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-[#526B5E]">
              المهارات المقترحة لمسار <strong className="text-[#05291A]">{selectedTrack}</strong>:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {filteredSkills.map((skill) => {
                const isSelected = selectedSkills.includes(skill);
                const hasScore = testedSkillsMap.has(skill.toLowerCase());
                const currentSp = testedSkillsMap.get(skill.toLowerCase());

                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? "border-[#056B38] bg-[#E8FAF0] text-[#05291A] shadow-xs"
                        : "border-[#D1E3D6] bg-white text-[#526B5E] hover:border-neutral-400"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs">{skill}</span>
                      <div
                        className={`h-4 w-4 rounded-md border flex items-center justify-center ${
                          isSelected
                            ? "bg-[#056B38] border-[#056B38] text-white"
                            : "border-neutral-300"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] font-bold">
                      {hasScore ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          مقيّم سابقاً ({currentSp} SP)
                        </span>
                      ) : (
                        <span className="text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                          غير مقيّم بعد
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Skill Input Form */}
          <form onSubmit={handleAddCustomSkill} className="flex gap-2 items-center max-w-md pt-1">
            <input
              type="text"
              value={customSkillInput}
              onChange={(e) => setCustomSkillInput(e.target.value)}
              placeholder="إضافة مهارة أخرى مخصصة (مثال: Rust, Solidity, Kafka)..."
              className="flex-1 rounded-xl border border-[#D1E3D6] px-3.5 py-2 text-xs bg-[#F7FAF8] focus:outline-none focus:border-[#056B38]"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#056B38] hover:bg-[#005B27] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </form>

          {/* Selected Skills Chips */}
          <div className="pt-2">
            <div className="text-xs font-black text-[#05291A] mb-2">
              المهارات المحددة للاختبار ({selectedSkills.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedSkills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8FAF0] text-[#056B38] border border-[#C5E8D1] text-xs font-bold"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className="hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Start Assessment CTA */}
        <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#526B5E] font-medium">
            مدة الاختبار: <strong>45 دقيقة</strong> · أسئلة اختيار من متعدد، مقابلات تقنية، وسيناريوهات كود حية.
          </div>

          <button
            type="button"
            onClick={handleStartAssessment}
            disabled={isPending || selectedSkills.length === 0}
            className="w-full sm:w-auto px-8 h-12 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            <Code2 className="w-4 h-4" />
            <span>{isPending ? "جاري توليد الاختبار بالذكاء الاصطناعي..." : "بدء اختبار المهارات المحددة الآن"}</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 3. Detailed Assessment History & Completed Sessions */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-[#05291A]">سجل التقييمات السابقة والدرجات</h3>
            <p className="text-xs text-[#526B5E] mt-0.5">
              تفاصيل كافة الاختبارات التي تم إجراؤها مع درجات الثقة والنقاط المكتسبة.
            </p>
          </div>
          <span className="text-xs font-bold bg-[#E8FAF0] text-[#056B38] px-3 py-1 rounded-full border border-[#C5E8D1]">
            {pastSessions.length} سجل مسجل
          </span>
        </div>

        {pastSessions.length > 0 ? (
          <div className="grid gap-4">
            {pastSessions.map((session) => {
              const formattedDate = new Intl.DateTimeFormat("ar-EG", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              }).format(new Date(session.startedAt));

              const isInProgress = session.status === "in_progress";

              return (
                <article
                  key={session.id}
                  className="rounded-[24px] border border-[#D1E3D6] bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-[#056B38] transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-extrabold text-[#05291A] text-base">
                        {session.track || "تقييم مهارات برمجية"}
                      </h4>
                      <span className="text-[11px] font-mono text-[#526B5E]">
                        #{session.publicId}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          session.status === "approved"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : session.status === "in_progress"
                            ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                            : session.status === "admin_review"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {session.status === "approved"
                          ? "معتمد"
                          : session.status === "in_progress"
                          ? "جاري الاختبار"
                          : session.status === "admin_review"
                          ? "قيد المراجعة"
                          : session.status}
                      </span>
                    </div>

                    {/* Tested Skills */}
                    {session.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {session.skills.map((sk) => (
                          <span
                            key={sk}
                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F0F5F2] text-[#056B38]"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="text-xs text-[#526B5E] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Results & Actions */}
                  <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 border-neutral-100 gap-3">
                    <div className="flex items-center gap-3">
                      {session.score !== null && (
                        <div className="text-right">
                          <div className="text-[10px] text-[#526B5E] font-bold">النتيجة:</div>
                          <div className="text-lg font-black text-[#056B38]">{session.score}%</div>
                        </div>
                      )}

                      {session.spAwarded !== null && session.spAwarded > 0 && (
                        <div className="text-right">
                          <div className="text-[10px] text-[#526B5E] font-bold">نقاط SP:</div>
                          <div className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            +{session.spAwarded} SP
                          </div>
                        </div>
                      )}
                    </div>

                    {isInProgress && (
                      <Link
                        href={`/developer-assessment/${session.publicId}`}
                        className="px-5 py-2 rounded-full bg-[#056B38] text-white text-xs font-bold hover:bg-[#005B27] transition-all shadow-xs flex items-center gap-1"
                      >
                        <span>متابعة الاختبار</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#D1E3D6] bg-white p-10 text-center space-y-3">
            <Code2 className="w-10 h-10 text-[#056B38] mx-auto opacity-70" />
            <h4 className="text-base font-extrabold text-[#05291A]">لا توجد اختبارات سابقة مسجلة</h4>
            <p className="text-xs text-[#526B5E] max-w-md mx-auto">
              ابدأ أول تقييم لمهاراتك أعلاه لرفع نقاط الـ SP ودرجة الموثوقية (Trust Score) على المنصة.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
