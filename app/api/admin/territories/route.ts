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

async function requireAdmin(userId: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

// GET: List all territories (admin view)
export async function GET() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  const { data: territories, error } = await db
    .from("rep_territories")
    .select("*, sales_reps(display_name, email)")
    .order("postal_code");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ territories });
}

// POST: Assign postal code(s) to a rep
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: {
    rep_id: string;
    postal_codes: string[];
    city?: string;
    region?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.rep_id || !body.postal_codes?.length) {
    return NextResponse.json(
      { error: "rep_id and postal_codes[] required" },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  const rows = body.postal_codes.map((pc) => ({
    rep_id: body.rep_id,
    postal_code: pc.trim(),
    city: body.city ?? null,
    region: body.region ?? null,
  }));

  // Upsert — if the postal code is already owned by another rep, swap it
  const { data, error } = await db
    .from("rep_territories")
    .upsert(rows, { onConflict: "postal_code,country" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assigned: data?.length ?? 0, territories: data });
}

// DELETE: Remove a territory assignment
export async function DELETE(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { error } = await db.from("rep_territories").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
