"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { sendMessage } from "@/lib/actions/chat";
import { uploadChatImage } from "@/lib/actions/upload";
import { reportChatMessage } from "@/lib/actions/tickets";
import {
  soundFX,
  requestBrowserNotificationPermission,
  sendBrowserNotification
} from "@/lib/client-audio-notifications";
import {
  Send,
  Check,
  CheckCheck,
  ImagePlus,
  X,
  Flag,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ZoomIn
} from "lucide-react";
import { useProfile } from "@/components/profile-provider";
import { CustomSelect } from "@/components/custom-select";

interface ChatMessage {
  id: number;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
  senderId: number;
  isRead?: boolean;
}

export function ChatClient({
  receiverId,
  receiverName,
  currentUserId,
  initialMessages
}: {
  receiverId: number;
  receiverName?: string;
  currentUserId: number;
  initialMessages: ChatMessage[];
}) {
  const { addToast } = useProfile();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  
  // Image Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Modal State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Report Modal State
  const [reportingMessage, setReportingMessage] = useState<ChatMessage | null>(null);
  const [reportReason, setReportReason] = useState("محتوى مسيء أو غير لائق");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessId, setReportSuccessId] = useState<number | null>(null);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const knownMessageIds = useRef<Set<number>>(new Set(initialMessages.map((m) => m.id)));
  const lastTypingSent = useRef<number>(0);

  // Request browser notification permission automatically
  useEffect(() => {
    void requestBrowserNotificationPermission();
  }, []);

  // Handle image selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast("حجم الصورة يجب ألا يتجاوز 5 ميجابايت", "warn");
      return;
    }
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancelImage = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Send typing signal to server (throttled to once every 2s)
  const sendTypingStatus = useCallback(
    async (isTyping: boolean) => {
      const now = Date.now();
      if (isTyping && now - lastTypingSent.current < 2000) return;
      lastTypingSent.current = now;
      try {
        await fetch(`/api/chat/${receiverId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ typing: isTyping })
        });
      } catch {
        // Ignore typing signal errors
      }
    },
    [receiverId]
  );

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const response = await fetch(`/api/chat/${receiverId}`, { cache: "no-store" });
        if (response.ok && active) {
          const data = await response.json();
          const incoming: ChatMessage[] = data.messages ?? [];
          setIsOtherTyping(Boolean(data.isTyping));

          // Detect new incoming messages not sent by current user
          let hasNewIncoming = false;
          let latestIncomingText = "";

          for (const msg of incoming) {
            if (!knownMessageIds.current.has(msg.id)) {
              knownMessageIds.current.add(msg.id);
              if (!isFirstLoad.current && msg.senderId !== currentUserId) {
                hasNewIncoming = true;
                latestIncomingText = msg.body || (msg.imageUrl ? "صورة مرفقة" : "");
              }
            }
          }

          if (hasNewIncoming) {
            soundFX.playReceived();
            // ONLY send OS desktop notification if user is NOT actively looking at this tab
            if (typeof document !== "undefined" && document.visibilityState === "hidden") {
              sendBrowserNotification(
                `رسالة جديدة من ${receiverName || "مستخدم"} `,
                latestIncomingText,
                `/chat?user=${receiverId}`
              );
            }
          }

          isFirstLoad.current = false;
          setMessages(incoming);
        }
      } catch {
        // Transient polling failure
      } finally {
        if (active) timer = setTimeout(poll, 2200);
      }
    };

    timer = setTimeout(poll, 2200);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      void sendTypingStatus(false);
    };
  }, [currentUserId, receiverId, receiverName, sendTypingStatus]);

  // Keep internal messages scrolled to bottom without affecting window/page scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isOtherTyping]);

  // Handle Submit Message
  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    const messageBody = body.trim();
    if ((!messageBody && !selectedFile) || busy) return;

    setBusy(true);
    setError("");

    let uploadedImageUrl: string | null = null;
    if (selectedFile) {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await uploadChatImage(formData);
      setIsUploadingImage(false);

      if (!uploadRes.ok || !uploadRes.url) {
        setError(uploadRes.error || "تعذر رفع الصورة");
        setBusy(false);
        return;
      }
      uploadedImageUrl = uploadRes.url;
    }

    // Stop typing status
    void sendTypingStatus(false);

    // Play immediate sent sound effect
    soundFX.playSent();

    const result = await sendMessage({
      receiverId,
      body: messageBody,
      imageUrl: uploadedImageUrl
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setBody("");
    handleCancelImage();
    knownMessageIds.current.add(result.message.id);
    setMessages((current) =>
      current.some((message) => message.id === result.message.id)
        ? current
        : [...current, { ...result.message, isRead: false }]
    );
  };

  // Submit Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMessage) return;

    setIsSubmittingReport(true);
    const res = await reportChatMessage({
      messageId: reportingMessage.id,
      reportedUserId: reportingMessage.senderId,
      reason: reportReason,
      details: reportDetails,
    });
    setIsSubmittingReport(false);

    if (res.ok) {
      setReportSuccessId(res.ticketId);
      addToast(`تم تسجيل البلاغ وإنشاء تذكرة دعم رقم #${res.ticketId}`, "success");
    } else {
      addToast(res.error || "تعذر إرسال البلاغ", "warn");
    }
  };

  return (
    <>
      <div ref={chatContainerRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-5 font-body" dir="rtl">
        {messages.map((message) => {
          const isMe = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`group relative max-w-[75%] rounded-2xl px-4 py-3 shadow-2xs transition-all ${
                isMe
                  ? "self-start bg-[#056B38] text-white rounded-tr-xs"
                  : "self-end bg-[#F2F7F4] text-[#05291A] border border-[#D1E3D6] rounded-tl-xs"
              }`}
            >
              {/* Report Message Action Button (For other user's messages) */}
              {!isMe && (
                <button
                  type="button"
                  onClick={() => {
                    setReportingMessage(message);
                    setReportSuccessId(null);
                    setReportDetails("");
                  }}
                  className="absolute -top-2 -left-2 opacity-0 group-hover:opacity-100 bg-white border border-[#D1E3D6] text-[#526B5E] hover:text-red-600 hover:border-red-300 p-1.5 rounded-full shadow-md transition-all cursor-pointer"
                  title="إبلاغ عن هذه الرسالة"
                  aria-label="إبلاغ عن هذه الرسالة"
                >
                  <Flag className="w-3 h-3" />
                </button>
              )}

              {/* Render Image if exists */}
              {message.imageUrl && (
                <div className="mb-2 relative overflow-hidden rounded-xl group/img cursor-pointer max-w-sm">
                  <img
                    src={message.imageUrl}
                    alt="صورة مرفقة"
                    className="max-h-64 w-auto rounded-xl object-cover border border-black/10 transition-transform duration-200 group-hover/img:scale-[1.02]"
                    onClick={() => setLightboxImage(message.imageUrl!)}
                  />
                  <div
                    onClick={() => setLightboxImage(message.imageUrl!)}
                    className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity rounded-xl"
                  >
                    <span className="bg-black/60 text-white p-2 rounded-full backdrop-blur-xs">
                      <ZoomIn className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              )}

              {/* Message Text */}
              {message.body && (
                <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.body}</p>
              )}

              <div className="mt-1 flex items-center justify-between gap-3 text-[10px]">
                <time className={isMe ? "text-emerald-100" : "text-[#526B5E]"}>
                  {new Date(message.createdAt).toLocaleString("ar-EG")}
                </time>

                {/* Read Receipts Status on Sent Messages */}
                {isMe && (
                  <div className="flex items-center gap-1">
                    {message.isRead ? (
                      <span title="تمت المشاهدة" className="inline-flex items-center gap-0.5 text-emerald-200 font-bold">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                        <span>تمت المشاهدة</span>
                      </span>
                    ) : (
                      <span title="تم الإرسال" className="inline-flex items-center gap-0.5 text-emerald-100/70">
                        <Check className="w-3.5 h-3.5" />
                        <span>تم الإرسال</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Typing Indicator */}
        {isOtherTyping && (
          <div className="self-end flex items-center gap-2 rounded-2xl bg-[#F2F7F4] border border-[#D1E3D6] px-4 py-2.5 shadow-2xs text-[#056B38] text-xs font-bold animate-in fade-in duration-150">
            <span>{receiverName || "الطرف الآخر"} يكتب الآن</span>
            <div className="flex items-center gap-1 pt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#056B38] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#056B38] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#056B38] animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Selected Image Preview Bar */}
      {previewUrl && (
        <div className="px-4 py-2 bg-[#E8FAF0] border-t border-[#D1E3D6] flex items-center justify-between gap-3 font-body">
          <div className="flex items-center gap-3">
            <img src={previewUrl} alt="Preview" className="h-12 w-12 object-cover rounded-xl border border-[#C5E8D1]" />
            <div className="text-xs">
              <p className="font-bold text-[#05291A]">صورة جاهزة للإرسال</p>
              <p className="text-[11px] text-[#526B5E]">{selectedFile?.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancelImage}
            className="p-1.5 rounded-full hover:bg-white text-[#526B5E] hover:text-red-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input Form */}
      <form
        className="flex flex-wrap items-center gap-2.5 border-t border-neutral-100 p-4 bg-white font-body"
        dir="rtl"
        onSubmit={handleSendMessage}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="h-12 w-12 rounded-full border border-[#D1E3D6] hover:border-[#056B38] hover:bg-[#E8FAF0] text-[#526B5E] hover:text-[#056B38] flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
          title="إرفاق صورة"
          aria-label="إرفاق صورة"
        >
          <ImagePlus className="w-5 h-5" />
        </button>

        <input
          autoFocus
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            void sendTypingStatus(event.target.value.trim().length > 0);
          }}
          onBlur={() => void sendTypingStatus(false)}
          className="min-w-0 flex-1 h-12 rounded-full border border-[#D1E3D6] px-5 text-sm text-[#05291A] focus:border-[#056B38] focus:outline-none bg-[#F7FAF8] transition-all"
          placeholder="اكتب رسالتك هنا..."
        />

        <button
          type="submit"
          disabled={busy || (!body.trim() && !selectedFile)}
          className="h-12 rounded-full bg-[#056B38] hover:bg-[#08592E] px-6 font-bold text-xs text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
        >
          {busy || isUploadingImage ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري الإرسال...</span>
            </span>
          ) : (
            <>
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
        {error && <p className="w-full text-xs font-bold text-red-600 px-2">{error}</p>}
      </form>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* LIGHTBOX MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 bg-white/20 hover:bg-white text-white hover:text-black p-2 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="صورة مكبرة"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
            />
            <div className="mt-3 flex gap-3">
              <a
                href={lightboxImage}
                target="_blank"
                rel="noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white text-xs px-4 py-2 rounded-full flex items-center gap-1.5 transition-colors"
              >
                <span>فتح بالحجم الأصلي</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* REPORT MESSAGE MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {reportingMessage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in font-body" dir="rtl">
          <div className="bg-white border border-[#D1E3D6] rounded-[28px] p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#D1E3D6] pb-3">
              <div className="flex items-center gap-2 text-red-600 font-extrabold text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>إبلاغ عن رسالة مخالفة</span>
              </div>
              <button
                type="button"
                onClick={() => setReportingMessage(null)}
                className="p-1 rounded-full text-[#526B5E] hover:bg-[#F2F7F4] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccessId ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[#E8FAF0] text-[#056B38] flex items-center justify-center mx-auto">
                  <CheckCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-[#05291A]">تم إرسال البلاغ بنجاح</h3>
                  <p className="text-xs text-[#526B5E] leading-relaxed">
                    تم إنشاء تذكرة دعم فني رقم <b className="text-[#056B38]">#{reportSuccessId}</b>. يتولى وكيل الأمان **SSD Agent** وفريق الإدارة التحقيق الفوري في البلاغ.
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-2">
                  <a
                    href="/support"
                    className="rounded-full bg-[#056B38] text-white text-xs font-bold px-5 py-2.5 hover:bg-[#08592E] transition-colors"
                  >
                    متابعة التذكرة مع SSD Agent
                  </a>
                  <button
                    type="button"
                    onClick={() => setReportingMessage(null)}
                    className="rounded-full border border-[#D1E3D6] text-xs font-bold px-4 py-2.5 hover:bg-[#F2F7F4]"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                {/* Excerpt */}
                <div className="p-3 rounded-2xl bg-[#F7FAF8] border border-[#D1E3D6] text-xs text-[#526B5E] space-y-1">
                  <p className="font-bold text-[#05291A]">الرسالة المبلغ عنها:</p>
                  <p className="line-clamp-2 italic">{reportingMessage.body || "(صورة مرفقة)"}</p>
                </div>

                {/* Reason */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#05291A]">سبب البلاغ</label>
                  <CustomSelect
                    value={reportReason}
                    onChange={(val) => setReportReason(val)}
                    options={[
                      "محتوى مسيء أو غير لائق",
                      "احتيال أو طلب دفع خارج المنصة",
                      "سب أو مضايقة أو تنمر",
                      "إزعاج أو إعلانات (Spam)",
                      "مشاركة معلومات اتصال شخصية مخالفة",
                      "أخرى",
                    ]}
                  />
                </div>

                {/* Additional Details */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#05291A]">ملاحظات إضافية (اختياري)</label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="وضح أي تفاصيل أو سياق إضافي لمساعدة SSD وفريق الإدارة في التحقيق..."
                    className="w-full rounded-2xl border border-[#D1E3D6] p-3 text-xs text-[#05291A] bg-[#F7FAF8] focus:outline-none focus:border-[#056B38]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingMessage(null)}
                    className="rounded-full border border-[#D1E3D6] px-4 py-2 text-xs font-bold text-[#526B5E] hover:bg-[#F7FAF8] cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="rounded-full bg-red-600 hover:bg-red-700 text-white px-5 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmittingReport ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5" />
                        <span>إرسال البلاغ</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
