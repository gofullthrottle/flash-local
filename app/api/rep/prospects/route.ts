import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET: List prospects for current rep
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: rep } = await db
    .from("sales_reps")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!rep) {
    return NextResponse.json({ error: "Not a sales rep" }, { status: 403 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

  let query = db
    .from("prospects")
    .select("*")
    .eq("rep_id", rep.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: prospects, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospects });
}

type ProspectPayload = {
  business_name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  address?: Record<string, unknown>;
  vertical_id?: string;
  niche_tags?: string[];
  estimated_value_cents?: number;
  notes?: string;
  follow_up_date?: string;
  captured_lat?: number;
  captured_lng?: number;
  scout_session_id?: string;
};

// POST: Create a new prospect
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: rep } = await db
    .from("sales_reps")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!rep) {
    return NextResponse.json({ error: "Not a sales rep" }, { status: 403 });
  }

  let body: ProspectPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.business_name?.trim()) {
    return NextResponse.json(
      { error: "business_name is required" },
      { status: 400 }
    );
  }

  const { data: prospect, error } = await db
    .from("prospects")
    .insert({
      rep_id: rep.id,
      business_name: body.business_name.trim(),
      contact_name: body.contact_name?.trim() || null,
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      address: body.address ?? {},
      vertical_id: body.vertical_id || null,
      niche_tags: body.niche_tags ?? [],
      estimated_value_cents: body.estimated_value_cents ?? null,
      notes: body.notes?.trim() || null,
      follow_up_date: body.follow_up_date || null,
      captured_lat: body.captured_lat ?? null,
      captured_lng: body.captured_lng ?? null,
      status: "NEW",
    })
    .select("id, business_name, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If there's an active scout session, record a breadcrumb
  if (body.scout_session_id && body.captured_lat != null && body.captured_lng != null) {
    await db.from("scout_breadcrumbs").insert({
      session_id: body.scout_session_id,
      lat: body.captured_lat,
      lng: body.captured_lng,
      event_type: "PROSPECT_CAPTURED",
      metadata: { prospect_id: prospect.id, business_name: body.business_name },
    });
  }

  return NextResponse.json({ prospect }, { status: 201 });
}

// PATCH: Update a prospect (status, follow-up, notes, etc.)
export async function PATCH(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  const { data: rep } = await db
    .from("sales_reps")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!rep) {
    return NextResponse.json({ error: "Not a sales rep" }, { status: 403 });
  }

  const body = await req.json();
  const { prospect_id, ...updates } = body;

  if (!prospect_id) {
    return NextResponse.json({ error: "prospect_id required" }, { status: 400 });
  }

  // Only allow updating specific fields
  const allowed: Record<string, unknown> = {};
  if (updates.status) allowed.status = updates.status;
  if (updates.follow_up_date !== undefined) allowed.follow_up_date = updates.follow_up_date;
  if (updates.notes !== undefined) allowed.notes = updates.notes;
  if (updates.contact_name !== undefined) allowed.contact_name = updates.contact_name;
  if (updates.phone !== undefined) allowed.phone = updates.phone;
  if (updates.email !== undefined) allowed.email = updates.email;
  if (updates.estimated_value_cents !== undefined) allowed.estimated_value_cents = updates.estimated_value_cents;
  if (updates.niche_tags !== undefined) allowed.niche_tags = updates.niche_tags;

  // Track conversion
  if (updates.status === "CONVERTED" && updates.became_provider_id) {
    allowed.became_provider_id = updates.became_provider_id;
    allowed.converted_at = new Date().toISOString();
  }

  const { data: prospect, error } = await db
    .from("prospects")
    .update(allowed)
    .eq("id", prospect_id)
    .eq("rep_id", rep.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ prospect });
}
