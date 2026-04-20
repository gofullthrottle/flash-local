export const dynamic = "force-dynamic";

import { getProviderForCurrentUser } from "@/lib/auth/session";
import { AdsContent } from "./ads-content";

export default async function AdsPage() {
  const provider = await getProviderForCurrentUser();
  if (!provider) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Ad Management
        </h2>
        <p className="text-muted-foreground">
          Complete onboarding to manage ad campaigns.
        </p>
      </div>
    );
  }

  const ads = Array.isArray(provider.ads_settings)
    ? provider.ads_settings[0]
    : provider.ads_settings;

  return (
    <AdsContent
      providerId={provider.id}
      initialData={{
        enabled: ads?.enabled ?? false,
        dailyCapCents: ads?.daily_cap_cents ?? 2500,
        objective: ads?.objective ?? "bookings",
        radius: (ads?.geo as any)?.radius_miles ?? 15,
      }}
    />
  );
}
