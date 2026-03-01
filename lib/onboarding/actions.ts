"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { OnboardingData } from "./types";

export async function createProvider(data: OnboardingData) {
  const supabase = createAdminClient();
  const slug = slugify(data.brand.slug || data.brand.displayName);

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from("providers")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return { error: "This URL is already taken. Try a different business name." };
  }

  // Create provider
  const { data: provider, error: providerErr } = await supabase
    .from("providers")
    .insert({
      status: data.plan === "REV_SHARE" ? "PENDING" : "PENDING",
      plan: data.plan,
      vertical_id: data.service.verticalId,
      slug,
      display_name: data.brand.displayName,
      // owner_user_id will be set after auth signup — for now use a placeholder
      // In production, this comes from the auth session
      owner_user_id: "00000000-0000-0000-0000-000000000000",
    })
    .select("id")
    .single();

  if (providerErr) {
    return { error: `Failed to create provider: ${providerErr.message}` };
  }

  const providerId = provider.id;

  // Create related records in parallel
  const ops = [
    supabase.from("provider_public_profiles").insert({
      provider_id: providerId,
      headline: `Professional ${data.service.verticalId.replace(/-/g, " ")} services`,
      service_area: { raw: data.service.serviceArea },
      timezone: data.service.timezone,
    }),
    supabase.from("provider_contacts").insert({
      provider_id: providerId,
      email: data.brand.email,
      phone: data.brand.phone,
    }),
    supabase.from("sites").insert({
      provider_id: providerId,
      subdomain: slug,
      theme_id: "default",
      is_live: false,
    }),
    supabase.from("ads_settings").insert({
      provider_id: providerId,
    }),
    supabase.from("gbp_profiles").insert({
      provider_id: providerId,
    }),
  ];

  // Insert packages
  if (data.pricing.packages.length > 0) {
    ops.push(
      supabase.from("service_packages").insert(
        data.pricing.packages.map((pkg) => ({
          provider_id: providerId,
          name: pkg.name,
          description: pkg.description,
          price_cents: pkg.priceCents,
          includes: pkg.includes,
          recommended: pkg.recommended,
        }))
      )
    );
  }

  const results = await Promise.all(ops);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    return { error: `Setup failed: ${failed.error.message}` };
  }

  return { providerId, slug };
}

export async function publishSite(providerId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("sites")
    .update({ is_live: true, published_at: new Date().toISOString() })
    .eq("provider_id", providerId);

  if (error) {
    return { error: `Publish failed: ${error.message}` };
  }

  await supabase
    .from("provider_public_profiles")
    .update({ published: true })
    .eq("provider_id", providerId);

  return { success: true };
}
