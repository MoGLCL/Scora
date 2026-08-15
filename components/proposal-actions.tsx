"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptProposal, undoRejectProposal } from "@/lib/actions/proposals";
import { RotateCcw } from "lucide-react";

export function ProposalActions({ id, userId, status }: { id: number; userId: number; status: string }) {
  const [busy, start] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [error, setError] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/chat?user=${userId}`}
        className="rounded-full border border-[#D1E3D6] bg-white hover:bg-neutral-50 px-4 py-2 text-xs font-bold text-[#05291A] transition-colors shadow-2xs"
      >
        محادثة
      </Link>
      {currentStatus === "accepted" ? (
        <span className="rounded-full bg-[#056B38] px-4 py-2 text-xs font-bold text-white shadow-2xs">
          تم التوظيف
        </span>
      ) : currentStatus === "pending" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              setError("");
              const result = await acceptProposal(id);
              if (result.ok) setCurrentStatus("accepted");
              else setError(result.error ?? "تعذر القبول");
            })
          }
          className="rounded-full bg-[#056B38] hover:bg-[#08592E] px-4 py-2 text-xs font-bold text-white transition-all shadow-2xs cursor-pointer disabled:opacity-50"
        >
          {busy ? "جاري القبول..." : "قبول وتوظيف"}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs text-neutral-500 font-bold">
            مرفوض
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                setError("");
                const result = await undoRejectProposal(id);
                if (result.ok) setCurrentStatus("pending");
                else setError(result.error ?? "تعذر إلغاء الرفض");
              })
            }
            className="rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-1.5 text-xs text-amber-900 font-bold transition-all inline-flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3 text-amber-700" />
            <span>{busy ? "جاري الإلغاء..." : "إلغاء الرفض"}</span>
          </button>
        </div>
      )}
      {error && <p className="w-full text-xs font-bold text-red-600">{error}</p>}
    </div>
  );
}
