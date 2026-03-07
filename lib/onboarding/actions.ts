"use server";

import { createAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";
import type { OnboardingData } from "./types";

export async function createProvider(data: OnboardingData, userId?: string) {
  const supabase = createAdminClient();
  const slug = slugify(data.brand.slug || data.brand.displayName);

  const { data: existing } = await supabase
    .from("providers")
    .select("id")
    .eq("slug", slug)
    .single();

  if (existing) {
    return { error: "This URL is already taken. Try a different business name." };
  }

  const ownerUserId = userId ?? "00000000-0000-0000-0000-000000000000";

  const { data: provider, error: providerErr } = await supabase
    .from("providers")
    .insert({
      status: "PENDING",
      plan: data.plan,
      vertical_id: data.service.verticalId,
      slug,
      display_name: data.brand.displayName,
      owner_user_id: ownerUserId,
    })
    .select("id")
    .single();

  if (providerErr) {
    return { error: `Failed to create provider: ${providerErr.message}` };
  }

  const providerId = provider.id;

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

export async function claimProvider(providerId: string, userId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("providers")
    .update({ owner_user_id: userId })
    .eq("id", providerId)
    .eq("owner_user_id", "00000000-0000-0000-0000-000000000000");

  if (error) return { error: error.message };
  return { success: true };
}
