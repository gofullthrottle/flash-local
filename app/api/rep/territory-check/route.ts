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

// GET: Check whether the given postal code belongs to the current rep
// Query params: ?postal_code=90210
// Returns: { in_territory: boolean, owned_by_rep_id?: string, owned_by_rep_name?: string }
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
  const postalCode = url.searchParams.get("postal_code");
  if (!postalCode) {
    return NextResponse.json(
      { error: "postal_code required" },
      { status: 400 }
    );
  }

  const { data: territory } = await db
    .from("rep_territories")
    .select("rep_id, sales_reps(display_name)")
    .eq("postal_code", postalCode)
    .maybeSingle();

  if (!territory) {
    return NextResponse.json({ in_territory: false, assigned: false });
  }

  const ownedByThisRep = territory.rep_id === rep.id;
  const ownerName = Array.isArray(territory.sales_reps)
    ? (territory.sales_reps[0] as { display_name: string } | undefined)?.display_name
    : (territory.sales_reps as { display_name: string } | null)?.display_name;

  return NextResponse.json({
    in_territory: ownedByThisRep,
    assigned: true,
    owned_by_rep_id: territory.rep_id,
    owned_by_rep_name: ownedByThisRep ? null : ownerName,
  });
}
