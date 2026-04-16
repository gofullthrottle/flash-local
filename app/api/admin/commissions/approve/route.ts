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

// POST: Approve one or more pending commissions
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: { commission_ids?: string[]; all_pending_for_rep?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getSupabaseAdmin();

  let query = db
    .from("rep_commissions")
    .update({ status: "APPROVED" })
    .eq("status", "PENDING");

  if (body.commission_ids?.length) {
    query = query.in("id", body.commission_ids);
  } else if (body.all_pending_for_rep) {
    query = query.eq("rep_id", body.all_pending_for_rep);
  } else {
    return NextResponse.json(
      { error: "Provide commission_ids[] or all_pending_for_rep" },
      { status: 400 }
    );
  }

  const { data, error } = await query.select("id, commission_cents, rep_id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    approved_count: data?.length ?? 0,
    total_cents:
      data?.reduce((sum: number, c: { commission_cents: number }) => sum + c.commission_cents, 0) ?? 0,
  });
}
