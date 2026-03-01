import { createServerClient } from "./server";

export async function getProviderBySlug(slug: string) {
  const supabase = createServerClient();

  const { data: provider } = await supabase
    .from("providers")
    .select("id, slug, display_name, vertical_id, plan, status")
    .eq("slug", slug)
    .eq("status", "ACTIVE")
    .single();

  if (!provider) return null;

  const [profileRes, packagesRes, siteRes, reviewsRes] = await Promise.all([
    supabase
      .from("provider_public_profiles")
      .select("*")
      .eq("provider_id", provider.id)
      .eq("published", true)
      .single(),
    supabase
      .from("service_packages")
      .select("*")
      .eq("provider_id", provider.id)
      .eq("is_active", true)
      .order("price_cents", { ascending: true }),
    supabase
      .from("sites")
      .select("*")
      .eq("provider_id", provider.id)
      .eq("is_live", true)
      .single(),
    supabase
      .from("reviews")
      .select("id, customer_name, rating, body, created_at")
      .eq("provider_id", provider.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (!siteRes.data) return null;

  return {
    provider,
    profile: profileRes.data,
    packages: packagesRes.data ?? [],
    site: siteRes.data,
    reviews: reviewsRes.data ?? [],
  };
}
