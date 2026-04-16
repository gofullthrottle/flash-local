"use client";

import { useState, useTransition } from "react";
import { Loader2, Save, Shield, User } from "lucide-react";
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
import { updateSettings } from "@/lib/dashboard/actions";

interface SettingsProps {
  providerId: string;
  initialData: {
    displayName: string;
    email: string;
    phone: string;
    plan: string;
    status: string;
  };
}

export function SettingsContent({ providerId, initialData }: SettingsProps) {
  const [displayName, setDisplayName] = useState(initialData.displayName);
  const [phone, setPhone] = useState(initialData.phone);
  const [email, setEmail] = useState(initialData.email);
  const [status, setStatus] = useState(initialData.status);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await updateSettings(providerId, {
        display_name: displayName,
        email,
        phone,
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setSuccessMsg("Settings saved");
      }
    });
  }

  function handlePause() {
    setError(null);
    startTransition(async () => {
      const newStatus = status === "PAUSED" ? "ACTIVE" : "PAUSED";
      const result = await updateSettings(providerId, {
        status: newStatus as "ACTIVE" | "PAUSED",
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setStatus(newStatus);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Settings
        </h2>
        <p className="text-muted-foreground">
          Manage your business information and account.
        </p>
      </div>

      {/* Business info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Business Information
          </CardTitle>
          <CardDescription>
            This information appears on your microsite and invoices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Business name</Label>
            <Input
              id="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" /> Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Plan</div>
              <div className="text-sm text-muted-foreground">
                {initialData.plan === "REV_SHARE"
                  ? "Partner (Rev-share)"
                  : "Launch (Upfront)"}
              </div>
            </div>
            <Badge>{initialData.plan}</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Status</div>
              <div className="text-sm text-muted-foreground">
                {status === "ACTIVE"
                  ? "Active and accepting bookings"
                  : status === "PAUSED"
                    ? "Paused — not accepting bookings"
                    : status}
              </div>
            </div>
            <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
              {status}
            </Badge>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium">Danger zone</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {status === "PAUSED"
                ? "Resume to start accepting bookings again."
                : "Pausing your account will hide your site and stop accepting new bookings."}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 text-destructive"
              onClick={handlePause}
              disabled={isPending}
            >
              {status === "PAUSED" ? "Resume My Account" : "Pause My Account"}
            </Button>
          </div>
        </CardContent>
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
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
