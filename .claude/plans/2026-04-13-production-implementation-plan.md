# Flash Local — Production Implementation Plan

## Context

The Flash Local audit found 8 P0 ship-blockers preventing the core business loop (provider signs up → gets a site → receives bookings → gets paid) from functioning. The UI layer is polished, the database schema + RLS are well-designed, and the Stripe webhook handler is solid. What's broken is the *wiring* between layers: auth sessions, payment triggering, user-provider linkage, Connect account routing, dashboard data fetching, and deployment config. This plan fixes all blockers in dependency order, recommends a deployment architecture, and adds strategic enhancements to make the zero-to-revenue journey frictionless.

**Key files this plan will modify:**
- `lib/supabase/server.ts`, `lib/supabase/client.ts` — rewrite with `@supabase/ssr`
- `middleware.ts` — add auth guard
- `app/start/wizard.tsx`, `app/start/steps/step-payments.tsx` — wire auth + checkout
- `lib/onboarding/actions.ts` — activate REV_SHARE providers, pass user ID
- `app/api/checkout/create/route.ts` — fix Connect account lookup (lines 186-187)
- `app/dashboard/layout.tsx` + all `app/dashboard/*/page.tsx` — add auth + real queries
- `app/dashboard/connect/connect-content.tsx` — wire provider_id from auth
- `package.json` — add `@supabase/ssr`, `resend`
- New: `lib/auth/session.ts`, `lib/email/*`, `vercel.json`

---

## Section 1: Deployment Strategy — Vercel + Cloudflare + Supabase

### Why NOT Cloudflare Pages (for now)

The user suggested Cloudflare + Supabase. **Cloudflare Pages is a bad fit for this codebase today** for three concrete reasons:

1. **Every API route declares `export const runtime = "nodejs"`** (8 routes). `@cloudflare/next-on-pages` does not support routes that require the Node.js runtime — it transforms only Edge-compatible routes.
2. **The Stripe webhook handler at `app/api/stripe/webhook/route.ts:5` comments "needs raw body + crypto"** and uses `req.text()` + `stripe.webhooks.constructEvent()`. Stripe's SDK v17 relies on Node.js crypto internals for HMAC signature verification. Porting this to the Workers runtime requires a significant rewrite (using Web Crypto APIs + manual HMAC).
3. **All API routes use `SUPABASE_SERVICE_ROLE_KEY`.** Pushing this key to edge workers globally distributed is a security anti-pattern. Service role should live only on server-side Node.js processes.

### Recommended Stack

```
┌─────────────────────────────────────────────────────────┐
│  Cloudflare (DNS + CDN + WAF + Wildcard Subdomains)    │
│  *.flashlocal.com → CNAME → Vercel                      │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Vercel (Next.js 15 App Router hosting)                 │
│  - Native Node.js runtime support                       │
│  - Zero-config deployment for Next.js                   │
│  - Preview deploys per PR                               │
│  - Edge middleware for tenant routing                   │
└──────────────────────────┬──────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase (Postgres + Auth + Storage + RLS)             │
│  Stripe (Checkout + Connect + Webhooks)                 │
│  Resend (Transactional email)                           │
└─────────────────────────────────────────────────────────┘
```

**Why this stack:**
- **Vercel** provides native Next.js 15 App Router support with zero config, Node.js runtime for all API routes, automatic preview deploys per PR, and built-in observability. Moving from local to production takes minutes, not days.
- **Cloudflare as DNS/CDN layer** gives the wildcard subdomain routing (`*.flashlocal.com`), global CDN, WAF/bot protection, and DDoS mitigation — all without touching the Pages Workers runtime. You keep CLAUDE.md's Cloudflare promise *for the parts Cloudflare is great at*.
- **Supabase** stays exactly as designed — Postgres, Auth, RLS, Storage.
- **Migration path**: When Cloudflare's Node.js compat on Pages matures and Stripe ships Workers-native signature verification, we can migrate the front-end to Cloudflare Pages with minimal API changes.

### DNS Setup (Cloudflare)

1. `flashlocal.com` A/CNAME → Vercel
2. `*.flashlocal.com` CNAME → Vercel (wildcard for tenant subdomains)
3. `www.flashlocal.com` CNAME → Vercel
4. Enable "Full (strict)" SSL
5. Enable Bot Fight Mode on `/api/*` paths
6. Page Rules: cache aggressively on `/site/*` (microsites), bypass cache on `/api/*` and `/dashboard/*`

### Vercel Project Setup

1. Import `gofullthrottle/flash-local` repo
2. Framework preset: Next.js (auto-detected)
3. Environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_APP_URL=https://flashlocal.com`
   - `NEXT_PUBLIC_SITE_DOMAIN=flashlocal.com`
   - `RESEND_API_KEY` (added in Phase 6)
   - `FROM_EMAIL=hello@flashlocal.com`
4. Domains: add `flashlocal.com` and `*.flashlocal.com`
5. Production branch: `master`; preview branch: `dev`

### Stripe Production Setup

1. In Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://flashlocal.com/api/stripe/webhook`
3. Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel
5. Connect: enable Express accounts in Connect settings, configure branding + branding return URL
6. Set application fee default to 15% in checkout code (already in place)

### Supabase Production Setup

1. Create new Supabase project (or use existing dev one for launch)
2. Run migrations: `supabase db push` against production DB URL
3. Verify RLS is enabled on all tables (`select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace;`)
4. Create admin user in `admin_users` table for operator access
5. Configure Auth: enable email/password, configure SMTP (or use Supabase's default), set redirect URLs for production domain
6. Storage: create `hero-images` and `gallery` buckets with public read, authenticated write

---

## Section 2: Implementation Phases (Ordered by Dependency)

### Phase 1 — Auth Foundation (blocks everything else)

**Goal**: Real Supabase session management with cookie-based auth, protected routes, and a `getProviderForCurrentUser()` helper every dashboard page can use.

**1.1 — Install `@supabase/ssr`**
- File: `package.json`
- Add dependency: `"@supabase/ssr": "^0.5.2"`

**1.2 — Rewrite `lib/supabase/server.ts`**
- Replace `createServerClient()` with `@supabase/ssr` version that reads cookies via `next/headers`
- Keep `createAdminClient()` as-is (server-only, bypasses RLS, used by webhook + server actions)
- Add new helper `getCurrentUser()` that returns the authenticated user or `null`

```typescript
import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export function createServerClient() {
  const cookieStore = cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch { /* middleware will retry */ }
        },
      },
    }
  );
}

export function createAdminClient() { /* unchanged */ }

export async function getCurrentUser() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
```

**1.3 — Rewrite `lib/supabase/client.ts`**
- Replace `createBrowserClient()` with `@supabase/ssr` version for consistent cookie handling

```typescript
import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";

export function createBrowserClient() {
  return createSSRBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**1.4 — Add auth middleware**
- File: `middleware.ts`
- Import `@supabase/ssr`'s middleware helper to refresh sessions
- Add route guard: `/dashboard/*` redirects to `/login` if no session, `/start/*` redirects to `/login` if no session
- Preserve existing tenant routing logic

**1.5 — Create session helper `lib/auth/session.ts`**
- New file
- Export `requireUser()` — server action that throws if no user
- Export `getProviderForCurrentUser()` — returns the provider record owned by `auth.uid()`, or null

```typescript
"use server";
import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getProviderForCurrentUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = createServerClient();
  const { data } = await supabase
    .from("providers")
    .select("*, provider_contacts(*), sites(*), provider_public_profiles(*)")
    .eq("owner_user_id", user.id)
    .single();
  return data;
}
```

**1.6 — Pass authenticated user ID to `createProvider()`**
- File: `app/start/steps/step-payments.tsx:41`
- Current: `const result = await createProvider(data);`
- Change: The wizard should be a server component wrapper (or use a server action that gets the user). Convert `createProvider` call site to use `requireUser()` first.
- Alternative: Fetch user in `app/start/page.tsx` (server component) and pass `userId` as a prop to `<Wizard>`.
- Use existing `claimProvider()` at `lib/onboarding/actions.ts:112` as a fallback for any orphaned providers.

**1.7 — Implement proper sign-out**
- File: `app/dashboard/layout.tsx:52-57`
- Current: `<Link href="/login">Sign out</Link>` (does nothing)
- Change: Convert to a form with a server action that calls `supabase.auth.signOut()` then redirects to `/`

---

### Phase 2 — Payment Flow Fixes

**Goal**: Upfront plan actually charges the setup fee; rev-share providers go ACTIVE on publish; Connect account routing works.

**2.1 — Wire Upfront checkout redirect into wizard**
- File: `app/start/steps/step-payments.tsx`
- Current flow (lines 30-55): calls `createProvider()` then `onNext()`
- New flow for UPFRONT:
  1. Call `createProvider(data, userId)` → get `providerId`
  2. Call `/api/checkout/create` with `order_kind: "SETUP_FEE"`, `success_url: ${origin}/start?session_id={CHECKOUT_SESSION_ID}&step=preview`, `cancel_url: ${origin}/start?step=payments`
  3. `window.location.href = response.url` (redirect to Stripe Checkout)
- On return from Stripe, the wizard's `/start` page reads `session_id` query param, verifies payment succeeded, and jumps to step 6 (preview)
- For REV_SHARE: no checkout needed, just `onNext()`
- The webhook already activates the provider on `SETUP_FEE` success (webhook/route.ts:210-213)

**2.2 — Activate REV_SHARE providers on publish**
- File: `lib/onboarding/actions.ts:92-110` (`publishSite`)
- Current: only updates sites and provider_public_profiles
- Add: for the provider's plan, if REV_SHARE, also update `providers.status = 'ACTIVE'`
- UPFRONT providers stay PENDING until webhook flips them on payment success

```typescript
export async function publishSite(providerId: string) {
  const supabase = createAdminClient();
  const { data: provider } = await supabase
    .from("providers").select("plan").eq("id", providerId).single();

  await supabase.from("sites")
    .update({ is_live: true, published_at: new Date().toISOString() })
    .eq("provider_id", providerId);
  await supabase.from("provider_public_profiles")
    .update({ published: true }).eq("provider_id", providerId);

  if (provider?.plan === "REV_SHARE") {
    await supabase.from("providers")
      .update({ status: "ACTIVE" }).eq("id", providerId);
  }
  return { success: true };
}
```

**2.3 — Fix Connect account lookup in checkout**
- File: `app/api/checkout/create/route.ts:186-187`
- Current: `process.env[\`STRIPE_CONNECT_${provider_id}\`]` (broken)
- Change: Use `provider.stripe_account_id` from the existing provider fetch at line 60-71
- First, update the select at line 62 to include `stripe_account_id, stripe_onboarding_complete`
- Then line 186-187 becomes: `const connectedAccountId = provider.stripe_account_id;`
- Also check `provider.stripe_onboarding_complete` before routing to ensure Connect is ready

**2.4 — Wire provider_id into Connect onboard**
- File: `app/dashboard/connect/connect-content.tsx:52`
- Current: `provider_id: ""` (hardcoded empty)
- Convert the component to accept `providerId` as a prop from a server-component parent
- File: `app/dashboard/connect/page.tsx` — fetch provider via `getProviderForCurrentUser()`, pass `providerId` and initial status to `<ConnectContent providerId={provider.id} initialStatus={...} />`
- Also fetch actual Connect status on mount via `/api/connect/status?provider_id=${providerId}` and display real "connected"/"pending" state instead of simulated

---

### Phase 3 — Provider Activation & Data Loading

**Goal**: Every dashboard page fetches real data for the authenticated provider.

**3.1 — Convert dashboard pages to server components with real queries**

For each of these pages, the pattern is:
1. Convert to server component (remove `"use client"` if possible, or split into server wrapper + client child)
2. Fetch data via `getProviderForCurrentUser()` + related queries
3. Pass data to existing UI as props
4. For pages needing interactivity (save buttons, filters), keep UI as client child component receiving initial data as props

**3.1a — Overview**
- File: `app/dashboard/page.tsx`
- Queries: aggregate `orders` (sum amount_cents where status=SUCCEEDED), count `bookings` this month, count pending `bookings` (status=REQUESTED), compute conversion
- Replace the hardcoded `[{title: "Total Revenue", value: "$0.00", ...}]` array with computed values
- Add a "Recent Bookings" query (limit 5) for the quick-action card

**3.1b — Bookings**
- File: `app/dashboard/bookings/page.tsx`
- Split into `page.tsx` (server, fetches) + `bookings-content.tsx` (client, renders with state for filter)
- Query: `select id, status, scheduled_start, customer_snapshot, total_amount_cents, deposit_amount_cents, notes, created_at, service_packages(name) from bookings where provider_id = ? order by created_at desc`
- Replace `DEMO_BOOKINGS` (lines 42-71) with the fetched data
- Add server action `updateBookingStatus(bookingId, status)` for the status transition buttons

**3.1c — Orders**
- File: `app/dashboard/orders/page.tsx`
- Split server/client
- Query: `select id, booking_id, amount_cents, application_fee_cents, provider_payout_cents, refunded_cents, status, stripe_payment_intent_id, created_at, bookings(customer_snapshot) from orders where provider_id = ? order by created_at desc`
- Compute summary totals (collected, fees, payouts)
- Replace `DEMO_ORDERS` (lines 41-66)

**3.1d — Reviews**
- File: `app/dashboard/reviews/page.tsx`
- Queries: `reviews` table + `review_requests` table (both exist in migration 0002)
- Split server/client, replace `DEMO_REVIEWS` and `DEMO_REQUESTS`

**3.1e — Site editor**
- File: `app/dashboard/site/page.tsx`
- Fetch from `sites` + `provider_public_profiles`
- Add server action `updateSite({ headline, description, hero_image_url, is_live })` that writes to both tables
- Wire "Save" button to action
- Also add image upload via Supabase Storage (`hero-images` bucket)

**3.1f — Settings**
- File: `app/dashboard/settings/page.tsx`
- Fetch from `providers` + `provider_contacts`
- Add server action `updateSettings({ display_name, phone, email })`
- "Pause Account" button → updates `providers.status = 'PAUSED'`

**3.1g — Ads**
- File: `app/dashboard/ads/page.tsx`
- Fetch from `ads_settings`
- Add server action `updateAdsSettings({ enabled, daily_cap_cents, geo, objective })`
- NOTE: actual ad platform backend is P2 — this phase only persists preferences

**3.2 — Add mobile navigation**
- File: `app/dashboard/layout.tsx:71`
- Add mobile hamburger menu + Sheet component (shadcn) for nav
- Reuse `NAV_ITEMS` array

---

### Phase 4 — Email & Communications

**Goal**: Customers get booking confirmations. Providers get new-booking alerts. Review requests actually send.

**4.1 — Install Resend**
- `npm install resend`
- Add `RESEND_API_KEY` to env
- Configure sending domain in Resend dashboard (DKIM/SPF records in Cloudflare DNS)

**4.2 — Email library scaffold**
- New file: `lib/email/client.ts` — Resend client singleton
- New file: `lib/email/templates/booking-confirmation.tsx` — React Email template
- New file: `lib/email/templates/new-booking-alert.tsx` — provider notification
- New file: `lib/email/templates/review-request.tsx` — with token link
- New file: `lib/email/templates/welcome.tsx` — post-signup welcome
- New file: `lib/email/send.ts` — typed wrappers: `sendBookingConfirmation`, `sendNewBookingAlert`, `sendReviewRequest`, `sendWelcome`

**4.3 — Hook into existing flows**
- `app/api/bookings/create/route.ts` — after booking insert, call `sendBookingConfirmation()` (customer) + `sendNewBookingAlert()` (provider)
- `app/api/reviews/request/route.ts` — actually send the review email with the token link `/review/{token}`
- `app/api/stripe/webhook/route.ts` — on `payment_intent.succeeded`, send booking-confirmed email to customer
- Post-signup in `app/signup/page.tsx` — call welcome email server action

---

### Phase 5 — Deployment

**Goal**: Site is live on `flashlocal.com` with working webhooks.

**5.1 — Create `vercel.json`** (optional but explicit)
```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**5.2 — Update `next.config.ts`**
- Add `experimental: { serverActions: { allowedOrigins: ["flashlocal.com", "*.flashlocal.com"] } }` so server actions work across tenant subdomains
- Verify image `remotePatterns` includes Supabase Storage URL

**5.3 — Run Supabase migrations on prod**
- `supabase link --project-ref <prod-ref>`
- `supabase db push`
- Verify with spot check queries

**5.4 — Configure Stripe webhook for prod**
- Add endpoint in Stripe dashboard
- Copy signing secret to Vercel env
- Test with Stripe CLI: `stripe trigger checkout.session.completed`

**5.5 — Configure Cloudflare DNS**
- Add A/CNAME records per Section 1
- Enable proxying (orange cloud) for flashlocal.com root, `*` wildcard, `www`
- Set SSL to "Full (strict)"

**5.6 — Smoke test production**
- Visit `flashlocal.com` — landing renders
- Sign up → wizard → publish (test mode)
- Customer books → Stripe Checkout → webhook confirms
- Verify dashboard shows the booking

---

### Phase 6 — P1 Polish

**6.1** Persist wizard state in `sessionStorage` keyed by step (file: `app/start/wizard.tsx`) — hydrate on mount
**6.2** Replace hardcoded "120+ seasonal crews" in `app/page.tsx` with honest copy: "Built for the 2026 season"
**6.3** Add loading skeletons to dashboard pages (shadcn Skeleton component)
**6.4** Add error boundaries: `app/dashboard/error.tsx`, `app/site/[slug]/error.tsx`
**6.5** Add rate limiting on `/api/bookings/create` and `/api/reviews` (use Vercel's `@upstash/ratelimit` or Supabase-backed token bucket)

---

## Section 3: Top 5 Zero-to-Revenue Fluidity Improvements

These go beyond bug fixes — they're what transforms Flash Local from "a working tool" into "the fastest path from signup to first payment in the industry."

### 3.1 — AI-Powered Instant Site Generation from a Single Input

**Problem**: Even with fixes, the wizard has 7 steps and requires the provider to write headlines, descriptions, package names, and pricing. This is a cognitive load that kills conversion.

**Fix**: Replace steps 2-4 with a single input: *"Tell us about your business in one sentence."* Example: "I hang Christmas lights in Austin, Texas." From that + a vertical selection:
- Auto-generate headline ("Austin's professional holiday light installers")
- Auto-generate description (3 sentences of conversion-optimized copy)
- Auto-generate 3 service packages with realistic local pricing (Basic/Standard/Premium)
- Auto-suggest service radius based on city
- Use Claude Haiku for speed + cost — each generation is ~$0.002

**Implementation**: New server action `generateSiteContent({ vertical, businessDescription, serviceArea })` that calls Anthropic API with a tuned prompt + ICP-specific pricing data. Show the generated content inline with "edit" icons — providers can tweak but don't *have* to.

**Impact**: Reduces wizard time from ~10 minutes to ~2 minutes. Removes the "blank page" problem that makes providers abandon.

---

### 3.2 — Phone-First Onboarding (SMS Magic Link)

**Problem**: Email/password signup has friction — especially for small business owners who may forget passwords or not check email often.

**Fix**: Primary signup path is phone number → SMS OTP via Supabase Auth's phone provider (already supported via Twilio/MessageBird). Email is captured as a secondary field later. This mirrors how providers already operate (phones are their primary device + lifeline).

**Secondary wins**:
- SMS-based booking notifications (provider gets texts on new bookings)
- Customer sees SMS "booking confirmed" for higher trust than email
- No password reset support burden

**Implementation**: Enable Phone provider in Supabase Auth dashboard. Update `app/signup/page.tsx` to use phone-first flow. Add Twilio integration in `lib/sms/` for outbound notifications. Use shadcn `InputOTP` component for the code input.

---

### 3.3 — Pre-Filled Templates Per Vertical (ICP-Aware)

**Problem**: Providers in different verticals have radically different needs (holiday lights is seasonal/urgent; tree removal is regulated/safety-focused; gift wrapping is gift-giving). Generic templates don't convert.

**Fix**: When a provider picks their vertical, the wizard pre-fills packages, headlines, trust signals, and FAQ entries from a vertical-specific template. Each of the 20 ICP subagents (Section 5) owns its vertical's defaults.

**Implementation**: 
- Create `lib/verticals/{vertical_id}.ts` files with typed `VerticalTemplate` (packages, copy, faq, trust_badges, booking_form_fields)
- Extend `DEFAULT_PACKAGES` in `lib/onboarding/types.ts` to cover all 20 verticals (currently only 2)
- When `step-service` completes, hydrate `step-pricing` with vertical defaults
- Seed the DB with `vertical_templates` table for dynamic updates

**Impact**: Providers see "oh — these people *get* my business" within 30 seconds. Psychological trust → completion rates go up.

---

### 3.4 — "Test Drive" Mode (Site Preview Before Signup)

**Problem**: The current flow forces signup before the provider sees what they're buying. High drop-off.

**Fix**: On the landing page, add an "Instant Preview" widget. Enter business name + vertical → show a live-rendered microsite preview on a fake subdomain (e.g., `preview.flashlocal.com/demo/{random-token}`). The preview has a "Claim this site" CTA that jumps straight into signup with the data pre-populated.

**Implementation**:
- New route `app/demo/[token]/page.tsx` that renders the microsite shell with generated content
- Store preview data in a short-lived `site_previews` table (24h TTL)
- The CTA creates a real provider from the preview data, pre-fills the wizard
- Track preview→signup conversion as a KPI

**Impact**: Providers "feel" the value before committing. Dramatically increases landing → signup → completion rate.

---

### 3.5 — One-Tap Stripe Express Onboarding (Deferred to First Booking)

**Problem**: Even with all fixes, a provider has to complete Stripe Connect Express onboarding (bank details, ID verification) before they can receive their first payment. Friction.

**Fix**: Let REV_SHARE providers publish their site immediately. The first time a customer books, hold the payment in the platform Stripe account (escrow-style). Send the provider a time-sensitive SMS/email: *"You just got your first $240 booking! Verify your bank in 60 seconds to receive your $204 payout."* This converts signup motivation → payout motivation, which is 10x stronger.

**Implementation**:
- `publishSite()` for REV_SHARE does not require Connect
- First customer booking stores the payment in platform account with `pending_provider_id` metadata
- On `checkout.session.completed`, if provider has no `stripe_account_id`, mark booking as `PENDING_PAYOUT` and fire SMS/email
- When provider completes Connect, run reconciliation job to transfer held funds minus platform fee
- Display in dashboard: "You have $X in pending payouts — verify your bank to release"

**Impact**: Dramatically lowers signup friction (no "bank verification" step) while creating a strong pull-through signal when the first sale happens.

---

## Section 4: 5 Ways to Make the Offering Nearly Irresistible

These are pricing/positioning/trust mechanics — not code fixes — that turn "interesting product" into "no-brainer signup."

### 4.1 — "$0 to $500 in 7 Days or Your Setup Fee Back" Guarantee

**Mechanic**: For UPFRONT plan ($99), guarantee that the provider receives at least $500 in bookings within 7 days of going live, or they get their setup fee refunded in full. For REV_SHARE, guarantee "first booking in 14 days or we waive your first 3 months of platform fees."

**Why it works**: Converts the buying decision from "will this work?" to "what do I have to lose?" The guarantee itself is the offer.

**Risk mitigation**: Only extend the guarantee to providers who complete all onboarding steps (verify business, upload 3+ photos, share site on at least one platform) — filters out uncommitted users. Track success rate; if real, it becomes the #1 marketing asset.

---

### 4.2 — Zero-Risk "Done-For-You" Onboarding Concierge

**Mechanic**: Offer a 30-minute concierge call (free with UPFRONT, $49 add-on for REV_SHARE) where a human walks the provider through site setup, GBP claim, and first social post — live over Zoom while they watch. Position as: *"We'll build your entire online presence while you're on the phone with us."*

**Why it works**: Small business owners distrust DIY SaaS. A human touch at the exact moment of maximum friction collapses the "will I actually use this?" anxiety. The $49 add-on prices itself into the revenue — even if only 10% buy, it pays for the whole concierge team.

**Implementation**: Add a checkbox to step 5 of the wizard: "Add 1-on-1 Setup Call — $49" (free for UPFRONT). On submit, schedule via Cal.com API. Concierge uses same dashboard they'd see, just does it with the provider on the call.

---

### 4.3 — "Neighborhood Domination" Geographic Exclusivity (Premium Tier)

**Mechanic**: Introduce a third tier — **Territory Plan** at $299 upfront + 10% rev-share — that guarantees the provider is the *only* Flash Local listing in their ZIP code for their vertical for the season. Scarcity: "Only one holiday lights installer per ZIP code. Lock yours now."

**Why it works**: Plays on territorial instinct + FOMO. Providers in competitive markets (Austin, LA, NYC suburbs) will pay a premium for exclusivity. Also naturally limits supply and creates urgency ("2 ZIP codes left in your area").

**Implementation**: New field `providers.territory_locked_zips text[]`. Landing page shows a live map: "Available ZIPs in your area." When a Territory customer signs up, their ZIPs become unavailable to all other providers in the same vertical.

---

### 4.4 — "First Booking Free" Money-Back for Customers (Trust Multiplier)

**Mechanic**: On the customer side (microsite), prominently display: *"First-time booking guarantee — not satisfied? Full refund, no questions asked."* Flash Local covers the refund out of platform fees for the first 30 days of a provider's life.

**Why it works**: Customers booking a new local service provider are risk-averse (especially for home-touching services like light installation or tree work). The platform-backed guarantee transfers risk from the customer to Flash Local, which removes the biggest booking blocker. Provider's conversion rate on their microsite jumps 30-50%.

**Implementation**: Add "Flash Local Guarantee" badge component to `app/site/[slug]/page.tsx`. Create `refund_requests` table with admin workflow. Absorb refund cost for first 30 days post-activation, then provider can opt-in to continue guarantee coverage as a differentiator.

---

### 4.5 — "Pay If You Book" Reverse Pricing for REV_SHARE

**Mechanic**: Take the rev-share model's natural advantage and make it the headline. Current copy says "15% platform fee." Reframe as: **"You don't pay us anything until a customer pays you. Ever."** Put this on the landing page, signup page, and every touchpoint. Make "no risk, ever" the emotional hook.

**Why it works**: The rev-share model *is* already the irresistible part — it's just buried. The psychology of "you only pay if you make money" is the strongest offer in SaaS. Providers who would never pay $99 upfront will sign up in 60 seconds for "no money until you earn."

**Implementation**: 
- Rewrite landing page hero: "Get booked online. Get paid. $0 until your first job."
- Make REV_SHARE the default plan (currently marked "Most Popular" — promote it harder)
- Remove UPFRONT plan from main landing page; make it an upsell later ("Want to keep 100% of your revenue? Switch to Launch anytime.")
- Show a live counter on landing: "$X paid out to providers this month"

---

## Section 5: 20 Detailed ICP Subagents

Each ICP below is designed to become a Claude Code subagent at `.claude/agents/icp-{slug}.md`. Each agent specializes in generating onboarding content, landing copy, pricing packages, and marketing assets for that vertical. The structure is: **Persona → Pains → Packages → Season → Marketing Angle → Site Copy**.

These 20 cover the full spectrum of seasonal/on-demand residential services. They're ordered roughly by opportunity size.

---

### ICP 1 — Holiday Lights Installer ("Mike the Light Guy")

- **Persona**: 28-50, owns a pickup truck, runs a 1-3 person crew, does this Oct-Jan only. May have a day job (landscaper, painter, construction) in the off-season.
- **Pains**: No professional online presence; loses jobs to Nextdoor posts; customers want to see pricing but crews hate giving quotes; payment collection is inconsistent (half cash, half Venmo).
- **Packages**: Classic Roofline ($399) · Full Display ($799) · Luxury Estate ($1,499+) · Takedown add-on ($99)
- **Season**: Install Oct 1 - Dec 15, takedown Jan 5 - Jan 31
- **Marketing Angle**: "Your neighbors are booking now. Lock in your spot before Thanksgiving."
- **Site Copy Hook**: "Professional installers. Commercial-grade lights. 5-year bulb warranty. Book in 60 seconds."
- **Urgency**: Calendar fills by Nov 1 in most markets — surface real scarcity.

---

### ICP 2 — Exterior Holiday Decorator ("Wreaths & Garlands")

- **Persona**: 30-55, often a second income for a stay-at-home parent or retired florist; artistic, detail-oriented; small team or solo.
- **Pains**: Customers want Instagram-worthy displays but can't communicate what they want; pricing is hard because each home is unique; delivery + install logistics.
- **Packages**: Door & Window Refresh ($249) · Full Front Exterior ($599) · Magazine Cover ($1,299)
- **Season**: Oct 15 - Dec 20
- **Marketing Angle**: "Pinterest-perfect holiday exterior, installed in one afternoon."
- **Site Copy Hook**: "Before-and-after gallery. Custom themes. We bring everything."

---

### ICP 3 — Tree Pickup & Delivery (Live Christmas Trees)

- **Persona**: 25-45, often a high school coach or church group running as fundraiser, or a landscape company looking for November-December revenue.
- **Pains**: Unpredictable demand spikes; deliveries need scheduling; trees are bulky and fragile; payment for delivery separate from tree.
- **Packages**: 6-7ft Fraser Fir Delivered ($149) · 7-8ft Noble ($199) · Install in Stand Add-On ($25) · Recycling Pickup ($35)
- **Season**: Black Friday - Dec 23 (delivery); Dec 26 - Jan 10 (recycling pickup)
- **Marketing Angle**: "Freshly cut farm tree, delivered to your door. Never go to a lot again."
- **Site Copy Hook**: "Order by 6pm, delivered tomorrow. Freshness guaranteed or your money back."

---

### ICP 4 — Tree Removal & Disposal

- **Persona**: 35-60, insured arborist or landscape company; high skill, high insurance cost, high job value.
- **Pains**: Quotes require site visits; insurance verification is a trust issue for customers; dead trees are seasonal (storm damage, fall cleanup).
- **Packages**: Single Tree (up to 30ft) ($599) · Hazardous Large Tree ($1,499+) · Stump Grinding ($199) · Emergency Storm Response ($899)
- **Season**: Year-round with peaks Oct-Dec (fall cleanup) and May-Jul (storm season)
- **Marketing Angle**: "Licensed, insured, bonded. Same-day quotes. We haul it away."
- **Site Copy Hook**: "$2M liability insurance. Certified arborist on every job. 24hr emergency response."

---

### ICP 5 — Gift Wrapping Service

- **Persona**: 25-45, often crafty/creative stay-at-home parent or Etsy seller; low overhead; works from home or pop-up at malls.
- **Pains**: Hyper-seasonal (Nov-Dec only); pricing psychology is tricky; delivery vs drop-off logistics.
- **Packages**: Small Gift ($8) · Medium ($15) · Large/Odd Shaped ($25) · In-Home Service per hour ($65) · Corporate Gift Wrapping (bulk)
- **Season**: Nov 25 - Dec 24
- **Marketing Angle**: "Your gifts, wrapped beautifully, without the paper cuts."
- **Site Copy Hook**: "We pick up, wrap, and deliver. You just tell us who it's for."

---

### ICP 6 — NYE Cleanup Crew

- **Persona**: 22-35, college students or a small cleaning company looking for one-night high-margin work.
- **Pains**: Only one night a year; need to book the crew AND the customers in the same tight window; alcohol/glass hazard insurance.
- **Packages**: House Party Cleanup (up to 50 guests) ($299) · Large Event (50-150) ($599) · Corporate/Venue ($1,299+)
- **Season**: Dec 28 - Jan 2 (with Jan 1 being the big day)
- **Marketing Angle**: "Wake up to a spotless house on Jan 1. We come, you sleep."
- **Site Copy Hook**: "$100 deposit holds your spot. We arrive at your chosen time between 10am-4pm."

---

### ICP 7 — Party Setup & Teardown

- **Persona**: 25-45, event rental company or independent event planner expanding services; may already own tables/chairs.
- **Pains**: Every event is custom; transportation + labor intensive; quoting takes forever.
- **Packages**: Backyard Party Setup (tables, chairs, linens) ($299) · Full Tent + Setup ($899) · Teardown Only ($199)
- **Season**: Year-round peak Apr-Oct + holiday parties Nov-Dec
- **Marketing Angle**: "Host the party. Skip the setup."
- **Site Copy Hook**: "We deliver, set up, and clean up. You just enjoy your event."

---

### ICP 8 — Snow Shoveling & De-Ice

- **Persona**: 18-40, students + side-hustlers in snow regions; low equipment cost; weather-driven.
- **Pains**: Unpredictable — can't commit to a schedule until snow falls; pricing per visit vs seasonal contracts; insurance for slip-and-fall liability.
- **Packages**: Per-Visit Walkway + Driveway ($45) · Seasonal Contract (unlimited visits, Nov-Mar) ($399) · Salt/De-Ice Application ($25 per visit)
- **Season**: Nov 1 - Mar 31
- **Marketing Angle**: "Wake up to a clear driveway. Every single snow."
- **Site Copy Hook**: "We watch the forecast so you don't have to. Out before 7am on snow days."

---

### ICP 9 — Junk Hauling & Donation Runs

- **Persona**: 25-50, owns a pickup truck or small trailer; often a moving company side business or someone with a flexible schedule.
- **Pains**: Weight/volume is hard to estimate over phone; disposal fees vary; customers sometimes forget items on day-of.
- **Packages**: 1/4 Truckload ($149) · Half Truckload ($299) · Full Truckload ($499) · Furniture Single Item ($99)
- **Season**: Year-round, peaks in spring (decluttering) and after holidays (gift returns/upgrades)
- **Marketing Angle**: "Same-day pickup. Donations tracked and receipts provided."
- **Site Copy Hook**: "Show us photos. We give you a firm quote. No surprises."

---

### ICP 10 — Holiday Handyman (Last-Minute Fixes)

- **Persona**: 40-60, experienced handyman with existing customer base looking for holiday-specific marketing.
- **Pains**: Seasonal spike in in-laws-coming-over small repairs; jobs are tiny but customers are desperate so margin is high; scheduling chaos.
- **Packages**: 1-Hour Visit ($129) · Half-Day Project ($299) · Emergency Same-Day ($249)
- **Season**: Nov 15 - Dec 24 (pre-holiday) and Jan 2 - Feb 14 (post-holiday repairs)
- **Marketing Angle**: "In-laws arriving Friday? Squeaky door? Broken handle? We fix it today."
- **Site Copy Hook**: "Book by noon, we're there by 5pm. Holiday rates guaranteed."

---

### ICP 11 — Gutter Cleaning (Fall/Spring)

- **Persona**: 25-50, solo operator with ladder/blower/vacuum truck; often a painter or roofer in off-season.
- **Pains**: Weather-dependent; roof pitch changes pricing; damaged gutters become upsell opportunity; safety/insurance critical.
- **Packages**: Single-Story Home ($179) · Two-Story Home ($249) · Gutter Guards Install ($499+)
- **Season**: Mar-May (spring clean) and Oct-Dec (fall leaves)
- **Marketing Angle**: "Cleaned, flushed, and photographed — you see every inch."
- **Site Copy Hook**: "Fully insured. Ground-up vacuum (no mess). Before/after photos with every job."

---

### ICP 12 — Lawn Aeration & Overseeding (Fall Prep)

- **Persona**: 30-55, landscape company looking for recurring fall revenue; owns commercial aerator.
- **Pains**: Narrow application window; customer education on why it matters; upsell from basic mowing customers.
- **Packages**: Core Aeration (up to 5000 sqft) ($149) · Aerate + Overseed ($249) · Winterize Package (aerate + seed + fertilize) ($349)
- **Season**: Sep 1 - Nov 15 (fall) and Mar 15 - May 15 (spring)
- **Marketing Angle**: "The #1 thing you can do for next year's lawn."
- **Site Copy Hook**: "Plugs removed. New seed down. Fertilizer applied. One visit, done right."

---

### ICP 13 — Pool Opening & Closing

- **Persona**: 30-60, pool company or trained technician; seasonal income peaks.
- **Pains**: Customers call the same week — scheduling crunch; winterization vs opening have different tool needs; chemistry mistakes create liability.
- **Packages**: Pool Opening Basic ($399) · Opening + Chemical Balance ($499) · Closing + Winterize ($449) · Spring Start-Up + Cleaning ($599)
- **Season**: Apr 1 - May 31 (opening) and Sep 15 - Oct 31 (closing)
- **Marketing Angle**: "From green to crystal clear in one visit."
- **Site Copy Hook**: "Certified pool technicians. Chemical balance guaranteed. Book your spot before the rush."

---

### ICP 14 — Mobile Auto Detailing

- **Persona**: 22-40, 1-2 person team with a van and mobile setup (water tank, steam cleaner); often owner-operator building toward brick-and-mortar.
- **Pains**: Scheduling back-to-back across a city; weather-dependent; upselling interior vs exterior packages.
- **Packages**: Express Wash ($49) · Full Detail ($199) · Premium Detail + Ceramic Spray ($349) · Fleet/Multiple Vehicles (custom)
- **Season**: Year-round, peaks in spring
- **Marketing Angle**: "We come to your driveway. Your car looks brand new. You don't lift a finger."
- **Site Copy Hook**: "Water + power + soap — we bring everything. No mess, no hassle."

---

### ICP 15 — Pressure Washing (Houses, Driveways, Decks)

- **Persona**: 25-50, low-capital startup with a commercial pressure washer; often expands into soft-washing for roof/siding.
- **Pains**: Customer doesn't know sqft; "quick job" expectations vs reality; residue stains on surfaces from chemicals.
- **Packages**: Driveway Only ($149) · Full House Exterior (soft wash) ($349) · Deck + Patio ($249) · Whole House Package ($599)
- **Season**: Mar - Nov
- **Marketing Angle**: "Your house, restored to new. Without breaking your budget."
- **Site Copy Hook**: "Soft-wash chemistry (no damage). Before/after photos. 30-day satisfaction guarantee."

---

### ICP 16 — Chimney Sweeping & Inspection

- **Persona**: 35-60, CSIA-certified sweep; high-trust, low-volume business.
- **Pains**: Customers only call when there's a problem; education on preventative service is hard; safety certifications matter but are invisible online.
- **Packages**: Sweep + Inspection ($199) · Sweep + Level 2 Inspection ($349) · Cap Install ($199) · Liner Repair (custom)
- **Season**: Aug 15 - Dec 31 (pre-winter) and Mar - May (spring cleaning)
- **Marketing Angle**: "Don't burn your house down this winter. Book your sweep before October."
- **Site Copy Hook**: "CSIA-certified. Full camera inspection. 45-minute appointment."

---

### ICP 17 — Firewood Delivery

- **Persona**: 30-60, rural/semi-rural property owner with woodlot or partnership with tree service; truck + splitter.
- **Pains**: Heavy/dirty product; measuring cords/face cords is confusing; delivery logistics.
- **Packages**: 1/4 Cord ($125) · 1/2 Cord ($225) · Full Cord ($399) · Stack Add-On ($50)
- **Season**: Sep 1 - Mar 31
- **Marketing Angle**: "Seasoned hardwood. Delivered. Stacked. Ready to burn."
- **Site Copy Hook**: "Local split & seasoned. 15-month dry guarantee. Delivery in 48 hours."

---

### ICP 18 — Moving Help (Labor Only)

- **Persona**: 20-40, gig workers or small moving company offering "load/unload only" (customer rents U-Haul).
- **Pains**: Scheduling reliability; physical demand means crew turnover; pricing by hour vs flat rate.
- **Packages**: 2-Hour Load/Unload ($199) · Half-Day (4hr) ($349) · Full-Day (8hr) ($599)
- **Season**: Year-round peak May-Sep
- **Marketing Angle**: "Two strong movers. Two hours. $199. Done."
- **Site Copy Hook**: "We bring dollies, straps, and muscle. You rent the truck. Fast and friendly."

---

### ICP 19 — Pet Waste Removal ("Poop Scoop")

- **Persona**: 22-45, solo operator with a bucket and determination; surprisingly high-margin recurring revenue.
- **Pains**: Tough to sell without humor; customers forget to pay subscriptions; scheduling reliability.
- **Packages**: One-Time Cleanup ($49) · Weekly Service ($25/wk) · Bi-Weekly ($35/visit) · Monthly Deep Clean ($79)
- **Season**: Year-round, peak after winter thaw
- **Marketing Angle**: "We scoop the poop. You enjoy your yard again."
- **Site Copy Hook**: "Your dogs will never miss us. Your yard will. Weekly service from $25."

---

### ICP 20 — Small Engine Repair (Mowers, Snowblowers, Generators)

- **Persona**: 40-70, retired mechanic or small shop; mobile or drop-off; trusted in community.
- **Pains**: Seasonality — mowers in summer, snowblowers in winter; diagnosing over phone is impossible; parts supply chains.
- **Packages**: Tune-Up + Blade Sharpen ($99) · Diagnostic + Basic Repair ($149) · Snow Blower Pre-Season Prep ($129) · Pickup & Delivery Add-On ($49)
- **Season**: Apr-Jun (mower season) and Oct-Dec (snowblower season)
- **Marketing Angle**: "Before the first snow. Before the first cut. Get it running right."
- **Site Copy Hook**: "We come to you. Tune-ups in 1 hour. Same-day repairs when possible."

---

### Subagent File Structure

Each ICP becomes a file at `.claude/agents/icp-{vertical-slug}.md` with this frontmatter:

```markdown
---
name: icp-holiday-lights
description: Generates onboarding content, site copy, packages, and marketing angles specifically for holiday light installation businesses. Use when a provider selects the "holiday-lights" vertical or when generating content for this ICP.
model: haiku
tools: Read, Grep
---

You are the Holiday Lights ICP specialist for Flash Local. When asked to generate content, packages, or marketing copy, apply the following persona:

[Full persona, pains, packages, season, angles, copy from Section 5.]

When asked to generate a microsite, produce:
- 1 headline (under 12 words)
- 1 subheadline (under 25 words)
- 3-4 service packages with realistic pricing for the given city
- 4-6 FAQ entries
- A trust signals list (insurance, warranty, crew size, etc.)

Output as typed JSON matching the `VerticalTemplate` schema in `lib/verticals/types.ts`.
```

These subagents can be invoked from the wizard via `generateSiteContent` (Section 3.1) to produce tailored content at runtime, or used by humans at `/dashboard/site` to regenerate copy variants.

---



## Section 6: Execution Order & Summary

### Critical Path (Minimum Viable Launch)

This is the absolute minimum sequence to reach a working production state:

```
Phase 1 (Auth)  ──┐
                  ├──▶ Phase 2 (Payments) ──▶ Phase 3 (Dashboard) ──▶ Phase 5 (Deploy)
                  │                                                        │
Phase 4 (Email) ──┘                                                        │
                                                                           ▼
                                                              ✅ LIVE + TAKING PAYMENTS
```

**Serial dependencies**: Phase 1 blocks everything downstream (auth is the foundation). Phase 2 depends on Phase 1 for user identity. Phase 3 depends on Phase 1 for provider context. Phase 5 depends on all code being in place.

**Parallelizable**: Phase 4 (email) can be built in parallel with Phase 3 (dashboard) once Phase 1 is done.

### What to Build First (Day-by-Day)

| Day | Focus | Key Deliverables |
|-----|-------|-----------------|
| 1 | Phase 1 — Auth | `@supabase/ssr` integrated, middleware guard, session helpers, wizard passes userId |
| 2 | Phase 2 — Payments | Upfront checkout redirect, REV_SHARE activation, Connect DB lookup fix |
| 3 | Phase 3a — Dashboard (Overview, Bookings, Orders) | Real queries replacing demo data |
| 4 | Phase 3b — Dashboard (Reviews, Site, Settings, Ads) + mobile nav | All 8 pages live |
| 5 | Phase 4 — Email integration | Resend + all 4 transactional templates + hooks |
| 6 | Phase 5 — Production deploy + smoke tests | Vercel + Cloudflare DNS + Stripe webhook live |
| 7 | Phase 6 — Polish (P1 items) + Gate 6 security review | Wizard persistence, loading states, rate limiting |

### What Can Ship After Launch (Enhancement Phase)

- Section 3 fluidity improvements (AI site generation, phone-first signup, test drive mode, deferred Connect)
- Section 4 offering enhancements (guarantee, concierge, territory, customer refund, reverse pricing reframe)
- Section 5 ICP subagents (create `.claude/agents/icp-*.md` files, hook into wizard)
- P2 items (GBP API integration, ads backend, rate limiting, CSRF)

### Files Being Modified (At-a-Glance)

**Phase 1** (auth foundation):
- `package.json` (add @supabase/ssr)
- `lib/supabase/server.ts` (rewrite)
- `lib/supabase/client.ts` (rewrite)
- `middleware.ts` (add auth guard)
- `lib/auth/session.ts` (new)
- `app/start/wizard.tsx` + `app/start/steps/step-payments.tsx` (pass userId)
- `app/dashboard/layout.tsx` (proper sign-out)

**Phase 2** (payments):
- `app/start/steps/step-payments.tsx` (Upfront checkout redirect)
- `lib/onboarding/actions.ts` (activate REV_SHARE on publish)
- `app/api/checkout/create/route.ts:60-71,186-187` (Connect DB lookup)
- `app/dashboard/connect/page.tsx` + `connect-content.tsx` (provider_id from auth)

**Phase 3** (dashboard):
- `app/dashboard/page.tsx` (overview queries)
- `app/dashboard/bookings/page.tsx` + new `bookings-content.tsx`
- `app/dashboard/orders/page.tsx` + new `orders-content.tsx`
- `app/dashboard/reviews/page.tsx` + new `reviews-content.tsx`
- `app/dashboard/site/page.tsx` (real data + save action)
- `app/dashboard/settings/page.tsx` (real data + save action)
- `app/dashboard/ads/page.tsx` (real data + save action)
- `app/dashboard/layout.tsx` (mobile nav)

**Phase 4** (email):
- `package.json` (add resend)
- `lib/email/client.ts` (new)
- `lib/email/templates/*.tsx` (4 new)
- `lib/email/send.ts` (new)
- `app/api/bookings/create/route.ts` (hook confirmation)
- `app/api/reviews/request/route.ts` (hook review email)
- `app/api/stripe/webhook/route.ts` (hook payment-confirmed)

**Phase 5** (deploy):
- `vercel.json` (new)
- `next.config.ts` (update server actions origins)
- Cloudflare DNS records (external)
- Stripe dashboard webhook (external)
- Supabase migrations run (external)

**Phase 6** (polish):
- `app/start/wizard.tsx` (sessionStorage)
- `app/page.tsx` (honest social proof)
- `app/dashboard/*/loading.tsx` (new — skeleton states)
- `app/dashboard/error.tsx` (new)
- `app/site/[slug]/error.tsx` (new)
- `middleware.ts` or new `lib/rate-limit.ts` (rate limiting)

---

## Section 7: Verification Plan

### Gate 1 — Auth Foundation Works (after Phase 1)

- [ ] `npm run type-check` passes
- [ ] Visit `/dashboard` while logged out → redirects to `/login`
- [ ] Log in → land on `/dashboard` → Network tab shows a Supabase session cookie
- [ ] Sign out → session destroyed → `/dashboard` redirects again
- [ ] Complete signup → land on `/start` → user is authenticated → `createProvider` in `lib/onboarding/actions.ts` receives a real user ID (verify in Supabase: `providers.owner_user_id` is a real UUID, not `00000000-...`)

### Gate 2 — Payment Flow Works (after Phase 2)

- [ ] **UPFRONT E2E**: Sign up → wizard → step 5 → Stripe Checkout loads → pay with `4242 4242 4242 4242` → webhook fires → provider status flips to `ACTIVE` → wizard resumes at step 6 → publish → microsite loads at `<slug>.flashlocal.com`
- [ ] **REV_SHARE E2E**: Sign up → wizard → step 5 completes without Stripe redirect → step 6 publishes → provider status flips to `ACTIVE` in `publishSite()` → microsite loads
- [ ] **Connect onboarding**: REV_SHARE provider → Dashboard → Payouts → Connect button → Stripe Express onboarding loads → complete with test info → return to dashboard → "Connected" badge shows
- [ ] **Customer booking**: Book on a REV_SHARE provider's microsite → Stripe Checkout shows correct amount → pay → webhook fires → application fee is 15% → `orders.provider_payout_cents` + `orders.application_fee_cents` are populated correctly

### Gate 3 — Dashboard Shows Real Data (after Phase 3)

- [ ] Every dashboard page fetches from Supabase (not demo arrays) — verify Network tab shows DB queries
- [ ] Create a test booking → appears in `/dashboard/bookings` for the correct provider only
- [ ] Create a test order → appears in `/dashboard/orders` with correct amounts
- [ ] Edit site headline in `/dashboard/site` → save → refresh → change persists
- [ ] Edit display name in `/dashboard/settings` → save → refresh → persists
- [ ] Toggle ads enabled in `/dashboard/ads` → save → persists
- [ ] Another provider's data does NOT appear (RLS check — test with two accounts)

### Gate 4 — Email Works (after Phase 4)

- [ ] Customer books a service → receives confirmation email within 30 seconds
- [ ] Provider receives new-booking alert email
- [ ] Provider sends review request → customer receives email with working token link → customer submits review → review appears on microsite
- [ ] New provider signup → welcome email arrives

### Gate 5 — Production Deploy Works (after Phase 5)

- [ ] `flashlocal.com` loads landing page
- [ ] `www.flashlocal.com` redirects to apex
- [ ] Sign up on production → full wizard → publish → microsite loads at `<slug>.flashlocal.com`
- [ ] Stripe webhook endpoint shows "Healthy" in Stripe dashboard (no failed deliveries)
- [ ] Supabase connection pool is stable under load
- [ ] Vercel logs show no runtime errors over a 1-hour window

### Gate 6 — Security Sanity Checks

- [ ] `SUPABASE_SERVICE_ROLE_KEY` only used in API routes and server actions (grep for leaks)
- [ ] Providers cannot read other providers' data (RLS test with 2 accounts)
- [ ] Webhook signature validation cannot be bypassed (manually POST without signature → 400)
- [ ] Duplicate Stripe event delivery is ignored (replay event ID → second call returns `deduped: true`)
- [ ] No service role key in client bundles (inspect production JS via DevTools)

### Manual Smoke Test Script

Run this full sequence on every deploy:

1. **Cold visit**: Incognito → `flashlocal.com` → landing renders with all sections
2. **Signup**: Create new account with a unique email
3. **Wizard**: Complete all 7 steps (REV_SHARE plan, pick vertical, set brand + pricing, create, publish, skip GBP)
4. **Microsite**: Visit the published site → renders correctly
5. **Customer flow**: Open a second browser → book a package on that microsite → pay
6. **Dashboard**: Back in first browser → booking appears in `/dashboard/bookings`
7. **Connect**: Complete Stripe Connect onboarding → payment routes correctly next time
8. **Review**: Mark booking complete → send review request → use token link → submit review → appears on microsite
9. **Sign out + back in**: Session persists correctly

---

## Ready for Implementation

This plan is complete and ready to execute. The recommended execution order is:

1. Start on branch `claude/audit-production-readiness-Yx8BY` (already active)
2. Work Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 in strict order (dependencies require it)
3. After each Phase, run the corresponding Gate checklist before moving on
4. Commit at the end of each Phase for rollback safety
5. Push to the remote branch after Phases 1-4 complete locally (leave Phase 5 deploy for a live session with the user present)

**Sections 3-5 (fluidity, offering, ICPs) are strategic enhancements — they do NOT block launch.** Ship the core fixes first, then layer these in based on real user feedback and conversion data.

The critical insight: Flash Local's architecture is actually *good*. The fixes are unglamorous wiring work — session cookies, checkout redirects, provider_id prop drilling, DB queries replacing demo arrays. None of this is fundamentally hard. It's approximately 5-7 days of focused execution to reach revenue-generating production state.



