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

export async function POST(req: NextRequest) {
  let body: { provider_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { provider_id } = body;
  if (!provider_id) {
    return NextResponse.json({ error: "Missing provider_id" }, { status: 400 });
  }

  const stripe = getStripe();
  const db = getSupabaseAdmin();

  // Fetch provider
  const { data: provider, error: provErr } = await db
    .from("providers")
    .select("id, display_name, plan, stripe_account_id, stripe_onboarding_complete")
    .eq("id", provider_id)
    .single();

  if (provErr || !provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  if (provider.plan !== "REV_SHARE") {
    return NextResponse.json(
      { error: "Connect onboarding is only for REV_SHARE providers" },
      { status: 400 }
    );
  }

  try {
    let accountId = provider.stripe_account_id;

    // Create a Connect Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: "individual",
        metadata: {
          provider_id,
          platform: "flashlocal",
        },
      });

      accountId = account.id;

      // Save account ID to provider
      await db
        .from("providers")
        .update({ stripe_account_id: accountId })
        .eq("id", provider_id);
    }

    // Create an Account Link for onboarding
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard/connect?refresh=true`,
      return_url: `${origin}/dashboard/connect?success=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url, account_id: accountId });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Connect onboarding failed: ${err.message}` },
      { status: 500 }
    );
  }
}
