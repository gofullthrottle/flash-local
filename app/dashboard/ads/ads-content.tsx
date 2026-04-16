"use client";

import { useState, useTransition } from "react";
import { Megaphone, MapPin, Target, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { updateAdsSettings } from "@/lib/dashboard/actions";

interface AdsContentProps {
  providerId: string;
  initialData: {
    enabled: boolean;
    dailyCapCents: number;
    objective: string;
    radius: number;
  };
}

export function AdsContent({ providerId, initialData }: AdsContentProps) {
  const [enabled, setEnabled] = useState(initialData.enabled);
  const [dailyBudget, setDailyBudget] = useState(
    Math.round(initialData.dailyCapCents / 100)
  );
  const [radius, setRadius] = useState(initialData.radius);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await updateAdsSettings(providerId, {
        enabled,
        daily_cap_cents: dailyBudget * 100,
        objective: "bookings",
        geo: { radius_miles: radius },
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setSuccessMsg("Ad settings saved");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Ad Management
        </h2>
        <p className="text-muted-foreground">
          Toggle ads on, set a budget, and we handle the rest.
        </p>
      </div>

      {/* Main toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-5 w-5" />
                Run Ads for Me
              </CardTitle>
              <CardDescription className="mt-1">
                We'll create and optimize local ads to drive bookings to your
                site.
              </CardDescription>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </CardHeader>

        {enabled && (
          <CardContent className="space-y-6">
            <Separator />

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <Label className="flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4" /> Daily Budget
                </Label>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={5}
                    max={500}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">/ day</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Est. monthly spend: $
                  {(dailyBudget * 30).toLocaleString()}
                </p>
              </div>

              <div>
                <Label className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> Service Radius
                </Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={radius}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">miles</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <Target className="h-4 w-4" /> Goal
              </Label>
              <div className="mt-2 flex gap-2">
                <Badge variant="default">Bookings</Badge>
                <Badge variant="outline">Calls</Badge>
                <Badge variant="outline">Leads</Badge>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4">
              <h4 className="text-sm font-medium">How it works</h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>We create ads targeting your service area</li>
                <li>Ads run on Google and local channels</li>
                <li>Budget is spent only when people click</li>
                <li>You can pause or adjust anytime from here</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      <Button onClick={handleSave} disabled={isPending} size="lg">
        {isPending ? "Saving..." : "Save Ad Settings"}
      </Button>
    </div>
  );
}
