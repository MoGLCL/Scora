"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useProfile } from "@/components/profile-provider";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import {
  Send,
  X,
  Sparkles,
  Bot,
  Minimize2,
  DollarSign,
  Users,
  ArrowLeft,
  Zap,
  RotateCcw,
  User,
  Loader2,
  ExternalLink,
  BrainCircuit,
  Code2,
} from "lucide-react";

interface ProjectDraft {
  title: string;
  description: string;
  category?: string;
  budgetFrom?: number;
  budgetTo?: number;
  deadlineDays?: number;
  skills?: string[];
  deliverables?: string[];
  target?: "client_project" | "developer_portfolio";
  executionTime?: string | null;
  startDate?: string | null;
  isOpenSource?: boolean | null;
  projectStatus?: "completed" | "in_progress" | null;
  previewUrl?: string | null;
  githubUrl?: string | null;
}

interface ChatMessage {
  id: string;
  sender: "ssd" | "user";
  text: string;
  time: string;
  projectDraft?: ProjectDraft;
  resultCards?: AssistantResultCard[];
  adminReport?: AssistantAdminReport | null;
  pendingAdminAction?: PendingAdminAction | null;
  pendingAdminStatus?: "pending" | "running" | "success" | "error" | "cancelled";
  actions?: Array<{ label: string; action: () => void }>;
}

type AgentActionType =
  | "create_project"
  | "create_portfolio_project"
  | "search_developers"
  | "estimate_pricing"
  | "browse_projects"
  | "navigate";

interface AgentActionResponse {
  type: AgentActionType;
  label: string;
  url?: string | null;
  projectDraft?: ProjectDraft | null;
}

interface AssistantApiResponse {
  answer?: string;
  error?: string;
  projectDraft?: ProjectDraft | null;
  actions?: AgentActionResponse[] | null;
  resultCards?: AssistantResultCard[];
  adminReport?: AssistantAdminReport | null;
  pendingAdminAction?: PendingAdminAction | null;
}

interface AssistantDeveloperCard {
  kind: "developer";
  userId: number;
  name: string;
  username: string;
  role: string;
  trustScore: number;
  skillPoints: number;
  skills: string[];
  profileUrl: string;
}

interface AssistantProjectCard {
  kind: "project";
  id: number;
  title: string;
  description: string;
  budgetFrom: number;
  budgetTo: number;
  deadlineDays: number | null;
  skills: string[];
  projectUrl: string;
}

type AssistantResultCard = AssistantDeveloperCard | AssistantProjectCard;

interface AssistantAdminReport {
  kind: "admin_report";
  today: Record<string, number>;
  yesterday: Record<string, number>;
  differences: Record<string, number>;
  recentAudit: Array<{ action: string; status: string; createdAt: string }>;
}

interface PendingAdminAction {
  type: "adjust_skill_points";
  token: string;
  target: { userId: number; name: string; username: string; currentSkillPoints: number };
  delta: number;
  nextSkillPoints: number;
  expiresAt: number;
}

const THINKING_MESSAGES = [
  "بفكر في طلبك وبحدد أفضل اتجاه",
  "برتب الفكرة والتفاصيل المهمة",
  "بجهز لك رد كامل وخطوات واضحة",
] as const;

export function AiAssistantSsd() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    userRole,
    isAdmin,
    developer,
    client,
    systemSettings,
    showSsdAssistant,
    setShowSsdAssistant,
    addToast,
  } = useProfile();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Floating Button Drag & Edge-Snap Positioning State
  const [position, setPosition] = useState<{ side: "left" | "right"; top: number }>({
    side: "left",
    top: 550,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const dragStartPos = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const [currentDragCoords, setCurrentDragCoords] = useState<{ x: number; y: number } | null>(null);

  // Load saved position from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("scora_ssd_agent_pos");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.side && typeof parsed.top === "number") {
          const maxTop = Math.max(100, window.innerHeight - 90);
          setPosition({
            side: parsed.side === "right" ? "right" : "left",
            top: Math.max(70, Math.min(maxTop, parsed.top)),
          });
        }
      } else {
        // Default bottom-left
        setPosition({ side: "left", top: Math.max(100, window.innerHeight - 100) });
      }
    } catch {
      // ignore
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    dragStartPos.current = { x: e.clientX, y: e.clientY, time: Date.now() };
    setCurrentDragCoords({ x: rect.left, y: rect.top });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragOffset) return;
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    setCurrentDragCoords({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragOffset(null);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const dist = Math.hypot(
      e.clientX - dragStartPos.current.x,
      e.clientY - dragStartPos.current.y
    );
    const duration = Date.now() - dragStartPos.current.time;

    // Quick tap / click
    if (dist < 8 && duration < 500) {
      setCurrentDragCoords(null);
      handleOpenChat();
      return;
    }

    // Dragged: snap to nearest side (left or right)
    const midX = window.innerWidth / 2;
    const snappedSide: "left" | "right" = e.clientX < midX ? "left" : "right";
    const maxTop = Math.max(100, window.innerHeight - 90);
    const snappedTop = Math.max(70, Math.min(maxTop, e.clientY - 25));

    const newPos = { side: snappedSide, top: snappedTop };
    setPosition(newPos);
    setCurrentDragCoords(null);

    try {
      localStorage.setItem("scora_ssd_agent_pos", JSON.stringify(newPos));
    } catch {}
  };

  // Initial Welcome Message
  const getInitialMessage = (): string => {
    if (isAdmin) {
      return "مرحباً يا مدير النظام! أنا SSD وكيل الذكاء الاصطناعي في سكورا. أستطيع تنفيذ المهام الإدارية، تحليل المنصة، أو صياغة مشاريع ومراجعات كاملة لك.";
    }
    if (userRole === "developer") {
      return `أهلاً بك يا ${developer.fullName || "بطل البرمجة"}! أنا SSD وكيلك الذكي في سكورا، أستطيع صياغة مقترحات تقنية لك، تسعير عروضك بالـ SP، ومساعدتك في العثور على أنسب المشاريع لمهاراتك.`;
    }
    if (userRole === "client") {
      return `مرحباً بك يا ${client.fullName || "صاحب العمل"}! أنا SSD وكيل الذكاء الاصطناعي، اطلب مني صياغة أي مشروع وسأقوم بتعبئة كافة تفاصيله وميزانيته ونقلك لصفحة النشر فوراً!`;
    }
    return "مرحباً بك! أنا SSD الوكيل والمساعد الذكي في منصة سكورا. كيف أساعدك اليوم؟ (يمكنك أن تطلب مني صياغة مشروع كامل، تقدير الميزانية، أو البحث عن مطورين).";
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ssd",
      text: getInitialMessage(),
      time: "الآن",
    },
  ]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  useEffect(() => {
    if (!isTyping) return;

    const timer = window.setInterval(() => {
      setThinkingStep((current) => (current + 1) % THINKING_MESSAGES.length);
    }, 1_800);

    return () => window.clearInterval(timer);
  }, [isTyping]);

  // Fast Instant Open / Close
  const handleOpenChat = () => {
    setIsOpen(true);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: "ssd",
        text: getInitialMessage(),
        time: "الآن",
      },
    ]);
  };

  // Agent Actions
  const handleApplyDraftAndNavigate = (draft: ProjectDraft) => {
    try {
      sessionStorage.setItem("scora_ai_project_draft", JSON.stringify(draft));
      addToast("جاري فتح صفحة نشر المشروع مع تعبئة كافة التفاصيل تلقائياً...", "info");
      router.push("/projects/new");
      handleCloseChat();
    } catch {
      router.push("/projects/new");
      handleCloseChat();
    }
  };

  const handleApplyPortfolioDraftAndNavigate = (draft: ProjectDraft) => {
    try {
      sessionStorage.setItem("scora_ai_portfolio_draft", JSON.stringify(draft));
      addToast("جاري فتح صفحة إضافة المشروع لمعرض الأعمال وتعبئة تفاصيله تلقائياً...", "info");
      router.push("/portfolio/new");
      handleCloseChat();
    } catch {
      router.push("/portfolio/new");
      handleCloseChat();
    }
  };

  const handleSearchDevelopers = (skill?: string) => {
    addToast("جاري الانتقال لدليل المطورين الموثقين...", "info");
    router.push(skill ? `/developers?skill=${encodeURIComponent(skill)}` : "/developers");
    handleCloseChat();
  };

  const handleCreateProjectPrompt = (promptText: string) => {
    setInputText(promptText);
  };

  const handleEstimateDeveloperPrice = () => {
    const estimated = Math.round((developer.skillPoints || 0) * 25 + 10000);
    const textMsg = `بناءً على رصيد مهاراتك (${developer.skillPoints || 0} SP) ونسبة ثقتك (${
      developer.trustScore || 0
    }%)، السعر التنافسي العادل المقترح لعروضك هو بين ${estimated.toLocaleString(
      "ar-EG"
    )} ج.م و ${(estimated + 8000).toLocaleString("ar-EG")} ج.م للمشاريع المتوسطة.`;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "ssd",
        text: textMsg,
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        actions: [
          {
            label: "تصفح المشاريع والتقديم",
            action: () => {
              router.push("/projects");
              handleCloseChat();
            },
          },
        ],
      },
    ]);
  };

  const updatePendingAdminStatus = (messageId: string, status: ChatMessage["pendingAdminStatus"]) => {
    setMessages((current) => current.map((message) => message.id === messageId ? { ...message, pendingAdminStatus: status } : message));
  };

  const handleConfirmAdminAction = async (messageId: string, action: PendingAdminAction) => {
    updatePendingAdminStatus(messageId, "running");
    try {
      const response = await fetch("/api/ai/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: action.token }),
      });
      const data = await response.json() as { error?: string; result?: { next: number } };
      if (!response.ok) throw new Error(data.error || "ACTION_FAILED");
      updatePendingAdminStatus(messageId, "success");
      addToast(`تم تحديث نقاط ${action.target.name} إلى ${data.result?.next ?? action.nextSkillPoints} SP وتسجيل العملية.`, "success");
    } catch (error) {
      updatePendingAdminStatus(messageId, "error");
      addToast(error instanceof Error ? error.message : "تعذر تنفيذ الإجراء الإداري", "warn");
    }
  };

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMsgText = inputText.trim();
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: userMsgText,
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setThinkingStep(0);
    setIsTyping(true);

    try {
      let latestPageContext: Record<string, unknown> | undefined;
      try {
        const raw = sessionStorage.getItem("scora_ai_page_context");
        latestPageContext = raw ? JSON.parse(raw) : undefined;
      } catch {
      }
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsgText, pathname, pageContext: latestPageContext }),
      });
      const data = (await response.json()) as AssistantApiResponse;
      if (!response.ok) throw new Error(data.error || "AI_UNAVAILABLE");

      const draft = data.projectDraft ?? undefined;
      const actions = data.actions
        ? data.actions.map((act) => ({
            label: act.label,
            action: () => {
              if (act.type === "create_portfolio_project" || (act.projectDraft?.target === "developer_portfolio") || (draft?.target === "developer_portfolio")) {
                handleApplyPortfolioDraftAndNavigate(act.projectDraft || draft!);
              } else if (act.type === "create_project" && (act.projectDraft || draft)) {
                handleApplyDraftAndNavigate(act.projectDraft || draft!);
              } else if (act.type === "search_developers") {
                handleSearchDevelopers();
              } else if (act.type === "browse_projects") {
                router.push("/projects");
                handleCloseChat();
              }
            },
          }))
        : draft
        ? [
            {
              label: draft.target === "developer_portfolio" ? "تعبئة ونشر المشروع في معرض أعمالي 🚀" : "تعبئة مسودة المشروع والتعديل عليها ✍️",
              action: () => {
                if (draft.target === "developer_portfolio") {
                  handleApplyPortfolioDraftAndNavigate(draft);
                } else {
                  handleApplyDraftAndNavigate(draft);
                }
              },
            },
          ]
        : undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ssd",
          text: data.answer || "تعذر تجهيز الرد الكامل. حاول مرة أخرى من فضلك.",
          projectDraft: draft,
          resultCards: data.resultCards,
          adminReport: data.adminReport,
          pendingAdminAction: data.pendingAdminAction,
          pendingAdminStatus: data.pendingAdminAction ? "pending" : undefined,
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
          actions,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "ssd",
          text: "⚠️ نعتذر، هناك مشكلة في الاتصال بنماذج الذكاء الاصطناعي (OpenRouter) حالياً. إدارة المنصة على علم بالأمر وسيقوم الأدمن بحلها قريباً جداً!",
          time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  if (!systemSettings.isAiAssistantEnabled || !showSsdAssistant) return null;

  return (
    <>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. DRAGGABLE & SNAPPABLE FLOATING AGENT TRIGGER BUTTON */}
      {/* ───────────────────────────────────────────────────────────── */}
      {!isOpen && (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            left: currentDragCoords ? `${currentDragCoords.x}px` : (position.side === "left" ? "20px" : undefined),
            right: currentDragCoords ? undefined : (position.side === "right" ? "20px" : undefined),
            top: currentDragCoords ? `${currentDragCoords.y}px` : `${position.top}px`,
            position: "fixed",
            zIndex: 9999,
            transition: isDragging ? "none" : "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none",
            userSelect: "none",
          }}
          className={`flex items-center gap-2 group select-none ${
            position.side === "right" ? "flex-row-reverse" : "flex-row"
          }`}
        >
          {/* Dismiss Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSsdAssistant(false);
            }}
            className="h-6 w-6 rounded-full bg-neutral-900/60 hover:bg-neutral-900 text-white flex items-center justify-center text-xs shadow-md transition-all cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
            title="إخفاء زر المساعد الذكي"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Main Floating Trigger Pill */}
          <div
            title="شلني يعمو"
            className={`group relative flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-[#056B38] to-[#08592E] p-2 sm:p-3 text-white shadow-xl transition-all border border-emerald-400/30 ${
              isDragging
                ? "scale-105 shadow-2xl ring-4 ring-[#056B38]/30"
                : "hover:scale-105 hover:shadow-2xl"
            }`}
          >
            {/* Playful Floating Tooltip on Hover */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#05291A] text-emerald-200 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap border border-emerald-500/30">
              شلني يعمو
            </div>

            <span className="relative flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-white/20 shrink-0">
              <Bot className={`h-5 w-5 ${isDragging ? "" : "animate-pulse"}`} />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border border-white" />
            </span>

            {/* Text details - Hidden on mobile, visible on desktop */}
            <div className="hidden sm:flex flex-col text-right pl-2 pr-0.5">
              <span className="text-xs font-black leading-tight tracking-wide">SSD Agent</span>
              <span className="text-[9px] text-emerald-200 leading-tight">وكيل سكورا الذكي</span>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. CHAT AGENT WINDOW */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          dir="rtl"
          style={{
            left: position.side === "left" ? "16px" : undefined,
            right: position.side === "right" ? "16px" : undefined,
          }}
          className="fixed bottom-[76px] sm:bottom-6 z-50 flex flex-col w-[calc(100vw-32px)] sm:w-[420px] h-[540px] max-h-[78vh] rounded-[28px] border border-[#D1E3D6] bg-white shadow-2xl overflow-hidden font-body animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#056B38] to-[#04552D] text-white shadow-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-emerald-300" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-[#056B38]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-black text-white">SSD AI Agent</h3>
                  <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded-full font-mono">
                    PRO
                  </span>
                </div>
                <p className="text-[11px] text-emerald-100/80">المساعد والوكيل المستقل لمنصة سكورا</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="محادثة جديدة"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCloseChat}
                className="h-8 w-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="إغلاق"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-2 bg-[#F7FAF8] border-b border-[#D1E3D6] flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {userRole === "developer" && (
              <button
                type="button"
                onClick={() => handleCreateProjectPrompt("ساعدني في نشر مشروع متكامل لمعرض أعمالي مع وصف احترافي بالـ Markdown")}
                className="px-2.5 py-1 rounded-xl bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <Code2 className="w-3 h-3" />
                <span>مشروع بالمعرض (MD)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleCreateProjectPrompt("اعملي مشروع متجر إلكتروني متكامل")}
              className="px-2.5 py-1 rounded-xl bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Zap className="w-3 h-3" />
              <span>مشروع متجر</span>
            </button>
            <button
              type="button"
              onClick={() => handleCreateProjectPrompt("اعملي مشروع تطبيق موبايل للخدمات")}
              className="px-2.5 py-1 rounded-xl bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Zap className="w-3 h-3" />
              <span>مشروع موبايل</span>
            </button>
            <button
              type="button"
              onClick={() => handleSearchDevelopers()}
              className="px-2.5 py-1 rounded-xl bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              <Users className="w-3 h-3" />
              <span>بحث مطورين</span>
            </button>
            {userRole === "developer" && (
              <button
                type="button"
                onClick={handleEstimateDeveloperPrice}
                className="px-2.5 py-1 rounded-xl bg-white border border-[#D1E3D6] text-[11px] font-bold text-[#056B38] hover:bg-[#056B38] hover:text-white transition-all shrink-0 cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <DollarSign className="w-3 h-3" />
                <span>تسعير عروضي</span>
              </button>
            )}
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F7FAF8]">
            {messages.map((msg) => {
              const isSSD = msg.sender === "ssd";
              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isSSD ? "flex-row" : "flex-row-reverse"}`}
                >
                  <div
                    className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-2xs ${
                      isSSD ? "bg-[#056B38] text-white" : "bg-neutral-200 text-[#05291A]"
                    }`}
                  >
                    {isSSD ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-[20px] p-3.5 text-xs leading-relaxed shadow-xs ${
                      isSSD
                        ? "bg-white border border-[#D1E3D6] text-[#05291A] rounded-tr-xs"
                        : "bg-[#056B38] text-white rounded-tl-xs font-bold"
                    }`}
                  >
                    {isSSD ? (
                      <MarkdownRenderer content={msg.text} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}

                    {msg.projectDraft && (
                      <div className="mt-3 p-3 rounded-2xl bg-[#E8FAF0]/80 border-2 border-[#056B38]/30 space-y-2.5 text-right shadow-2xs">
                        <div className="flex items-center justify-between border-b border-[#D1E3D6] pb-2">
                          <span className="font-black text-[#05291A] text-xs flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#056B38]" />
                            <span>
                              {msg.projectDraft.target === "developer_portfolio" ? "مسودة مشروع معرض الأعمال (MD)" : "مسودة المشروع المقترحة"}
                            </span>
                          </span>
                          <span className="rounded-full bg-[#056B38] text-white text-[9px] font-black px-2 py-0.5">
                            جاهز للنقل
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="font-extrabold text-[#05291A] text-xs">
                            {msg.projectDraft.title}
                          </div>
                          <p className="text-[11px] text-[#526B5E] line-clamp-2">
                            {msg.projectDraft.description}
                          </p>
                        </div>

                        {msg.projectDraft.target === "developer_portfolio" ? (
                          <div className="flex flex-wrap gap-2 text-[10px] text-[#526B5E] font-bold">
                            {msg.projectDraft.executionTime && (
                              <span className="bg-white px-2 py-0.5 rounded-md border border-[#D1E3D6]">
                                ⏱️ {msg.projectDraft.executionTime}
                              </span>
                            )}
                            <span className="bg-white px-2 py-0.5 rounded-md border border-[#D1E3D6]">
                              {msg.projectDraft.isOpenSource ? "مفتوح المصدر" : "مغلق / تجاري"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 text-[10px] text-[#526B5E] font-bold">
                            <span className="bg-white px-2 py-0.5 rounded-md border border-[#D1E3D6]">
                              {msg.projectDraft.budgetFrom?.toLocaleString("ar-EG")} -{" "}
                              {msg.projectDraft.budgetTo?.toLocaleString("ar-EG")} ج.م
                            </span>
                            <span className="bg-white px-2 py-0.5 rounded-md border border-[#D1E3D6]">
                              {msg.projectDraft.deadlineDays} يوم
                            </span>
                          </div>
                        )}

                        {msg.projectDraft.skills && msg.projectDraft.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {msg.projectDraft.skills.map((sk, idx) => (
                              <span
                                key={idx}
                                className="text-[9px] font-black text-[#056B38] bg-white px-1.5 py-0.2 rounded border border-[#D1E3D6]"
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (msg.projectDraft?.target === "developer_portfolio") {
                              handleApplyPortfolioDraftAndNavigate(msg.projectDraft);
                            } else {
                              handleApplyDraftAndNavigate(msg.projectDraft!);
                            }
                          }}
                          className="w-full h-9 rounded-xl bg-[#056B38] hover:bg-[#005B27] text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>
                            {msg.projectDraft.target === "developer_portfolio" ? "تعبئة ونشر المشروع في معرض أعمالي" : "فتح وتعبئة مسودة المشروع الآن"}
                          </span>
                        </button>
                      </div>
                    )}

                    {msg.resultCards && msg.resultCards.length > 0 && (
                      <div className="mt-3 space-y-2 text-right">
                        <div className="flex items-center gap-1.5 text-[11px] font-black text-[#056B38]">
                          <Users className="h-3.5 w-3.5" />
                          <span>{msg.resultCards.some((card) => card.kind === "developer") ? "أفضل النتائج المطابقة" : "مشاريع متاحة لك"}</span>
                        </div>
                        {msg.resultCards.slice(0, 6).map((card) => card.kind === "developer" ? (
                          <a
                            key={`developer-${card.userId}`}
                            href={card.profileUrl}
                            className="block rounded-xl border border-[#D1E3D6] bg-[#F7FAF8] p-2.5 transition-colors hover:border-[#056B38] hover:bg-[#E8FAF0]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-[11px] font-black text-[#05291A]">{card.name}</div>
                                <div className="truncate text-[10px] text-[#526B5E]">{card.role} · @{card.username}</div>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#056B38]" />
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-bold text-[#056B38]">
                              <span className="rounded bg-white px-1.5 py-0.5">Trust {card.trustScore}%</span>
                              <span className="rounded bg-white px-1.5 py-0.5">{card.skillPoints} SP</span>
                              {card.skills.slice(0, 3).map((skill) => <span key={skill} className="rounded bg-white px-1.5 py-0.5">{skill}</span>)}
                            </div>
                          </a>
                        ) : (
                          <a
                            key={`project-${card.id}`}
                            href={card.projectUrl}
                            className="block rounded-xl border border-[#D1E3D6] bg-[#F7FAF8] p-2.5 transition-colors hover:border-[#056B38] hover:bg-[#E8FAF0]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="truncate text-[11px] font-black text-[#05291A]">{card.title}</div>
                                <p className="mt-0.5 line-clamp-2 text-[10px] text-[#526B5E]">{card.description}</p>
                              </div>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#056B38]" />
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1 text-[9px] font-bold text-[#056B38]">
                              <span className="rounded bg-white px-1.5 py-0.5">{card.budgetFrom.toLocaleString("ar-EG")} - {card.budgetTo.toLocaleString("ar-EG")} ج.م</span>
                              {card.deadlineDays && <span className="rounded bg-white px-1.5 py-0.5">{card.deadlineDays} يوم</span>}
                              {card.skills.slice(0, 3).map((skill) => <span key={skill} className="rounded bg-white px-1.5 py-0.5">{skill}</span>)}
                            </div>
                          </a>
                        ))}
                      </div>
                    )}

                    {msg.adminReport && (
                      <div className="mt-3 rounded-2xl border-2 border-[#056B38]/25 bg-[#E8FAF0]/70 p-3 text-[10px] text-[#05291A]">
                        <div className="mb-2 flex items-center justify-between border-b border-[#D1E3D6] pb-2">
                          <span className="font-black">تقرير اليوم مقارنة بالأمس</span>
                          <span className="text-[9px] text-[#526B5E]">بيانات مباشرة</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {Object.entries(msg.adminReport.today).map(([key, value]) => {
                            const diff = msg.adminReport!.differences[key] ?? 0;
                            return <div key={key} className="rounded-lg bg-white px-2 py-1.5"><div className="text-[#526B5E]">{key}</div><div className="font-black">{value} <span className={diff >= 0 ? "text-[#056B38]" : "text-red-600"}>({diff >= 0 ? "+" : ""}{diff})</span></div></div>;
                          })}
                        </div>
                      </div>
                    )}

                    {msg.pendingAdminAction && (
                      <div className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 text-[10px] text-[#3b2a08]">
                        <div className="font-black">تأكيد تعديل نقاط المهارة</div>
                        <p className="mt-1 leading-relaxed">سيتم {msg.pendingAdminAction.delta < 0 ? "خفض" : "زيادة"} نقاط <strong>{msg.pendingAdminAction.target.name}</strong> من {msg.pendingAdminAction.target.currentSkillPoints} إلى {msg.pendingAdminAction.nextSkillPoints} SP. لن يتم التنفيذ إلا بعد التأكيد.</p>
                        {msg.pendingAdminStatus === "pending" && <div className="mt-2 flex gap-1.5"><button type="button" onClick={() => handleConfirmAdminAction(msg.id, msg.pendingAdminAction!)} className="flex-1 rounded-lg bg-[#056B38] px-2 py-1.5 font-black text-white">تأكيد التنفيذ</button><button type="button" onClick={() => updatePendingAdminStatus(msg.id, "cancelled")} className="rounded-lg border border-amber-300 px-2 py-1.5 font-black">إلغاء</button></div>}
                        {msg.pendingAdminStatus === "running" && <div className="mt-2 font-bold text-[#056B38]">جاري التنفيذ والتحقق من الصلاحية...</div>}
                        {msg.pendingAdminStatus === "success" && <div className="mt-2 font-bold text-[#056B38]">تم التنفيذ وتسجيله في سجل الإدارة.</div>}
                        {msg.pendingAdminStatus === "error" && <div className="mt-2 font-bold text-red-600">فشل التنفيذ. لم يتم تغيير النقاط.</div>}
                        {msg.pendingAdminStatus === "cancelled" && <div className="mt-2 font-bold text-[#526B5E]">تم إلغاء الطلب.</div>}
                      </div>
                    )}

                    {/* Action Chips */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex flex-wrap gap-1.5">
                        {msg.actions.map((act, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={act.action}
                            className="px-3 py-1.5 rounded-xl bg-[#056B38] hover:bg-[#005B27] text-white text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                          >
                            <span>{act.label}</span>
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        ))}
                      </div>
                    )}

                    <div
                      className={`text-[9px] mt-1 text-left ${
                        isSSD ? "text-[#526B5E]" : "text-emerald-200"
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isTyping && (
              <div
                className="flex items-start gap-2.5"
                role="status"
                aria-live="polite"
                aria-label={THINKING_MESSAGES[thinkingStep]}
              >
                <div className="h-7 w-7 rounded-xl bg-[#056B38] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <BrainCircuit className="w-4 h-4 motion-safe:animate-pulse" />
                </div>
                <div className="min-h-12 min-w-[230px] max-w-[85%] rounded-[20px] rounded-tr-xs border border-[#D1E3D6] bg-white px-3.5 py-3 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#056B38]">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 motion-safe:animate-spin" />
                    <span>{THINKING_MESSAGES[thinkingStep]}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 pr-5" aria-hidden="true">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#056B38]/70 motion-safe:animate-bounce" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#056B38]/50 motion-safe:animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-[#056B38]/30 motion-safe:animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-[#D1E3D6] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اطلب من SSD: اعملي مشروع كذا أو اقترح فكرة..."
              className="flex-1 h-10 rounded-2xl border border-[#D1E3D6] bg-[#F7FAF8] px-3.5 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="h-10 w-10 rounded-2xl bg-[#056B38] hover:bg-[#005B27] text-white flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
