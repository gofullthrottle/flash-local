import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";
import { searchPlaces } from "@/lib/lead-sourcing/places-client";
import { scoreGooglePlaceLead, NICHE_OPPORTUNITIES } from "@/lib/lead-sourcing/strategies";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type ScanRequest = {
  query: string;
  lat: number;
  lng: number;
  radius_meters?: number;
  vertical_id?: string;
};

function hashQuery(q: string, lat: number, lng: number, radius: number): string {
  return createHash("sha256")
    .update(`${q}|${lat.toFixed(3)}|${lng.toFixed(3)}|${radius}`)
    .digest("hex");
}

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  // Verify sales rep
  const { data: rep } = await db
    .from("sales_reps")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!rep) {
    return NextResponse.json({ error: "Not a sales rep" }, { status: 403 });
  }

  let body: ScanRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.query?.trim() || body.lat == null || body.lng == null) {
    return NextResponse.json(
      { error: "query, lat, lng required" },
      { status: 400 }
    );
  }

  const radius = body.radius_meters ?? 5000;
  const queryHash = hashQuery(body.query.trim(), body.lat, body.lng, radius);

  // Check cache first
  const { data: cached } = await db
    .from("places_scan_cache")
    .select("results_json, expires_at")
    .eq("query_hash", queryHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) {
    return NextResponse.json({
      cached: true,
      results: cached.results_json,
      expires_at: cached.expires_at,
    });
  }

  // Cache miss — hit Places API
  const { results, configured } = await searchPlaces({
    query: body.query.trim(),
    lat: body.lat,
    lng: body.lng,
    radiusMeters: radius,
  });

  if (!configured) {
    return NextResponse.json(
      {
        error: "GOOGLE_PLACES_API_KEY not set on server",
        results: [],
        mock: true,
      },
      { status: 200 }
    );
  }

  // Score each result and attach vertical pitch
  const nicheOpp = body.vertical_id
    ? NICHE_OPPORTUNITIES.find((n) => n.vertical_id === body.vertical_id)
    : undefined;

  const scored = results.map((r) => {
    const opportunityScore = scoreGooglePlaceLead({
      rating: r.rating,
      review_count: r.user_rating_count,
      has_website: !!r.website_uri,
      has_photos: r.photo_count > 0,
      photo_count: r.photo_count,
    });
    return {
      ...r,
      opportunity_score: opportunityScore,
      tier:
        opportunityScore >= 70
          ? "hot"
          : opportunityScore >= 45
            ? "warm"
            : "cold",
      pitch_angle: nicheOpp?.pitch_angle ?? null,
    };
  });

  // Sort: hottest first
  scored.sort((a, b) => b.opportunity_score - a.opportunity_score);

  // Cache
  await db
    .from("places_scan_cache")
    .upsert(
      {
        query_hash: queryHash,
        query: body.query.trim(),
        center_lat: body.lat,
        center_lng: body.lng,
        radius_meters: radius,
        results_json: scored,
        results_count: scored.length,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: "query_hash" }
    );

  return NextResponse.json({
    cached: false,
    results: scored,
    results_count: scored.length,
  });
}
