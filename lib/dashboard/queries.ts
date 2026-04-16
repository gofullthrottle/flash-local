import { createServerClient } from "@/lib/supabase/server";

/**
 * Fetch aggregate stats for the overview page.
 */
export async function getDashboardStats(providerId: string) {
  const supabase = createServerClient();

  // Run in parallel
  const [revenueRes, monthBookingsRes, pendingBookingsRes, totalBookingsRes] =
    await Promise.all([
      supabase
        .from("orders")
        .select("amount_cents")
        .eq("provider_id", providerId)
        .eq("status", "SUCCEEDED"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", providerId)
        .gte(
          "created_at",
          new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ).toISOString()
        ),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", providerId)
        .eq("status", "REQUESTED"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("provider_id", providerId),
    ]);

  const totalRevenueCents =
    revenueRes.data?.reduce((sum, o) => sum + (o.amount_cents ?? 0), 0) ?? 0;

  const thisMonth = monthBookingsRes.count ?? 0;
  const pending = pendingBookingsRes.count ?? 0;
  const totalBookings = totalBookingsRes.count ?? 0;

  // Conversion = bookings / (bookings that had a lead attempt)
  // For now, use completed vs total as a simple proxy.
  const conversion = totalBookings > 0
    ? Math.round(((totalBookings - pending) / totalBookings) * 100)
    : 0;

  return {
    totalRevenueCents,
    thisMonth,
    pending,
    conversion,
  };
}

export async function getRecentBookings(providerId: string, limit = 5) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      `
      id,
      status,
      scheduled_start,
      customer_snapshot,
      total_amount_cents,
      deposit_amount_cents,
      notes,
      created_at,
      service_packages(name)
    `
    )
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getAllBookings(providerId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("bookings")
    .select(
      `
      id,
      status,
      scheduled_start,
      customer_snapshot,
      total_amount_cents,
      deposit_amount_cents,
      notes,
      created_at,
      service_packages(name)
    `
    )
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getAllOrders(providerId: string) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("orders")
    .select(
      `
      id,
      booking_id,
      amount_cents,
      application_fee_cents,
      provider_payout_cents,
      refunded_cents,
      status,
      stripe_payment_intent_id,
      created_at,
      bookings(customer_snapshot)
    `
    )
    .eq("provider_id", providerId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function getReviewsData(providerId: string) {
  const supabase = createServerClient();

  const [reviewsRes, requestsRes] = await Promise.all([
    supabase
      .from("reviews")
      .select("id, customer_name, rating, body, source, created_at")
      .eq("provider_id", providerId)
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("review_requests")
      .select("id, booking_id, customer_email, status, sent_at")
      .eq("provider_id", providerId)
      .order("sent_at", { ascending: false, nullsFirst: false }),
  ]);

  return {
    reviews: reviewsRes.data ?? [],
    requests: requestsRes.data ?? [],
  };
}
