"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, getCurrentUser } from "@/lib/supabase/server";

async function assertOwnership(providerId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" as const };

  const supabase = createAdminClient();
  const { data: provider } = await supabase
    .from("providers")
    .select("id, owner_user_id")
    .eq("id", providerId)
    .single();

  if (!provider || provider.owner_user_id !== user.id) {
    return { error: "Not authorized" as const };
  }
  return { ok: true as const, supabase };
}

export async function updateSite(
  providerId: string,
  patch: {
    headline?: string;
    description?: string;
    hero_image_url?: string;
    is_live?: boolean;
  }
) {
  const check = await assertOwnership(providerId);
  if ("error" in check) return { error: check.error };
  const { supabase } = check;

  const profilePatch: Record<string, unknown> = {};
  if (patch.headline !== undefined) profilePatch.headline = patch.headline;
  if (patch.description !== undefined)
    profilePatch.description = patch.description;
  if (patch.hero_image_url !== undefined)
    profilePatch.hero_image_url = patch.hero_image_url;

  if (Object.keys(profilePatch).length > 0) {
    const { error: profileErr } = await supabase
      .from("provider_public_profiles")
      .update(profilePatch)
      .eq("provider_id", providerId);
    if (profileErr) return { error: profileErr.message };
  }

  if (patch.is_live !== undefined) {
    const { error: siteErr } = await supabase
      .from("sites")
      .update({
        is_live: patch.is_live,
        ...(patch.is_live ? { published_at: new Date().toISOString() } : {}),
      })
      .eq("provider_id", providerId);
    if (siteErr) return { error: siteErr.message };
  }

  revalidatePath("/dashboard/site");
  return { success: true };
}

export async function updateSettings(
  providerId: string,
  patch: {
    display_name?: string;
    email?: string;
    phone?: string;
    status?: "ACTIVE" | "PAUSED";
  }
) {
  const check = await assertOwnership(providerId);
  if ("error" in check) return { error: check.error };
  const { supabase } = check;

  if (patch.display_name !== undefined || patch.status !== undefined) {
    const providerPatch: Record<string, unknown> = {};
    if (patch.display_name !== undefined)
      providerPatch.display_name = patch.display_name;
    if (patch.status !== undefined) providerPatch.status = patch.status;
    const { error } = await supabase
      .from("providers")
      .update(providerPatch)
      .eq("id", providerId);
    if (error) return { error: error.message };
  }

  if (patch.email !== undefined || patch.phone !== undefined) {
    const contactPatch: Record<string, unknown> = {};
    if (patch.email !== undefined) contactPatch.email = patch.email;
    if (patch.phone !== undefined) contactPatch.phone = patch.phone;
    const { error } = await supabase
      .from("provider_contacts")
      .update(contactPatch)
      .eq("provider_id", providerId);
    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function updateAdsSettings(
  providerId: string,
  patch: {
    enabled?: boolean;
    daily_cap_cents?: number;
    objective?: string;
    geo?: Record<string, unknown>;
  }
) {
  const check = await assertOwnership(providerId);
  if ("error" in check) return { error: check.error };
  const { supabase } = check;

  const { error } = await supabase
    .from("ads_settings")
    .update(patch)
    .eq("provider_id", providerId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/ads");
  return { success: true };
}

export async function updateBookingStatus(
  bookingId: string,
  status:
    | "REQUESTED"
    | "CONFIRMED"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELED"
    | "REFUNDED"
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const supabase = createAdminClient();
  // Verify ownership via join
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, provider_id, providers!inner(owner_user_id)")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found" };
  const owner = Array.isArray(booking.providers)
    ? booking.providers[0]?.owner_user_id
    : (booking.providers as any)?.owner_user_id;
  // Guard against undefined owner — treat missing join result as unauthorized
  if (!owner || owner !== user.id) return { error: "Not authorized" };

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/bookings");
  return { success: true };
}
