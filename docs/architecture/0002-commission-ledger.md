# ADR-0002: Rep Commission Ledger & Payout Design

## Status
Accepted

## Context
Sales reps need to earn money when providers they sign up generate revenue or upgrade tiers. The platform already uses Stripe Connect for provider payouts (rev-share model) — the commission system must integrate cleanly with that existing flow.

Commission triggers:
1. **Signup bonus** — flat fee when a referred provider completes onboarding
2. **Tier upgrade** — one-time bonus when provider upgrades from STARTER → PRO/PREMIUM
3. **Booking revenue share** — ongoing % of platform's `application_fee` from bookings on referred providers

## Decision

### Commission Calculation

| Trigger | STARTER | PRO | PREMIUM |
|---------|---------|-----|---------|
| Signup bonus | $0 | $25 | $50 |
| Tier upgrade bonus | - | $25 | $75 |
| Ongoing rev-share (of platform fee) | 15% | 12% | 10% |

The `plan_tier_definitions.commission_pct` column stores the ongoing rate. Signup/upgrade bonuses are calculated in application code.

### Ledger Design
Each commission event creates one row in `rep_commissions`:
- `trigger_event`: `'SIGNUP'`, `'TIER_UPGRADE'`, or `'BOOKING_REVENUE'`
- `idempotency_key`: prevents duplicates (e.g., `booking-revenue:{order_id}`)
- `status`: `PENDING` → `APPROVED` → `PAID` (or `VOIDED`)

### Payout Flow
1. Commissions accrue in `PENDING` state
2. Admin reviews and approves (batch or individual)
3. Approved commissions are paid out via Stripe Connect Transfer to the rep's connected account
4. `paid_at` + `stripe_transfer_id` recorded on the commission row

### Integration Points
- **Webhook handler** (`app/api/stripe/webhook/route.ts`): on `payment_intent.succeeded`, if the provider has a `referred_by_rep_id`, insert a `BOOKING_REVENUE` commission row
- **Tier upgrade action**: when a provider changes tier, insert a `TIER_UPGRADE` commission row
- **Provider creation action**: when a provider is created with a referral code, insert a `SIGNUP` commission row (if tier >= PRO)

### Rep Stripe Connect
Reps onboard to Stripe Connect Express (same flow as providers). Their `stripe_account_id` is stored on `sales_reps`. Payouts use `stripe.transfers.create()` with the rep's connected account as destination.

## Consequences

**Easier:**
- Full audit trail of every dollar earned by every rep
- Idempotent commission insertion (safe against webhook retries)
- Admins have approval gate before money moves
- Reps see real-time earnings in their dashboard

**Harder:**
- Requires rep Stripe Connect onboarding (additional friction)
- Monthly reconciliation needed if commissions span billing periods
- Must handle: provider downgrades/cancels after commission paid (clawback policy TBD)
- Tax implications: reps are 1099 contractors, platform must issue forms
