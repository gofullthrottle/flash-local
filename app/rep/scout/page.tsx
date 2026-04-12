"use client";

import { useState, useCallback } from "react";
import { Compass, MapPin, Pause, Square, Play } from "lucide-react";
import { useGeolocation, type GeoPosition } from "@/lib/hooks/use-geolocation";
import { ProspectCaptureForm } from "@/components/rep/prospect-capture-form";

export default function ScoutPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<
    "idle" | "active" | "paused"
  >("idle");
  const [breadcrumbCount, setBreadcrumbCount] = useState(0);
  const [prospectCount, setProspectCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recordBreadcrumb = useCallback(
    async (pos: GeoPosition) => {
      if (!sessionId) return;
      try {
        await fetch("/api/rep/scout/breadcrumb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: sessionId,
            lat: pos.lat,
            lng: pos.lng,
            accuracy: pos.accuracy,
            event_type: "POSITION",
          }),
        });
        setBreadcrumbCount((c) => c + 1);
      } catch {
        // Will retry on next interval
      }
    },
    [sessionId]
  );

  const { position, tracking, startTracking, stopTracking } = useGeolocation({
    intervalMs: 15000,
    onPosition: recordBreadcrumb,
  });

  const startSession = async () => {
    setError(null);
    try {
      const res = await fetch("/api/rep/scout", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start session");
      }
      const data = await res.json();
      setSessionId(data.session.id);
      setSessionStatus("active");
      setBreadcrumbCount(0);
      setProspectCount(0);
      startTracking();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start");
    }
  };

  const endSession = async () => {
    if (!sessionId) return;
    stopTracking();
    try {
      await fetch("/api/rep/scout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, status: "COMPLETED" }),
      });
    } catch {
      // Non-fatal
    }
    setSessionStatus("idle");
    setSessionId(null);
  };

  const pauseSession = async () => {
    if (!sessionId) return;
    stopTracking();
    try {
      await fetch("/api/rep/scout", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, status: "PAUSED" }),
      });
    } catch {
      // Non-fatal
    }
    setSessionStatus("paused");
  };

  const resumeSession = () => {
    setSessionStatus("active");
    startTracking();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Scout Mode</h2>
        <p className="text-muted-foreground">
          Walk a neighborhood. Your route is tracked and prospects are
          geo-tagged.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Session controls */}
      <div className="rounded-lg border bg-background p-6">
        {sessionStatus === "idle" ? (
          <div className="text-center">
            <Compass className="mx-auto h-12 w-12 text-primary" />
            <h3 className="mt-4 text-lg font-semibold">Ready to Scout</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a scouting session to track your route and capture prospects
              with GPS coordinates.
            </p>
            <button
              onClick={startSession}
              className="mt-4 rounded-lg bg-primary px-8 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Start Scouting
            </button>
          </div>
        ) : (
          <div>
            {/* Active session stats */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    sessionStatus === "active"
                      ? "animate-pulse bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
                <span className="text-sm font-medium">
                  {sessionStatus === "active" ? "Scouting..." : "Paused"}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{breadcrumbCount} waypoints</span>
                <span>{prospectCount} prospects</span>
              </div>
            </div>

            {/* Current position */}
            {position && (
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                  {position.accuracy && ` (~${Math.round(position.accuracy)}m)`}
                </span>
              </div>
            )}

            {/* Session controls */}
            <div className="flex gap-3">
              {sessionStatus === "active" ? (
                <button
                  onClick={pauseSession}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg border bg-background py-3 font-medium transition-colors hover:bg-accent"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeSession}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Play className="h-4 w-4" />
                  Resume
                </button>
              )}
              <button
                onClick={endSession}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-3 font-medium text-white transition-colors hover:bg-red-600"
              >
                <Square className="h-4 w-4" />
                End Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline prospect capture (when session is active) */}
      {sessionStatus !== "idle" && (
        <div className="rounded-lg border bg-background p-6">
          <h3 className="mb-4 text-lg font-semibold">
            Capture a Prospect
          </h3>
          <ProspectCaptureForm
            scoutSessionId={sessionId}
            onSubmit={() => setProspectCount((c) => c + 1)}
          />
        </div>
      )}
    </div>
  );
}
