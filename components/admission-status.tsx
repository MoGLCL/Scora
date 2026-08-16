"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  PlayCircle,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
  Code2,
  Edit3,
  Plus,
  Search,
  CheckCircle2,
  Layers
} from "lucide-react";
import { CustomSelect } from "@/components/custom-select";
import {
  requestReassessmentByDeveloper,
  startDeveloperAssessment,
  updateDeveloperAssessmentSkills
} from "@/lib/actions/developer-assessment";

import { useProfile } from "@/components/profile-provider";

// Comprehensive Specialty Tracks
const TRACKS_LIST = [
  "Full-Stack Web Developer",
  "Frontend Engineer",
  "Backend Engineer",
  "Agentic AI Engineer",
  "Machine Learning & AI Engineer",
  "Mobile App Engineer (iOS/Android/Flutter)",
  "DevOps & Cloud Engineer",
  "Cybersecurity & Penetration Tester",
  "UI/UX & Product Designer",
  "Data Engineer",
  "Data Scientist & Analyst",
  "Embedded Systems & IoT Engineer",
  "Blockchain & Web3 Developer",
  "Game Developer (Unity / Unreal)",
  "QA & Automation Testing Engineer",
  "Site Reliability Engineer (SRE)",
  "Systems Architect",
  "Database Administrator (DBA)"
];

const TRACK_RECOMMENDED_SKILLS: Record<string, string[]> = {
  "Full-Stack Web Developer": [
    "JavaScript", "TypeScript", "React.js", "Next.js", "Node.js", "Express.js", "PostgreSQL", "MongoDB", "Tailwind CSS", "REST APIs", "Git & GitHub"
  ],
  "Frontend Engineer": [
    "JavaScript", "TypeScript", "React.js", "Next.js", "Vue.js", "Nuxt.js", "Angular", "Tailwind CSS", "HTML5", "CSS3", "Redux", "Zustand"
  ],
  "Backend Engineer": [
    "Node.js", "Express.js", "NestJS", "Python", "Django", "FastAPI", "Go", "Java", "Spring Boot", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "GraphQL", "REST APIs"
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
  "Data Scientist & Analyst": [
    "Python", "R", "SQL", "Pandas", "NumPy", "Power BI", "Tableau", "Scikit-learn", "Statistics", "Data Visualization"
  ],
  "Embedded Systems & IoT Engineer": [
    "C++", "C#", "C", "Arduino", "Raspberry Pi", "RTOS", "Microcontrollers", "IoT Protocols", "Linux"
  ],
  "Blockchain & Web3 Developer": [
    "Solidity", "Rust", "Ethereum", "Smart Contracts", "Web3.js", "Ethers.js", "Hardhat", "Truffle", "DeFi"
  ],
  "Game Developer (Unity / Unreal)": [
    "C#", "C++", "Unity", "Unreal Engine", "3D Math", "Shader Programming", "Physics Engine", "Blender"
  ],
  "QA & Automation Testing Engineer": [
    "Selenium", "Cypress", "Playwright", "Jest", "Vitest", "Postman", "JUnit", "Test Automation", "CI/CD Actions", "JavaScript", "Python"
  ],
  "Site Reliability Engineer (SRE)": [
    "Kubernetes", "Docker", "Linux", "Prometheus", "Grafana", "Terraform", "Go", "Python", "AWS"
  ],
  "Systems Architect": [
    "Microservices", "System Design", "Cloud Architecture", "Docker", "Kubernetes", "Design Patterns", "Kafka", "PostgreSQL", "NoSQL"
  ],
  "Database Administrator (DBA)": [
    "PostgreSQL", "MySQL", "MongoDB", "Oracle", "SQL Server", "Performance Tuning", "Replication", "Database Backup", "Redis"
  ]
};

const MASTER_SKILLS_POOL = [
  "JavaScript", "TypeScript", "Python", "C++", "C#", "Java", "Go", "Rust", "PHP", 
  "Swift", "Kotlin", "Dart", "Ruby", "SQL", "HTML5", "CSS3", "R", "Scala", "Elixir", "Shell / Bash",
  "React.js", "Next.js", "Vue.js", "Nuxt.js", "Angular", "Svelte", "Tailwind CSS", 
  "Bootstrap", "React Native", "Flutter", "SwiftUI", "Android Jetpack", "Electron", "Redux", "Zustand",
  "Node.js", "Express.js", "NestJS", "FastAPI", "Django", "Flask", "Spring Boot", 
  "ASP.NET Core", "Laravel", "Symfony", "Gin (Go)", "Ruby on Rails", "GraphQL", "REST APIs", "gRPC", "WebSockets",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite", "Supabase", "Firebase", 
  "Elasticsearch", "Cassandra", "Neo4j", "MariaDB", "DynamoDB", "Prisma", "TypeORM",
  "PyTorch", "TensorFlow", "Scikit-learn", "LangChain", "LlamaIndex", "Hugging Face", 
  "OpenAI APIs", "Anthropic APIs", "OpenCV", "Pandas", "NumPy", "Ollama", "CrewAI", "AutoGen",
  "Docker", "Kubernetes", "AWS", "Google Cloud (GCP)", "Microsoft Azure", "CI/CD Actions", 
  "Linux", "Nginx", "Terraform", "Ansible", "Prometheus", "Grafana", "Kafka", "RabbitMQ",
  "Git & GitHub", "GitLab", "Jira", "Figma", "Adobe XD", "Postman", "Vitest", "Jest", "Cypress", "Playwright",
  "Selenium", "Solidity", "Smart Contracts", "Web3.js", "Unity", "Unreal Engine", "Odoo", "SAP ABAP", "Salesforce"
];

export function AdmissionStatus() {
  const router = useRouter();
  const { developer, updateDeveloper } = useProfile();
  const [status, setStatus] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState<string>(() => developer?.jobTitle || "Full-Stack Web Developer");
  const [skills, setSkills] = useState<string[]>(() => (developer?.skills && developer.skills.length > 0 ? developer.skills : []));
  const [remainingSkillsChanges, setRemainingSkillsChanges] = useState<number>(2);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reassessmentReason, setReassessmentReason] = useState<string | null>(null);
  const [loadingTest, setLoadingTest] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);

  // Skills Editing Modal States
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [editTrack, setEditTrack] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [isSkillSearchDropdownOpen, setIsSkillSearchDropdownOpen] = useState(false);
  const [skillsSubmitting, setSkillsSubmitting] = useState(false);
  const skillSearchBoxRef = useRef<HTMLDivElement>(null);

  const isStartingRef = useRef(false);
  const isSavingSkillsRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/developer-admission/status", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const currentStatus = data.status || "pending";
      setStatus(currentStatus);
      if (data.jobTitle) setJobTitle(data.jobTitle);
      if (Array.isArray(data.skills) && data.skills.length > 0) setSkills(data.skills);
      if (typeof data.remainingSkillsChanges === "number") setRemainingSkillsChanges(data.remainingSkillsChanges);
      if (data.reassessmentReason) setReassessmentReason(data.reassessmentReason);

      if (data.assessmentUrl) {
        router.replace(data.assessmentUrl);
        return;
      }

      if (currentStatus === "approved") {
        router.replace("/profile");
        return;
      }
    } catch {
      // Ignore background network issues
    }
  }, [router]);

  // Initial load once on mount
  useEffect(() => {
    const timer = window.setTimeout(() => void fetchStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [fetchStatus]);

  // Polling ONLY when waiting for admin decision (admin_review or reset_requested)
  useEffect(() => {
    if (status !== "admin_review" && status !== "reset_requested") return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void fetchStatus();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [status, fetchStatus]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (skillSearchBoxRef.current && !skillSearchBoxRef.current.contains(e.target as Node)) {
        setIsSkillSearchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleManualStart = async () => {
    if (loadingTest || isStartingRef.current) return;
    isStartingRef.current = true;
    setLoadingTest(true);
    setError("");
    setSuccessMessage("");
    try {
      const result = await startDeveloperAssessment();
      if (result && result.ok && result.assessmentUrl) {
        router.replace(result.assessmentUrl);
      } else if (result && !result.ok) {
        setError(result.error);
        setLoadingTest(false);
        isStartingRef.current = false;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء إنشاء وتوليد الاختبار");
      setLoadingTest(false);
      isStartingRef.current = false;
    }
  };

  const handleOpenSkillsModal = () => {
    const currentTrack = jobTitle || developer?.jobTitle || "Full-Stack Web Developer";
    const currentSkills = skills.length > 0 ? skills : (developer?.skills && developer.skills.length > 0 ? developer.skills : []);
    setEditTrack(currentTrack);
    setEditSkills([...currentSkills]);
    setSkillSearch("");
    setError("");
    setSuccessMessage("");
    setSkillsModalOpen(true);
  };

  const handleToggleSkill = (skillName: string) => {
    if (editSkills.includes(skillName)) {
      setEditSkills(editSkills.filter((s) => s !== skillName));
    } else {
      if (editSkills.length >= 12) return;
      setEditSkills([...editSkills, skillName]);
    }
  };

  const handleSaveSkills = async () => {
    if (editSkills.length === 0) {
      setError("يجب اختيار مهارة واحدة على الأقل للاختبار.");
      return;
    }
    if (skillsSubmitting || isSavingSkillsRef.current) return;
    isSavingSkillsRef.current = true;
    setSkillsSubmitting(true);
    setError("");
    try {
      const res = await updateDeveloperAssessmentSkills({
        skills: editSkills,
        jobTitle: editTrack
      });
      setSkillsSubmitting(false);
      isSavingSkillsRef.current = false;
      if (!res.ok) {
        setError(res.error);
      } else {
        setSkills(res.skills);
        setJobTitle(res.jobTitle);
        setEditSkills(res.skills);
        updateDeveloper({
          jobTitle: res.jobTitle,
          skills: res.skills
        });
        setRemainingSkillsChanges(res.remainingChanges);
        setSkillsModalOpen(false);
        setSuccessMessage(`تم حفظ وتثبيت المهارات المختارة بنجاح! متبقي لك الآن ${res.remainingChanges} تغيير.`);
      }
    } catch (err: unknown) {
      setSkillsSubmitting(false);
      isSavingSkillsRef.current = false;
      setError(err instanceof Error ? err.message : "تعذر حفظ المهارات");
    }
  };

  const handleSendReassessmentRequest = async () => {
    setRequestSubmitting(true);
    setError("");
    const res = await requestReassessmentByDeveloper(requestReason);
    setRequestSubmitting(false);
    if (!res.ok) {
      setError(res.error);
    } else {
      setError("");
      setRequestModalOpen(false);
      setStatus("reset_requested");
    }
  };

  const filteredSearchPool = useMemo(() => {
    if (!skillSearch.trim()) return [];
    return MASTER_SKILLS_POOL.filter(
      (s) =>
        s.toLowerCase().includes(skillSearch.toLowerCase()) &&
        !editSkills.includes(s)
    );
  }, [skillSearch, editSkills]);

  const recommendedSkillsForTrack =
    TRACK_RECOMMENDED_SKILLS[editTrack] || TRACK_RECOMMENDED_SKILLS["Full-Stack Web Developer"] || [];

  if (status === null) {
    return (
      <div className="rounded-[24px] border border-[#D1E3D6] bg-white p-8 text-center space-y-3 shadow-xs font-body">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#E8FAF0] text-[#056B38]">
          <Clock className="h-6 w-6 animate-spin" />
        </div>
        <h3 className="text-lg font-extrabold text-[#05291A]">جارٍ التحقق من حالة اعتمادك مع السيرفر...</h3>
        <p className="text-sm text-[#526B5E]">سيتم توجيهك تلقائياً فور جاهزية التقييم.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-body">
      
      {/* Main Status Card */}
      <div className="rounded-[28px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-xs space-y-6">
        
        {/* Header Title & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div className="flex items-center gap-3">
            {status === "admin_review" && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="h-6 w-6" />
              </div>
            )}
            {status === "reset_requested" && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-800 border border-sky-200">
                <Send className="h-6 w-6" />
              </div>
            )}
            {(status === "pending" || status === "assessment_in_progress" || status === "reset_approved") && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]">
                <Sparkles className="h-6 w-6" />
              </div>
            )}
            {status === "rejected" && (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
                <XCircle className="h-6 w-6" />
              </div>
            )}

            <div>
              <h2 className="text-xl font-extrabold text-[#05291A]">
                {status === "admin_review"
                  ? "طلب اعتمادك قيد المراجعة الفنية من الإدارة"
                  : status === "reset_requested"
                  ? "تم إرسال طلب إعادة الاختبار إلى الإدارة (بانتظار الموافقة)"
                  : status === "reset_approved"
                  ? "وافقت الإدارة على طلب إعادة الاختبار! يمكنك البدء الآن"
                  : status === "rejected"
                  ? "تم رفض طلب إعادة الاختبار / الاعتماد من قِبل الأدمن"
                  : "بوابة تقييم المهارات واعتماد المطورين"}
              </h2>
              <p className="text-xs text-[#526B5E] mt-0.5">
                {status === "admin_review"
                  ? "تم تسليم أجوبة اختبارك بنجاح، ويقوم فريق الإدارة بمراجعة النتائج لاعتماد حسابك."
                  : status === "reset_requested"
                  ? "سيقوم الأدمن بمراجعة طلبك وإتاحة إعادة الاختبار لك قريباً."
                  : status === "reset_approved"
                  ? "تم منحك الصلاحية من الأدمن. تأكد من مهاراتك المختارة ثم اضغط على زر 'بدء الاختبار الآن'."
                  : status === "rejected"
                  ? "قام الأدمن بمراجعة طلبك وتوضيح أسباب الرفض. يمكنك تقديم طلب جديد للتوضيح إذا أردت."
                  : "اختر مهاراتك البرمجية بدقة، واضغط على زر بدء الاختبار للتقييم بالذكاء الاصطناعي."}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-4 py-1.5 text-xs font-extrabold shadow-xs ${
              status === "admin_review"
                ? "bg-amber-100 text-amber-900 border border-amber-300"
                : status === "reset_requested"
                ? "bg-sky-100 text-sky-900 border border-sky-300"
                : status === "rejected"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-[#E8FAF0] text-[#056B38] border border-[#D1E3D6]"
            }`}
          >
            {status === "admin_review"
              ? "قيد مراجعة الأدمن"
              : status === "reset_requested"
              ? "بانتظار موافقة الأدمن"
              : status === "reset_approved"
              ? "تمت موافقة الأدمن (صلاحية مفعلة)"
              : status === "rejected"
              ? "مرفوض من الأدمن"
              : "صلاحية مفعلة"}
          </span>
        </div>

        {/* ACTIVE SPECIALTY & SKILLS OVERVIEW BOX */}
        <div className="rounded-[24px] border border-[#D1E3D6] bg-[#F7FAF8] p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D1E3D6] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-[#526B5E]">التخصص والمهارات المستهدفة في الاختبار:</span>
                <div className="text-sm font-black text-[#05291A]">{jobTitle || "Full-Stack Web Developer"}</div>
              </div>
            </div>

            {/* Change Skills Button with Remaining Counter */}
            {(status === "pending" || status === "reset_approved" || status === "assessment_in_progress") && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenSkillsModal}
                  disabled={remainingSkillsChanges <= 0}
                  className={`h-9 px-4 rounded-full text-xs font-black transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    remainingSkillsChanges > 0
                      ? "bg-white border border-[#056B38] text-[#056B38] hover:bg-[#E8FAF0] active:scale-95"
                      : "bg-neutral-100 border border-neutral-300 text-neutral-400 cursor-not-allowed"
                  }`}
                  title={remainingSkillsChanges > 0 ? "تعديل المهارات والتخصص قبل بدء الاختبار" : "تم استنفاد محاولات التعديل"}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>تعديل المهارات والتخصص</span>
                  <span className="bg-[#056B38] text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                    {remainingSkillsChanges} متبقي
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Render Active Skills Badges */}
          <div className="space-y-2">
            <div className="text-[12px] font-extrabold text-[#526B5E]">
              المهارات المعتمدة التي سيتم فحصك بها بالذكاء الاصطناعي ({skills.length}):
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.length > 0 ? (
                skills.map((sk) => (
                  <span
                    key={sk}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#D1E3D6] text-xs font-bold text-[#05291A] shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#056B38]" />
                    <span>{sk}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-amber-700 font-bold">
                  لم يتم تحديد أي مهارات بعد. اضغط على زر &quot;تعديل المهارات والتخصص&quot; أعلاه.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Success Notice Banner */}
        {successMessage && (
          <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] p-4 text-xs font-bold text-[#056B38] flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#056B38] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* AI Generation Loading Banner */}
        {loadingTest && (
          <div className="rounded-2xl bg-[#E8FAF0] border border-[#D1E3D6] p-4 text-xs font-bold text-[#056B38] space-y-2 animate-pulse">
            <div className="flex items-center gap-2 font-extrabold">
              <Clock className="h-5 w-5 text-[#056B38] animate-spin shrink-0" />
              <span>جاري بناء وتوليد أسئلة الاختبار البرمجي بالذكاء الاصطناعي لكافة المهارات المحددة...</span>
            </div>
            <p className="text-[11px] text-[#526B5E] leading-relaxed font-normal">
              يقوم محرك AI بفحص تخصص ({jobTitle}) والمهارات ({skills.join(", ")}) وتوليد أسئلة كود ومقابلات فريدة وغير مكررة.
            </p>
          </div>
        )}

        {/* Rejection Notice Banner */}
        {status === "rejected" && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-900 font-bold space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-extrabold">
              <XCircle className="h-5 w-5 text-red-600 shrink-0" />
              <span>إشعار الإدارة: تم رفض الطلب</span>
            </div>
            <p className="text-red-800 leading-relaxed font-normal">
              {reassessmentReason || "قام الأدمن بمراجعة طلب الاعتماد الخاص بك وقرر عدم منح صلاحية إعادة الاختبار حالياً."}
            </p>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs font-bold text-red-800 space-y-2">
            <div className="flex items-center gap-2 text-red-900 font-extrabold">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-700" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Action Controls Box */}
        <div className="rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-extrabold text-[#05291A] text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[#056B38]" />
                خيارات تقييم المهارات والاختبار
              </h4>
              <p className="text-xs text-[#526B5E] mt-1">
                {status === "reset_approved"
                  ? "تم منحك الصلاحية بنجاح من الإدارة، يمكنك البدء الآن."
                  : status === "rejected"
                  ? "الاختبار مغلق بسبب قرار الإدارة. يمكنك تقديم طلب جديد للتوضيح."
                  : status === "reset_requested"
                  ? "طلبك قيد مراجعة الأدمن في لوحة التحكم."
                  : "اضغط على زر بدء الاختبار أدناه لخوض التقييم الشامل."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0">
              {/* Primary Start Test Button */}
              {(status === "reset_approved" || status === "pending" || status === "assessment_in_progress") && (
                <button
                  type="button"
                  disabled={loadingTest || skills.length === 0}
                  onClick={handleManualStart}
                  className="h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white px-8 font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial disabled:opacity-50"
                >
                  {loadingTest ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>جاري التوليد والدخول...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-5 w-5" />
                      <span>بدء الاختبار الآن ({skills.length} مهارات)</span>
                    </>
                  )}
                </button>
              )}

              {/* Request Re-test Button */}
              {status !== "reset_requested" && status !== "reset_approved" && (
                <button
                  type="button"
                  onClick={() => setRequestModalOpen(true)}
                  className="h-11 rounded-full border border-[#056B38] bg-[#E8FAF0] text-[#056B38] hover:bg-[#056B38] hover:text-white px-6 font-extrabold text-xs transition-all flex items-center justify-center gap-2 shadow-xs flex-1 sm:flex-initial cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>طلب إعادة الاختبار من الإدارة</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {status === "reset_requested" && (
          <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 text-xs text-sky-900 font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-700 shrink-0" />
            <span>تم إرسال طلبك للإدارة. سيزول هذا التنبيه ويظهر زر &quot;بدء الاختبار الآن&quot; أوتوماتيكياً فور موافقة الأدمن.</span>
          </div>
        )}
      </div>

      {/* ─── MODAL: SKILLS & SPECIALTY EDITING (MAX 2 TIMES) ─── */}
      {skillsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border border-[#D1E3D6] bg-white p-6 md:p-8 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E8FAF0] text-[#056B38] flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#05291A]">
                    تعديل المهارات والتخصص للاختبار البرمجي
                  </h3>
                  <p className="text-xs text-[#526B5E]">
                    المتبقي لك: <strong className="text-[#056B38] font-bold">{remainingSkillsChanges} من أصل مرتين</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSkillsModalOpen(false)}
                className="text-neutral-400 hover:text-black cursor-pointer p-1 rounded-lg hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Warning Alert Note */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 font-bold space-y-1">
              <div className="flex items-center gap-1.5 text-amber-950 font-black">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>تنبيه هام حول اختيار المهارات:</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
                يسمح النظام بتغيير مهارات وتخصص الاختبار مرتين فقط لضمان النزاهة الفنية. سيتم توليد أسئلة الاختبار البرمجي والمقابلات التقنية بالذكاء الاصطناعي بناءً على المهارات التي تختارها هنا.
              </p>
            </div>

            {/* Step A: Choose Track / Specialty */}
            <div className="space-y-2">
              <label className="text-xs font-black text-[#05291A] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#056B38]" />
                <span>1. اختر تخصصك البرمجي الرئيسي:</span>
              </label>
              <CustomSelect
                value={editTrack}
                onChange={(val) => setEditTrack(val)}
                size="lg"
                options={TRACKS_LIST}
              />
            </div>

            {/* Step B: Selected Skills Badges List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-black text-[#05291A] flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-[#056B38]" />
                  <span>2. المهارات المختارة للاختبار ({editSkills.length} من 12):</span>
                </label>
                <span className="text-[11px] text-[#526B5E]">اختر المهارات التي تتقنها جيداً</span>
              </div>

              <div className="p-4 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] min-h-[60px] flex flex-wrap gap-2 items-center">
                {editSkills.length > 0 ? (
                  editSkills.map((sk) => (
                    <span
                      key={sk}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#056B38] text-[#056B38] text-xs font-black shadow-2xs animate-in zoom-in-95"
                    >
                      <span>{sk}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleSkill(sk)}
                        className="text-neutral-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-neutral-400 font-bold">
                    لم تقم باختيار أي مهارة بعد. اضغط على المهارات المقترحة أدناه أو ابحث لإضافتها.
                  </span>
                )}
              </div>
            </div>

            {/* Step C: Recommended Skills for the Selected Track */}
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-[#05291A]">
                مهارات مقترحة لتخصص ({editTrack}):
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-1">
                {recommendedSkillsForTrack.map((sk) => {
                  const isSelected = editSkills.includes(sk);
                  return (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => handleToggleSkill(sk)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-[#056B38] text-white shadow-xs"
                          : "bg-white border border-[#D1E3D6] text-[#05291A] hover:border-[#056B38] hover:bg-[#E8FAF0]"
                      }`}
                    >
                      {isSelected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>{sk}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step D: Search & Add Other Custom Skills */}
            <div className="space-y-2 relative" ref={skillSearchBoxRef}>
              <div className="text-xs font-extrabold text-[#05291A]">
                البحث عن مهارات وتقنيات أخرى:
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-[#526B5E] absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={skillSearch}
                  onFocus={() => setIsSkillSearchDropdownOpen(true)}
                  onChange={(e) => {
                    setSkillSearch(e.target.value);
                    setIsSkillSearchDropdownOpen(true);
                  }}
                  placeholder="ابحث عن مهارة (مثل: PostgreSQL, Docker, GraphQL, Flutter...)"
                  className="w-full h-11 pr-10 pl-4 rounded-2xl border border-[#D1E3D6] bg-white text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10"
                />
              </div>

              {/* Autocomplete Dropdown */}
              {isSkillSearchDropdownOpen && skillSearch.trim().length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-[#D1E3D6] rounded-2xl shadow-xl z-20 max-h-48 overflow-y-auto p-2 space-y-1">
                  {filteredSearchPool.length > 0 ? (
                    filteredSearchPool.slice(0, 8).map((sk) => (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => {
                          handleToggleSkill(sk);
                          setSkillSearch("");
                          setIsSkillSearchDropdownOpen(false);
                        }}
                        className="w-full text-right px-3 py-2 rounded-xl text-xs font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <span>{sk}</span>
                        <Plus className="w-3.5 h-3.5 text-[#056B38]" />
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-[#526B5E]">
                      <span>اضغط إضافة لمهارة مخصصة: </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleSkill(skillSearch.trim());
                          setSkillSearch("");
                          setIsSkillSearchDropdownOpen(false);
                        }}
                        className="font-bold text-[#056B38] underline cursor-pointer"
                      >
                        &quot;{skillSearch.trim()}&quot;
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                disabled={skillsSubmitting || editSkills.length === 0}
                onClick={handleSaveSkills}
                className="flex-1 h-12 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {skillsSubmitting ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ المهارات...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ المهارات وتجهيز الاختبار ({editSkills.length})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSkillsModalOpen(false)}
                className="px-6 h-12 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: REASSESSMENT REQUEST TO ADMIN */}
      {requestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[28px] border border-[#D1E3D6] bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="text-lg font-extrabold text-[#05291A] flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-[#056B38]" />
                طلب إعادة إجراء اختبار التقييم
              </h3>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-[#526B5E] leading-relaxed">
                اكتب توضيحاً للإدارة بسبب طلب إعادة الاختبار (مثلاً: إضافة مهارات جديدة، حدوث عطل تقني، إلخ):
              </p>

              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="اكتب التوضيح هنا (اختياري)..."
                rows={3}
                className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs text-[#05291A] focus:outline-none focus:border-[#056B38] focus:ring-2 focus:ring-[#056B38]/10"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={requestSubmitting}
                onClick={handleSendReassessmentRequest}
                className="flex-1 h-11 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-extrabold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {requestSubmitting ? "جاري الإرسال..." : "إرسال الطلب للإدارة"}
              </button>
              <button
                type="button"
                onClick={() => setRequestModalOpen(false)}
                className="px-5 h-11 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-sm hover:bg-[#F7FAF8] cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
