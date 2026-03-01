"use client";

import { useState } from "react";
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

export default function AdsPage() {
  const [enabled, setEnabled] = useState(false);
  const [dailyBudget, setDailyBudget] = useState(25);
  const [radius, setRadius] = useState(15);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    // In production: call server action to update ads_settings
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Ad Management</h2>
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
                We'll create and optimize local ads to drive bookings to your site.
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
                  Est. monthly spend: ${(dailyBudget * 30).toLocaleString()}
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

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Ad Settings"}
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Performance preview */}
      {enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance</CardTitle>
            <CardDescription>
              Stats will appear once your ads start running.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">—</div>
                <div className="text-xs text-muted-foreground">Impressions</div>
              </div>
              <div>
                <div className="text-2xl font-bold">—</div>
                <div className="text-xs text-muted-foreground">Clicks</div>
              </div>
              <div>
                <div className="text-2xl font-bold">—</div>
                <div className="text-xs text-muted-foreground">Bookings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
