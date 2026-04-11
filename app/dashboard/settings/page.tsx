import { getProviderForCurrentUser } from "@/lib/auth/session";
import { SettingsContent } from "./settings-content";

export default async function SettingsPage() {
  const provider = await getProviderForCurrentUser();
  if (!provider) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          Settings
        </h2>
        <p className="text-muted-foreground">
          Complete onboarding to manage your settings.
        </p>
      </div>
    );
  }

  const contacts = Array.isArray(provider.provider_contacts)
    ? provider.provider_contacts[0]
    : provider.provider_contacts;

  return (
    <SettingsContent
      providerId={provider.id}
      initialData={{
        displayName: provider.display_name ?? "",
        email: contacts?.email ?? "",
        phone: contacts?.phone ?? "",
        plan: provider.plan,
        status: provider.status,
      }}
    />
  );
}
