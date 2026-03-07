"use client";

import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OnboardingData, PlanType } from "@/lib/onboarding/types";

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const PLANS: {
  type: PlanType;
  title: string;
  subtitle: string;
  price: string;
  priceSub: string;
  features: string[];
  popular?: boolean;
}[] = [
  {
    type: "UPFRONT",
    title: "Launch Plan",
    subtitle: "Pay once, keep full control",
    price: "$99",
    priceSub: "one-time",
    features: [
      "Custom microsite + subdomain",
      "Online booking + payments",
      "3-tier pricing packages",
      "Google Business Profile wizard",
      "Reviews collection",
    ],
  },
  {
    type: "REV_SHARE",
    title: "Partner Plan",
    subtitle: "$0 upfront, we take a small cut",
    price: "$0",
    priceSub: "15% per booking",
    features: [
      "Everything in Launch",
      "Stripe Connect payouts",
      "Priority ad management",
      "Custom domain (free)",
      "Cancel anytime",
    ],
    popular: true,
  },
];

export function StepPlan({ data, updateData, onNext }: Props) {
  function selectPlan(plan: PlanType) {
    updateData({ plan });
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Choose your plan</h2>
      <p className="mt-2 text-muted-foreground">
        Both plans get you a live site with booking + payments. Pick what works
        for you.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {PLANS.map((p) => (
          <Card
            key={p.type}
            className={`relative cursor-pointer transition-all hover:shadow-md ${
              data.plan === p.type
                ? "border-primary ring-2 ring-primary"
                : ""
            }`}
            onClick={() => selectPlan(p.type)}
          >
            {p.popular && (
              <div className="absolute -top-3 left-4 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                Most Popular
              </div>
            )}
            <CardHeader>
              <CardTitle>{p.title}</CardTitle>
              <CardDescription>{p.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {p.price}
                <span className="text-base font-normal text-muted-foreground">
                  {" "}{p.priceSub}
                </span>
              </div>
              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button size="lg" disabled={!data.plan} onClick={onNext}>
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
