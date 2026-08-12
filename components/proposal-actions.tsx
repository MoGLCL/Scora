"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptProposal } from "@/lib/actions/proposals";

export function ProposalActions({ id, userId, status }: { id: number; userId: number; status: string }) {
  const [busy, start] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [error, setError] = useState("");

  return <div className="flex flex-wrap items-center gap-2">
    <Link href={`/chat?with=${userId}`} className="rounded-full border px-4 py-2 font-bold">محادثة</Link>
    {currentStatus === "accepted" ? <span className="rounded-full bg-[#056B38] px-4 py-2 font-bold text-white">تم التوظيف</span> : currentStatus === "pending" ? <button type="button" disabled={busy} onClick={() => start(async () => {
      setError("");
      const result = await acceptProposal(id);
      if (result.ok) setCurrentStatus("accepted");
      else setError(result.error);
    })} className="rounded-full bg-[#056B38] px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? "جاري القبول..." : "قبول وتوظيف"}</button> : <span className="rounded-full bg-gray-100 px-4 py-2">مرفوض</span>}
    {error && <p className="w-full text-xs font-bold text-red-600">{error}</p>}
  </div>;
}
