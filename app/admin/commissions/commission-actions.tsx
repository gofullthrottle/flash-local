"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  repId: string;
  hasPending: boolean;
  hasApproved: boolean;
  connectReady: boolean;
};

export function CommissionActions({
  repId,
  hasPending,
  hasApproved,
  connectReady,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "payout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const approve = async () => {
    setBusy("approve");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/commissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all_pending_for_rep: repId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      setResult(`Approved ${data.approved_count} commissions`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  };

  const payout = async () => {
    if (!confirm("Execute Stripe Transfer for all approved commissions? This moves real money.")) {
      return;
    }
    setBusy("payout");
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/commissions/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rep_id: repId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payout failed");
      setResult(`Paid ${data.paid_count} commissions (transfer ${data.transfer_id})`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Payout failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-sm text-green-800">
          {result}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={approve}
          disabled={!hasPending || busy !== null}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "approve" ? "Approving..." : "Approve all pending"}
        </button>
        <button
          onClick={payout}
          disabled={!hasApproved || !connectReady || busy !== null}
          title={!connectReady ? "Rep must complete Stripe Connect first" : ""}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy === "payout" ? "Paying..." : "Pay out approved"}
        </button>
      </div>
    </div>
  );
}
