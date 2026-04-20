"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  BanknoteIcon,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ConnectContentProps {
  providerId: string;
  plan: string;
  initialStatus: {
    connected: boolean;
    onboarding_complete: boolean;
  };
}

export default function ConnectContent({
  providerId,
  plan,
  initialStatus,
}: ConnectContentProps) {
  const searchParams = useSearchParams();
  const justReturned = searchParams.get("success") === "true";
  const needsRefresh = searchParams.get("refresh") === "true";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState({
    connected: initialStatus.connected,
    onboarding_complete: initialStatus.onboarding_complete,
    payouts_enabled: false,
    charges_enabled: false,
  });

  // Refresh status from server when the user returns from Stripe
  useEffect(() => {
    if (justReturned) {
      fetch(`/api/connect/status?provider_id=${providerId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && !data.error) {
            setStatus({
              connected: data.connected ?? false,
              onboarding_complete: data.onboarding_complete ?? false,
              payouts_enabled: data.payouts_enabled ?? false,
              charges_enabled: data.charges_enabled ?? false,
            });
          }
        })
        .catch(() => {});
    }
  }, [justReturned, providerId]);

  const isOnboarded = status.onboarding_complete;

  async function handleOnboard() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_id: providerId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Onboarding failed");
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Payouts
        </h2>
        <p className="text-muted-foreground">
          Connect your bank account to receive customer payments directly.
        </p>
      </div>

      {/* Connect status card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-5 w-5" />
                Stripe Connect
              </CardTitle>
              <CardDescription className="mt-1">
                Payments are processed securely through Stripe.
              </CardDescription>
            </div>
            <Badge variant={isOnboarded ? "default" : "secondary"}>
              {isOnboarded ? "Connected" : "Not connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isOnboarded ? (
            <>
              {/* Connected state */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Stripe account connected
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      Customer payments will be deposited directly to your bank
                      account, minus the platform fee.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Payout summary */}
              <div>
                <h3 className="text-sm font-medium">Payout Summary</h3>
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-bold">$0.00</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Total earned
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-bold">$0.00</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Pending payout
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4 text-center">
                    <div className="text-2xl font-bold">$0.00</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Platform fees
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    Manage your Stripe account
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Update bank info, view payouts, and download tax forms.
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-1.5 h-3 w-3" />
                  Stripe Dashboard
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Not connected state */}
              {needsRefresh && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm text-amber-800">
                    Your onboarding session expired. Please try again to
                    complete setup.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-6 text-center">
                  <BanknoteIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 font-semibold">
                    Set up payouts to get paid
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    Connect your bank account through Stripe to receive customer
                    payments. You keep 85% of every transaction — the 15%
                    platform fee covers payment processing, your microsite, and
                    ongoing support.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium">How it works</h4>
                  <ul className="mt-3 space-y-3">
                    {[
                      {
                        step: "1",
                        title: "Connect your bank",
                        desc: "Complete Stripe's secure onboarding (~2 min)",
                      },
                      {
                        step: "2",
                        title: "Customer pays",
                        desc: "Deposits flow through Stripe with automatic fee split",
                      },
                      {
                        step: "3",
                        title: "Get paid",
                        desc: "Funds hit your bank in 2 business days",
                      },
                    ].map((item) => (
                      <li key={item.step} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {item.step}
                        </span>
                        <div>
                          <div className="text-sm font-medium">
                            {item.title}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.desc}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                size="lg"
                className="w-full"
                onClick={handleOnboard}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    Connect with Stripe
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3 w-3" />
                <span>
                  Secured by Stripe. We never see your bank details.
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Rev-share breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Split</CardTitle>
          <CardDescription>
            How earnings are divided on each transaction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">You keep</div>
                <div className="text-sm text-muted-foreground">
                  Direct to your bank account
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">85%</div>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Platform fee</div>
                <div className="text-sm text-muted-foreground">
                  Covers site hosting, payments, support
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-muted-foreground">
                  15%
                </div>
              </div>
            </div>
            <Separator />
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Example: On a $400 job deposit of $120, you receive $102 and the
              platform fee is $18.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
