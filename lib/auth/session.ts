import { redirect } from "next/navigation";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProviderForCurrentUser() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("providers")
    .select(
      `
      *,
      provider_contacts(*),
      provider_public_profiles(*),
      sites(*),
      ads_settings(*)
    `
    )
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function requireProvider() {
  const provider = await getProviderForCurrentUser();
  if (!provider) redirect("/start");
  return provider;
}
