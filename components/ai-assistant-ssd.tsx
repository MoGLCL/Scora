"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProfile } from "@/components/profile-provider";
import {
  Send,
  X,
  DollarSign,
  Briefcase,
  Users,
  ArrowLeft,
  Zap,
  Minimize2,
  Sparkles,
  Cloud
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "ssd" | "user";
  text: string;
  time: string;
  actions?: Array<{ label: string; action: () => void }>;
}

export function AiAssistantSsd() {
  const router = useRouter();
  const { userRole, isAdmin, developer, client, systemSettings, showSsdAssistant, setShowSsdAssistant, addToast } = useProfile();

  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isMorphing, setIsMorphing] = useState(false);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [inputText, setInputText] = useState("");
  const [eyeState, setEyeState] = useState<"normal" | "happy" | "wink" | "excited">("normal");

  // Prompts for speech bubble
  const developerPrompts = [
    "محتاج تظبط ملفك الشخصي والجواز الرقمي؟",
    "محتار في تحديد سعر عادل لمشروعك ورصيد الـ SP؟",
    "عايز مساعدة في اجتياز التقييمات البرمجية؟",
    "محتاج استكشاف أحدث عروض العمل المناسبة لمهاراتك؟",
  ];

  const clientPrompts = [
    "بتدور على مطور معين بمواصفات خاصة؟",
    "عايز مساعدة في تحديد ميزانية وسعر طلبك؟",
    "محتاج تنشر مشروع جديد ومحتار في تحديد نطاق العمل؟",
    "عايز تقييم تلقائي لطلبات التوظيف المتقدمة؟",
  ];

  const guestPrompts = [
    "مرحباً بك! أنا SSD مساعدك الذكي في Scora",
    "بتدور على ايه النهاردة في المنصة؟",
    "عايز استكشاف المطورين الموثقين أو إنشاء حساب جديد؟",
  ];

  const adminPrompts = [
    "عايز مقارنة بين عدد المطورين والعملاء؟",
    "اسألني عن المستخدمين المحظورين أو الموقوفين.",
    "محتاج ملخص سريع عن حالة المنصة؟",
    "عايز تقارن بين المطورين حسب الثقة ونقاط SP؟",
  ];

  const activePrompts =
    isAdmin
      ? adminPrompts
      : userRole === "developer"
      ? developerPrompts
      : userRole === "client"
      ? clientPrompts
      : guestPrompts;

  // Cycle prompts & robot eye expressions automatically
  useEffect(() => {
    const timer = setInterval(() => {
      const expressions: Array<"normal" | "happy" | "wink" | "excited"> = ["normal", "happy", "wink", "excited"];
      setCurrentPromptIndex((current) => {
        const next = (current + 1) % activePrompts.length;
        setEyeState(expressions[next % expressions.length]);
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [activePrompts.length]);

  // Initial Messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ssd",
      text:
        userRole === "developer"
          ? `أهلاً بك يا ${developer.fullName}! أنا SSD المساعد الذكي. أستطيع مساعدتك في تحديد سعر عادل لعروضك وتوثيق مهاراتك.`
          : userRole === "client"
          ? `أهلاً بك يا ${client.fullName}! أنا SSD مساعدك الذكي. أستطيع البحث لك عن أفضل المطورين الموثقين ومساعدتك في تقدير الميزانية.`
          : "مرحباً بك! أنا SSD المساعد الذكي في منصة سكورا. كيف يمكنني مساعدتك؟",
      time: "الآن",
    },
  ]);

  // Handle Morphing Open Transition Sequence: Antenna spark turns to orbiting REAL CLOUD -> window morphs open
  const handleOpenChat = () => {
    setIsMorphing(true);
    /* Legacy local-response logic is intentionally unreachable; live AI errors are surfaced above without fake replies. */
    setTimeout(() => {
      setIsOpen(true);
      setIsMorphing(false);
    }, 380);
  };

  // Handle Morphing Close Transition Sequence: Window morphs down -> reverse orbiting cloud condenses to antenna spark
  const handleCloseChat = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 320);
  };

  // AI Actions
  const handleSearchDevelopers = () => {
    addToast("جاري التوجيه لدليل المطورين والبحث الذكي...", "info");
    router.push("/developers");
    handleCloseChat();
  };

  const handleCreateProject = () => {
    addToast("جاري فتح نموذج نشر مشروع جديد مع تقدير الميزانية...", "info");
    router.push("/projects/new");
    handleCloseChat();
  };

  const handleEstimateDeveloperPrice = () => {
    setEyeState("happy");
    const estimated = Math.round((developer.skillPoints * 25) + 10000);
    const textMsg = `بناءً على رصيد مهاراتك (${developer.skillPoints} SP) ونسبة ثقتك (${developer.trustScore}%)، أنصحك بتقديم سعر عادل في حدود ${estimated.toLocaleString("ar-EG")} ج.م للمشاريع المتوسطة.`;
    
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "ssd",
        text: textMsg,
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        actions: [
          { label: "تصفح المشاريع والتقديم", action: () => { router.push("/projects"); handleCloseChat(); } }
        ]
      },
    ]);
  };

  const handleEstimateClientBudget = () => {
    setEyeState("excited");
    const textMsg = "للمشاريع البرمجية المتكاملة (Full-Stack Web / SaaS Dashboard)، الميزانية التقديرية المنطقية في سوق المطورين الموثقين هي بين 20,000 ج.م و 35,000 ج.م بمهلة تسليم 14 يوماً.";
    
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "ssd",
        text: textMsg,
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        actions: [
          { label: "نشر المشروع بالأسعار المقترحة", action: handleCreateProject }
        ]
      },
    ]);
  };

  // Chat Logic
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userMsgText,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setEyeState("excited");

    try {
      const response=await fetch("/api/ai/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:userMsgText})});
      const data=await response.json();
      if(!response.ok) throw new Error(data.error||"AI_UNAVAILABLE");
      setMessages((prev)=>[...prev,{id:(Date.now()+1).toString(),sender:"ssd",text:data.answer,time:new Date().toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}]);
      setEyeState("happy");
      return;
    } catch {
      setMessages((prev)=>[...prev,{id:(Date.now()+1).toString(),sender:"ssd",text:"خدمة المساعد غير متاحة حاليًا. لم يتم إنشاء رد بديل أو بيانات وهمية.",time:new Date().toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}]);
      setEyeState("normal");
      return;
    }
    setTimeout(() => {
      let responseText = "أنا هنا لمساعدتك! اختر إحدى التوصيات الذكية أدناه للتحكم في المنصة.";
      let actions: Array<{ label: string; action: () => void }> | undefined = undefined;

      const lower = userMsgText.toLowerCase();
      if (isAdmin) {
        if (lower.includes("مقارنة") || lower.includes("مقارنه") || lower.includes("قارن")) {
          responseText = "أقدر أقارن لك بين المطورين والعملاء، الحسابات النشطة والمحظورة، أو المطورين حسب Trust Score وSP. البيانات تتحدث تلقائيًا من قاعدة البيانات.";
          actions = [{ label: "فتح إدارة المستخدمين", action: () => { router.push("/admin"); handleCloseChat(); } }];
        } else if (lower.includes("محظور") || lower.includes("موقوف") || lower.includes("حظر")) {
          responseText = "راجع الحسابات المحظورة والموقوفة في إدارة المستخدمين. كل تعديل للحالة يتحقق منه السيرفر ويحفظ في قاعدة البيانات.";
          actions = [{ label: "مراجعة حالات الحسابات", action: () => { router.push("/admin"); handleCloseChat(); } }];
        } else if (lower.includes("ملخص") || lower.includes("إحص") || lower.includes("احص") || lower.includes("حالة المنصة")) {
          responseText = "يمكنني مساعدتك في تلخيص المستخدمين، مقارنة الأدوار، مراجعة الحظر، وفحص إعدادات المنصة والـ AI.";
          actions = [{ label: "فتح لوحة الإدارة", action: () => { router.push("/admin"); handleCloseChat(); } }];
        }
      }

      if (lower.includes("مطور") || lower.includes("ابحث") || lower.includes("بحث")) {
        responseText = "يمكنني نقلك فوراً لدليل المطورين الموثقين وفلترتهم بحسب المهارات ونقاط الثقة.";
        actions = [{ label: "الانتقال لدليل المطورين", action: handleSearchDevelopers }];
      } else if (lower.includes("سعر") || lower.includes("ميزانية") || lower.includes("فلوس") || lower.includes("بكام")) {
        if (userRole === "developer") {
          responseText = `حسب نقاطك (${developer.skillPoints} SP) وجوازك الموثق، السعر المقترح لعروضك هو بين 15,000 و 25,000 ج.م.`;
        } else {
          responseText = "أنصحك بوضع ميزانية منطقية من 20,000 إلى 35,000 ج.م للمشاريع البرمجية المتكاملة لضمان استجابة كبار المطورين.";
        }
      } else if (lower.includes("مشروع") || lower.includes("شغل") || lower.includes("وظيفة")) {
        responseText = "يمكننا فتح صفحة المشاريع فوراً أو إنشاء عرض مشروع جديد لتوظيف المطورين.";
        actions = [
          { label: "استكشاف المشاريع", action: () => { router.push("/projects"); handleCloseChat(); } },
          { label: "+ نشر عرض جديد", action: handleCreateProject },
        ];
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ssd",
          text: responseText,
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          actions,
        },
      ]);
    }, 700);
  };

  if (!systemSettings.isAiAssistantEnabled || !showSsdAssistant) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-3 sm:right-4 lg:right-6 z-50 font-body dir-rtl" dir="rtl">
      
      {/* 1. ORIGINAL 3D ROBOT MASCOT BUTTON & FLOATING SPEECH BUBBLE */}
      {!isOpen && (
        <div className="relative flex flex-col items-start gap-2 animate-bounce cursor-pointer group">
          
          {/* FLOATING SPEECH BUBBLE TOOLTIP (DESKTOP ONLY WHEN CLOSED) */}
          {!isMorphing && !isClosing && (
            <div className="hidden sm:block w-72 rounded-[22px] bg-[#05291A] text-white p-4 shadow-2xl border-2 border-[#339E61] animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto relative">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#056B38] text-white flex items-center justify-center font-extrabold text-[11px] shrink-0 border border-emerald-400">
                  SSD
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#339E61]">SSD AI Assistant</span>
                    <span className="text-[9px] bg-[#056B38] text-[#D4F5E0] px-2 py-0.5 rounded-full font-bold">
                      متصل
                    </span>
                  </div>
                  <p className="text-[12px] text-white font-medium leading-relaxed">
                    {activePrompts[currentPromptIndex]}
                  </p>
                </div>
              </div>
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[#05291A] border-b-2 border-r-2 border-[#339E61] rotate-45" />
            </div>
          )}

          <button
            type="button"
            onClick={handleOpenChat}
            className="relative transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            title="افتح المساعد الذكي SSD"
          >
            {/* 3D ANIMATED ROBOT MASCOT HEAD */}
            <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#04331B] via-[#056B38] to-[#128648] p-1.5 shadow-2xl border-2 border-emerald-400 flex items-center justify-center ${
              isMorphing ? "scale-125 transition-transform duration-300" : ""
            }`}>
            
            {/* REAL ORGANIC PUFF CLOUD (ORBITS AROUND MASCOT HEAD ON OPEN/CLOSE) */}
            <div className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 flex flex-col items-center z-40">
              {isMorphing || isClosing ? (
                <div className={isClosing ? "animate-ssd-orbit-cloud-reverse" : "animate-ssd-orbit-cloud"}>
                  <div className="px-2 py-1 rounded-full bg-gradient-to-r from-emerald-300 via-green-300 to-emerald-400 shadow-[0_0_30px_#34d399] flex items-center justify-center border border-white/80 gap-1 backdrop-blur-xs">
                    <Cloud className="w-5 h-5 text-white fill-white animate-pulse" />
                    <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
                  </div>
                </div>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span className="w-1.5 h-3 sm:h-4 bg-gradient-to-b from-emerald-400 to-[#056B38] rounded-full" />
                </>
              )}
            </div>

            {/* Metallic Robot Visor Head */}
            <div className="w-full h-full rounded-full bg-[#05291A] flex flex-col items-center justify-center p-1.5 sm:p-2 relative overflow-hidden border border-emerald-400/50 shadow-inner">
              
              {/* Robot Visor Glass Effect */}
              <div className="w-11 h-6 sm:w-14 sm:h-8 rounded-full bg-gradient-to-b from-[#021A10] to-[#053D22] border border-emerald-400/60 flex items-center justify-center relative overflow-hidden shadow-inner">
                
                {/* Glowing Laser Scanline */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400/40 animate-pulse" />

                {/* Animated Eyes inside Visor */}
                <div className="flex items-center gap-1.5 sm:gap-2 z-10">
                  {eyeState === "normal" && (
                    <>
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
                    </>
                  )}
                  {eyeState === "happy" && (
                    <>
                      <span className="text-[12px] sm:text-[14px] font-bold text-emerald-400">^</span>
                      <span className="text-[12px] sm:text-[14px] font-bold text-emerald-400">^</span>
                    </>
                  )}
                  {eyeState === "wink" && (
                    <>
                      <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                      <span className="text-[10px] sm:text-[12px] font-bold text-emerald-400">;</span>
                    </>
                  )}
                  {eyeState === "excited" && (
                    <>
                      <span className="text-[10px] sm:text-[12px] font-bold text-amber-400">&gt;</span>
                      <span className="text-[10px] sm:text-[12px] font-bold text-amber-400">&lt;</span>
                    </>
                  )}
                </div>
              </div>

              {/* Robot Core Badge - CENTERED DIRECTLY UNDER EYES */}
              <div className="mt-0.5 sm:mt-1 flex items-center justify-center w-full">
                <span className="text-[8px] sm:text-[9px] font-extrabold text-emerald-300 font-mono tracking-wider text-center block">
                  SSD-AI
                </span>
              </div>

            </div>

          </div>
        </button>
      </div>
      )}

      {!isOpen && (
        <button type="button" onClick={() => setShowSsdAssistant(false)}
          className="absolute -top-2 -left-2 z-20 rounded-full bg-white border border-[#D1E3D6] p-1.5 text-[#526B5E] shadow-md hover:text-red-600"
          aria-label="إخفاء مساعد الذكاء الاصطناعي">
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 2. CHAT RECTANGLE WINDOW WITH SYMMETRIC OPEN/CLOSE MORPHING ANIMATIONS */}
      {isOpen && (
        <div className={`w-[calc(100vw-2rem)] sm:w-[400px] h-[75vh] max-h-[550px] rounded-[28px] border-2 border-[#056B38] bg-white shadow-2xl flex flex-col overflow-hidden ${
          isClosing ? "animate-ssd-morph-window-close" : "animate-ssd-morph-window"
        }`}>
          
          {/* Header */}
          <div className="bg-[#05291A] text-[#ffffff] p-3.5 sm:p-4 flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#04331B] to-[#056B38] border-2 border-emerald-400 p-0.5 sm:p-1 flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full bg-[#05291A] flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400" />
                    <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[6px] sm:text-[7px] font-bold text-emerald-300 font-mono mt-0.5">SSD</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[14px] sm:text-[15px] font-extrabold text-white font-heading">SSD Assistant</h3>
                  <span className="text-[9px] sm:text-[10px] font-bold bg-[#056B38] text-[#D4F5E0] px-2 py-0.5 rounded-full">
                    مساعد ذكي
                  </span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-[#D4F5E0] flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>متصل للتحكم بالموقع</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseChat}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="تصغير الشات"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Chips Bar */}
          <div className="p-2.5 sm:p-3 bg-[#E8FAF0] border-b border-[#D1E3D6] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
            {userRole === "developer" ? (
              <>
                <button
                  type="button"
                  onClick={handleEstimateDeveloperPrice}
                  className="px-3 py-1.5 rounded-full bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <DollarSign className="w-3 h-3" />
                  <span>تسعير العرض الفني</span>
                </button>
                <button
                  type="button"
                  onClick={() => { router.push("/projects"); handleCloseChat(); }}
                  className="px-3 py-1.5 rounded-full bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Briefcase className="w-3 h-3" />
                  <span>استكشاف المشاريع</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSearchDevelopers}
                  className="px-3 py-1.5 rounded-full bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Users className="w-3 h-3" />
                  <span>البحث عن مطور</span>
                </button>
                <button
                  type="button"
                  onClick={handleEstimateClientBudget}
                  className="px-3 py-1.5 rounded-full bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <DollarSign className="w-3 h-3" />
                  <span>تقدير الميزانية</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateProject}
                  className="px-3 py-1.5 rounded-full bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" />
                  <span>+ نشر مشروع</span>
                </button>
              </>
            )}
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 bg-[#F7FAF8]">
            {messages.map((msg) => {
              const isSSD = msg.sender === "ssd";
              return (
                <div key={msg.id} className={`flex flex-col animate-in fade-in-0 slide-in-from-bottom-2 duration-250 ${isSSD ? "items-start" : "items-end"}`}>
                  <div
                    className={`max-w-[88%] p-3 sm:p-3.5 rounded-[18px] text-[12px] leading-relaxed shadow-2xs ${
                      isSSD
                        ? "bg-white border border-[#D1E3D6] text-[#05291A] rounded-tr-none"
                        : "bg-[#056B38] text-white rounded-tl-none font-medium"
                    }`}
                  >
                    {msg.text}

                    {/* Action Buttons */}
                    {msg.actions && (
                      <div className="mt-3 pt-2 border-t border-neutral-100 flex flex-wrap gap-2">
                        {msg.actions.map((act, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={act.action}
                            className="px-3 py-1 rounded-full bg-[#056B38] text-white text-[11px] font-bold hover:bg-[#08592E] transition-all cursor-pointer flex items-center gap-1"
                          >
                            <span>{act.label}</span>
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-[#526B5E] mt-1 px-1">{msg.time}</span>
                </div>
              );
            })}
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSend} className="p-2.5 sm:p-3 bg-white border-t border-[#D1E3D6] flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اطلب أي شيء من SSD..."
              className="flex-1 h-[40px] sm:h-[42px] rounded-full border border-[#D1E3D6] bg-white px-3.5 text-[12px] text-[#05291A] outline-none focus:border-[#056B38]"
            />
            <button
              type="submit"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>

        </div>
      )}

    </div>
  );
}
