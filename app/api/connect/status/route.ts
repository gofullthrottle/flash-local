import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("provider_id");
  if (!providerId) {
    return NextResponse.json({ error: "Missing provider_id" }, { status: 400 });
  }

  const stripe = getStripe();
  const db = getSupabaseAdmin();

  const { data: provider, error: provErr } = await db
    .from("providers")
    .select("id, stripe_account_id, stripe_onboarding_complete")
    .eq("id", providerId)
    .single();

  if (provErr || !provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  if (!provider.stripe_account_id) {
    return NextResponse.json({
      connected: false,
      onboarding_complete: false,
      payouts_enabled: false,
      charges_enabled: false,
    });
  }

  try {
    const account = await stripe.accounts.retrieve(provider.stripe_account_id);

    const onboardingComplete = account.details_submitted ?? false;

    // Update provider record if onboarding just completed
    if (onboardingComplete && !provider.stripe_onboarding_complete) {
      await db
        .from("providers")
        .update({ stripe_onboarding_complete: true })
        .eq("id", providerId);
    }

    return NextResponse.json({
      connected: true,
      onboarding_complete: onboardingComplete,
      payouts_enabled: account.payouts_enabled ?? false,
      charges_enabled: account.charges_enabled ?? false,
      account_id: provider.stripe_account_id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Failed to retrieve account status: ${err.message}` },
      { status: 500 }
    );
  }
}
