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

// POST: Begin (or resume) Stripe Connect onboarding for a sales rep
export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const db = getSupabaseAdmin();

  const { data: rep } = await db
    .from("sales_reps")
    .select("id, display_name, email, stripe_account_id, stripe_onboarding_complete")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!rep) {
    return NextResponse.json({ error: "Not a sales rep" }, { status: 403 });
  }

  try {
    let accountId = rep.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: rep.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          rep_id: rep.id,
          platform: "flashlocal",
          role: "sales_rep",
        },
      });

      accountId = account.id;
      await db
        .from("sales_reps")
        .update({ stripe_account_id: accountId })
        .eq("id", rep.id);
    }

    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/rep/earnings?refresh=true`,
      return_url: `${origin}/rep/earnings?connect=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url, account_id: accountId });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Rep Connect onboarding failed: ${err.message}` },
      { status: 500 }
    );
  }
}

// GET: Check onboarding status and sync stripe_onboarding_complete flag
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const db = getSupabaseAdmin();

  const { data: rep } = await db
    .from("sales_reps")
    .select("id, stripe_account_id, stripe_onboarding_complete")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!rep?.stripe_account_id) {
    return NextResponse.json({ connected: false });
  }

  try {
    const account = await stripe.accounts.retrieve(rep.stripe_account_id);
    const complete =
      !!account.details_submitted && !!account.charges_enabled;

    if (complete !== rep.stripe_onboarding_complete) {
      await db
        .from("sales_reps")
        .update({ stripe_onboarding_complete: complete })
        .eq("id", rep.id);
    }

    return NextResponse.json({
      connected: true,
      complete,
      details_submitted: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Status check failed: ${err.message}` },
      { status: 500 }
    );
  }
}
