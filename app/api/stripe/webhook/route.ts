import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // needs raw body + crypto

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  { auth: { persistSession: false } }
);

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function alreadyProcessed(eventId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("stripe_events")
    .insert({ event_id: eventId, event_type: "UNKNOWN", payload: {} });
  // unique violation => already processed
  if (error && (error as any).code === "23505") return true;
  if (error) throw error;
  return false;
}

async function recordEvent(event: Stripe.Event) {
  const { error } = await supabaseAdmin
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

async function upsertOrder(params: {
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
}) {
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

  // Prefer upsert by payment_intent_id if present, else by checkout_session_id.
  if (payload.stripe_payment_intent_id) {
    const { error } = await supabaseAdmin.from("orders").upsert(payload, {
      onConflict: "stripe_payment_intent_id",
    });
    if (!error) return;
  }

  if (payload.stripe_checkout_session_id) {
    const { error } = await supabaseAdmin.from("orders").upsert(payload, {
      onConflict: "stripe_checkout_session_id",
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin.from("orders").insert(payload);
  if (error) throw error;
}

async function setBookingStatus(bookingId: string, status: string) {
  const { error } = await supabaseAdmin
    .from("bookings")
    .update({ status })
    .eq("id", bookingId);
  if (error) throw error;
}

async function setProviderActive(providerId: string) {
  const { error } = await supabaseAdmin
    .from("providers")
    .update({ status: "ACTIVE" })
    .eq("id", providerId);
  if (error) throw error;
}

async function setSiteLive(providerId: string) {
  const { error } = await supabaseAdmin
    .from("sites")
    .update({ is_live: true, published_at: new Date().toISOString() })
    .eq("provider_id", providerId);
  if (error) throw error;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig)
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 }
    );

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
    const dup = await alreadyProcessed(event.id);
    if (dup) return NextResponse.json({ received: true, deduped: true });
    await recordEvent(event);
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

        await upsertOrder({
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
          await setProviderActive(meta.provider_id);
          await setSiteLive(meta.provider_id);
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

        await upsertOrder({
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
          await setBookingStatus(meta.booking_id, "CONFIRMED");
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const meta = readMeta(pi);
        if (!meta.provider_id) break;

        await upsertOrder({
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

        await upsertOrder({
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
          await setBookingStatus(meta.booking_id, "REFUNDED");
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

        await upsertOrder({
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
        // Intentionally ignore unhandled events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Return 500 so Stripe retries; idempotency table prevents double effects.
    return NextResponse.json(
      { error: `Handler failed: ${err.message}` },
      { status: 500 }
    );
  }
}
