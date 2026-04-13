"use client";

import { useState } from "react";

export function ConnectOnboardButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startOnboarding = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rep/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start");
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      {error && (
        <div className="mb-2 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {error}
        </div>
      )}
      <button
        onClick={startOnboarding}
        disabled={loading}
        className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Starting..." : "Connect Stripe"}
      </button>
    </div>
  );
}
