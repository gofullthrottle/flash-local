"use client";

import { useState, useCallback, useEffect } from "react";
import { useGeolocation } from "@/lib/hooks/use-geolocation";

const QUICK_VERTICALS = [
  { id: "garage-declutter", label: "Garage Declutter", emoji: "🏠" },
  { id: "estate-cleanout", label: "Estate Cleanout", emoji: "🏗️" },
  { id: "pressure-wash", label: "Pressure Wash", emoji: "💦" },
  { id: "holiday-lights", label: "Holiday Lights", emoji: "✨" },
  { id: "closet-org", label: "Home Organization", emoji: "📦" },
  { id: "fence-stain", label: "Fence Staining", emoji: "🪵" },
  { id: "gutter-clean", label: "Gutter Cleaning", emoji: "🏠" },
  { id: "window-clean", label: "Window Cleaning", emoji: "🪟" },
  { id: "mobile-detail", label: "Auto Detailing", emoji: "🚗" },
  { id: "pool-open-close", label: "Pool Service", emoji: "🏊" },
  { id: "dog-waste", label: "Dog Waste Removal", emoji: "🐕" },
  { id: "dryer-vent", label: "Dryer Vent", emoji: "🌀" },
  { id: "snow-shoveling", label: "Snow Removal", emoji: "❄️" },
  { id: "handyman", label: "Handyman", emoji: "🔧" },
  { id: "other", label: "Other", emoji: "➕" },
];

type ProspectCaptureFormProps = {
  scoutSessionId?: string | null;
  onSubmit?: (prospect: { id: string; business_name: string }) => void;
};

export function ProspectCaptureForm({
  scoutSessionId,
  onSubmit,
}: ProspectCaptureFormProps) {
  const { position, getCurrentPosition } = useGeolocation();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [verticalId, setVerticalId] = useState("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [territoryWarning, setTerritoryWarning] = useState<string | null>(null);

  // Check territory whenever postal code changes (debounced)
  useEffect(() => {
    if (!postalCode || postalCode.length < 3) {
      setTerritoryWarning(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/rep/territory-check?postal_code=${encodeURIComponent(postalCode)}`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        if (data.assigned && !data.in_territory) {
          setTerritoryWarning(
            `Postal code ${postalCode} is assigned to ${data.owned_by_rep_name ?? "another rep"}. Attribution may be reviewed.`
          );
        } else {
          setTerritoryWarning(null);
        }
      } catch {
        // Ignore (abort or network)
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [postalCode]);

  const resetForm = useCallback(() => {
    setBusinessName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setVerticalId("");
    setNotes("");
    setFollowUpDate("");
    setEstimatedValue("");
    setPostalCode("");
    setTerritoryWarning(null);
    setError(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) return;

    setSubmitting(true);
    setError(null);

    // Grab current position if we don't have one
    let lat = position?.lat;
    let lng = position?.lng;
    if (!lat || !lng) {
      try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lng = pos.lng;
      } catch {
        // Non-fatal: proceed without geo
      }
    }

    try {
      const payload = {
        business_name: businessName.trim(),
        contact_name: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        vertical_id: verticalId || undefined,
        notes: notes.trim() || undefined,
        follow_up_date: followUpDate || undefined,
        estimated_value_cents: estimatedValue
          ? Math.round(parseFloat(estimatedValue) * 100)
          : undefined,
        captured_lat: lat,
        captured_lng: lng,
        scout_session_id: scoutSessionId ?? undefined,
        address: postalCode ? { postal_code: postalCode } : undefined,
      };

      const res = await fetch("/api/rep/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save prospect");
      }

      const data = await res.json();
      setSuccess(true);
      onSubmit?.(data.prospect);

      // Auto-reset after brief success flash
      setTimeout(() => {
        resetForm();
        setSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);

      // Queue for offline sync if it looks like a network error
      if (!navigator.onLine) {
        try {
          const cache = await caches.open("flashlocal-offline-queue");
          const offlineReq = new Request("/api/rep/prospects", {
            method: "POST",
          });
          await cache.put(
            offlineReq,
            new Response(
              JSON.stringify({
                business_name: businessName.trim(),
                contact_name: contactName.trim() || undefined,
                phone: phone.trim() || undefined,
                vertical_id: verticalId || undefined,
                notes: notes.trim() || undefined,
                captured_lat: lat,
                captured_lng: lng,
              })
            )
          );
          if ("serviceWorker" in navigator && "SyncManager" in window) {
            const reg = await navigator.serviceWorker.ready;
            await (reg as any).sync.register("sync-prospects");
          }
          setError("Saved offline — will sync when connected");
          setSuccess(true);
          setTimeout(() => {
            resetForm();
            setSuccess(false);
          }, 2000);
        } catch {
          // Queue failed — surface original error
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Success flash */}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-800">
          Prospect captured!
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Business name — the only required field for speed */}
      <div>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Business name *"
          required
          autoFocus
          className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Quick vertical picker — tap-friendly chips */}
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Service type
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_VERTICALS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setVerticalId(verticalId === v.id ? "" : v.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                verticalId === v.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {v.emoji} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contact details — collapsible for speed */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          Contact details (optional)
        </summary>
        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Contact person"
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="Postal code (for territory check)"
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {territoryWarning && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-900">
              {territoryWarning}
            </div>
          )}
        </div>
      </details>

      {/* Value & follow-up */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            type="number"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="Est. value ($)"
            min="0"
            step="100"
            className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className="w-full rounded-lg border bg-background px-4 py-3 text-base text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Notes — voice-to-text friendly */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Quick notes..."
        rows={2}
        className="w-full rounded-lg border bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {/* Geo indicator */}
      {position && (
        <p className="text-xs text-muted-foreground">
          Location: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
          {position.accuracy && ` (~${Math.round(position.accuracy)}m)`}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !businessName.trim()}
        className="w-full rounded-lg bg-primary py-3.5 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Capture Prospect"}
      </button>
    </form>
  );
}
