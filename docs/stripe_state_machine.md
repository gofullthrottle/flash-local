# FlashLocal Stripe State Machine (v1)

## Guiding principles

- **Idempotent**: every Stripe event can be delivered multiple times; handle safely.
- **Source of truth**: Stripe is source of truth for payment outcome; your DB stores a *projection*.
- **Metadata-first**: every Checkout Session / PaymentIntent MUST include:
  - `provider_id` (uuid)
  - `booking_id` (uuid)
  - `plan_type` (UPFRONT | REV_SHARE)
  - `order_kind` (SETUP_FEE | CUSTOMER_BOOKING)
  - `environment` (prod | test)

## Core tables

- `orders`: maps Stripe PaymentIntent/CheckoutSession to booking/provider.
- `stripe_events`: stores processed `event_id` to enforce once-only effects.

## Order states (`orders.status`)

```
CREATED ──► PROCESSING ──► SUCCEEDED ──► REFUNDED
                │                │
                ▼                ▼
     REQUIRES_PAYMENT_METHOD   DISPUTED
                │
                ▼
             FAILED
```

- **CREATED**: order row exists, no confirmed payment
- **REQUIRES_PAYMENT_METHOD**: PI failed / needs new method
- **PROCESSING**: PI processing
- **SUCCEEDED**: paid
- **FAILED**: terminal failure (rare; treat like needs attention)
- **REFUNDED**: fully refunded
- **DISPUTED**: dispute opened

## Booking states (`bookings.status`)

```
DRAFT ──► REQUESTED ──► CONFIRMED ──► IN_PROGRESS ──► COMPLETED
                │              │
                ▼              ▼
            CANCELED       REFUNDED
```

- **REQUESTED**: booking created before payment (or pay-later)
- **CONFIRMED**: deposit/full payment succeeded
- **CANCELED**: canceled pre-service
- **COMPLETED**: provider marks complete
- **REFUNDED**: refunded after payment

## Stripe events → transitions

### `checkout.session.completed`

**When**: a Checkout Session completes (setup fee or booking checkout).

**Effects**:

1. Upsert `orders` row with:
   - `stripe_checkout_session_id`
   - `provider_id`, `booking_id` from metadata
   - `status` = PROCESSING (or SUCCEEDED if `payment_intent` already succeeded and expanded)
2. If `order_kind` = SETUP_FEE:
   - set `providers.status` = ACTIVE (or keep PENDING and require admin approval; your call)
   - set `sites.is_live` = true if you allow instant publish

### `payment_intent.succeeded`

**Effects**:

1. Upsert `orders` by `stripe_payment_intent_id`
2. `orders.status` = SUCCEEDED
3. `bookings.status` = CONFIRMED (if `booking_id` present)
4. Record `application_fee` + payout values if using Connect destination charges:
   - compute from PI charges (or from your own known fee schedule)

### `payment_intent.payment_failed`

**Effects**:

- `orders.status` = REQUIRES_PAYMENT_METHOD (or FAILED)
- bookings stays REQUESTED (unless you want to auto-cancel)

### `charge.refunded`

**Effects**:

- `orders.refunded_cents` += refunded amount
- if `refunded >= amount`: `orders.status` = REFUNDED; `bookings.status` = REFUNDED

### `charge.dispute.created`

**Effects**:

- `orders.status` = DISPUTED
- `orders.dispute_status` = `dispute.status`

### `charge.dispute.closed`

**Effects**:

- if won: `orders.status` = SUCCEEDED
- if lost: `orders.status` = DISPUTED (and you may set booking REFUNDED depending on funds flow)

## Webhook handler invariants

- Verify signature (`Stripe-Signature`)
- Store `stripe_events(event_id)` first; if conflict, return 200 (already processed)
- Apply state changes in a DB transaction
- Never trust client-sent amounts; read from Stripe event object

## Required Stripe object config

### Customer booking Checkout Session

- `mode`: payment
- `line_items`: package + add-ons (or a single computed line)
- `metadata`:
  - `provider_id`, `booking_id`, `plan_type`, `order_kind`=CUSTOMER_BOOKING, `environment`
- `success_url` / `cancel_url` include `booking_id` and a short status

### Setup fee Checkout Session

- `metadata`:
  - `provider_id`, `plan_type`, `order_kind`=SETUP_FEE

## Money flow: Connect destination charges (rev-share)

```
Customer pays $200
  └─► PaymentIntent on platform
       ├─► application_fee_amount = $30 (15% rev-share)
       └─► Transfer to connected account = $170
            └─► Stripe fees deducted from platform or connected account (configurable)
```

## Testing checklist

- [ ] Duplicate webhook delivery doesn't double-confirm bookings
- [ ] Refund updates booking state correctly
- [ ] Dispute toggles status and alerts admin
- [ ] Payment without `booking_id` still creates order but doesn't mutate bookings
- [ ] Setup fee checkout → provider ACTIVE + site LIVE
- [ ] Rev-share checkout → correct `application_fee_amount` recorded
- [ ] Idempotency: replay any event → no state corruption
