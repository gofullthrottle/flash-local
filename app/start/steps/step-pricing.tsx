"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/utils";
import type { OnboardingData, PackageInput } from "@/lib/onboarding/types";
import { DEFAULT_PACKAGES } from "@/lib/onboarding/types";

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepPricing({ data, updateData, onNext, onBack }: Props) {
  const [initialized, setInitialized] = useState(false);

  // Load default packages for this vertical (once)
  useEffect(() => {
    if (!initialized && data.pricing.packages.length === 0) {
      const defaults =
        DEFAULT_PACKAGES[data.service.verticalId] ??
        DEFAULT_PACKAGES["holiday-lights"] ??
        [];
      updateData({
        pricing: { ...data.pricing, packages: defaults },
      });
      setInitialized(true);
    }
  }, [initialized]);

  function updatePackage(index: number, patch: Partial<PackageInput>) {
    const updated = [...data.pricing.packages];
    updated[index] = { ...updated[index], ...patch };
    updateData({ pricing: { ...data.pricing, packages: updated } });
  }

  function removePackage(index: number) {
    const updated = data.pricing.packages.filter((_, i) => i !== index);
    updateData({ pricing: { ...data.pricing, packages: updated } });
  }

  function addPackage() {
    updateData({
      pricing: {
        ...data.pricing,
        packages: [
          ...data.pricing.packages,
          {
            name: "",
            priceCents: 0,
            description: "",
            includes: [],
            recommended: false,
          },
        ],
      },
    });
  }

  function setRecommended(index: number) {
    const updated = data.pricing.packages.map((pkg, i) => ({
      ...pkg,
      recommended: i === index,
    }));
    updateData({ pricing: { ...data.pricing, packages: updated } });
  }

  const isValid =
    data.pricing.packages.length > 0 &&
    data.pricing.packages.every((p) => p.name.trim() && p.priceCents > 0);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Set your pricing</h2>
      <p className="mt-2 text-muted-foreground">
        We've loaded smart defaults based on your service. Customize them or use
        as-is.
      </p>

      <div className="mt-8 space-y-4">
        {data.pricing.packages.map((pkg, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Package {i + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  {pkg.recommended && <Badge variant="secondary">Recommended</Badge>}
                  {!pkg.recommended && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRecommended(i)}
                    >
                      Set recommended
                    </Button>
                  )}
                  {data.pricing.packages.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removePackage(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Package name</Label>
                  <Input
                    value={pkg.name}
                    onChange={(e) =>
                      updatePackage(i, { name: e.target.value })
                    }
                    placeholder="e.g. Basic"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price ($)</Label>
                  <Input
                    type="number"
                    value={pkg.priceCents / 100 || ""}
                    onChange={(e) =>
                      updatePackage(i, {
                        priceCents: Math.round(
                          parseFloat(e.target.value || "0") * 100
                        ),
                      })
                    }
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Description</Label>
                <Input
                  value={pkg.description}
                  onChange={(e) =>
                    updatePackage(i, { description: e.target.value })
                  }
                  placeholder="What's included in this package?"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {data.pricing.packages.length < 5 && (
          <Button variant="outline" onClick={addPackage} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Package
          </Button>
        )}
      </div>

      {/* Deposit toggle */}
      <div className="mt-8 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">Require deposit</div>
            <div className="text-sm text-muted-foreground">
              Customers pay {data.pricing.depositPercent}% upfront when booking
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              max={100}
              value={data.pricing.depositPercent}
              onChange={(e) =>
                updateData({
                  pricing: {
                    ...data.pricing,
                    depositPercent: parseInt(e.target.value || "0"),
                  },
                })
              }
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Preview earnings */}
      {data.pricing.packages.length > 0 && (
        <div className="mt-6 rounded-lg bg-muted/50 p-4">
          <div className="text-sm font-medium">Estimated per job</div>
          <div className="mt-2 grid grid-cols-3 gap-4 text-center">
            {data.pricing.packages.map((pkg) => (
              <div key={pkg.name || "unnamed"}>
                <div className="text-xs text-muted-foreground">
                  {pkg.name || "Unnamed"}
                </div>
                <div className="text-lg font-bold">
                  {formatCents(pkg.priceCents)}
                </div>
                {data.plan === "REV_SHARE" && (
                  <div className="text-xs text-muted-foreground">
                    You keep {formatCents(Math.round(pkg.priceCents * 0.85))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
