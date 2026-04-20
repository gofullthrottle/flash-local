# Flash Local — Production Readiness Audit & Onboarding Guide

## Context

Flash Local is preparing for live deployment to the team. The platform promises to turn seasonal service providers into searchable, bookable, payable local businesses in minutes. Before go-live, a comprehensive audit was performed tracing every flow from provider signup through customer payment. **The audit found 11 production-blocking issues** that would prevent the core value loop (provider signs up → gets a site → receives bookings → gets paid) from functioning. This document catalogs every gap and provides a new-teammate onboarding overview.

---

## Part 1: Platform Overview (New Teammate Onboarding)

### What Flash Local Does

Flash Local gives seasonal service providers (holiday lights installers, snow shovelers, tree pickup crews, etc.) a professional web presence with built-in booking and payments — in under 10 minutes.

### Two Commercial Models

| | Launch Plan (Upfront) | Partner Plan (Rev-Share) |
|---|---|---|
| **Cost to provider** | $99 one-time setup fee | $0 upfront |
| **Payment flow** | Provider controls payments directly | All payments flow through platform Stripe Connect |
| **Platform revenue** | Setup fee | 15% of every transaction |
| **Target audience** | Providers who want full control | Providers who want zero risk |

### The Provider Journey (Intended Flow)

```
Landing Page (/) → Choose Plan → Sign Up (/signup)
  → Onboarding Wizard (/start) — 7 steps:
      1. Plan Selection (UPFRONT or REV_SHARE)
      2. Service Type (10 verticals) + Service Area
      3. Brand Setup (business name → auto-slug, phone, email)
      4. Pricing (packages, deposit %, earnings preview)
      5. Payment Setup (create provider record in DB)
      6. Preview & Publish (set site live)
      7. Google Business Profile (manual checklist)
  → Dashboard (/dashboard) — manage bookings, orders, reviews, site, payouts, ads, settings
```

### The Customer Journey (Intended Flow)

```
Visit microsite (<slug>.flashlocal.com or /site/<slug>)
  → Browse packages, read reviews
  → Click "Book Now" → Fill booking form (/site/<slug>/book)
  → Pay 30% deposit via Stripe Checkout
  → Receive confirmation → Provider sees booking in dashboard
```

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS + shadcn/ui
- **Database/Auth**: Supabase (Postgres + Auth + RLS)
- **Payments**: Stripe (Checkout Sessions, Connect Express for rev-share)
- **Multi-tenancy**: Middleware rewrites `<slug>.flashlocal.com` → `/site/<slug>/*`
- **Target Hosting**: Cloudflare Pages (per docs — not yet configured)

### Key Files Map

| Area | Files |
|---|---|
| Landing page | `app/page.tsx` |
| Auth | `app/login/page.tsx`, `app/signup/page.tsx`, `lib/auth/actions.ts` |
| Onboarding wizard | `app/start/wizard.tsx`, `app/start/steps/step-*.tsx` |
| Provider creation | `lib/onboarding/actions.ts` (`createProvider`, `publishSite`) |
| Microsite | `app/site/[slug]/page.tsx` |
| Booking | `app/site/[slug]/book/page.tsx`, `app/api/bookings/create/route.ts` |
| Checkout | `app/api/checkout/create/route.ts` |
| Webhooks | `app/api/stripe/webhook/route.ts` |
| Connect | `app/api/connect/onboard/route.ts`, `app/dashboard/connect/connect-content.tsx` |
| Dashboard | `app/dashboard/*/page.tsx` (8 pages) |
| Reviews | `app/api/reviews/route.ts`, `app/review/[token]/page.tsx` |
| DB schema | `supabase/migrations/0001_flashlocal.sql`, `0002_stripe_connect.sql` |
| Middleware | `middleware.ts` |
| Supabase clients | `lib/supabase/server.ts`, `lib/supabase/client.ts` |
| Queries | `lib/supabase/queries.ts` |

---

## Part 2: Critical Path Analysis

### Flow: Provider Signs Up and Gets a Live Site

```
Step                          Status    Blocker?
─────────────────────────────────────────────────
1. Landing page renders        OK        -
2. User clicks "Get Started"   OK        -
3. Signup with email/password  OK        -
4. Wizard Step 1-4 (data)     OK        -
5. Wizard Step 5 (create)     BROKEN    P0-1, P0-5
6. Wizard Step 6 (publish)    BROKEN    P0-2
7. Microsite visible          BROKEN    P0-2
```

### Flow: Customer Books and Pays

```
Step                          Status    Blocker?
─────────────────────────────────────────────────
1. Visit microsite             BLOCKED   (provider never becomes ACTIVE)
2. Browse packages             BLOCKED   -
3. Submit booking form         OK*       (API logic is sound)
4. Stripe Checkout redirect    BROKEN    P0-4 (rev-share routing)
5. Payment succeeds            OK*       (webhook handler is solid)
6. Booking confirmed           OK*       -
```

### Flow: Provider Manages Business via Dashboard

```
Step                          Status    Blocker?
─────────────────────────────────────────────────
1. Access dashboard            BROKEN    P0-3 (no auth)
2. See real bookings/orders    BROKEN    P0-7 (mock data only)
3. Connect Stripe (rev-share)  BROKEN    P0-4 (empty provider_id)
4. Edit site                   BROKEN    P0-7 (no save)
5. Request reviews             PARTIAL   P1-1 (no email sending)
```

---

## Part 3: Production Blockers

### P0 — Ship-Blocking (must fix before any live use)

#### P0-1: Upfront Plan Never Collects Payment
- **File**: `app/start/steps/step-payments.tsx:30-55`
- **Problem**: The "Pay & Create" button calls `createProvider()` only. It never creates a Stripe Checkout session or redirects to payment. The copy says "you'll be redirected to Stripe Checkout" but no checkout is ever initiated.
- **Impact**: Upfront plan providers get sites for free. Platform collects $0.
- **Fix**: After `createProvider()` succeeds, call `/api/checkout/create` with `order_kind: "SETUP_FEE"` and redirect to the returned Stripe URL. Only advance to step 6 after payment confirmation (or show a "waiting for payment" state).
- **Size**: M
- **Dependencies**: P0-5 (need real user ID for provider)

#### P0-2: No Provider Ever Becomes ACTIVE — Microsites Never Render
- **File**: `lib/onboarding/actions.ts:92-110` (publishSite), `lib/supabase/queries.ts:6-9` (getProviderBySlug)
- **Problem**: `publishSite()` sets `is_live=true` and `published=true`, but provider status stays `PENDING`. The microsite query requires `status='ACTIVE'`. For UPFRONT: activation depends on a webhook from a checkout that never happens (P0-1). For REV_SHARE: there is NO mechanism to set the provider to ACTIVE — nothing in the wizard or Connect flow changes the status.
- **Impact**: Zero microsites will ever be visible to customers.
- **Fix**: For REV_SHARE providers, set status to `ACTIVE` when `publishSite()` is called (they have no upfront gate). For UPFRONT, ensure the checkout webhook activates them (this already works in the webhook handler — it's the checkout creation that's missing per P0-1).
- **Size**: S

#### P0-3: Dashboard Has No Authentication
- **Files**: `app/dashboard/layout.tsx` (no auth check), entire `app/dashboard/` directory
- **Problem**: No middleware protection, no session verification, no `getUser()` calls anywhere. Anyone can access `/dashboard/*`. The "Sign out" link just navigates to `/login` without destroying the session.
- **Impact**: No data isolation between providers. Security vulnerability. Cannot identify which provider is logged in.
- **Fix**: 
  1. Add Supabase SSR auth (`@supabase/ssr` package) for cookie-based sessions
  2. Create auth middleware or layout-level guard that checks session and redirects to `/login`
  3. Fetch the provider record for the authenticated user and pass it via context/props
  4. Implement proper sign-out (call `supabase.auth.signOut()`)
- **Size**: L
- **Dependencies**: Blocks P0-4, P0-7

#### P0-4: Stripe Connect Sends Empty Provider ID
- **File**: `app/dashboard/connect/connect-content.tsx:52`
- **Problem**: `provider_id: ""` with comment "In production, from auth context". The `/api/connect/onboard` endpoint requires a valid provider_id and returns 400.
- **Impact**: Rev-share providers cannot connect Stripe accounts. They cannot receive any payments.
- **Fix**: Once dashboard auth is implemented (P0-3), fetch the provider_id from the authenticated user's session and pass it to the Connect onboard call.
- **Size**: S
- **Dependencies**: P0-3

#### P0-5: Provider Created with Placeholder User ID
- **File**: `lib/onboarding/actions.ts:21`
- **Problem**: `ownerUserId = userId ?? "00000000-0000-0000-0000-000000000000"`. The wizard never passes the authenticated user's ID to `createProvider()`. RLS policies check `owner_user_id = auth.uid()`, so the provider record becomes inaccessible to the actual user.
- **Impact**: Even with dashboard auth, the user couldn't see their own provider data. The nil UUID doesn't match any real Supabase auth user.
- **Fix**: In the wizard, get the current user from Supabase auth session and pass their ID to `createProvider()`. Also add the `claimProvider()` call (which already exists in actions.ts:112) as a fallback if the user wasn't authenticated during creation.
- **Size**: S
- **Dependencies**: Auth must be working in the onboarding flow

#### P0-6: Rev-Share Payment Routing Uses Env Vars Instead of DB
- **File**: `app/api/checkout/create/route.ts:186-187`
- **Problem**: `process.env[\`STRIPE_CONNECT_${provider_id}\`]` looks for a per-provider environment variable. This is unworkable — you can't create env vars dynamically for each provider. The Connect onboard flow correctly saves `stripe_account_id` to the providers table, but checkout doesn't read it.
- **Impact**: Customer payments for rev-share providers won't include the application fee or route to the provider's Connect account. Provider gets nothing; platform gets nothing; the full payment sits in the platform's Stripe with no split.
- **Fix**: Replace the env var lookup with a DB query:
  ```typescript
  const { data: providerConnect } = await db
    .from("providers")
    .select("stripe_account_id")
    .eq("id", provider_id)
    .single();
  const connectedAccountId = providerConnect?.stripe_account_id;
  ```
- **Size**: S

#### P0-7: All Dashboard Pages Use Hardcoded Demo Data
- **Files**: `app/dashboard/bookings/page.tsx`, `app/dashboard/orders/page.tsx`, `app/dashboard/reviews/page.tsx`, `app/dashboard/site/page.tsx`, `app/dashboard/settings/page.tsx`, `app/dashboard/page.tsx`
- **Problem**: Every dashboard page renders from hardcoded arrays (e.g., `const demoBookings = [...]`). No Supabase queries. No save/update functions. Site editor has no save. Settings has no persistence.
- **Impact**: Providers see fake data, cannot manage real bookings, cannot update their site.
- **Fix**: Replace demo data with Supabase queries using the authenticated provider's ID (from P0-3). Implement update/save mutations for site editor and settings.
- **Size**: L
- **Dependencies**: P0-3

#### P0-8: No Deployment Configuration for Cloudflare Pages
- **Problem**: CLAUDE.md specifies Cloudflare Pages as hosting target, but:
  - No `wrangler.toml`
  - No `@cloudflare/next-on-pages` in package.json
  - `next.config.ts` has no Cloudflare-specific settings
- **Impact**: Cannot deploy. The app has nowhere to run.
- **Fix**: Either (a) add Cloudflare Pages adapter and config, or (b) deploy to Vercel/other platform that supports Next.js 15 App Router natively. Vercel would be simplest for launch.
- **Size**: M

### P1 — Launch-Day Risk (should fix before first real users)

#### P1-1: No Email/Notification System
- **Problem**: No email provider integrated. Booking confirmations promise "you'll receive a confirmation email" but nothing sends. Review request tokens are created but never emailed.
- **Impact**: Customers get no confirmation. Review collection doesn't work end-to-end.
- **Fix**: Integrate an email provider (Resend, SendGrid) for: booking confirmations, review request emails, provider notifications on new bookings.
- **Size**: M

#### P1-2: Supabase Server Client Doesn't Use Cookie-Based Auth
- **File**: `lib/supabase/server.ts`
- **Problem**: `createServerClient()` creates a plain client with `persistSession: false` and uses the anon key. It doesn't read cookies/headers, so it can't identify the authenticated user. Server-rendered pages (like microsites) work because they only read public data, but any page needing user context will fail.
- **Fix**: Replace with `@supabase/ssr` `createServerClient` that reads from cookies. This is a prerequisite for P0-3.
- **Size**: M

#### P1-3: Wizard State Is Lost on Page Refresh
- **Problem**: The entire 7-step wizard stores data in React state only. If the user refreshes at step 4, all data is lost and they start over. The provider record isn't created until step 5.
- **Fix**: Persist wizard state in localStorage or sessionStorage. Hydrate on mount.
- **Size**: S

#### P1-4: No Mobile Navigation on Dashboard
- **File**: `app/dashboard/layout.tsx:71`
- **Problem**: Comment says `{/* Mobile nav could go here */}`. Sidebar is `hidden lg:block`. On mobile, there's no way to navigate between dashboard pages.
- **Fix**: Add a hamburger menu or bottom navigation for mobile.
- **Size**: S

#### P1-5: Social Proof Is Hardcoded
- **File**: `app/page.tsx`
- **Problem**: "120+ seasonal crews launched this month" is a static string. False at launch.
- **Fix**: Either remove it, make it dynamic from DB count, or use honest copy like "Join providers launching this season".
- **Size**: S

### P2 — Post-Launch (improve iteratively)

- **P2-1**: GBP wizard is a manual checklist with no API integration
- **P2-2**: Ads management is UI-only with no ad platform backend
- **P2-3**: No rate limiting on public API endpoints (bookings, reviews)
- **P2-4**: No CSRF protection on API routes
- **P2-5**: Booking form doesn't show which package is selected or its price
- **P2-6**: Default packages only exist for 2 of 10 verticals (holiday-lights, snow-shoveling)
- **P2-7**: No loading/skeleton states on dashboard pages
- **P2-8**: E2E tests run against UI shells, not actual backend flows

---

## Part 4: Fix Recommendations (Ordered by Dependency)

### Phase 1: Auth Foundation (blocks everything else)

| # | Task | Files | Size |
|---|---|---|---|
| 1a | Add `@supabase/ssr` package | `package.json` | S |
| 1b | Rewrite `lib/supabase/server.ts` to use cookie-based SSR client | `lib/supabase/server.ts` | S |
| 1c | Add auth middleware for `/dashboard/*` routes | `middleware.ts` | S |
| 1d | Create provider context/hook that fetches provider for current user | New: `lib/auth/provider-context.tsx` | M |
| 1e | Pass authenticated user ID to `createProvider()` in wizard | `app/start/wizard.tsx`, `app/start/steps/step-payments.tsx` | S |
| 1f | Implement proper sign-out | `app/dashboard/layout.tsx` | S |

### Phase 2: Payment Flow Fixes

| # | Task | Files | Size |
|---|---|---|---|
| 2a | Add Stripe Checkout redirect for UPFRONT plan after provider creation | `app/start/steps/step-payments.tsx` | M |
| 2b | Set REV_SHARE providers to ACTIVE on publishSite() | `lib/onboarding/actions.ts` | S |
| 2c | Fix Connect account lookup to query DB instead of env vars | `app/api/checkout/create/route.ts:186-187` | S |
| 2d | Wire provider_id into Connect onboard button from auth context | `app/dashboard/connect/connect-content.tsx:52` | S |

### Phase 3: Dashboard Activation

| # | Task | Files | Size |
|---|---|---|---|
| 3a | Replace demo data with Supabase queries (all dashboard pages) | `app/dashboard/*/page.tsx` | L |
| 3b | Implement site editor save function | `app/dashboard/site/page.tsx` | M |
| 3c | Implement settings save function | `app/dashboard/settings/page.tsx` | M |
| 3d | Add mobile navigation | `app/dashboard/layout.tsx` | S |

### Phase 4: Deployment

| # | Task | Files | Size |
|---|---|---|---|
| 4a | Choose deployment target (Vercel recommended for fastest launch) | Config files | S |
| 4b | Configure deployment (vercel.json or wrangler.toml) | New config | M |
| 4c | Set environment variables in hosting platform | Hosting dashboard | S |
| 4d | Configure Stripe webhook endpoint URL for production | Stripe dashboard | S |
| 4e | Run Supabase migrations against production DB | `supabase/migrations/*` | S |
| 4f | Configure DNS for `*.flashlocal.com` wildcard subdomain | DNS provider | S |

### Phase 5: Communications

| # | Task | Files | Size |
|---|---|---|---|
| 5a | Integrate email provider (Resend recommended) | New: `lib/email/` | M |
| 5b | Send booking confirmation emails | `app/api/bookings/create/route.ts` | S |
| 5c | Send review request emails with token links | `app/api/reviews/request/route.ts` | S |

---

## Part 5: Verification Plan

### End-to-End Test: Upfront Plan Provider

1. Visit `/` → Click "Get Started" on Launch Plan
2. Sign up with email/password at `/signup`
3. Complete wizard steps 1-5 (plan=UPFRONT, pick service, set brand, add packages)
4. On step 5, verify redirect to Stripe Checkout
5. Complete test payment (use Stripe test card `4242 4242 4242 4242`)
6. Verify webhook fires → provider status becomes `ACTIVE`
7. Verify redirect back to wizard step 6
8. Publish site → visit `<slug>.flashlocal.com`
9. Verify microsite renders with correct packages
10. Submit a booking as a customer → verify Stripe Checkout
11. Complete payment → verify booking appears in provider dashboard as CONFIRMED

### End-to-End Test: Rev-Share Provider

1. Same wizard flow with plan=REV_SHARE
2. Verify no payment required, provider becomes ACTIVE on publish
3. Visit microsite, verify it renders
4. Go to Dashboard → Payouts → Click "Connect with Stripe"
5. Complete Stripe Connect Express onboarding (test mode)
6. Return to dashboard → verify "Connected" badge
7. As a customer, book a service and pay
8. Verify: 15% application fee applied, payment routes to provider's Connect account
9. Check provider dashboard → booking and order appear with correct amounts

### Quick Smoke Tests

- [ ] Unauthenticated user cannot access `/dashboard/*` (redirects to `/login`)
- [ ] Provider can only see their own data in dashboard
- [ ] Microsite returns 404 for non-existent slugs
- [ ] Microsite returns 404 for PENDING/PAUSED providers
- [ ] Duplicate slug during onboarding shows error
- [ ] Stripe webhook handles duplicate events (send same event twice)
- [ ] Page refresh during wizard doesn't lose data (after P1-3 fix)
- [ ] Mobile dashboard navigation works (after P1-4 fix)

---

## Summary

**What works today**: Landing page, auth signup/login, wizard UI, microsite rendering logic, booking API, Stripe webhook handler, DB schema + RLS, middleware tenant routing.

**What's broken**: The payment collection (P0-1), provider activation (P0-2), dashboard auth (P0-3), Connect wiring (P0-4, P0-6), user-provider linkage (P0-5), dashboard data (P0-7), and deployment config (P0-8).

**Bottom line**: The UI layer is polished and the database/API architecture is sound, but the critical wiring between layers — auth sessions, payment triggers, data fetching, and deployment — is incomplete. Phases 1-2 (auth + payment fixes) are the minimum to demonstrate the core value loop. Estimate: ~3-5 days of focused work for Phases 1-4 to reach deployable state.
