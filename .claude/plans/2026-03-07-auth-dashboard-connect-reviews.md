# Implementation Plan: Auth, Dashboard, Checkout, Connect, Reviews

**Date:** 2026-03-07
**Branch:** `claude/claude-md-mm7qtu424u8styi9-f9e4I`

## Context

FlashLocal platform already had: Next.js 15 foundation, landing page, onboarding wizard (7 steps), microsite renderer, Stripe webhook handler, checkout session creation API, and Supabase migration with RLS. The next phase required building out the authenticated provider experience and customer-facing flows.

## Tasks

### 1. Auth — Supabase Auth signup/login, wire owner_user_id

- Create `lib/auth/actions.ts` with server actions: `signUp()` (via admin API), `getSession()`, `getProviderForUser()`
- Build `app/login/page.tsx` — email/password form, `signInWithPassword`, redirect to `/dashboard`
- Build `app/signup/page.tsx` — email/password/confirm form, `signUp`, redirect to `/start`
- Update `lib/onboarding/actions.ts` — accept optional `userId` param in `createProvider()`, add `claimProvider()` for backfilling `owner_user_id`

### 2. Provider Dashboard — bookings, orders, ads, site editor, settings

- `app/dashboard/layout.tsx` — sidebar nav (8 items) with mobile header
- `app/dashboard/page.tsx` — overview with stats grid + quick action cards
- `app/dashboard/bookings/page.tsx` — status filters, booking cards with status transitions (Confirm/Decline/Start/Complete), customer info
- `app/dashboard/orders/page.tsx` — transaction history with summary stats (collected, fees, payouts)
- `app/dashboard/ads/page.tsx` — toggle switch, daily budget, service radius, goal selector
- `app/dashboard/site/page.tsx` — content editor (headline, description, hero image), visibility toggle
- `app/dashboard/settings/page.tsx` — business info editor, plan/status display, danger zone

### 3. Customer Checkout Integration

- `app/api/bookings/create/route.ts` — creates lead + booking from customer form, computes 30% deposit
- Rewrite `app/site/[slug]/book/page.tsx` — wire up real API calls: booking creation → checkout creation → Stripe redirect
- `app/api/providers/resolve/route.ts` — resolve provider_id from slug for client-side flows
- `app/site/[slug]/book/success/page.tsx` — booking confirmation page

### 4. Rev-share — Stripe Connect Express

- `supabase/migrations/0002_stripe_connect.sql` — add `stripe_account_id` + `stripe_onboarding_complete` to providers
- `app/api/connect/onboard/route.ts` — create Connect Express account + Account Link for onboarding
- `app/api/connect/status/route.ts` — check account status (charges/payouts enabled)
- `app/dashboard/connect/page.tsx` + `connect-content.tsx` — Payouts dashboard with:
  - Not-connected: onboarding flow with step-by-step guide
  - Connected: payout summary, Stripe Dashboard link
  - Rev-share breakdown card (85/15 split)
- Update checkout route to use `stripe_account_id` from DB instead of env vars (future)

### 5. Reviews Engine

- `supabase/migrations/0002_stripe_connect.sql` — `reviews` + `review_requests` tables with RLS
- `app/api/reviews/route.ts` — GET (published reviews + stats) + POST (submit review with optional token)
- `app/api/reviews/request/route.ts` — create review request for completed bookings, generate unique tokens
- `app/dashboard/reviews/page.tsx` — stats cards, tabbed view (reviews vs requests)
- `app/review/[token]/page.tsx` — public review submission with interactive star rating

### 6. Frontend Design Audit

- Add reviews section to microsite with star ratings and customer testimonials
- Dynamic hero badge: show actual rating when reviews exist
- Add "Request Review" button on completed bookings
- Fix unused imports, remove dead state variables
- Suspense boundary for Connect page's `useSearchParams()`
- Verify clean build (all 23 routes)

## Technical Decisions

- **Suspense pattern**: Pages using `useSearchParams()` need Suspense boundaries in Next.js 15 static generation. Split into server page wrapper + client content component.
- **Lazy-init pattern**: All API routes use factory functions (`getStripe()`, `getSupabaseAdmin()`) to avoid build-time env var errors.
- **Token-based reviews**: Review requests generate unique hex tokens for email/SMS links, validated on submission.
- **Single migration file**: Combined Stripe Connect columns + reviews/review_requests tables in one migration for simplicity.
- **Demo data**: Dashboard pages use client-side demo data arrays to demonstrate UI before DB integration is complete.
