"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useProfile } from "@/components/profile-provider";
import {
  Send,
  Paperclip,
  ShieldCheck,
  Search,
  CheckCheck,
  Sparkles,
  LifeBuoy,
  Code,
  Building,
  User
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "other";
  text: string;
  time: string;
}

export default function DirectChatPage() {
  const { userRole, developer, client } = useProfile();

  const currentUserName = userRole === "developer" ? developer.fullName : client.fullName;

  const conversations = [
    {
      id: "support",
      name: "فريق دعم سكورا الفني (Scora Support)",
      role: "الدعم والخدمات الفنية المباشرة",
      trustScore: 100,
      spPoints: 1000,
      projectTitle: "خدمة الدعم المباشر الموثق",
      lastMessage: `مرحباً بك يا ${currentUserName}! فريق الدعم جاهز لمساعدتك.`,
      lastTime: "الآن",
      unread: 1,
      online: true,
      isSupport: true,
    },
    {
      id: "1",
      name: "محمد وائل الغنام",
      role: "Full-Stack Web Developer",
      trustScore: 94,
      spPoints: 850,
      projectTitle: "تطوير لوحة تحكم SaaS تعليمية",
      lastMessage: "ممتاز جداً، قمت بمراجعة متطلبات API ويمكننا البدء بالتنفيذ غداً.",
      lastTime: "10:47 ص",
      unread: 0,
      online: true,
      isSupport: false,
    },
    {
      id: "2",
      name: "أحمد علي محمود",
      role: "Backend & Systems Engineer",
      trustScore: 88,
      spPoints: 720,
      projectTitle: "تحسين أداء وقواعد بيانات المنصة",
      lastMessage: "تم إرسال العرض المالي المعدل بحسب الاتفاق.",
      lastTime: "أمس",
      unread: 0,
      online: false,
      isSupport: false,
    },
  ];

  const [activeConvId, setActiveConvId] = useState("support");

  // Check if opened with support query parameter
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("support")) {
      setActiveConvId("support");
    }
  }, []);

  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({
    support: [
      {
        id: "s1",
        sender: "other",
        text: `أهلاً بك يا ${currentUserName}! مرحباً بك في مركز المحادثات المباشرة والدعم الفني لـ Scora. كيف يمكن لفريقنا مساعدتك اليوم؟`,
        time: "10:30 ص",
      },
    ],
    "1": [
      {
        id: "m1",
        sender: "other",
        text: `أهلاً بك يا ${currentUserName}! قرأت تفاصيل مشروع SaaS التعليمية ولدّي خطة عمل جاهزة للتنفيذ.`,
        time: "10:40 ص",
      },
      {
        id: "m2",
        sender: "user",
        text: "مرحباً محمد، ممتاز جداً. ما هي المدة التقديرية لتسليم الواجهات وربط الـ APIs؟",
        time: "10:42 ص",
      },
      {
        id: "m3",
        sender: "other",
        text: "يمكننا تسليم المرحلة الأولى خلال 7 أيام، وتسليم لوحة التحكم كاملة مع الاختبارات خلال 14 يوماً.",
        time: "10:45 ص",
      },
      {
        id: "m4",
        sender: "other",
        text: "ممتاز جداً، قمت بمراجعة متطلبات API ويمكننا البدء بالتنفيذ غداً.",
        time: "10:47 ص",
      },
    ],
    "2": [
      {
        id: "m5",
        sender: "other",
        text: `أهلاً يا ${currentUserName}! تم مراجعة العرض المالي وتجهيز الجدول الزمني لحسابات الداتا بيز.`,
        time: "أمس",
      },
    ],
  });

  const [inputText, setInputText] = useState("");

  const activeConv = conversations.find((c) => c.id === activeConvId) || conversations[0];
  const activeMessages = messagesMap[activeConvId] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputText.trim(),
      time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeConvId]: [...(prev[activeConvId] || []), newMsg],
    }));

    const currentText = inputText.trim();
    setInputText("");

    // Simulated reply from Support or Developer
    setTimeout(() => {
      const replyMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "other",
        text: activeConv.isSupport
          ? `شكراً لتواصلك يا ${currentUserName}. قام فريق دعم Scora بتوثيق استفسارك وسيتم تزويدك بالرد التقني فوراً.`
          : `أهلاً يا ${currentUserName}، تم استلام رسالتك وتأكيد مواعيد تسليم المشروع.`,
        time: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessagesMap((prev) => ({
        ...prev,
        [activeConvId]: [...(prev[activeConvId] || []), replyMsg],
      }));
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-body dir-rtl" dir="rtl">
      <SiteHeader />

      <main className="mx-auto max-w-[1360px] px-4 md:px-8 py-6 w-full flex-1 flex flex-col">
        
        {/* CHAT CONTAINER GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 rounded-[24px] border border-[#D1E3D6] bg-white shadow-md overflow-hidden min-h-[650px]">
          
          {/* RIGHT SIDEBAR: CONVERSATIONS LIST (4 cols) */}
          <div className="lg:col-span-4 border-l border-[#D1E3D6] bg-[#F7FAF8] flex flex-col">
            
            {/* Conversations Header */}
            <div className="p-4 border-b border-[#D1E3D6] space-y-3 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-extrabold text-[#05291A] font-heading">
                  المحادثات المباشرة
                </h2>
                <span className="text-[11px] font-bold bg-[#E8FAF0] text-[#056B38] px-2.5 py-0.5 rounded-full">
                  آمن وموثق
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="البحث في المحادثات..."
                  className="w-full h-[40px] rounded-[12px] border border-[#D1E3D6] bg-white pr-9 pl-4 text-[12px] text-[#05291A] outline-none focus:border-[#056B38]"
                />
                <Search className="w-4 h-4 text-[#526B5E] absolute right-3 pointer-events-none" />
              </div>
            </div>

            {/* Conversations Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#D1E3D6]/40">
              {conversations.map((conv) => {
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConvId(conv.id)}
                    className={`w-full p-4 text-right transition-all flex items-start gap-3 cursor-pointer ${
                      isActive ? "bg-[#E8FAF0] border-r-4 border-r-[#056B38]" : "hover:bg-white"
                    }`}
                  >
                    {/* Avatar with Online Dot */}
                    <div className="relative shrink-0">
                      {conv.isSupport ? (
                        <div className="w-11 h-11 rounded-full bg-[#056B38] text-white flex items-center justify-center">
                          <LifeBuoy className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-[#056B38]/10 border border-[#C5E8D1] text-[#056B38] font-bold flex items-center justify-center text-[15px]">
                          {conv.name.slice(0, 2)}
                        </div>
                      )}
                      {conv.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="text-[14px] font-bold text-[#05291A] truncate">{conv.name}</div>
                        <div className="text-[11px] text-[#526B5E]">{conv.lastTime}</div>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-[#056B38] font-bold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{conv.isSupport ? "الدعم المباشر" : `Score ${conv.trustScore}%`}</span>
                      </div>

                      <p className="text-[12px] text-[#526B5E] truncate leading-tight">
                        {conv.lastMessage}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* LEFT AREA: MAIN CHAT FEED & INPUT (8 cols) */}
          <div className="lg:col-span-8 flex flex-col bg-white">
            
            {/* Active Conversation Header */}
            <div className="p-4 md:px-6 border-b border-[#D1E3D6] bg-white flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {activeConv.isSupport ? (
                    <div className="w-11 h-11 rounded-full bg-[#056B38] text-white flex items-center justify-center">
                      <LifeBuoy className="w-6 h-6" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-[#E8FAF0] border border-[#C5E8D1] text-[#056B38] font-bold flex items-center justify-center text-[16px]">
                      {activeConv.name.slice(0, 2)}
                    </div>
                  )}
                  {activeConv.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[16px] font-extrabold text-[#05291A] font-heading">
                      {activeConv.name}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#056B38] text-white px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{activeConv.isSupport ? "فريق الدعم المعتمد" : "Verified Passport"}</span>
                    </span>
                  </div>
                  <div className="text-[12px] text-[#526B5E] flex items-center gap-2">
                    <span>{activeConv.projectTitle}</span>
                    <span>•</span>
                    <span className="text-emerald-600 font-bold">متصل الآن</span>
                  </div>
                </div>
              </div>

              {!activeConv.isSupport && (
                <Link
                  href="/profile"
                  target="_blank"
                  className="hidden sm:inline-flex text-[12px] font-bold text-[#056B38] bg-[#E8FAF0] px-3.5 py-1.5 rounded-full hover:bg-[#D4F5E0] transition-colors"
                >
                  معاينة الجواز الرقمي
                </Link>
              )}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-neutral-50/50 to-white">
              {activeMessages.map((msg) => {
                const isMe = msg.sender === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-[85%] md:max-w-[70%] p-4 rounded-[18px] text-[13px] leading-relaxed shadow-2xs ${
                        isMe
                          ? "bg-[#056B38] text-white rounded-tr-none"
                          : "bg-[#F7FAF8] border border-[#D1E3D6] text-[#05291A] rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[#526B5E] mt-1 px-1">
                      <span>{msg.time}</span>
                      {isMe && <CheckCheck className="w-3.5 h-3.5 text-[#056B38]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-[#D1E3D6] bg-white flex items-center gap-3">
              <button
                type="button"
                className="w-11 h-11 rounded-full border border-[#D1E3D6] bg-neutral-50 hover:bg-neutral-100 text-[#526B5E] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                title="إرفاق ملف أو كود"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  activeConv.isSupport
                    ? `اكتب استفسارك للدعم الفني يا ${currentUserName}...`
                    : `اكتب رسالتك للمطور هنا...`
                }
                className="flex-1 h-[48px] rounded-full border border-[#D1E3D6] bg-white px-5 text-[13px] text-[#05291A] outline-none focus:border-[#056B38]"
              />

              <button
                type="submit"
                className="w-11 h-11 rounded-full bg-[#056B38] hover:bg-[#08592E] text-white flex items-center justify-center shrink-0 transition-all shadow-xs cursor-pointer"
                title="إرسال الرسالة"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </form>

          </div>

        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
