import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type CheckoutRequest = {
  provider_id: string;
  order_kind: "SETUP_FEE" | "CUSTOMER_BOOKING";
  // For CUSTOMER_BOOKING
  booking_id?: string;
  package_id?: string;
  // For SETUP_FEE
  setup_tier?: "basic" | "standard" | "premium";
  // Shared
  success_url: string;
  cancel_url: string;
};

const SETUP_FEE_PRICES: Record<string, number> = {
  basic: 9900, // $99
  standard: 19900, // $199
  premium: 39900, // $399
};

export async function POST(req: NextRequest) {
  let body: CheckoutRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { provider_id, order_kind, success_url, cancel_url } = body;

  if (!provider_id || !order_kind || !success_url || !cancel_url) {
    return NextResponse.json(
      { error: "Missing required fields: provider_id, order_kind, success_url, cancel_url" },
      { status: 400 }
    );
  }

  // Fetch provider to validate existence and get plan info
  const { data: provider, error: provErr } = await supabaseAdmin
    .from("providers")
    .select("id, plan, display_name, slug, status")
    .eq("id", provider_id)
    .single();

  if (provErr || !provider) {
    return NextResponse.json(
      { error: "Provider not found" },
      { status: 404 }
    );
  }

  // Build metadata — this is the single source of truth for all Stripe objects
  const metadata: Record<string, string> = {
    provider_id,
    plan_type: provider.plan,
    order_kind,
    environment: process.env.NODE_ENV === "production" ? "prod" : "test",
  };

  try {
    if (order_kind === "SETUP_FEE") {
      const tier = body.setup_tier ?? "basic";
      const priceCents = SETUP_FEE_PRICES[tier];
      if (!priceCents) {
        return NextResponse.json(
          { error: `Invalid setup_tier: ${tier}` },
          { status: 400 }
        );
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        metadata,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `FlashLocal Launch – ${tier.charAt(0).toUpperCase() + tier.slice(1)}`,
                description: `Setup fee for ${provider.display_name}`,
              },
              unit_amount: priceCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${success_url}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url,
        payment_intent_data: {
          metadata, // metadata on PI too, so webhooks can read it from either object
        },
      });

      return NextResponse.json({ url: session.url, session_id: session.id });
    }

    if (order_kind === "CUSTOMER_BOOKING") {
      const { booking_id, package_id } = body;

      if (!booking_id || !package_id) {
        return NextResponse.json(
          { error: "CUSTOMER_BOOKING requires booking_id and package_id" },
          { status: 400 }
        );
      }

      metadata.booking_id = booking_id;

      // Fetch the package for price info
      const { data: pkg, error: pkgErr } = await supabaseAdmin
        .from("service_packages")
        .select("name, price_cents, currency, description")
        .eq("id", package_id)
        .eq("provider_id", provider_id)
        .eq("is_active", true)
        .single();

      if (pkgErr || !pkg) {
        return NextResponse.json(
          { error: "Package not found or inactive" },
          { status: 404 }
        );
      }

      // Fetch booking for deposit info
      const { data: booking, error: bookErr } = await supabaseAdmin
        .from("bookings")
        .select("deposit_amount_cents, total_amount_cents, currency")
        .eq("id", booking_id)
        .single();

      if (bookErr || !booking) {
        return NextResponse.json(
          { error: "Booking not found" },
          { status: 404 }
        );
      }

      // Charge the deposit if set, otherwise full amount
      const chargeCents =
        booking.deposit_amount_cents > 0
          ? booking.deposit_amount_cents
          : booking.total_amount_cents;

      // Build Checkout Session — optionally with Connect destination charge
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        metadata,
        line_items: [
          {
            price_data: {
              currency: (booking.currency ?? "USD").toLowerCase(),
              product_data: {
                name: pkg.name,
                description: pkg.description ?? undefined,
              },
              unit_amount: chargeCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${success_url}?booking_id=${booking_id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${cancel_url}?booking_id=${booking_id}`,
        payment_intent_data: {
          metadata,
        },
      };

      // If rev-share, route payment through Connect
      if (provider.plan === "REV_SHARE") {
        const { data: site } = await supabaseAdmin
          .from("sites")
          .select("id")
          .eq("provider_id", provider_id)
          .single();

        // Look up the provider's connected Stripe account
        // (stored during onboarding — for now we read from provider_contacts or a future stripe_accounts table)
        // Placeholder: you'll wire this up when Connect onboarding is built
        const connectedAccountId = process.env[`STRIPE_CONNECT_${provider_id}`];

        if (connectedAccountId) {
          // 15% platform fee (1500 basis points) — read from provider config in production
          const applicationFeeCents = Math.round(chargeCents * 0.15);

          sessionParams.payment_intent_data = {
            ...sessionParams.payment_intent_data,
            application_fee_amount: applicationFeeCents,
            transfer_data: {
              destination: connectedAccountId,
            },
          };
        }
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Update order row to link checkout session
      await supabaseAdmin.from("orders").upsert(
        {
          provider_id,
          booking_id,
          stripe_checkout_session_id: session.id,
          status: "CREATED",
          amount_cents: chargeCents,
          currency: (booking.currency ?? "USD").toUpperCase(),
          metadata,
        },
        { onConflict: "stripe_checkout_session_id" }
      );

      return NextResponse.json({
        url: session.url,
        session_id: session.id,
        booking_id,
      });
    }

    return NextResponse.json(
      { error: `Unknown order_kind: ${order_kind}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Checkout creation failed: ${err.message}` },
      { status: 500 }
    );
  }
}
