"use client";

import { useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { slugify } from "@/lib/utils";
import type { OnboardingData } from "@/lib/onboarding/types";

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepBrand({ data, updateData, onNext, onBack }: Props) {
  // Auto-generate slug from display name
  useEffect(() => {
    if (data.brand.displayName && !data.brand.slug) {
      updateData({
        brand: {
          ...data.brand,
          slug: slugify(data.brand.displayName),
        },
      });
    }
  }, []);

  function updateField(field: keyof typeof data.brand, value: string) {
    const updated = { ...data.brand, [field]: value };
    // Auto-sync slug with display name changes
    if (field === "displayName") {
      updated.slug = slugify(value);
    }
    updateData({ brand: updated });
  }

  const isValid =
    data.brand.displayName.trim() &&
    data.brand.slug.trim() &&
    data.brand.phone.trim() &&
    data.brand.email.trim();

  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "flashlocal.com";

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Brand it in 60 seconds</h2>
      <p className="mt-2 text-muted-foreground">
        The basics. You can always update these later from your dashboard.
      </p>

      <div className="mt-8 space-y-6">
        <div>
          <Label htmlFor="display-name">Business name</Label>
          <Input
            id="display-name"
            placeholder="e.g. Mike's Holiday Lights"
            value={data.brand.displayName}
            onChange={(e) => updateField("displayName", e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="slug">Your URL</Label>
          <div className="mt-2 flex items-center gap-0">
            <Input
              id="slug"
              value={data.brand.slug}
              onChange={(e) =>
                updateField("slug", slugify(e.target.value))
              }
              className="rounded-r-none"
            />
            <div className="flex h-10 items-center rounded-r-md border border-l-0 bg-muted px-3 text-sm text-muted-foreground">
              .{domain}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            This will be your site's address. Choose carefully — it can't be
            changed after publish.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={data.brand.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={data.brand.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button size="lg" disabled={!isValid} onClick={onNext}>
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
