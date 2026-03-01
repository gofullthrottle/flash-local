"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCents } from "@/lib/utils";
import type { OnboardingData } from "@/lib/onboarding/types";
import { publishSite } from "@/lib/onboarding/actions";

interface Props {
  data: OnboardingData;
  onNext: () => void;
  onBack: () => void;
  providerId: string | null;
}

export function StepPreview({ data, onNext, onBack, providerId }: Props) {
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteUrl = `https://${data.brand.slug}.flashlocal.com`;

  async function handlePublish() {
    if (!providerId) return;
    setPublishing(true);
    setError(null);

    try {
      const result = await publishSite(providerId);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setPublished(true);
    } catch (e: any) {
      setError(e.message ?? "Publish failed");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">
        {published ? "You're live!" : "Preview your site"}
      </h2>
      <p className="mt-2 text-muted-foreground">
        {published
          ? "Your microsite is published and ready for customers."
          : "Review everything, then publish when you're ready."}
      </p>

      {/* Site preview card */}
      <Card className="mt-8">
        <CardContent className="p-6">
          {/* Mock site preview */}
          <div className="rounded-lg border bg-muted/30 p-6">
            <div className="text-center">
              <h3 className="font-display text-2xl font-bold">
                {data.brand.displayName}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Professional{" "}
                {data.service.verticalId.replace(/-/g, " ")} services in{" "}
                {data.service.serviceArea}
              </p>
              <Button className="mt-4" size="sm" disabled>
                Book Now
              </Button>
            </div>

            <Separator className="my-6" />

            {/* Packages preview */}
            <div className="grid gap-3 sm:grid-cols-3">
              {data.pricing.packages.map((pkg) => (
                <div
                  key={pkg.name}
                  className={`rounded-lg border p-3 text-center ${
                    pkg.recommended ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  {pkg.recommended && (
                    <Badge variant="secondary" className="mb-2 text-xs">
                      Popular
                    </Badge>
                  )}
                  <div className="font-semibold">{pkg.name}</div>
                  <div className="mt-1 text-xl font-bold">
                    {formatCents(pkg.priceCents)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {pkg.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Site URL */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3">
            <span className="text-sm font-medium">{siteUrl}</span>
            {published && (
              <Button variant="ghost" size="sm" asChild>
                <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                  Visit <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {published && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <div className="font-medium">Site published!</div>
            <div className="text-sm">
              Customers can now find and book you at {siteUrl}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={publishing}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {!published ? (
          <Button size="lg" onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish My Site"
            )}
          </Button>
        ) : (
          <Button size="lg" onClick={onNext}>
            Set Up Google Profile <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
