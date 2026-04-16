"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

type Territory = {
  id: string;
  rep_id: string;
  postal_code: string;
  city?: string | null;
  region?: string | null;
  sales_reps?: { display_name: string; email: string } | { display_name: string; email: string }[] | null;
};

type Rep = {
  id: string;
  display_name: string;
  email: string;
};

type Props = {
  initialTerritories: Territory[];
  reps: Rep[];
};

function repName(t: Territory): string {
  const r = Array.isArray(t.sales_reps) ? t.sales_reps[0] : t.sales_reps;
  return r?.display_name ?? "Unknown";
}

export function TerritoryManager({ initialTerritories, reps }: Props) {
  const router = useRouter();
  const [repId, setRepId] = useState(reps[0]?.id ?? "");
  const [postalCodes, setPostalCodes] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const assign = async () => {
    const codes = postalCodes
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (!repId || !codes.length) {
      setError("Pick a rep and enter at least one postal code");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rep_id: repId,
          postal_codes: codes,
          city: city.trim() || undefined,
          region: region.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Assign failed");

      setPostalCodes("");
      setCity("");
      setRegion("");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setRemoveError(null);
    try {
      const res = await fetch(`/api/admin/territories?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      router.refresh();
    } catch {
      setRemoveError("Failed to remove territory. Please try again.");
      setTimeout(() => setRemoveError(null), 4000);
    }
  };

  // Group by rep for display
  const byRep = new Map<string, Territory[]>();
  initialTerritories.forEach((t) => {
    if (!byRep.has(t.rep_id)) byRep.set(t.rep_id, []);
    byRep.get(t.rep_id)!.push(t);
  });

  return (
    <div className="space-y-8">
      {/* Assign form */}
      <div className="rounded-lg border bg-background p-6">
        <h2 className="mb-4 text-lg font-semibold">Assign Postal Codes</h2>

        {error && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="grid gap-3">
          <select
            value={repId}
            onChange={(e) => setRepId(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name} ({r.email})
              </option>
            ))}
          </select>
          <input
            value={postalCodes}
            onChange={(e) => setPostalCodes(e.target.value)}
            placeholder="Postal codes (comma or space separated) — e.g., 90210, 90211, 90212"
            className="w-full rounded-lg border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City (optional)"
              className="w-full rounded-lg border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="State/Region (e.g., CA)"
              className="w-full rounded-lg border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            onClick={assign}
            disabled={busy}
            className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Assigning..." : "Assign"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Note: assigning a postal code already owned by another rep will
          reassign it.
        </p>
      </div>

      {/* Current assignments */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Current Assignments</h2>
        {removeError && (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-800">
            {removeError}
          </div>
        )}
        {initialTerritories.length === 0 ? (
          <div className="rounded-lg border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">No territories assigned yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(byRep.entries()).map(([rId, ts]) => (
              <div key={rId} className="rounded-lg border bg-background p-4">
                <p className="mb-2 font-medium">
                  {repName(ts[0])}{" "}
                  <span className="text-sm text-muted-foreground">
                    ({ts.length} codes)
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {ts.map((t) => (
                    <span
                      key={t.id}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-mono"
                    >
                      {t.postal_code}
                      <button
                        onClick={() => remove(t.id)}
                        className="text-red-500 hover:text-red-700"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
