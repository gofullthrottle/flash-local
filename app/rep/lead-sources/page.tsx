"use client";

import { useState } from "react";
import { MapPin, Search, Globe, Star, Camera } from "lucide-react";
import { useGeolocation } from "@/lib/hooks/use-geolocation";

type ScoredPlace = {
  place_id: string;
  name: string;
  formatted_address: string;
  phone_number?: string;
  website_uri?: string;
  rating?: number;
  user_rating_count: number;
  photo_count: number;
  opportunity_score: number;
  tier: "hot" | "warm" | "cold";
  pitch_angle?: string | null;
};

const VERTICAL_QUERIES = [
  { label: "Garage declutter", query: "garage cleanout organizer", vertical: "garage-declutter" },
  { label: "Estate cleanout", query: "estate cleanout", vertical: "estate-cleanout" },
  { label: "Pressure washing", query: "pressure washing", vertical: "pressure-wash" },
  { label: "Fence staining", query: "fence staining", vertical: "fence-stain" },
  { label: "Gutter cleaning", query: "gutter cleaning", vertical: "gutter-clean" },
  { label: "Holiday lights", query: "holiday light installation", vertical: "holiday-lights" },
  { label: "Snow removal", query: "snow shoveling", vertical: "snow-shoveling" },
  { label: "Junk haul", query: "junk removal", vertical: "junk-haul" },
  { label: "Dryer vent", query: "dryer vent cleaning", vertical: "dryer-vent" },
  { label: "Pool service", query: "pool opening closing", vertical: "pool-open-close" },
];

export default function LeadSourcesPage() {
  const { position, getCurrentPosition } = useGeolocation();

  const [query, setQuery] = useState("");
  const [verticalId, setVerticalId] = useState<string | undefined>();
  const [radius, setRadius] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScoredPlace[]>([]);
  const [cached, setCached] = useState(false);
  const [mockMode, setMockMode] = useState(false);

  const runScan = async (q: string, vert?: string) => {
    setQuery(q);
    setVerticalId(vert);
    setLoading(true);
    setError(null);
    setResults([]);
    setMockMode(false);

    let lat = position?.lat;
    let lng = position?.lng;
    if (!lat || !lng) {
      try {
        const pos = await getCurrentPosition();
        lat = pos.lat;
        lng = pos.lng;
      } catch {
        setError("Location required — enable GPS or enter coordinates manually.");
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/rep/lead-sources/places-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          lat,
          lng,
          radius_meters: radius,
          vertical_id: vert,
        }),
      });

      const data = await res.json();

      if (data.mock) {
        setMockMode(true);
      }
      if (!res.ok && !data.mock) {
        throw new Error(data.error || "Scan failed");
      }

      setResults(data.results ?? []);
      setCached(data.cached ?? false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  };

  const captureAsProspect = async (place: ScoredPlace) => {
    try {
      await fetch("/api/rep/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: place.name,
          phone: place.phone_number,
          vertical_id: verticalId,
          notes: `From Places scan. Address: ${place.formatted_address}. Score: ${place.opportunity_score}.`,
          captured_lat: position?.lat,
          captured_lng: position?.lng,
        }),
      });
      // Visual feedback
      alert(`${place.name} captured as prospect!`);
    } catch {
      alert("Failed to capture — try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Lead Sources</h2>
        <p className="text-muted-foreground">
          Scan for local businesses using Google Places. Highest scores =
          businesses with no website, few reviews, or no photos — prime
          FlashLocal candidates.
        </p>
      </div>

      {mockMode && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          <strong>Mock mode:</strong> GOOGLE_PLACES_API_KEY is not set on the
          server. Set it in your environment to enable real scans.
        </div>
      )}

      {/* Quick vertical buttons */}
      <div>
        <p className="mb-2 text-sm font-medium">Scan a vertical near you</p>
        <div className="flex flex-wrap gap-2">
          {VERTICAL_QUERIES.map((v) => (
            <button
              key={v.vertical}
              onClick={() => runScan(v.query, v.vertical)}
              disabled={loading}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Radius + custom search */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Or custom query (e.g., 'junk removal')"
          className="w-full rounded-lg border bg-background px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value, 10))}
          className="rounded-lg border bg-background px-3 py-3 text-sm"
        >
          <option value={2000}>2 km</option>
          <option value={5000}>5 km</option>
          <option value={10000}>10 km</option>
          <option value={25000}>25 km</option>
        </select>
        <button
          onClick={() => runScan(query)}
          disabled={loading || !query.trim()}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          Scan
        </button>
      </div>

      {position && (
        <p className="text-xs text-muted-foreground">
          <MapPin className="inline h-3 w-3" /> Center: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
        </p>
      )}

      {loading && (
        <p className="text-center text-sm text-muted-foreground">Scanning...</p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-muted-foreground">
            {results.length} results{cached ? " (cached)" : " (fresh)"} |{" "}
            Sorted by opportunity score (highest first)
          </p>
          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.place_id}
                className="rounded-lg border bg-background p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{r.name}</p>
                      <TierBadge tier={r.tier} score={r.opportunity_score} />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {r.formatted_address}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {r.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" /> {r.rating}
                          {" "}({r.user_rating_count})
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Globe className={`h-3 w-3 ${r.website_uri ? "text-green-600" : "text-red-500"}`} />
                        {r.website_uri ? "Has website" : "No website"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Camera className="h-3 w-3" /> {r.photo_count} photos
                      </span>
                      {r.phone_number && <span>{r.phone_number}</span>}
                    </div>
                    {r.pitch_angle && (
                      <p className="mt-2 rounded bg-muted p-2 text-xs italic text-muted-foreground">
                        {r.pitch_angle}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => captureAsProspect(r)}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
                  >
                    + Prospect
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TierBadge({ tier, score }: { tier: string; score: number }) {
  const styles: Record<string, string> = {
    hot: "bg-red-100 text-red-800",
    warm: "bg-yellow-100 text-yellow-800",
    cold: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[tier]}`}>
      {tier} ({score})
    </span>
  );
}
