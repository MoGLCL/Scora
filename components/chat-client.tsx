"use client";

import { useState } from "react";
import { sendMessage } from "@/lib/actions/chat";

interface SentMessage {
  id: number;
  body: string;
  createdAt: string;
}

export function ChatClient({ receiverId }: { receiverId: number }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

  return <>
    {sentMessages.length > 0 && <div className="flex flex-col gap-3 px-5 pb-3">
      {sentMessages.map((message) => <div key={message.id} className="max-w-[75%] self-start rounded-2xl bg-[#056B38] px-4 py-3 text-white">
        <p>{message.body}</p>
        <time className="mt-1 block text-[10px] opacity-70">{new Date(message.createdAt).toLocaleString("ar-EG")}</time>
      </div>)}
    </div>}
    <form className="flex flex-wrap gap-3 border-t p-4" onSubmit={async (event) => {
      event.preventDefault();
      const messageBody = body.trim();
      if (!messageBody || busy) return;
      setBusy(true);
      setError("");
      const result = await sendMessage({ receiverId, body: messageBody });
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setBody("");
      setSentMessages((messages) => [...messages, result.message]);
    }}>
      <input autoFocus value={body} onChange={(event) => setBody(event.target.value)} className="min-w-0 flex-1 rounded-full border px-5" placeholder="اكتب رسالة..." required />
      <button type="submit" disabled={busy || !body.trim()} className="rounded-full bg-[#056B38] px-6 py-3 font-bold text-white disabled:opacity-50">{busy ? "جاري الإرسال..." : "إرسال"}</button>
      {error && <p className="w-full text-sm font-bold text-red-600">{error}</p>}
    </form>
  </>;
}
