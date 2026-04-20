import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // needs raw body + crypto

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

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function alreadyProcessed(
  db: SupabaseClient,
  eventId: string
): Promise<boolean> {
  const { error } = await db
    .from("stripe_events")
    .insert({ event_id: eventId, event_type: "UNKNOWN", payload: {} });
  if (error && (error as any).code === "23505") return true;
  if (error) throw error;
  return false;
}

async function recordEvent(db: SupabaseClient, event: Stripe.Event) {
  const { error } = await db
    .from("stripe_events")
    .update({
      event_type: event.type,
      payload: event as any,
    })
    .eq("event_id", event.id);
  if (error) throw error;
}

type Meta = {
  provider_id?: string;
  booking_id?: string;
  plan_type?: "UPFRONT" | "REV_SHARE";
  order_kind?: "SETUP_FEE" | "CUSTOMER_BOOKING";
  environment?: "prod" | "test";
};

function readMeta(obj: any): Meta {
  const m = (obj?.metadata ?? {}) as Record<string, string>;
  return {
    provider_id: m.provider_id,
    booking_id: m.booking_id,
    plan_type: m.plan_type as any,
    order_kind: m.order_kind as any,
    environment: m.environment as any,
  };
}

async function upsertOrder(
  db: SupabaseClient,
  params: {
    provider_id: string;
    booking_id?: string;
    stripe_payment_intent_id?: string | null;
    stripe_checkout_session_id?: string | null;
    status: string;
    amount_cents?: number;
    currency?: string;
    application_fee_cents?: number;
    provider_payout_cents?: number;
    refunded_cents?: number;
    dispute_status?: string | null;
    metadata?: Meta;
    raw_last_event: any;
  }
) {
  const payload: any = {
    provider_id: params.provider_id,
    booking_id: params.booking_id ?? null,
    stripe_payment_intent_id: params.stripe_payment_intent_id ?? null,
    stripe_checkout_session_id: params.stripe_checkout_session_id ?? null,
    status: params.status,
    amount_cents: params.amount_cents ?? 0,
    currency: params.currency ?? "USD",
    application_fee_cents: params.application_fee_cents ?? 0,
    provider_payout_cents: params.provider_payout_cents ?? 0,
    refunded_cents: params.refunded_cents ?? 0,
    dispute_status: params.dispute_status ?? null,
    metadata: params.metadata ?? {},
    raw_last_event: params.raw_last_event ?? {},
  };

  if (payload.stripe_payment_intent_id) {
    const { error } = await db.from("orders").upsert(payload, {
      onConflict: "stripe_payment_intent_id",
    });
    if (!error) return;
  }

  if (payload.stripe_checkout_session_id) {
    const { error } = await db.from("orders").upsert(payload, {
      onConflict: "stripe_checkout_session_id",
    });
    if (error) throw error;
    return;
  }

  const { error } = await db.from("orders").insert(payload);
  if (error) throw error;
}

async function setBookingStatus(
  db: SupabaseClient,
  bookingId: string,
  status: string
) {
  const { error } = await db
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) throw error;
}

async function setProviderActive(db: SupabaseClient, providerId: string) {
  const { error } = await db
    .from("providers")
    .update({ status: "ACTIVE" })
    .eq("id", providerId);
  if (error) throw error;
}

async function setSiteLive(db: SupabaseClient, providerId: string) {
  const { error } = await db
    .from("sites")
    .update({ is_live: true, published_at: new Date().toISOString() })
    .eq("provider_id", providerId);
  if (error) throw error;
}

async function mintBookingCommission(
  db: SupabaseClient,
  providerId: string,
  paymentIntentId: string,
  amountCents: number
) {
  // Check if this provider was referred by a sales rep
  const { data: provider } = await db
    .from("providers")
    .select("referred_by_rep_id, tier")
    .eq("id", providerId)
    .single();

  if (!provider?.referred_by_rep_id) return;

  // Look up commission rate from plan tier definitions
  const { data: tierDef } = await db
    .from("plan_tier_definitions")
    .select("commission_pct")
    .eq("tier", provider.tier ?? "STARTER")
    .single();

  const commissionPct = tierDef?.commission_pct ?? 15;

  // Calculate platform's share first (application_fee), then rep's cut of that
  // Platform takes 15% of total. Rep gets commission_pct of the platform's 15%.
  const platformFeeCents = Math.round(amountCents * 0.15);
  const repCommissionCents = Math.round(platformFeeCents * (commissionPct / 100));

  if (repCommissionCents <= 0) return;

  const idempotencyKey = `booking-revenue:${paymentIntentId}`;

  // Insert commission (idempotent via unique constraint on idempotency_key)
  await db.from("rep_commissions").upsert(
    {
      rep_id: provider.referred_by_rep_id,
      provider_id: providerId,
      trigger_event: "BOOKING_REVENUE",
      gross_amount_cents: amountCents,
      commission_pct: commissionPct,
      commission_cents: repCommissionCents,
      status: "PENDING",
      idempotency_key: idempotencyKey,
    },
    { onConflict: "idempotency_key" }
  );

  // Update rep lifetime earnings
  await db.rpc("increment_rep_earnings", {
    rep_id_param: provider.referred_by_rep_id,
    amount_param: repCommissionCents,
  }).then(() => {}).catch(() => {
    // Non-fatal — earnings will be recalculated from ledger if needed
  });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );

  const stripe = getStripe();
  const db = getSupabaseAdmin();
  const webhookSecret = mustGetEnv("STRIPE_WEBHOOK_SECRET");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${err.message}` },
      { status: 400 }
    );
  }

  // Idempotency fence
  try {
    const dup = await alreadyProcessed(db, event.id);
    if (dup) return NextResponse.json({ received: true, deduped: true });
    await recordEvent(db, event);
  } catch (e: any) {
    return NextResponse.json(
      { error: `Event store failed: ${e.message}` },
      { status: 500 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = readMeta(session);
        if (!meta.provider_id) break;

        await upsertOrder(db, {
          provider_id: meta.provider_id,
          booking_id: meta.booking_id,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : null,
          status: "PROCESSING",
          amount_cents:
            typeof session.amount_total === "number"
              ? session.amount_total
              : 0,
          currency: (session.currency ?? "usd").toUpperCase(),
          metadata: meta,
          raw_last_event: event,
        });

        if (meta.order_kind === "SETUP_FEE") {
          await setProviderActive(db, meta.provider_id);
          await setSiteLive(db, meta.provider_id);
        }
        break;
      }

      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = readMeta(pi);
        if (!meta.provider_id) break;

        const amount =
          typeof pi.amount_received === "number"
            ? pi.amount_received
            : (pi.amount ?? 0);
        const currency = (pi.currency ?? "usd").toUpperCase();

        await upsertOrder(db, {
          provider_id: meta.provider_id,
          booking_id: meta.booking_id,
          stripe_payment_intent_id: pi.id,
          status: "SUCCEEDED",
          amount_cents: amount,
          currency,
          metadata: meta,
          raw_last_event: event,
        });

        if (meta.booking_id) {
          await setBookingStatus(db, meta.booking_id, "CONFIRMED");
        }

        // Mint sales rep commission if this provider was referred
        await mintBookingCommission(db, meta.provider_id, pi.id, amount);
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = readMeta(pi);
        if (!meta.provider_id) break;

        await upsertOrder(db, {
          provider_id: meta.provider_id,
          booking_id: meta.booking_id,
          stripe_payment_intent_id: pi.id,
          status: "REQUIRES_PAYMENT_METHOD",
          amount_cents: pi.amount ?? 0,
          currency: (pi.currency ?? "usd").toUpperCase(),
          metadata: meta,
          raw_last_event: event,
        });
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const meta = readMeta(charge);
        if (!meta.provider_id) break;

        const refunded = charge.amount_refunded ?? 0;
        const amount = charge.amount ?? 0;

        await upsertOrder(db, {
          provider_id: meta.provider_id,
          booking_id: meta.booking_id,
          stripe_payment_intent_id:
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : null,
          status: refunded >= amount ? "REFUNDED" : "SUCCEEDED",
          amount_cents: amount,
          refunded_cents: refunded,
          currency: (charge.currency ?? "usd").toUpperCase(),
          metadata: meta,
          raw_last_event: event,
        });

        if (meta.booking_id && refunded >= amount) {
          await setBookingStatus(db, meta.booking_id, "REFUNDED");
        }
        break;
      }

      case "charge.dispute.created":
      case "charge.dispute.closed": {
        const dispute = event.data.object as Stripe.Dispute;
        const chargeId = dispute.charge as string;
        const charge = await stripe.charges.retrieve(chargeId);
        const meta = readMeta(charge);
        if (!meta.provider_id) break;

        await upsertOrder(db, {
          provider_id: meta.provider_id,
          booking_id: meta.booking_id,
          stripe_payment_intent_id:
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : null,
          status: "DISPUTED",
          amount_cents: charge.amount ?? 0,
          currency: (charge.currency ?? "usd").toUpperCase(),
          dispute_status: dispute.status ?? null,
          metadata: meta,
          raw_last_event: event,
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Handler failed: ${err.message}` },
      { status: 500 }
    );
  }
}
