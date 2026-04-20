export const dynamic = "force-dynamic";

import { getProviderForCurrentUser } from "@/lib/auth/session";
import { SiteEditorContent } from "./site-editor-content";

export default async function SiteEditorPage() {
  const provider = await getProviderForCurrentUser();
  if (!provider) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          My Site
        </h2>
        <p className="text-muted-foreground">
          Complete onboarding to set up your site.
        </p>
      </div>
    );
  }

  const site = Array.isArray(provider.sites) ? provider.sites[0] : provider.sites;
  const profile = Array.isArray(provider.provider_public_profiles)
    ? provider.provider_public_profiles[0]
    : provider.provider_public_profiles;

  const siteDomain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "flashlocal.com";
  const siteUrl = `${provider.slug}.${siteDomain}`;

  return (
    <SiteEditorContent
      providerId={provider.id}
      initialData={{
        headline: profile?.headline ?? "",
        description: profile?.description ?? "",
        heroImageUrl: profile?.hero_image_url ?? "",
        isLive: site?.is_live ?? false,
        siteUrl,
      }}
    />
  );
}
