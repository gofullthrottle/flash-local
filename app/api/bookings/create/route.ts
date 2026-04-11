import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendBookingConfirmation,
  sendNewBookingAlert,
} from "@/lib/email/send";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

interface BookingRequest {
  provider_id: string;
  package_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address: string;
  scheduled_date: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  let body: BookingRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    provider_id,
    package_id,
    customer_name,
    customer_email,
    customer_phone,
    address,
    scheduled_date,
    notes,
  } = body;

  if (!provider_id || !package_id || !customer_name || !customer_email || !address) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // Fetch the package to compute pricing
  const { data: pkg, error: pkgErr } = await db
    .from("service_packages")
    .select("id, name, price_cents, currency")
    .eq("id", package_id)
    .eq("provider_id", provider_id)
    .eq("is_active", true)
    .single();

  if (pkgErr || !pkg) {
    return NextResponse.json(
      { error: "Package not found" },
      { status: 404 }
    );
  }

  // Default 30% deposit
  const depositPercent = 30;
  const depositCents = Math.round(pkg.price_cents * (depositPercent / 100));

  // Create lead
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .insert({
      provider_id,
      source: "microsite",
      customer_name,
      customer_email,
      customer_phone,
      address: { formatted: address },
    })
    .select("id")
    .single();

  if (leadErr) {
    return NextResponse.json(
      { error: `Lead creation failed: ${leadErr.message}` },
      { status: 500 }
    );
  }

  // Create booking
  const { data: booking, error: bookErr } = await db
    .from("bookings")
    .insert({
      provider_id,
      lead_id: lead.id,
      package_id,
      status: "REQUESTED",
      scheduled_start: scheduled_date ? new Date(scheduled_date).toISOString() : null,
      customer_snapshot: {
        name: customer_name,
        email: customer_email,
        phone: customer_phone,
        address,
      },
      notes: notes ?? null,
      total_amount_cents: pkg.price_cents,
      deposit_amount_cents: depositCents,
      currency: pkg.currency ?? "USD",
    })
    .select("id")
    .single();

  if (bookErr) {
    return NextResponse.json(
      { error: `Booking creation failed: ${bookErr.message}` },
      { status: 500 }
    );
  }

  // Fire-and-forget emails — errors don't block the booking flow
  try {
    const { data: providerInfo } = await db
      .from("providers")
      .select("display_name, slug, provider_contacts(email)")
      .eq("id", provider_id)
      .single();

    const providerContactEmail = Array.isArray(providerInfo?.provider_contacts)
      ? (providerInfo?.provider_contacts as any)[0]?.email
      : (providerInfo?.provider_contacts as any)?.email;
    const providerName = providerInfo?.display_name ?? "your provider";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://flashlocal.com";

    // Customer confirmation
    await sendBookingConfirmation({
      to: customer_email,
      customerName: customer_name,
      providerName,
      packageName: pkg.name,
      scheduledDate: scheduled_date || null,
      address,
      depositAmountCents: depositCents,
      totalAmountCents: pkg.price_cents,
    });

    // Provider alert
    if (providerContactEmail) {
      await sendNewBookingAlert({
        to: providerContactEmail,
        providerName,
        customerName: customer_name,
        packageName: pkg.name,
        scheduledDate: scheduled_date || null,
        totalAmountCents: pkg.price_cents,
        dashboardUrl: `${appUrl}/dashboard/bookings`,
      });
    }
  } catch (e) {
    console.error("[bookings/create] email failure", e);
  }

  return NextResponse.json({
    booking_id: booking.id,
    lead_id: lead.id,
    package_name: pkg.name,
    total_cents: pkg.price_cents,
    deposit_cents: depositCents,
  });
}
