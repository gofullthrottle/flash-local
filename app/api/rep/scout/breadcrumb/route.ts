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

type BreadcrumbPayload = {
  session_id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  event_type?: string;
  metadata?: Record<string, unknown>;
};

// POST: Record a breadcrumb (position, prospect capture, etc.)
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: BreadcrumbPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { session_id, lat, lng, accuracy, event_type, metadata } = body;

  if (!session_id || lat == null || lng == null) {
    return NextResponse.json(
      { error: "session_id, lat, lng required" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  // Verify the session belongs to this user's rep account
  const { data: session } = await db
    .from("scout_sessions")
    .select("id, rep_id")
    .eq("id", session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { data: rep } = await db
    .from("sales_reps")
    .select("id")
    .eq("user_id", user.id)
    .eq("id", session.rep_id)
    .single();

  if (!rep) {
    return NextResponse.json({ error: "Not your session" }, { status: 403 });
  }

  const { data: breadcrumb, error } = await db
    .from("scout_breadcrumbs")
    .insert({
      session_id,
      lat,
      lng,
      accuracy: accuracy ?? null,
      event_type: event_type ?? "POSITION",
      metadata: metadata ?? {},
    })
    .select("id, recorded_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ breadcrumb });
}
