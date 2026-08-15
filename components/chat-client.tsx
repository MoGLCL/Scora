"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { sendMessage } from "@/lib/actions/chat";
import {
  soundFX,
  requestBrowserNotificationPermission,
  sendBrowserNotification
} from "@/lib/client-audio-notifications";
import { Send, Check, CheckCheck } from "lucide-react";

interface ChatMessage {
  id: number;
  body: string;
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
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const knownMessageIds = useRef<Set<number>>(new Set(initialMessages.map((m) => m.id)));
  const lastTypingSent = useRef<number>(0);

  // Request browser notification permission automatically
  useEffect(() => {
    void requestBrowserNotificationPermission();
  }, []);

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
                latestIncomingText = msg.body;
              }
            }
          }

          if (hasNewIncoming) {
            soundFX.playReceived();
            // ONLY send OS desktop notification if user is NOT actively looking at this tab
            if (typeof document !== "undefined" && document.visibilityState === "hidden") {
              sendBrowserNotification(
                `رسالة جديدة من ${receiverName || "مستخدم"} 💬`,
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOtherTyping]);

  return (
    <>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-5 font-body" dir="rtl">
        {messages.map((message) => {
          const isMe = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-2xs ${
                isMe
                  ? "self-start bg-[#056B38] text-white rounded-tr-xs"
                  : "self-end bg-[#F2F7F4] text-[#05291A] border border-[#D1E3D6] rounded-tl-xs"
              }`}
            >
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{message.body}</p>

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

        <div ref={messagesEndRef} />
      </div>

      <form
        className="flex flex-wrap items-center gap-3 border-t border-neutral-100 p-4 bg-white font-body"
        dir="rtl"
        onSubmit={async (event) => {
          event.preventDefault();
          const messageBody = body.trim();
          if (!messageBody || busy) return;

          setBusy(true);
          setError("");

          // Stop typing status
          void sendTypingStatus(false);

          // Play immediate sent sound effect
          soundFX.playSent();

          const result = await sendMessage({ receiverId, body: messageBody });
          setBusy(false);

          if (!result.ok) {
            setError(result.error);
            return;
          }

          setBody("");
          knownMessageIds.current.add(result.message.id);
          setMessages((current) =>
            current.some((message) => message.id === result.message.id)
              ? current
              : [...current, { ...result.message, isRead: false }]
          );
        }}
      >
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
          required
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="h-12 rounded-full bg-[#056B38] hover:bg-[#08592E] px-6 font-bold text-xs text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
        >
          {busy ? (
            <span>جاري الإرسال...</span>
          ) : (
            <>
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5" />
            </>
          )}
        </button>
        {error && <p className="w-full text-xs font-bold text-red-600 px-2">{error}</p>}
      </form>
    </>
  );
}
