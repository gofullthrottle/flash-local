"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingData } from "@/lib/onboarding/types";
import { VERTICALS } from "@/lib/onboarding/types";

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepService({ data, updateData, onNext, onBack }: Props) {
  function selectVertical(id: string) {
    updateData({
      service: { ...data.service, verticalId: id },
    });
  }

  function setServiceArea(area: string) {
    updateData({
      service: { ...data.service, serviceArea: area },
    });
  }

  const isValid = data.service.verticalId && data.service.serviceArea.trim();

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">
        What service do you offer?
      </h2>
      <p className="mt-2 text-muted-foreground">
        Pick your hustle. We'll load smart defaults for pricing, FAQs, and
        policies.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {VERTICALS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => selectVertical(v.id)}
            className={`rounded-lg border p-4 text-left text-sm font-medium transition-all hover:shadow-sm ${
              data.service.verticalId === v.id
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "hover:border-foreground/20"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        <Label htmlFor="service-area">Service area</Label>
        <Input
          id="service-area"
          placeholder="e.g. Austin, TX or 78701, 78702"
          value={data.service.serviceArea}
          onChange={(e) => setServiceArea(e.target.value)}
          className="mt-2"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Cities, zip codes, or neighborhoods you serve.
        </p>
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
