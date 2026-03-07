"use client";

import { useState } from "react";
import {
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Palette,
  Save,
} from "lucide-react";
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

export default function SiteEditorPage() {
  const [headline, setHeadline] = useState("Professional holiday light installation services");
  const [description, setDescription] = useState(
    "Reliable, professional holiday lights in Austin, TX. Book online in minutes."
  );
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [saving, setSaving] = useState(false);

  const siteUrl = "mikes-holiday-lights.flashlocal.com";

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">My Site</h2>
          <p className="text-muted-foreground">Edit your microsite content and settings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isLive ? "default" : "secondary"}>
            {isLive ? "Live" : "Offline"}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <a href={`https://${siteUrl}`} target="_blank" rel="noopener noreferrer">
              <Eye className="mr-1 h-3 w-3" /> Preview
            </a>
          </Button>
        </div>
      </div>

      {/* Site URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" /> Site URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="flex-1 rounded-lg bg-muted px-4 py-2.5 text-sm font-medium">
              {siteUrl}
            </code>
            <Button variant="outline" size="sm" asChild>
              <a href={`https://${siteUrl}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            This is your permanent URL. Share it with customers.
          </p>
        </CardContent>
      </Card>

      {/* Content editor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" /> Site Content
          </CardTitle>
          <CardDescription>Edit the text that appears on your microsite.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <Label htmlFor="hero-image">Hero image URL</Label>
            <Input
              id="hero-image"
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Upload to Supabase Storage and paste the URL here.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Site visibility</div>
              <div className="text-sm text-muted-foreground">
                {isLive ? "Your site is visible to customers" : "Your site is hidden"}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isLive}
              onClick={() => setIsLive(!isLive)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
                isLive ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                  isLive ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Changes
      </Button>
    </div>
  );
}
