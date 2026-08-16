"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useProfile } from "@/components/profile-provider";
import { useFloatingChat, FloatingChatUser } from "@/components/floating-chat-provider";
import { sendMessage } from "@/lib/actions/chat";
import { uploadChatImage } from "@/lib/actions/upload";
import { reportChatMessage } from "@/lib/actions/tickets";
import {
  X,
  Minus,
  Send,
  ExternalLink,
  Loader2,
  ChevronUp,
  ImagePlus,
  Flag
} from "lucide-react";
import { CustomSelect } from "@/components/custom-select";

interface ChatMessageItem {
  id: number;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
  senderId: number;
  isRead: boolean;
}

function FloatingChatWindow({
  user,
  index,
}: {
  user: FloatingChatUser;
  index: number;
}) {
  const { addToast } = useProfile();
  const { closeFloatingChat, toggleMinimizeFloatingChat } = useFloatingChat();

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  
  // Image attachments
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Report Modal
  const [reportingMsg, setReportingMsg] = useState<ChatMessageItem | null>(null);
  const [reportReason, setReportReason] = useState("محتوى مسيء أو غير لائق");
  const [isReporting, setIsReporting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Poll conversation messages
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${user.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.currentUserId) setCurrentUserId(data.currentUserId);
      setIsOtherTyping(Boolean(data.isTyping));
      setMessages(data.messages || []);
    } catch {
      // ignore network errors
    }
  }, [user.id]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        await loadMessages();
      }
      if (active) timer = setTimeout(poll, 3500);
    };

    void poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [loadMessages]);

  // Auto-scroll internal messages on new message
  useEffect(() => {
    if (!user.isMinimized && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, user.isMinimized, isOtherTyping]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast("حجم الصورة يجب ألا يتجاوز 5 ميجابايت", "warn");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleCancelImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if ((!text && !selectedFile) || isSending) return;

    setInputText("");
    setIsSending(true);

    let uploadedImageUrl: string | null = null;
    if (selectedFile) {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await uploadChatImage(formData);
      if (uploadRes.ok && uploadRes.url) {
        uploadedImageUrl = uploadRes.url;
      }
    }

    try {
      const res = await sendMessage({
        receiverId: user.id,
        body: text,
        imageUrl: uploadedImageUrl,
      });
      if (res.ok && res.message) {
        handleCancelImage();
        setMessages((prev) => [
          ...prev,
          {
            id: res.message.id,
            body: res.message.body,
            imageUrl: res.message.imageUrl,
            createdAt: res.message.createdAt,
            senderId: res.message.senderId,
            isRead: false,
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setIsSending(false);
    }
  };

  const handleReport = async (msg: ChatMessageItem) => {
    setIsReporting(true);
    const res = await reportChatMessage({
      messageId: msg.id,
      reportedUserId: msg.senderId,
      reason: reportReason,
    });
    setIsReporting(false);
    setReportingMsg(null);

    if (res.ok) {
      addToast(`تم إرسال البلاغ بنجاح وإنشاء تذكرة دعم #${res.ticketId}`, "success");
    } else {
      addToast(res.error || "تعذر إرسال البلاغ", "warn");
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const rightOffset = 20 + index * 320;

  return (
    <>
      <div
        style={{ right: `${rightOffset}px` }}
        className={`fixed bottom-0 z-40 w-72 sm:w-76 rounded-t-[20px] border border-[#D1E3D6] bg-white shadow-2xl transition-all duration-200 overflow-hidden font-body flex flex-col ${
          user.isMinimized ? "h-12" : "h-[420px]"
        }`}
        dir="rtl"
      >
        {/* Floating Chat Header */}
        <div
          onClick={() => toggleMinimizeFloatingChat(user.id)}
          className="flex items-center justify-between p-2.5 bg-gradient-to-r from-[#056B38] to-[#04552D] text-white shadow-xs shrink-0 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div className="relative h-7 w-7 overflow-hidden rounded-full bg-white/20 text-white font-black text-xs flex items-center justify-center border border-white/30">
                {user.avatar ? (
                  <Image src={user.avatar} alt={user.name} fill unoptimized sizes="28px" className="object-cover" />
                ) : (
                  <span>{getInitials(user.name)}</span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[#056B38]" />
            </div>

            <div className="min-w-0 text-right">
              <span className="truncate text-xs font-black leading-tight text-white block">
                {user.name}
              </span>
              <p className="text-[9px] text-emerald-200 leading-tight">
                {isOtherTyping ? "يكتب الآن..." : "نشط الآن"}
              </p>
            </div>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Link
              href={user.username ? `/chat?with=${user.username}` : `/chat?with=${user.id}`}
              className="h-6 w-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="فتح في صفحة كاملة"
            >
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              type="button"
              onClick={() => toggleMinimizeFloatingChat(user.id)}
              className="h-6 w-6 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title={user.isMinimized ? "تكبير" : "تصغير"}
            >
              {user.isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => closeFloatingChat(user.id)}
              className="h-6 w-6 rounded-lg bg-white/10 hover:bg-red-500 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="إغلاق المحادثة"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        {!user.isMinimized && (
          <>
            <div ref={containerRef} className="flex-1 p-2.5 overflow-y-auto space-y-2 bg-[#F7FAF8] text-xs">
              {messages.length > 0 ? (
                messages.map((msg) => {
                  const isMine = currentUserId ? msg.senderId === currentUserId : false;
                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex flex-col ${isMine ? "items-start" : "items-end"}`}
                    >
                      {/* Report button on hover for incoming messages */}
                      {!isMine && (
                        <button
                          type="button"
                          onClick={() => setReportingMsg(msg)}
                          className="opacity-0 group-hover:opacity-100 absolute -top-1.5 -left-1.5 bg-white border border-[#D1E3D6] text-[#526B5E] hover:text-red-600 p-1 rounded-full shadow-xs cursor-pointer"
                          title="إبلاغ عن الرسالة"
                        >
                          <Flag className="w-2.5 h-2.5" />
                        </button>
                      )}

                      <div
                        className={`max-w-[88%] rounded-[16px] px-3 py-2 leading-relaxed shadow-2xs ${
                          isMine
                            ? "bg-[#056B38] text-white rounded-tr-xs"
                            : "bg-white border border-[#D1E3D6] text-[#05291A] rounded-tl-xs"
                        }`}
                      >
                        {msg.imageUrl && (
                          <div
                            className="mb-1.5 overflow-hidden rounded-lg cursor-pointer max-h-40"
                            onClick={() => setLightboxImage(msg.imageUrl!)}
                          >
                            <Image src={msg.imageUrl} alt="صورة" width={320} height={160} unoptimized className="max-h-40 w-auto rounded-lg object-cover" />
                          </div>
                        )}
                        {msg.body && <p className="whitespace-pre-wrap break-words">{msg.body}</p>}
                      </div>
                      <span className="text-[9px] text-[#526B5E] px-1 mt-0.5">
                        {new Date(msg.createdAt).toLocaleTimeString("ar-EG", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#526B5E]">
                  <p className="text-xs font-bold text-[#05291A]">ابدأ المحادثة الآن</p>
                  <p className="text-[11px] mt-1">اكتب رسالتك وتواصل مع {user.name} فوراً.</p>
                </div>
              )}

              {isOtherTyping && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#056B38] font-bold py-1">
                  <span className="animate-bounce">•</span>
                  <span className="animate-bounce delay-100">•</span>
                  <span className="animate-bounce delay-200">•</span>
                  <span>{user.name} يكتب...</span>
                </div>
              )}
            </div>

            {/* Selected Image Preview Bar */}
            {previewUrl && (
              <div className="px-2 py-1 bg-[#E8FAF0] border-t border-[#D1E3D6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image src={previewUrl} alt="Preview" width={28} height={28} unoptimized className="h-7 w-7 object-cover rounded-md" />
                  <span className="text-[10px] font-bold text-[#05291A]">صورة مرفقة</span>
                </div>
                <button type="button" onClick={handleCancelImage} className="text-[#526B5E] hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Quick Input Bar */}
            <form
              onSubmit={handleSend}
              className="p-2 bg-white border-t border-[#D1E3D6] flex items-center gap-1.5 shrink-0"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 rounded-lg border border-[#D1E3D6] text-[#526B5E] hover:text-[#056B38] hover:bg-[#E8FAF0] flex items-center justify-center shrink-0 cursor-pointer"
                title="إرفاق صورة"
              >
                <ImagePlus className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="اكتب رسالتك..."
                className="flex-1 h-8 rounded-xl border border-[#D1E3D6] bg-[#F7FAF8] px-2.5 text-xs font-bold text-[#05291A] focus:outline-none focus:border-[#056B38] focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedFile) || isSending}
                className="h-8 w-8 rounded-xl bg-[#056B38] hover:bg-[#005B27] text-white flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
              >
                {isSending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5 -scale-x-100" />}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 bg-white/20 hover:bg-white text-white hover:text-black p-1.5 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <Image src={lightboxImage} alt="صورة مكبرة" width={1000} height={800} unoptimized className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
          </div>
        </div>
      )}

      {/* Mini Report Modal */}
      {reportingMsg && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in font-body" dir="rtl">
          <div className="bg-white border border-[#D1E3D6] rounded-2xl p-4 max-w-xs w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#D1E3D6] pb-2">
              <span className="text-xs font-bold text-red-600 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5" />
                <span>إبلاغ عن الرسالة</span>
              </span>
              <button type="button" onClick={() => setReportingMsg(null)}>
                <X className="w-3.5 h-3.5 text-[#526B5E]" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#05291A]">سبب البلاغ:</label>
              <CustomSelect
                value={reportReason}
                onChange={(val) => setReportReason(val)}
                size="sm"
                options={[
                  "محتوى مسيء أو غير لائق",
                  "احتيال أو طلب دفع خارج المنصة",
                  "سب أو مضايقة أو تنمر",
                  "إزعاج أو إعلانات (Spam)",
                ]}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setReportingMsg(null)}
                className="rounded-lg border border-[#D1E3D6] px-3 py-1 text-xs font-bold text-[#526B5E]"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isReporting}
                onClick={() => handleReport(reportingMsg)}
                className="rounded-lg bg-red-600 text-white px-3 py-1 text-xs font-bold hover:bg-red-700 flex items-center gap-1"
              >
                {isReporting ? <Loader2 className="w-3 h-3 animate-spin" /> : "إرسال البلاغ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function FloatingChatContainer() {
  const { openChats } = useFloatingChat();

  if (!openChats || openChats.length === 0) return null;

  return (
    <div className="hidden sm:block">
      {openChats.map((chatUser, idx) => (
        <FloatingChatWindow key={chatUser.id} user={chatUser} index={idx} />
      ))}
    </div>
  );
}
