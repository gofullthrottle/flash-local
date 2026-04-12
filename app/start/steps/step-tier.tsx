"use client";

import { Check } from "lucide-react";
import type { OnboardingData, PlanTier } from "@/lib/onboarding/types";
import { PLAN_TIERS } from "@/lib/onboarding/types";
import { formatCents } from "@/lib/utils";

type StepTierProps = {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
};

export function StepTier({ data, updateData, onNext, onBack }: StepTierProps) {
  const selectTier = (tier: PlanTier) => {
    updateData({ tier });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Choose Your Tier</h2>
        <p className="text-muted-foreground">
          Start free and upgrade anytime. Your tier determines which features
          you get.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_TIERS.map((tier) => {
          const selected = data.tier === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => selectTier(tier.id)}
              className={`relative rounded-lg border p-5 text-left transition-all ${
                selected
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              {"popular" in tier && tier.popular && (
                <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  Popular
                </span>
              )}
              <div>
                <h3 className="text-lg font-semibold">{tier.label}</h3>
                <p className="mt-1 text-2xl font-bold">
                  {tier.priceCentsMonthly === 0
                    ? "Free"
                    : `${formatCents(tier.priceCentsMonthly)}/mo`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {tier.description}
                </p>
              </div>

              <ul className="mt-4 space-y-2">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border bg-background py-3 font-medium transition-colors hover:bg-accent"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-lg bg-primary py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
