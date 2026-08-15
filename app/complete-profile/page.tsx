"use client";

import React, { useState, useRef, useEffect } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import { updateDeveloperProfile, setDeveloperSkills } from "@/lib/actions/profile";
import { uploadAvatar } from "@/lib/actions/upload";
import { startDeveloperAssessment } from "@/lib/actions/developer-assessment";
import { EGYPT_GOVERNORATES_AND_CITIES } from "@/lib/egyptian-locations";
import { EgyptFlag } from "@/components/egypt-flag";
import { useRouter } from "next/navigation";
import {
  User,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Check,
  Search,
  ChevronDown,
  X,
  Plus,
  AlertCircle
} from "lucide-react";

// ALL EGYPTIAN UNIVERSITIES
const ALL_EGYPTIAN_UNIVERSITIES = [
  "جامعة القاهرة",
  "جامعة عين شمس",
  "جامعة الإسكندرية",
  "جامعة المنصورة",
  "جامعة أسيوط",
  "جامعة حلوان",
  "جامعة الزقازيق",
  "جامعة طنطا",
  "جامعة بنها",
  "جامعة المنوفية",
  "جامعة قناة السويس",
  "جامعة جنوب الوادي",
  "جامعة المنيا",
  "جامعة الفيوم",
  "جامعة بني سويف",
  "جامعة كفر الشيخ",
  "جامعة سوهاج",
  "جامعة بورسعيد",
  "جامعة دمنهور",
  "جامعة أسوان",
  "جامعة دمياط",
  "جامعة السويس",
  "جامعة مدينة السادات",
  "جامعة العريش",
  "جامعة مطروح",
  "جامعة الوادي الجديد",
  "جامعة الأقصر",
  "جامعة الأزهر",
  "جامعة الجلالة الأهلية",
  "جامعة العلمين الدولية",
  "جامعة الملك سلمان الدولية",
  "جامعة المنصورة الجديدة الأهلية",
  "جامعة مصر للمعلوماتية (EUI)",
  "جامعة النيل الأهلية",
  "جامعة زويل للعلوم والتكنولوجيا",
  "الجامعة المصرية للتعلم الإلكتروني الأهلية (EELU)",
  "جامعة القاهرة الأهلية",
  "جامعة عين شمس الأهلية",
  "جامعة الإسكندرية الأهلية",
  "جامعة المنصورة الأهلية",
  "جامعة الزقازيق الأهلية",
  "جامعة طنطا الأهلية",
  "جامعة حلوان الأهلية",
  "جامعة بنها الأهلية",
  "جامعة المنوفية الأهلية",
  "جامعة أسيوط الأهلية",
  "جامعة بني سويف الأهلية",
  "جامعة القاهرة الجديدة التكنولوجية",
  "جامعة الدلتا التكنولوجية",
  "جامعة بني سويف التكنولوجية",
  "جامعة 6 أكتوبر التكنولوجية",
  "جامعة برج العرب التكنولوجية",
  "جامعة مصر التكنولوجية الدولية",
  "الجامعة الأمريكية بالقاهرة (AUC)",
  "الجامعة الألمانية بالقاهرة (GUC)",
  "الجامعة البريطانية في مصر (BUE)",
  "الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري (AASTMT)",
  "جامعة مصر للعلوم والتكنولوجيا (MUST)",
  "جامعة 6 أكتوبر (O6U)",
  "جامعة المستقبل (FUE)",
  "الجامعة الروسية في مصر (ERU)",
  "جامعة فاروس بالإسكندرية (PUA)",
  "جامعة الدلتا للعلوم والتكنولوجيا",
  "جامعة النهضة ببني سويف (NUB)",
  "الجامعة الحديثة للتكنولوجيا والمعلومات (MTI)",
  "جامعة سيناء",
  "جامعة هليوبوليس",
  "جامعة بدر بالقاهرة (BUC)",
  "جامعة بدر بأسيوط",
  "جامعة دراية بالمنيا",
  "جامعة نيو جيزة (NGU)",
  "الجامعة المصرية الصينية (ECU)",
  "جامعة سفنكس بأسيوط",
  "جامعة ميريت بسوهاج",
  "جامعة السلام بالغربية",
  "جامعة الصالحية الجديدة",
  "الجامعة الفرنسية في مصر (UFE)",
  "جامعة إسلسكا (ESLSCA)",
  "جامعة المعرفة الدولية"
];

// ALL EGYPTIAN HIGHER INSTITUTES
const ALL_EGYPTIAN_INSTITUTES = [
  "معهد تكنولوجيا المعلومات (ITI)",
  "المعهد التكنولوجي العالي بالعاشر من رمضان (HTI)",
  "المعهد الكندي العالي لتكنولوجيا الهندسة والإدارة (CIC)",
  "أكاديمية الشروق (المعهد العالي للهندسة والحاسبات)",
  "معهد القاهرة العالي للهندسة وعلوم الحاسب والإدارة",
  "معهد طيبة العالي لتكنولوجيا الإدارة والمعلومات",
  "المعهد العالي لعلوم الحاسب ونظم المعلومات بـ 6 أكتوبر",
  "المعهد العالي للهندسة والتكنولوجيا بالتجمع الخامس",
  "معهد العبور العالي للهندسة والتكنولوجيا",
  "معهد العبور العالي للإدارة والحاسبات ونظم المعلومات",
  "المعهد العالي لتكنولوجيا المعلومات بمدينة بدر",
  "المعهد العالي للهندسة والتكنولوجيا بطنطا",
  "المعهد العالي للهندسة والتكنولوجيا بالمنصورة",
  "المعهد العالي للهندسة والتكنولوجيا بكفر الشيخ",
  "المعهد العالي للهندسة والتكنولوجيا بالزقازيق",
  "المعهد العالي للإدارة وتكنولوجيا المعلومات بالمنيا",
  "معهد الإسكندرية العالي للهندسة والتكنولوجيا (AIET)",
  "المعهد العالي للهندسة والتكنولوجيا بكنج مريوط",
  "معهد أكتوبر العالي للهندسة والتكنولوجيا",
  "معهد المستقبل العالي للدراسات التكنولوجية المتخصصة",
  "معهد الفراعنة العالي للحاسب الآلي ونظم المعلومات بالهرم",
  "معهد الجزيرة العالي للهندسة والتكنولوجيا بالمقطم",
  "معهد الدلتا العالي للهندسة والتكنولوجيا بالمنصورة",
  "معهد مصر العالي للهندسة والتكنولوجيا بالمنصورة",
  "معهد الصفوة العالي للهندسة والتكنولوجيا بالقليوبية",
  "الأكاديمية الدولية لعلوم الإعلام (IAEMS)"
];

// ALL EGYPTIAN COLLEGES ACROSS ALL DISCIPLINES
const ALL_EGYPTIAN_COLLEGES = [
  "كلية الحاسبات والمعلومات والذكاء الاصطناعي",
  "كلية علوم الحاسب وتكنولوجيا المعلومات",
  "كلية الذكاء الاصطناعي",
  "كلية الهندسة",
  "كلية الهندسة الإلكترونية بمنوف",
  "كلية التخطيط العمراني",
  "كلية العلوم",
  "كلية الطب البشري",
  "كلية طب جراحة الفم والأسنان",
  "كلية الصيدلة والتصنيع الدوائي",
  "كلية العلاج الطبيعي",
  "كلية التمريض",
  "كلية تكنولوجيا العلوم الصحية التطبيقية",
  "كلية الطب البيطري",
  "كلية الزراعة",
  "كلية التجارة وإدارة الأعمال",
  "كلية الاقتصاد والعلوم السياسية",
  "كلية الحقوق والشريعة والقانون",
  "كلية الألسن واللغات والترجمة",
  "كلية اللغات والترجمة",
  "كلية الآداب",
  "كلية الإعلام وتكنولوجيا الاتصال",
  "كلية الفنون التطبيقية",
  "كلية الفنون الجميلة",
  "كلية التربية",
  "كلية التربية النوعية",
  "كلية التربية الرياضية",
  "كلية التربية للطفولة المبكرة",
  "كلية التربية الموسيقية",
  "كلية التكنولوجيا والتعليم الصناعي",
  "كلية تكنولوجيا الصناعة والطاقة",
  "كلية السياحة والفنادق",
  "كلية الآثار وعلم المصريات",
  "كلية الخدمة الاجتماعية",
  "كلية دار العلوم",
  "كلية الدراسات الإنسانية",
  "كلية أصول الدين والدعوة",
  "كلية الشريعة والقانون",
  "كلية اللغة العربية",
  "كلية علوم الملاحة وتكنولوجيا الفضاء",
  "كلية الثروة السمكية والمصايد",
  "كلية الدراسات العليا للبحوث الإحصائية",
  "كلية الدراسات العليا للنانوتكنولوجي",
  "كلية الدراسات العليا للتربية",
  "كلية الدراسات العليا والبحوث البيئية"
];

// COMPREHENSIVE MULTI-SELECT TRACKS
const COMPREHENSIVE_TRACKS_LIST = [
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
  "Database Administrator (DBA)",
  "Computer Vision Engineer",
  "NLP & LLM Engineer",
  "MLOps Engineer",
  "ERP & CRM Developer (Odoo / SAP)"
];

// MAPPING FROM TRACK TO RECOMMENDED TECH STACK & TOOLS
const TRACK_RECOMMENDED_SKILLS: Record<string, string[]> = {
  "Full-Stack Web Developer": [
    "JavaScript", "TypeScript", "React.js", "Next.js", "Node.js", "Express.js", "PostgreSQL", "MongoDB", "Tailwind CSS", "REST APIs", "Git & GitHub"
  ],
  "Frontend Engineer": [
    "JavaScript", "TypeScript", "React.js", "Next.js", "Vue.js", "Nuxt.js", "Angular", "Tailwind CSS", "HTML5", "CSS3", "Redux", "Zustand", "Figma"
  ],
  "Backend Engineer": [
    "Node.js", "Express.js", "NestJS", "Python", "Django", "FastAPI", "Go", "Java", "Spring Boot", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Docker", "GraphQL", "REST APIs", "gRPC"
  ],
  "Agentic AI Engineer": [
    "Python", "LangChain", "LlamaIndex", "CrewAI", "AutoGen", "OpenAI APIs", "Anthropic APIs", "PyTorch", "FastAPI", "Ollama", "Vector DBs", "Docker"
  ],
  "Machine Learning & AI Engineer": [
    "Python", "PyTorch", "TensorFlow", "Scikit-learn", "Pandas", "NumPy", "OpenCV", "Hugging Face", "MLOps", "Jupyter", "SQL"
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
    "Solidity", "Rust", "Ethereum", "Smart Contracts", "Web3.js", "Ethers.js", "Hardhat", "Truffle", "DeFi", "IPFS"
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
  ],
  "Computer Vision Engineer": [
    "OpenCV", "PyTorch", "TensorFlow", "YOLO", "Image Processing", "Deep Learning", "Python", "CUDA"
  ],
  "NLP & LLM Engineer": [
    "Hugging Face", "Transformers", "BERT", "GPT", "PyTorch", "LangChain", "Tokenization", "Python", "Vector DBs"
  ],
  "MLOps Engineer": [
    "MLflow", "Kubeflow", "Docker", "Kubernetes", "CI/CD Actions", "Airflow", "DVC", "Python", "AWS SageMaker"
  ],
  "ERP & CRM Developer (Odoo / SAP)": [
    "Odoo", "Python", "PostgreSQL", "XML", "SAP ABAP", "Salesforce", "ERP Systems", "Business Logic"
  ]
};

// MASTER POOL OF ALL TECH STACK & TOOLS FOR AUTOCOMPLETE & SEARCH
const MASTER_TECH_POOL = [
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

export default function DeveloperOnboardingPage() {
  const router = useRouter();
  const { developer, updateDeveloper, updateUsername, setUserRole, addToast } = useProfile();

  const [currentStep, setCurrentStep] = useState(1);

  // Form Fields
  const [firstName, setFirstName] = useState(developer.fullName.split(" ")[0] || "");
  const [fatherName, setFatherName] = useState(developer.fullName.split(" ")[1] || "");
  const [familyName, setFamilyName] = useState(developer.fullName.split(" ")[2] || "");
  const [phone, setPhone] = useState(developer.phone || "");
  const [username, setUsername] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(developer.avatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isStartingAssessment, setIsStartingAssessment] = useState(false);
  const [, setAssessmentError] = useState("");

  // Error highlighting state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2: Academic
  const [qualificationType, setQualificationType] = useState<"university" | "institute" | "self-taught">("university");
  const [universityName, setUniversityName] = useState("");
  const [collegeName, setCollegeName] = useState("");

  // Custom Dropdown Open States
  const [isUniOpen, setIsUniOpen] = useState(false);
  const [isColOpen, setIsColOpen] = useState(false);
  const uniRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);

  // Step 3: Tracks & Skills (Multi-select with dynamic recommendations)
  const [selectedTracks, setSelectedTracks] = useState<string[]>(
    developer.jobTitle ? [developer.jobTitle] : ["Full-Stack Web Developer"]
  );
  const [selectedSkills, setSelectedSkills] = useState<string[]>(developer.skills || []);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [isSkillSearchOpen, setIsSkillSearchOpen] = useState(false);
  const skillSearchRef = useRef<HTMLDivElement>(null);

  // Step 4: Governorate & City (Separated & Initialized as empty)
  const [governorate, setGovernorate] = useState(
    developer.location ? developer.location.split(" - ")[0] || "" : ""
  );
  const [city, setCity] = useState(
    developer.location ? developer.location.split(" - ")[1] || "" : ""
  );
  const [isGovOpen, setIsGovOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const govRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  const [github, setGithub] = useState(developer.github || "");
  const [linkedin, setLinkedin] = useState(developer.linkedin || "");
  const [website, setWebsite] = useState(developer.website || "");
  const [bio, setBio] = useState(developer.bio || "");

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (uniRef.current && !uniRef.current.contains(e.target as Node)) setIsUniOpen(false);
      if (colRef.current && !colRef.current.contains(e.target as Node)) setIsColOpen(false);
      if (govRef.current && !govRef.current.contains(e.target as Node)) setIsGovOpen(false);
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) setIsCityOpen(false);
      if (skillSearchRef.current && !skillSearchRef.current.contains(e.target as Node)) setIsSkillSearchOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        addToast("حجم الصورة يجب ألا يتجاوز 5 ميجابايت", "warn");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      addToast("تم اختيار الصورة بنجاح وتحديث بطاقة الجواز", "info");
    }
  };

  const toggleTrack = (track: string) => {
    if (errors.selectedTracks) setErrors((prev) => ({ ...prev, selectedTracks: "" }));
    if (selectedTracks.includes(track)) {
      setSelectedTracks(selectedTracks.filter((t) => t !== track));
    } else {
      setSelectedTracks([...selectedTracks, track]);
    }
  };

  const toggleSkill = (skill: string) => {
    if (errors.selectedSkills) setErrors((prev) => ({ ...prev, selectedSkills: "" }));
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skill));
    } else {
      setSelectedSkills([...selectedSkills, skill]);
    }
  };

  const addCustomSkill = (skillToAdd: string) => {
    const trimmed = skillToAdd.trim();
    if (!trimmed) return;
    if (errors.selectedSkills) setErrors((prev) => ({ ...prev, selectedSkills: "" }));
    if (selectedSkills.includes(trimmed)) {
      addToast("المهارة مضافة بالفعل", "info");
    } else {
      setSelectedSkills([...selectedSkills, trimmed]);
      addToast(`تمت إضافة "${trimmed}" بنجاح`, "success");
    }
    setSkillSearchQuery("");
    setIsSkillSearchOpen(false);
  };

  // Compute recommended skills based on chosen career tracks
  const recommendedSkillsSet = new Set<string>();
  selectedTracks.forEach((track) => {
    const recs = TRACK_RECOMMENDED_SKILLS[track] || [];
    recs.forEach((r) => recommendedSkillsSet.add(r));
  });
  const recommendedSkillsList = Array.from(recommendedSkillsSet);

  // Filtered skills from master pool for search/add input
  const filteredMasterSkills = MASTER_TECH_POOL.filter(
    (sk) =>
      sk.toLowerCase().includes(skillSearchQuery.trim().toLowerCase()) &&
      !selectedSkills.includes(sk)
  );

  // Free Navigation: allowed at any time
  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepNum: number) => {
    setCurrentStep(stepNum);
  };

  const combinedLocation = governorate ? (city ? `${governorate} - ${city}` : governorate) : "";

  // Full validation check with error tracking and automated redirect to the first invalid step
  const handleCompleteOnboarding = async () => {
    const newErrors: Record<string, string> = {};

    // Validate Step 1
    if (!firstName.trim()) newErrors.firstName = "الاسم الأول إجباري";
    if (!familyName.trim()) newErrors.familyName = "اسم العائلة إجباري";
    
    // Egyptian phone validation: exactly 11 digits starting with 01 (010, 011, 012, 015) or 10 digits
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) {
      newErrors.phone = "رقم الهاتف المصري للتوثيق إجباري";
    } else if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      newErrors.phone = "يرجى إدخال رقم هاتف مصري صحيح (11 رقم)";
    }

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      newErrors.username = "اسم المستخدم لرابط البروفايل إجباري";
    } else if (cleanUsername.length < 3) {
      newErrors.username = "اسم المستخدم يجب ألا يقل عن 3 أحرف";
    }

    // Validate Step 2
    if (qualificationType !== "self-taught") {
      if (!universityName.trim()) {
        newErrors.universityName = qualificationType === "institute" ? "اسم المعهد إجباري" : "اسم الجامعة إجباري";
      }
      if (!collegeName.trim()) {
        newErrors.collegeName = "الكلية والتخصص الدراسي إجباري";
      }
    }

    // Validate Step 3
    if (selectedTracks.length === 0) {
      newErrors.selectedTracks = "يجب اختيار مسار وظيفي واحد على الأقل";
    }
    if (selectedSkills.length === 0) {
      newErrors.selectedSkills = "يجب تحديد مهارة أو تقنية واحدة على الأقل";
    }

    // Validate Step 4
    if (!governorate.trim()) newErrors.governorate = "المحافظة إجبارية";
    if (!city.trim()) newErrors.city = "المدينة أو المركز إجباري";

    setErrors(newErrors);

    // If any error exists, immediately redirect to the earliest step with an error & show red marks
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.firstName || newErrors.familyName || newErrors.phone || newErrors.username) {
        setCurrentStep(1);
        addToast("يرجى استكمال البيانات الشخصية الإجبارية أولاً (محددة بالأحمر)", "warn");
      } else if (newErrors.universityName || newErrors.collegeName) {
        setCurrentStep(2);
        addToast("يرجى تحديد الجامعة والكلية (محددة بالأحمر)", "warn");
      } else if (newErrors.selectedTracks || newErrors.selectedSkills) {
        setCurrentStep(3);
        addToast("يرجى تحديد مسارك الوظيفي ومهاراتك (محددة بالأحمر)", "warn");
      } else if (newErrors.governorate || newErrors.city) {
        setCurrentStep(4);
        addToast("يرجى تحديد المحافظة والمدينة (محددة بالأحمر)", "warn");
      }
      return;
    }

    if (isStartingAssessment) return;
    setIsStartingAssessment(true);
    setAssessmentError("");

    const fullCombinedName = `${firstName.trim()} ${fatherName.trim()} ${familyName.trim()}`.trim() || developer.fullName;
    const finalJobTitle = selectedTracks.join(" | ") || "Full-Stack Web Developer";
    const finalUsername = username.trim() || `dev_${Math.floor(Math.random() * 10000)}`;

    const data = new FormData();
    data.set("displayName", fullCombinedName);
    data.set("jobTitle", finalJobTitle);
    data.set("bio", bio);
    data.set("location", combinedLocation);
    data.set("phone", phone);
    data.set("username", finalUsername);
    data.set("availability", "available");
    data.set("github", github);
    data.set("linkedin", linkedin);
    data.set("website", website);

    const profileResult = await updateDeveloperProfile(undefined, data);
    if (!profileResult.ok) {
      const msg = profileResult.error ?? Object.values(profileResult.fieldErrors ?? {}).flat()[0] ?? "تعذر حفظ الملف الشخصي";
      addToast(msg, "warn");
      setIsStartingAssessment(false);
      return;
    }

    const skillsToSave = selectedSkills.length ? selectedSkills : ["JavaScript", "Problem Solving"];
    const skillsResult = await setDeveloperSkills(skillsToSave);
    if (!skillsResult.ok) {
      addToast(skillsResult.error ?? "تعذر حفظ المهارات", "warn");
    }

    let uploadedUrl = avatarPreview;
    if (avatarFile) {
      const avatarData = new FormData();
      avatarData.set("file", avatarFile);
      const avatarResult = await uploadAvatar(avatarData);
      if (avatarResult.ok && avatarResult.url) {
        uploadedUrl = avatarResult.url;
        updateDeveloper({ avatarUrl: avatarResult.url });
      }
    }

    updateDeveloper({
      fullName: fullCombinedName,
      phone,
      jobTitle: finalJobTitle,
      location: combinedLocation,
      bio,
      skills: skillsToSave,
      github,
      linkedin,
      website,
      avatarUrl: uploadedUrl,
    });
    updateUsername(finalUsername);
    setUserRole("developer");

    addToast("تهانينا! تم تفعيل الجواز الرقمي وبدء حساب المطور بنجاح.", "success");

    try {
      const assessmentResult = await startDeveloperAssessment();
      if (assessmentResult && assessmentResult.ok && assessmentResult.assessmentUrl) {
        router.replace(assessmentResult.assessmentUrl);
      } else {
        router.replace("/developer-assessment/pending");
      }
    } catch {
      router.replace("/developer-assessment/pending");
    }
  };

  const fullNameDisplay = `${firstName} ${fatherName} ${familyName}`.trim();
  const avatarLetter = (firstName.trim()[0] || "م");

  // Current list based on tab
  const institutionsList = qualificationType === "institute" ? ALL_EGYPTIAN_INSTITUTES : ALL_EGYPTIAN_UNIVERSITIES;

  // Filtered dropdown items based on typed input
  const filteredInstitutions = institutionsList.filter((inst) =>
    inst.toLowerCase().includes(universityName.trim().toLowerCase())
  );
  const filteredColleges = ALL_EGYPTIAN_COLLEGES.filter((col) =>
    col.toLowerCase().includes(collegeName.trim().toLowerCase())
  );

  // Available cities for selected governorate
  const availableCities = governorate ? EGYPT_GOVERNORATES_AND_CITIES[governorate] || [] : [];
  const filteredCities = availableCities.filter((c) =>
    c.toLowerCase().includes(city.trim().toLowerCase())
  );
  const governoratesList = Object.keys(EGYPT_GOVERNORATES_AND_CITIES);
  const filteredGovernorates = governoratesList.filter((g) =>
    g.toLowerCase().includes(governorate.trim().toLowerCase())
  );

  // Clean Passport Tracks Display: 2 Tracks + ETC if more
  const passportTracksDisplay = selectedTracks.length > 0
    ? selectedTracks.length > 2
      ? `${selectedTracks.slice(0, 2).join(" · ")} · ETC`
      : selectedTracks.join(" · ")
    : "Full-Stack Web Developer";

  return (
    <div className="min-h-screen bg-white flex flex-col font-body" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1280px] px-4 md:px-6 py-6 md:py-8 w-full flex-1 space-y-6">
        
        {/* TOP BANNER */}
        <div className="rounded-[28px] bg-[#EAF7EE] border border-[#D3EBDC] p-6 md:p-8 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            {/* Right side in RTL: Title and Badge */}
            <div className="text-right space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[11px] font-bold text-[#056B38] border border-[#CDE5D6]">
                <Sparkles className="w-3.5 h-3.5 text-[#056B38]" />
                <span>Developer Onboarding · إعداد حساب المطور</span>
              </div>
              <h1 className="text-[26px] md:text-[34px] font-black text-[#05291A] font-heading leading-tight">
                أكمل إعداد الجواز الرقمي (Developer Passport)
              </h1>
              <p className="text-[13px] text-[#526B5E] font-medium">
                ادخل بياناتك الشخصية والتعليمية ومهاراتك لتوثيق نقاط الثقة وتقييمات الكود.
              </p>
            </div>

            {/* Left side in RTL: Interactive Clickable Stepper Circles (Always Accessible) */}
            <div className="flex items-center gap-2 bg-white/75 backdrop-blur-xs border border-[#CDE5D6] rounded-full px-4 py-2 self-start md:self-center">
              {[1, 2, 3, 4].map((stepNum, idx) => {
                const isActive = currentStep === stepNum;
                const isPassed = currentStep > stepNum;
                return (
                  <React.Fragment key={stepNum}>
                    <button
                      type="button"
                      onClick={() => handleStepClick(stepNum)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-[#056B38] text-white shadow-xs scale-110"
                          : isPassed
                          ? "bg-[#056B38]/80 text-white hover:opacity-90"
                          : "bg-white text-neutral-400 border border-neutral-200 hover:border-[#056B38] hover:text-[#056B38]"
                      }`}
                      title={`الانتقال إلى الخطوة ${stepNum}`}
                    >
                      {stepNum}
                    </button>
                    {idx < 3 && <div className="w-3 h-0.5 bg-[#CDE5D6]" />}
                  </React.Fragment>
                );
              })}
            </div>

          </div>
        </div>

        {/* 2-COLUMN SIDE-BY-SIDE LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* RIGHT COLUMN: Form Card (8 Columns) */}
          <div className="lg:col-span-8 rounded-[24px] bg-white border border-[#D1E3D6] p-6 md:p-8 space-y-6 shadow-xs">
            
            {/* STEP 1: PERSONAL & CONTACT INFO */}
            {currentStep === 1 && (
              <div className="space-y-6">
                
                {/* Step Header: Title on Right, Avatar circle on Left */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-5">
                  <div className="text-right">
                    <h2 className="text-[20px] font-black text-[#05291A]">
                      الخطوة 1: البيانات الشخصية والأساسية
                    </h2>
                    <p className="text-[12px] text-[#526B5E] mt-0.5">
                      أدخل اسمك الرسمي ورقم هاتفك للتوثيق والاتصال بالشركات. الحقول بعلامة (<span className="text-red-500 font-bold">*</span>) إجبارية.
                    </p>
                  </div>

                  {/* Avatar Upload circle */}
                  <div
                    className="relative group cursor-pointer shrink-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar Preview"
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#056B38] shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#E8FAF0] border-2 border-[#CDE5D6] flex flex-col items-center justify-center text-[#056B38]">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#056B38] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                      تغيير
                    </span>
                  </div>
                </div>

                {/* 3 Name Inputs (Row 1) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5 text-right">
                    <label className="text-[12px] font-bold text-[#05291A]">
                      الاسم الأول <span className="text-red-500 font-bold text-[14px]">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        if (errors.firstName) setErrors((prev) => ({ ...prev, firstName: "" }));
                      }}
                      placeholder="محمد"
                      className={`w-full h-11 rounded-[14px] border px-3.5 text-[13px] text-[#05291A] focus:outline-none transition-all text-right ${
                        errors.firstName
                          ? "border-red-500 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400"
                          : "border-[#D1E3D6] bg-[#F7FAF8] focus:bg-white focus:border-[#056B38]"
                      }`}
                    />
                    {errors.firstName && (
                      <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.firstName}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-[12px] font-bold text-[#05291A]">اسم الأب</label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="وائل"
                      className="w-full h-11 rounded-[14px] border border-[#D1E3D6] bg-[#F7FAF8] px-3.5 text-[13px] text-[#05291A] focus:bg-white focus:border-[#056B38] focus:outline-none transition-all text-right"
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-[12px] font-bold text-[#05291A]">
                      اسم العائلة <span className="text-red-500 font-bold text-[14px]">*</span>
                    </label>
                    <input
                      type="text"
                      value={familyName}
                      onChange={(e) => {
                        setFamilyName(e.target.value);
                        if (errors.familyName) setErrors((prev) => ({ ...prev, familyName: "" }));
                      }}
                      placeholder="مثال: الغنام"
                      className={`w-full h-11 rounded-[14px] border px-3.5 text-[13px] text-[#05291A] focus:outline-none transition-all text-right ${
                        errors.familyName
                          ? "border-red-500 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400"
                          : "border-[#D1E3D6] bg-[#F7FAF8] focus:bg-white focus:border-[#056B38]"
                      }`}
                    />
                    {errors.familyName && (
                      <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.familyName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Phone (Egyptian Real Flag Badge + +20) + Username (Row 2) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Phone with Real Egyptian Flag Badge */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-[12px] font-bold text-[#05291A]">
                      رقم الهاتف للتوثيق (مصر فقط) <span className="text-red-500 font-bold text-[14px]">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none z-10 pl-2.5 border-l border-neutral-200">
                        <EgyptFlag className="w-5 h-3.5" />
                        <span className="text-[12px] font-bold text-[#05291A] font-mono dir-ltr">+20</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setPhone(val);
                          if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
                        }}
                        placeholder="010 1234 5678"
                        dir="ltr"
                        maxLength={11}
                        className={`w-full h-11 rounded-[14px] border pr-22 pl-3.5 text-[13px] font-bold text-[#05291A] focus:outline-none transition-all text-left font-mono ${
                          errors.phone
                            ? "border-red-500 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400"
                            : "border-[#D1E3D6] bg-[#F7FAF8] focus:bg-white focus:border-[#056B38]"
                        }`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-[12px] font-bold text-[#05291A]">
                      اسم المستخدم لرابط البروفايل (3 أحرف على الأقل) <span className="text-red-500 font-bold text-[14px]">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                        if (errors.username) setErrors((prev) => ({ ...prev, username: "" }));
                      }}
                      placeholder="مثال: mohamed_dev"
                      dir="ltr"
                      className={`w-full h-11 rounded-[14px] border px-3.5 text-[13px] font-bold text-[#05291A] focus:outline-none transition-all text-left ${
                        errors.username
                          ? "border-red-500 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400"
                          : "border-[#D1E3D6] bg-[#F7FAF8] focus:bg-white focus:border-[#056B38]"
                      }`}
                    />
                    {errors.username ? (
                      <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.username}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-[#526B5E] font-mono text-left select-none pt-0.5">
                        scora.alwaysdata.net/profile/{username || "username"}
                      </p>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* STEP 2: ACADEMIC EDUCATION (CUSTOM SCORA STYLED DROPDOWNS) */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="border-b border-neutral-100 pb-4 text-right">
                  <h2 className="text-[20px] font-black text-[#05291A]">الخطوة 2: التعليم والبيانات الأكاديمية</h2>
                  <p className="text-[12px] text-[#526B5E] mt-0.5">حدد مسارك التعليمي وجامعتك أو معهدك وكليتك في مصر.</p>
                </div>

                {/* 3 Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "university" as const, label: "جامعة مصرية / دولية" },
                    { id: "institute" as const, label: "معهد عالي أو أكاديمية" },
                    { id: "self-taught" as const, label: "تعلم ذاتي" },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setQualificationType(q.id);
                        setUniversityName("");
                        setIsUniOpen(false);
                        setErrors((prev) => ({ ...prev, universityName: "", collegeName: "" }));
                      }}
                      className={`h-11 rounded-[14px] border text-[12px] font-bold transition-all flex items-center justify-center cursor-pointer ${
                        qualificationType === q.id
                          ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] shadow-2xs font-extrabold"
                          : "border-[#D1E3D6] bg-[#F7FAF8] text-[#526B5E] hover:bg-white"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>

                {qualificationType !== "self-taught" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    
                    {/* University / Institute Custom Popover Dropdown with Strict Internal Scroll */}
                    <div className="space-y-1.5 text-right relative" ref={uniRef}>
                      <label className="text-[12px] font-bold text-[#05291A]">
                        {qualificationType === "institute" ? "اسم المعهد أو الأكاديمية" : "اسم الجامعة أو الأكاديمية"}{" "}
                        <span className="text-red-500 font-bold text-[14px]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={universityName}
                          onFocus={() => setIsUniOpen(true)}
                          onChange={(e) => {
                            setUniversityName(e.target.value);
                            setIsUniOpen(true);
                            if (errors.universityName) setErrors((prev) => ({ ...prev, universityName: "" }));
                          }}
                          placeholder={qualificationType === "institute" ? "ابحث أو اختر المعهد العالي..." : "ابحث أو اختر الجامعة (القاهرة، طنطا...)"}
                          className={`w-full h-11 rounded-[14px] border pr-3.5 pl-9 text-[13px] text-[#05291A] focus:outline-none transition-all ${
                            errors.universityName
                              ? "border-red-500 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400"
                              : "border-[#D1E3D6] bg-[#F7FAF8] focus:bg-white focus:border-[#056B38]"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setIsUniOpen(!isUniOpen)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#056B38] cursor-pointer"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isUniOpen ? "rotate-180 text-[#056B38]" : ""}`} />
                        </button>
                      </div>
                      {errors.universityName && (
                        <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{errors.universityName}</span>
                        </p>
                      )}

                      {/* Custom Popover with strict internal scroll */}
                      {isUniOpen && (
                        <div
                          onWheel={(e) => e.stopPropagation()}
                          className="absolute top-full right-0 left-0 mt-1.5 max-h-48 overflow-y-auto overscroll-contain rounded-2xl border border-[#D1E3D6] bg-white shadow-xl z-50 p-1.5 space-y-0.5"
                        >
                          {filteredInstitutions.length > 0 ? (
                            filteredInstitutions.map((inst) => {
                              const isSelected = universityName === inst;
                              return (
                                <button
                                  key={inst}
                                  type="button"
                                  onClick={() => {
                                    setUniversityName(inst);
                                    setIsUniOpen(false);
                                    if (errors.universityName) setErrors((prev) => ({ ...prev, universityName: "" }));
                                  }}
                                  className={`w-full text-right px-3.5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? "bg-[#E8FAF0] text-[#056B38]"
                                      : "text-[#05291A] hover:bg-[#F7FAF8] hover:text-[#056B38]"
                                  }`}
                                >
                                  <span>{inst}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#056B38]" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-3 text-center text-xs text-[#526B5E]">
                              سيتم حفظ القيمة المدخلة: &quot;{universityName}&quot;
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* College / Major Custom Popover Dropdown (All Disciplines) */}
                    <div className="space-y-1.5 text-right relative" ref={colRef}>
                      <label className="text-[12px] font-bold text-[#05291A]">
                        الكلية أو التخصص الدراسي <span className="text-red-500 font-bold text-[14px]">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={collegeName}
                          onFocus={() => setIsColOpen(true)}
                          onChange={(e) => {
                            setCollegeName(e.target.value);
                            setIsColOpen(true);
                            if (errors.collegeName) setErrors((prev) => ({ ...prev, collegeName: "" }));
                          }}
                          placeholder="ابحث أو اختر الكلية (حاسبات، هندسة، طب، تجارة، علوم، حقوق...)"
                          className={`w-full h-11 rounded-[14px] border pr-3.5 pl-9 text-[13px] text-[#05291A] focus:outline-none transition-all ${
                            errors.collegeName
                              ? "border-red-500 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400"
                              : "border-[#D1E3D6] bg-[#F7FAF8] focus:bg-white focus:border-[#056B38]"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setIsColOpen(!isColOpen)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#056B38] cursor-pointer"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${isColOpen ? "rotate-180 text-[#056B38]" : ""}`} />
                        </button>
                      </div>
                      {errors.collegeName && (
                        <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>{errors.collegeName}</span>
                        </p>
                      )}

                      {/* Custom Popover with strict internal scroll */}
                      {isColOpen && (
                        <div
                          onWheel={(e) => e.stopPropagation()}
                          className="absolute top-full right-0 left-0 mt-1.5 max-h-48 overflow-y-auto overscroll-contain rounded-2xl border border-[#D1E3D6] bg-white shadow-xl z-50 p-1.5 space-y-0.5"
                        >
                          {filteredColleges.length > 0 ? (
                            filteredColleges.map((col) => {
                              const isSelected = collegeName === col;
                              return (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => {
                                    setCollegeName(col);
                                    setIsColOpen(false);
                                    if (errors.collegeName) setErrors((prev) => ({ ...prev, collegeName: "" }));
                                  }}
                                  className={`w-full text-right px-3.5 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? "bg-[#E8FAF0] text-[#056B38]"
                                      : "text-[#05291A] hover:bg-[#F7FAF8] hover:text-[#056B38]"
                                  }`}
                                >
                                  <span>{col}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-[#056B38]" />}
                                </button>
                              );
                            })
                          ) : (
                            <div className="p-3 text-center text-xs text-[#526B5E]">
                              سيتم حفظ القيمة المدخلة: &quot;{collegeName}&quot;
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* STEP 3: TECHNICAL TRACKS & DYNAMIC TECH STACK (WITH SEARCH & CUSTOM ADD) */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="border-b border-neutral-100 pb-4 text-right">
                  <h2 className="text-[20px] font-black text-[#05291A]">الخطوة 3: المسار الوظيفي والمهارات البرمجية</h2>
                  <p className="text-[12px] text-[#526B5E] mt-0.5">
                    اختر مسارك لتظهر لك التقنيات والأدوات المقترحة تلقائياً، مع إمكانية البحث وإضافة أي مهارات إضافية بحرية.
                  </p>
                </div>

                {/* 1. Multi-Select Career Tracks */}
                <div className="space-y-2.5 text-right">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-[#05291A]">
                      المسار الوظيفي (يمكنك اختيار أكثر من تخصص) <span className="text-red-500 font-bold text-[14px]">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-[#056B38] bg-[#E8FAF0] px-2.5 py-0.5 rounded-full border border-[#CDE5D6]">
                      المسارات المحددة: {selectedTracks.length}
                    </span>
                  </div>
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto overscroll-contain p-1.5 border rounded-2xl bg-[#F7FAF8] ${
                    errors.selectedTracks ? "border-red-500 ring-1 ring-red-400" : "border-[#D1E3D6]"
                  }`}>
                    {COMPREHENSIVE_TRACKS_LIST.map((track) => {
                      const isSelected = selectedTracks.includes(track);
                      return (
                        <button
                          key={track}
                          type="button"
                          onClick={() => toggleTrack(track)}
                          className={`h-10 px-3 rounded-[12px] border text-[12px] font-bold transition-all flex items-center justify-between cursor-pointer text-right ${
                            isSelected
                              ? "border-[#056B38] bg-[#E8FAF0] text-[#056B38] shadow-2xs font-extrabold"
                              : "border-transparent bg-white text-[#526B5E] hover:bg-neutral-50 hover:text-[#05291A]"
                          }`}
                        >
                          <span className="truncate">{track}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#056B38] shrink-0 mr-1" />}
                        </button>
                      );
                    })}
                  </div>
                  {errors.selectedTracks && (
                    <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.selectedTracks}</span>
                    </p>
                  )}
                </div>

                {/* 2. Interactive Search & Add Skills (Like Upwork / Freelance Platforms) */}
                <div className="space-y-2.5 text-right pt-2" ref={skillSearchRef}>
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-bold text-[#05291A]">
                      ابحث وأضف أدوات وتقنيات إضافية (Search & Add Tech Stack)
                    </label>
                    <span className="text-[11px] font-bold text-[#056B38]">
                      إجمالي المهارات: {selectedSkills.length}
                    </span>
                  </div>
                  
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={skillSearchQuery}
                          onFocus={() => setIsSkillSearchOpen(true)}
                          onChange={(e) => {
                            setSkillSearchQuery(e.target.value);
                            setIsSkillSearchOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (skillSearchQuery.trim()) {
                                addCustomSkill(skillSearchQuery);
                              }
                            }
                          }}
                          placeholder="ابحث عن مهارة أو أداة (مثال: Next.js, Docker, FastAPI, Figma...) أو اضغط Enter للإضافة"
                          className="w-full h-11 rounded-[14px] border border-[#D1E3D6] bg-[#F7FAF8] pr-10 pl-3 text-[13px] text-[#05291A] focus:bg-white focus:border-[#056B38] focus:outline-none transition-all"
                        />
                        <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      </div>

                      {skillSearchQuery.trim() && (
                        <button
                          type="button"
                          onClick={() => addCustomSkill(skillSearchQuery)}
                          className="h-11 px-4 rounded-[14px] bg-[#056B38] hover:bg-[#005B27] text-white font-bold text-[12px] flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>إضافة</span>
                        </button>
                      )}
                    </div>

                    {/* Autocomplete Dropdown */}
                    {isSkillSearchOpen && skillSearchQuery.trim() && (
                      <div
                        onWheel={(e) => e.stopPropagation()}
                        className="absolute top-full right-0 left-0 mt-1.5 max-h-48 overflow-y-auto overscroll-contain rounded-2xl border border-[#D1E3D6] bg-white shadow-xl z-50 p-1.5 space-y-0.5"
                      >
                        {filteredMasterSkills.length > 0 ? (
                          filteredMasterSkills.map((sk) => (
                            <button
                              key={sk}
                              type="button"
                              onClick={() => addCustomSkill(sk)}
                              className="w-full text-right px-3.5 py-2 rounded-xl text-[12px] font-bold text-[#05291A] hover:bg-[#E8FAF0] hover:text-[#056B38] transition-all flex items-center justify-between cursor-pointer"
                            >
                              <span>{sk}</span>
                              <Plus className="w-3.5 h-3.5 text-[#056B38]" />
                            </button>
                          ))
                        ) : (
                          <button
                            type="button"
                            onClick={() => addCustomSkill(skillSearchQuery)}
                            className="w-full text-right px-3.5 py-2.5 rounded-xl text-[12px] font-bold text-[#056B38] bg-[#E8FAF0] hover:bg-[#d8f5e3] transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span>إضافة مهارة مخصصة: &quot;{skillSearchQuery}&quot;</span>
                            <Plus className="w-4 h-4 text-[#056B38]" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Selected Skills Chips (Removable) */}
                <div className="space-y-2 text-right">
                  <label className="text-[12px] font-bold text-[#05291A]">
                    المهارات المختارة في حسابك ({selectedSkills.length}) <span className="text-red-500 font-bold">*</span>:
                  </label>
                  <div className={`flex flex-wrap gap-1.5 p-3 rounded-2xl border ${
                    errors.selectedSkills ? "border-red-500 bg-red-50/20 ring-1 ring-red-400" : "border-[#CDE5D6] bg-[#F0FAF3]"
                  }`}>
                    {selectedSkills.length > 0 ? (
                      selectedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="h-8 pl-2.5 pr-3 rounded-full bg-[#056B38] text-white text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-all animate-in fade-in"
                        >
                          <span>{skill}</span>
                          <button
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center cursor-pointer transition-colors"
                            title={`إزالة ${skill}`}
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-neutral-400">لم يتم اختيار أو إضافة مهارات بعد</span>
                    )}
                  </div>
                  {errors.selectedSkills && (
                    <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{errors.selectedSkills}</span>
                    </p>
                  )}
                </div>

                {/* 4. Suggested Tech Stack for Selected Track(s) */}
                <div className="space-y-2 text-right pt-1">
                  <label className="text-[12px] font-bold text-[#05291A]">
                    التقنيات المقترحة بناءً على مساراتك الوظيفية (انقر للإضافة السريعة):
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto overscroll-contain p-2.5 border border-neutral-100 rounded-2xl bg-[#F7FAF8]">
                    {recommendedSkillsList.map((skill) => {
                      const isSelected = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`h-8 px-3 rounded-full border text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? "border-[#056B38] bg-[#056B38] text-white shadow-xs"
                              : "border-[#D1E3D6] bg-white text-[#526B5E] hover:bg-[#E8FAF0] hover:text-[#056B38]"
                          }`}
                        >
                          <span>{skill}</span>
                          {isSelected ? (
                            <Check className="w-3 h-3 text-white" />
                          ) : (
                            <Plus className="w-3 h-3 text-[#056B38]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* STEP 4: PASSPORT & LOCATION (GOVERNORATE + CITY) & SOCIAL LINKS */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="border-b border-neutral-100 pb-4 text-right">
                  <h2 className="text-[20px] font-black text-[#05291A]">الخطوة 4: المحافظة والمدينة والروابط</h2>
                  <p className="text-[12px] text-[#526B5E] mt-0.5">حدد محافظتك ومدينتك وأضف حساباتك الخارجية لتوثيق الجواز الرقمي.</p>
                </div>

                {/* Governorate & City Separated Popover Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* Governorate Dropdown */}
                  <div className="space-y-1.5 text-right relative" ref={govRef}>
                    <label className="text-[12px] font-bold text-[#05291A]">
                      المحافظة <span className="text-red-500 font-bold text-[14px]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={governorate}
                        onFocus={() => setIsGovOpen(true)}
                        onChange={(e) => {
                          setGovernorate(e.target.value);
                          setIsGovOpen(true);
                          if (errors.governorate) setErrors((prev) => ({ ...prev, governorate: "" }));
                        }}
                        placeholder="اختر أو ابحث عن المحافظة..."
                        className={`w-full h-11 rounded-[14px] border pr-3.5 pl-9 text-[13px] text-[#05291A] focus:outline-none transition-all ${
                          errors.governorate
                            ? "border-red-500 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400"
                            : "border-[#D1E3D6] bg-[#F7FAF8] focus:bg-white focus:border-[#056B38]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setIsGovOpen(!isGovOpen)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#056B38] cursor-pointer"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isGovOpen ? "rotate-180 text-[#056B38]" : ""}`} />
                      </button>
                    </div>
                    {errors.governorate && (
                      <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.governorate}</span>
                      </p>
                    )}

                    {isGovOpen && (
                      <div
                        onWheel={(e) => e.stopPropagation()}
                        className="absolute top-full right-0 left-0 mt-1.5 max-h-48 overflow-y-auto overscroll-contain rounded-2xl border border-[#D1E3D6] bg-white shadow-xl z-50 p-1.5 space-y-0.5"
                      >
                        {filteredGovernorates.map((gov) => {
                          const isSelected = governorate === gov;
                          return (
                            <button
                              key={gov}
                              type="button"
                              onClick={() => {
                                setGovernorate(gov);
                                setCity("");
                                setIsGovOpen(false);
                                if (errors.governorate) setErrors((prev) => ({ ...prev, governorate: "" }));
                              }}
                              className={`w-full text-right px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-[#E8FAF0] text-[#056B38]"
                                  : "text-[#05291A] hover:bg-[#F7FAF8] hover:text-[#056B38]"
                              }`}
                            >
                              <span>{gov}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#056B38]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* City / District Dropdown (Dynamic based on selected governorate) */}
                  <div className="space-y-1.5 text-right relative" ref={cityRef}>
                    <label className="text-[12px] font-bold text-[#05291A]">
                      المدينة / المركز / الحي <span className="text-red-500 font-bold text-[14px]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={city}
                        onFocus={() => setIsCityOpen(true)}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setIsCityOpen(true);
                          if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
                        }}
                        placeholder={availableCities.length > 0 ? "اختر أو ابحث عن مدينتك..." : "اختر المحافظة أولاً..."}
                        className={`w-full h-11 rounded-[14px] border pr-3.5 pl-9 text-[13px] text-[#05291A] focus:outline-none transition-all ${
                          errors.city
                            ? "border-red-500 bg-red-50/20 focus:border-red-500 ring-1 ring-red-400"
                            : "border-[#D1E3D6] bg-[#F7FAF8] focus:bg-white focus:border-[#056B38]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setIsCityOpen(!isCityOpen)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-[#056B38] cursor-pointer"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${isCityOpen ? "rotate-180 text-[#056B38]" : ""}`} />
                      </button>
                    </div>
                    {errors.city && (
                      <p className="text-[11px] text-red-600 font-bold flex items-center gap-1 mt-0.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{errors.city}</span>
                      </p>
                    )}

                    {isCityOpen && availableCities.length > 0 && (
                      <div
                        onWheel={(e) => e.stopPropagation()}
                        className="absolute top-full right-0 left-0 mt-1.5 max-h-48 overflow-y-auto overscroll-contain rounded-2xl border border-[#D1E3D6] bg-white shadow-xl z-50 p-1.5 space-y-0.5"
                      >
                        {filteredCities.map((c) => {
                          const isSelected = city === c;
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => {
                                setCity(c);
                                setIsCityOpen(false);
                                if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
                              }}
                              className={`w-full text-right px-3.5 py-2 rounded-xl text-[12px] font-bold transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-[#E8FAF0] text-[#056B38]"
                                  : "text-[#05291A] hover:bg-[#F7FAF8] hover:text-[#056B38]"
                              }`}
                            >
                              <span>{c}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#056B38]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Social Links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5 text-right">
                    <label className="text-[12px] font-bold text-[#05291A]">حساب GitHub</label>
                    <input
                      type="text"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="https://github.com/username"
                      dir="ltr"
                      className="w-full h-11 rounded-[14px] border border-[#D1E3D6] bg-[#F7FAF8] px-3.5 text-[12px] text-[#05291A] focus:bg-white focus:border-[#056B38] focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-[12px] font-bold text-[#05291A]">حساب LinkedIn</label>
                    <input
                      type="text"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="https://linkedin.com/in/username"
                      dir="ltr"
                      className="w-full h-11 rounded-[14px] border border-[#D1E3D6] bg-[#F7FAF8] px-3.5 text-[12px] text-[#05291A] focus:bg-white focus:border-[#056B38] focus:outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-[12px] font-bold text-[#05291A]">الموقع الشخصي</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://portfolio.dev"
                      dir="ltr"
                      className="w-full h-11 rounded-[14px] border border-[#D1E3D6] bg-[#F7FAF8] px-3.5 text-[12px] text-[#05291A] focus:bg-white focus:border-[#056B38] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-right">
                  <label className="text-[12px] font-bold text-[#05291A]">نبذة شخصية (Bio)</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="اكتب نبذة مختصرة عن خبراتك البرمجية..."
                    rows={2}
                    className="w-full rounded-[14px] border border-[#D1E3D6] bg-[#F7FAF8] p-3 text-[13px] text-[#05291A] focus:bg-white focus:border-[#056B38] focus:outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {/* ACTION BUTTONS (BOTTOM RIGHT) */}
            <div className="flex items-center justify-between pt-4 border-t border-[#D1E3D6]">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="h-11 px-6 rounded-full border border-[#D1E3D6] bg-white text-[#05291A] font-bold text-[13px] hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>الخطوة السابقة</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="h-11 px-8 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-bold text-[13px] transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <span>الخطوة التالية</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isStartingAssessment}
                  onClick={handleCompleteOnboarding}
                  className="h-11 px-8 rounded-full bg-[#056B38] hover:bg-[#005B27] text-white font-bold text-[13px] transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isStartingAssessment ? (
                    <span>جاري التوليد والدخول...</span>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>تأكيد وبدء التقييم بالذكاء الاصطناعي</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>

          {/* LEFT COLUMN: Live Verified Passport Card (Takes 4 Columns) */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            <div className="rounded-[24px] bg-[#05291A] text-white p-6 space-y-5 shadow-lg relative border border-[#04331B]">
              
              {/* Header: معاينة الجواز on Right, Verified Passport on Left */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3.5">
                <div className="flex items-center gap-1.5 text-white/90">
                  <ShieldCheck className="w-4 h-4 text-[#339E61]" />
                  <span className="text-[12px] font-bold font-heading">معاينة الجواز الرقمي</span>
                </div>
                <span className="text-[10px] font-bold bg-[#056B38] px-2.5 py-0.5 rounded-full text-[#D4F5E0] border border-[#339E61]/40">
                  Verified Passport
                </span>
              </div>

              {/* Center: Avatar Circle on Right, @username on Left */}
              <div className="flex items-center justify-between pt-1">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Passport Avatar"
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#339E61] shadow-xs"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#D4F5E0] text-[#056B38] flex items-center justify-center text-[22px] font-black shadow-xs border-2 border-[#339E61]">
                    {avatarLetter}
                  </div>
                )}

                <div className="text-left dir-ltr">
                  <div className="text-[13px] font-bold text-white/90">
                    @{username || "username"}
                  </div>
                  <div className="text-[10px] text-neutral-400">الصورة اختيارية</div>
                </div>
              </div>

              {/* Developer Details */}
              <div className="space-y-1 text-right">
                <h3 className="text-[20px] font-extrabold text-white font-heading leading-snug">
                  {fullNameDisplay || "محمد وائل"}
                </h3>
                <div className="text-[12px] text-[#D4F5E0] font-bold">
                  {passportTracksDisplay}
                </div>
                <div className="text-[11px] text-neutral-300 pt-1 space-y-0.5">
                  <div>
                    {qualificationType === "self-taught"
                      ? "تعلم ذاتي"
                      : universityName
                      ? collegeName
                        ? `${universityName} · ${collegeName}`
                        : universityName
                      : collegeName || "اسم الجامعة / الكلية"}
                  </div>
                  <div className="flex items-center gap-1 text-[#339E61]">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{combinedLocation || "المحافظة - المدينة"}</span>
                  </div>
                </div>
              </div>

              {/* Stats Box (Trust Score 0% on Right + SP 0 on Left) */}
              <div className="grid grid-cols-2 gap-2 bg-black/25 p-3.5 rounded-2xl border border-white/10 text-center">
                <div className="border-l border-white/10 pl-2">
                  <div className="text-[10px] text-neutral-400 font-medium">نقاط الثقة</div>
                  <div className="text-[16px] font-black text-[#339E61]">
                    {developer.trustScore && developer.trustScore > 0 ? `${developer.trustScore}%` : "0%"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400 font-medium">رصيد الـ SP</div>
                  <div className="text-[16px] font-black text-amber-400">
                    SP {developer.skillPoints && developer.skillPoints > 0 ? developer.skillPoints : 0}
                  </div>
                </div>
              </div>

              {/* Selected Skills */}
              <div className="text-right space-y-1.5 pt-1">
                <div className="text-[11px] font-bold text-neutral-300">
                  المهارات المحددة ({selectedSkills.length}):
                </div>
                {selectedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSkills.slice(0, 6).map((sk) => (
                      <span key={sk} className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full text-white">
                        {sk}
                      </span>
                    ))}
                    {selectedSkills.length > 6 && (
                      <span className="text-[10px] font-bold bg-white/10 px-1.5 py-0.5 rounded-full text-neutral-300">
                        +{selectedSkills.length - 6}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-neutral-500">لم يتم تحديد مهارات بعد</div>
                )}
              </div>

            </div>
          </div>

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
