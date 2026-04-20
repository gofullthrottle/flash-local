export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { getProviderForCurrentUser } from "@/lib/auth/session";
import ConnectContent from "./connect-content";

export default async function ConnectPage() {
  const provider = await getProviderForCurrentUser();

  if (!provider) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Payouts
          </h2>
          <p className="text-muted-foreground">
            You need to complete onboarding before connecting payouts.{" "}
            <a href="/start" className="underline">
              Start onboarding
            </a>
          </p>
        </div>
      </div>
    );
  }

  const initialStatus = {
    connected: Boolean(provider.stripe_account_id),
    onboarding_complete: Boolean(provider.stripe_onboarding_complete),
  };

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold tracking-tight">
            Payouts
          </h2>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ConnectContent
        providerId={provider.id}
        plan={provider.plan}
        initialStatus={initialStatus}
      />
    </Suspense>
  );
}
