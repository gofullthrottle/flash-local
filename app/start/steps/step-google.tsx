"use client";

import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { OnboardingData } from "@/lib/onboarding/types";

interface Props {
  data: OnboardingData;
  onBack: () => void;
  providerId: string | null;
}

const GBP_STEPS = [
  {
    id: "check",
    title: "Check for existing listing",
    description:
      "Search Google Maps for your business name to see if a listing already exists.",
    action: "I've checked",
  },
  {
    id: "create",
    title: "Create or claim your listing",
    description:
      "If no listing exists, create one. If it does, claim ownership through Google Business Profile.",
    action: "Done",
  },
  {
    id: "verify",
    title: "Complete verification",
    description:
      "Google will require verification. This may include video verification — it's normal and usually takes a few days.",
    action: "Verification started",
  },
  {
    id: "optimize",
    title: "Add photos & details",
    description:
      "Upload real work photos, add your service area, hours, and business description. This helps you show up in search.",
    action: "Photos uploaded",
  },
];

export function StepGoogle({ data, onBack }: Props) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  function toggleStep(id: string) {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const allDone = completedSteps.size === GBP_STEPS.length;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">
        Google Business Profile
      </h2>
      <p className="mt-2 text-muted-foreground">
        Your site is live. Now let's get you visible on Google Maps and Search.
        This process depends on Google's verification — we'll guide you through
        every step.
      </p>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Heads up:</strong> Google decides the verification method (sometimes
        video, sometimes postcard). This can take a few days. Your microsite is
        already live and bookable in the meantime.
      </div>

      <div className="mt-8 space-y-4">
        {GBP_STEPS.map((step, i) => {
          const isDone = completedSteps.has(step.id);
          return (
            <Card
              key={step.id}
              className={isDone ? "border-green-200 bg-green-50/50" : ""}
            >
              <CardContent className="flex items-start gap-4 p-4">
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      Step {i + 1}
                    </span>
                  </div>
                  <div className="font-medium">{step.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  <Button
                    variant={isDone ? "ghost" : "outline"}
                    size="sm"
                    className="mt-2"
                    onClick={() => toggleStep(step.id)}
                  >
                    {isDone ? "Undo" : step.action}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {allDone && (
        <>
          <Separator className="my-8" />
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
            <PartyPopper className="mx-auto h-10 w-10 text-green-600" />
            <h3 className="mt-4 font-display text-xl font-bold">
              You're all set!
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Your site is live at{" "}
              <strong>{data.brand.slug}.flashlocal.com</strong> and your Google
              profile is in progress. Once Google verifies you, you'll start
              appearing in local search results.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <a href={`/dashboard`}>Go to Dashboard</a>
              </Button>
              <Button variant="outline" asChild>
                <a
                  href={`https://${data.brand.slug}.flashlocal.com`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View My Site <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </>
      )}

      {!allDone && (
        <div className="mt-8 flex justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="text-sm text-muted-foreground">
            <Badge variant="outline">
              {completedSteps.size}/{GBP_STEPS.length} complete
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
