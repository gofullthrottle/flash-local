import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// POST /api/reviews/request — create a review request for a completed booking
export async function POST(req: NextRequest) {
  let body: {
    provider_id: string;
    booking_id: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { provider_id, booking_id } = body;

  if (!provider_id || !booking_id) {
    return NextResponse.json(
      { error: "Missing required fields: provider_id, booking_id" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // Fetch the booking to get customer info
  const { data: booking, error: bookErr } = await db
    .from("bookings")
    .select("id, status, customer_snapshot, provider_id")
    .eq("id", booking_id)
    .eq("provider_id", provider_id)
    .single();

  if (bookErr || !booking) {
    return NextResponse.json(
      { error: "Booking not found" },
      { status: 404 }
    );
  }

  if (booking.status !== "COMPLETED") {
    return NextResponse.json(
      { error: "Can only request reviews for completed bookings" },
      { status: 400 }
    );
  }

  const snapshot = booking.customer_snapshot as {
    email?: string;
    phone?: string;
  } | null;

  if (!snapshot?.email) {
    return NextResponse.json(
      { error: "No customer email available for this booking" },
      { status: 400 }
    );
  }

  // Check for existing pending request
  const { data: existing } = await db
    .from("review_requests")
    .select("id")
    .eq("booking_id", booking_id)
    .in("status", ["PENDING", "SENT"])
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "A review request has already been sent for this booking" },
      { status: 409 }
    );
  }

  // Create the review request
  const { data: reviewReq, error: reqErr } = await db
    .from("review_requests")
    .insert({
      provider_id,
      booking_id,
      customer_email: snapshot.email,
      customer_phone: snapshot.phone ?? null,
      status: "PENDING",
    })
    .select("id, token")
    .single();

  if (reqErr) {
    return NextResponse.json(
      { error: `Failed to create review request: ${reqErr.message}` },
      { status: 500 }
    );
  }

  // In production: trigger email/SMS sending here via a queue or direct call
  // For now, mark as SENT and return the token (for demo/testing)
  await db
    .from("review_requests")
    .update({ status: "SENT", sent_at: new Date().toISOString() })
    .eq("id", reviewReq.id);

  return NextResponse.json({
    request_id: reviewReq.id,
    token: reviewReq.token,
    review_url: `/review/${reviewReq.token}`,
  });
}
