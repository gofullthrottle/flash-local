"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { OnboardingData } from "@/lib/onboarding/types";
import { createProvider } from "@/lib/onboarding/actions";

interface Props {
  data: OnboardingData;
  updateData: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  providerId: string | null;
  setProviderId: (id: string) => void;
}

export function StepPayments({
  data,
  updateData,
  onNext,
  onBack,
  providerId,
  setProviderId,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUpfront = data.plan === "UPFRONT";

  async function handleContinue() {
    setLoading(true);
    setError(null);

    try {
      // Create provider (idempotent — returns existing if user already has one)
      let currentProviderId: string | null = providerId;
      if (!currentProviderId) {
        const result = await createProvider(data);
        if ("error" in result && result.error) {
          setError(result.error);
          return;
        }
        if (!("providerId" in result) || !result.providerId) {
          setError("Failed to create provider");
          return;
        }
        currentProviderId = result.providerId;
        setProviderId(result.providerId);
        updateData({ payments: { setupComplete: true } });
      }

      // For UPFRONT plan, redirect to Stripe Checkout for the setup fee.
      // The webhook handler will flip the provider to ACTIVE on success.
      if (isUpfront) {
        const origin = window.location.origin;
        const checkoutRes = await fetch("/api/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider_id: currentProviderId,
            order_kind: "SETUP_FEE",
            setup_tier: "basic",
            success_url: `${origin}/start?paid=1`,
            cancel_url: `${origin}/start?canceled=1`,
          }),
        });

        if (!checkoutRes.ok) {
          const err = await checkoutRes.json();
          setError(err.error ?? "Failed to create checkout session");
          return;
        }

        const { url } = await checkoutRes.json();
        if (url) {
          window.location.href = url;
          return;
        }
        setError("Checkout URL missing");
        return;
      }

      // For REV_SHARE, skip payment and go straight to preview
      onNext();
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Payment setup</h2>
      <p className="mt-2 text-muted-foreground">
        {isUpfront
          ? "Pay the setup fee and we'll create your site."
          : "No payment needed now. We'll set up Stripe Connect so you can receive customer payments."}
      </p>

      <div className="mt-8 space-y-4">
        {isUpfront ? (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">FlashLocal Launch — Setup Fee</div>
                  <div className="text-sm text-muted-foreground">
                    One-time payment. Your site goes live immediately.
                  </div>
                </div>
                <div className="text-2xl font-bold">$99</div>
              </div>
              <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                After creating your account, you'll be redirected to Stripe
                Checkout to complete payment. Your site publishes automatically
                once payment succeeds.
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="font-semibold">Partner Plan — Rev-Share</div>
              <div className="mt-2 text-sm text-muted-foreground">
                No setup fee. Customer payments flow through Stripe Connect.
                You receive weekly payouts minus the 15% platform fee.
              </div>
              <ul className="mt-4 space-y-2">
                {[
                  "We create your site first",
                  "Then we guide you through Stripe Connect onboarding",
                  "Once connected, customers can pay directly through your site",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary */}
      <div className="mt-8 rounded-lg border p-4">
        <div className="text-sm font-medium text-muted-foreground">Summary</div>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Business</span>
            <span className="font-medium">{data.brand.displayName}</span>
          </div>
          <div className="flex justify-between">
            <span>Service</span>
            <span className="font-medium">
              {data.service.verticalId.replace(/-/g, " ")}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Area</span>
            <span className="font-medium">{data.service.serviceArea}</span>
          </div>
          <div className="flex justify-between">
            <span>Packages</span>
            <span className="font-medium">
              {data.pricing.packages.length} packages
            </span>
          </div>
          <div className="flex justify-between">
            <span>URL</span>
            <span className="font-medium">
              {data.brand.slug}.flashlocal.com
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button size="lg" onClick={handleContinue} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : isUpfront ? (
            <>
              Pay & Create <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            <>
              Create My Site <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
