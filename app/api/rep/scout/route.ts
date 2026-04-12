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

// POST: Start a new scout session
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getSupabaseAdmin();

  // Get the rep record
  const { data: rep } = await db
    .from("sales_reps")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!rep) {
    return NextResponse.json({ error: "Not a sales rep" }, { status: 403 });
  }

  // End any active sessions first
  await db
    .from("scout_sessions")
    .update({ status: "COMPLETED", ended_at: new Date().toISOString() })
    .eq("rep_id", rep.id)
    .eq("status", "ACTIVE");

  // Create new session
  const { data: session, error } = await db
    .from("scout_sessions")
    .insert({ rep_id: rep.id, status: "ACTIVE" })
    .select("id, started_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session });
}

// PATCH: End or pause a scout session
export async function PATCH(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { session_id, status } = body as { session_id: string; status: string };

  if (!session_id || !["PAUSED", "COMPLETED"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  const update: Record<string, unknown> = { status };
  if (status === "COMPLETED") {
    update.ended_at = new Date().toISOString();

    // Compute summary stats
    const { count: prospectCount } = await db
      .from("scout_breadcrumbs")
      .select("id", { count: "exact" })
      .eq("session_id", session_id)
      .eq("event_type", "PROSPECT_CAPTURED");

    update.total_prospects = prospectCount ?? 0;
  }

  const { data: session, error } = await db
    .from("scout_sessions")
    .update(update)
    .eq("id", session_id)
    .select("id, status, ended_at, total_prospects")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session });
}
