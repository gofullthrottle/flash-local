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

// GET /api/reviews?provider_id=xxx — fetch published reviews for a provider
export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("provider_id");
  if (!providerId) {
    return NextResponse.json({ error: "Missing provider_id" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const { data: reviews, error } = await db
    .from("reviews")
    .select("id, customer_name, rating, body, source, created_at")
    .eq("provider_id", providerId)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: `Failed to fetch reviews: ${error.message}` },
      { status: 500 }
    );
  }

  // Compute aggregate stats
  const count = reviews.length;
  const avgRating = count > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
    : 0;

  return NextResponse.json({
    reviews,
    stats: {
      count,
      average_rating: Math.round(avgRating * 10) / 10,
    },
  });
}

// POST /api/reviews — submit a review (from token-based link or direct)
export async function POST(req: NextRequest) {
  let body: {
    provider_id: string;
    booking_id?: string;
    token?: string;
    customer_name: string;
    customer_email?: string;
    rating: number;
    body?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { provider_id, booking_id, token, customer_name, rating } = body;

  if (!provider_id || !customer_name || !rating) {
    return NextResponse.json(
      { error: "Missing required fields: provider_id, customer_name, rating" },
      { status: 400 }
    );
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be between 1 and 5" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // If a token was provided, validate and complete the review request
  if (token) {
    const { data: reviewReq, error: reqErr } = await db
      .from("review_requests")
      .select("id, provider_id, booking_id, status")
      .eq("token", token)
      .eq("status", "PENDING")
      .single();

    if (reqErr || !reviewReq) {
      return NextResponse.json(
        { error: "Invalid or expired review link" },
        { status: 400 }
      );
    }

    // Mark the review request as completed
    await db
      .from("review_requests")
      .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
      .eq("id", reviewReq.id);
  }

  // Insert the review
  const { data: review, error: revErr } = await db
    .from("reviews")
    .insert({
      provider_id,
      booking_id: booking_id ?? null,
      customer_name,
      customer_email: body.customer_email ?? null,
      rating,
      body: body.body ?? null,
      source: token ? "review_request" : "platform",
    })
    .select("id")
    .single();

  if (revErr) {
    return NextResponse.json(
      { error: `Failed to create review: ${revErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ review_id: review.id });
}
