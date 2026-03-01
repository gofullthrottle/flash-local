"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import {
  type OnboardingData,
  type WizardStepId,
  INITIAL_DATA,
} from "@/lib/onboarding/types";
import { StepPlan } from "./steps/step-plan";
import { StepService } from "./steps/step-service";
import { StepBrand } from "./steps/step-brand";
import { StepPricing } from "./steps/step-pricing";
import { StepPayments } from "./steps/step-payments";
import { StepPreview } from "./steps/step-preview";
import { StepGoogle } from "./steps/step-google";

const STEPS: WizardStepId[] = [
  "plan",
  "service",
  "brand",
  "pricing",
  "payments",
  "preview",
  "google",
];

const STEP_LABELS: Record<WizardStepId, string> = {
  plan: "Choose Plan",
  service: "Service Type",
  brand: "Your Brand",
  pricing: "Pricing",
  payments: "Payments",
  preview: "Preview & Publish",
  google: "Google Presence",
};

export function StartWizard() {
  const searchParams = useSearchParams();
  const preselectedPlan = searchParams.get("plan");

  const [currentStep, setCurrentStep] = useState<WizardStepId>(
    preselectedPlan ? "service" : "plan"
  );
  const [data, setData] = useState<OnboardingData>(() => ({
    ...INITIAL_DATA,
    plan:
      preselectedPlan === "rev_share"
        ? "REV_SHARE"
        : preselectedPlan === "upfront"
          ? "UPFRONT"
          : null,
  }));
  const [providerId, setProviderId] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = useCallback(() => {
    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [stepIndex]);

  const goBack = useCallback(() => {
    const prevIndex = stepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [stepIndex]);

  const updateData = useCallback((patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <div>
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">{STEP_LABELS[currentStep]}</span>
          <span className="text-muted-foreground">
            Step {stepIndex + 1} of {STEPS.length}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Step content */}
      {currentStep === "plan" && (
        <StepPlan data={data} updateData={updateData} onNext={goNext} />
      )}
      {currentStep === "service" && (
        <StepService
          data={data}
          updateData={updateData}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === "brand" && (
        <StepBrand
          data={data}
          updateData={updateData}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === "pricing" && (
        <StepPricing
          data={data}
          updateData={updateData}
          onNext={goNext}
          onBack={goBack}
        />
      )}
      {currentStep === "payments" && (
        <StepPayments
          data={data}
          updateData={updateData}
          onNext={goNext}
          onBack={goBack}
          providerId={providerId}
          setProviderId={setProviderId}
        />
      )}
      {currentStep === "preview" && (
        <StepPreview
          data={data}
          onNext={goNext}
          onBack={goBack}
          providerId={providerId}
        />
      )}
      {currentStep === "google" && (
        <StepGoogle data={data} onBack={goBack} providerId={providerId} />
      )}
    </div>
  );
}
