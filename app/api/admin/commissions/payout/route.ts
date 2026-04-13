import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-02-24.acacia",
  });
}

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

// POST: Execute Stripe Transfers for all APPROVED commissions for a given rep
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await requireAdmin(user.id))) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: { rep_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.rep_id) {
    return NextResponse.json({ error: "rep_id required" }, { status: 400 });
  }

  const stripe = getStripe();
  const db = getSupabaseAdmin();

  // Verify rep has Connect onboarded
  const { data: rep } = await db
    .from("sales_reps")
    .select("id, stripe_account_id, stripe_onboarding_complete")
    .eq("id", body.rep_id)
    .single();

  if (!rep?.stripe_account_id || !rep.stripe_onboarding_complete) {
    return NextResponse.json(
      { error: "Rep has not completed Stripe Connect onboarding" },
      { status: 400 }
    );
  }

  // Fetch approved commissions
  const { data: commissions, error: fetchErr } = await db
    .from("rep_commissions")
    .select("id, commission_cents")
    .eq("rep_id", body.rep_id)
    .eq("status", "APPROVED");

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!commissions?.length) {
    return NextResponse.json({ paid_count: 0, total_cents: 0 });
  }

  const totalCents = commissions.reduce(
    (sum: number, c: { commission_cents: number }) => sum + c.commission_cents,
    0
  );

  if (totalCents <= 0) {
    return NextResponse.json({ paid_count: 0, total_cents: 0 });
  }

  try {
    // Create one Stripe Transfer for the batch
    const transfer = await stripe.transfers.create({
      amount: totalCents,
      currency: "usd",
      destination: rep.stripe_account_id,
      description: `FlashLocal commission payout: ${commissions.length} items`,
      metadata: {
        rep_id: body.rep_id,
        commission_count: String(commissions.length),
      },
    });

    // Mark all as PAID
    const ids = commissions.map((c: { id: string }) => c.id);
    await db
      .from("rep_commissions")
      .update({
        status: "PAID",
        paid_at: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
      })
      .in("id", ids);

    return NextResponse.json({
      paid_count: commissions.length,
      total_cents: totalCents,
      transfer_id: transfer.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Transfer failed: ${err.message}` },
      { status: 500 }
    );
  }
}
