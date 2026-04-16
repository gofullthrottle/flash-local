"use client";

import { useState, useTransition } from "react";
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
import { updateSite } from "@/lib/dashboard/actions";

interface SiteEditorProps {
  providerId: string;
  initialData: {
    headline: string;
    description: string;
    heroImageUrl: string;
    isLive: boolean;
    siteUrl: string;
  };
}

export function SiteEditorContent({
  providerId,
  initialData,
}: SiteEditorProps) {
  const [headline, setHeadline] = useState(initialData.headline);
  const [description, setDescription] = useState(initialData.description);
  const [heroImageUrl, setHeroImageUrl] = useState(initialData.heroImageUrl);
  const [isLive, setIsLive] = useState(initialData.isLive);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const result = await updateSite(providerId, {
        headline,
        description,
        hero_image_url: heroImageUrl,
        is_live: isLive,
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        setSuccessMsg("Changes saved");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            My Site
          </h2>
          <p className="text-muted-foreground">
            Edit your microsite content and settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isLive ? "default" : "secondary"}>
            {isLive ? "Live" : "Offline"}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://${initialData.siteUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
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
              {initialData.siteUrl}
            </code>
            <Button variant="outline" size="sm" asChild>
              <a
                href={`https://${initialData.siteUrl}`}
                target="_blank"
                rel="noopener noreferrer"
              >
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
          <CardDescription>
            Edit the text that appears on your microsite.
          </CardDescription>
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
                {isLive
                  ? "Your site is visible to customers"
                  : "Your site is hidden"}
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
        Save Changes
      </Button>
    </div>
  );
}
