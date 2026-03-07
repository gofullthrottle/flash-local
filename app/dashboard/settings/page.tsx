"use client";

import { useState } from "react";
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

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("Mike's Holiday Lights");
  const [phone, setPhone] = useState("(555) 123-4567");
  const [email, setEmail] = useState("mike@example.com");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your business information and account.</p>
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
              <div className="text-sm text-muted-foreground">Partner (Rev-share)</div>
            </div>
            <Badge>REV_SHARE</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Status</div>
              <div className="text-sm text-muted-foreground">Active and accepting bookings</div>
            </div>
            <Badge variant="default">ACTIVE</Badge>
          </div>
          <Separator />
          <div>
            <div className="text-sm font-medium">Danger zone</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pausing your account will hide your site and stop accepting new bookings.
            </p>
            <Button variant="outline" size="sm" className="mt-3 text-destructive">
              Pause My Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Settings
      </Button>
    </div>
  );
}
