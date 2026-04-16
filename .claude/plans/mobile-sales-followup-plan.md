# Implementation Plan: Mobile Sales Capability Follow-Up

**Branch:** `claude/mobile-sales-capability-oZSBw`
**Predecessor:** feat: add mobile sales rep system (commit 72552f8)
**Scope:** Close the gaps identified in the initial sales rep build so the system is production-ready.

## Gaps to close

From the initial build's "What's still needed" list:

1. **Google Places API integration** — actual lead sourcing from Maps
2. **Claim email flow** — rep-enrolled providers need a magic link to claim their account
3. **PWA icons** — real icon assets, not just manifest references
4. **Commission payout automation** — admin approval UI + Stripe Transfer execution
5. **Territory management** — zip/area assignment to prevent rep overlap

## Design decisions

### 1. Google Places integration

**Endpoint:** `POST /api/rep/lead-sources/places-scan`

**Inputs:** `{ query: string, lat: number, lng: number, radius_meters: number, vertical_id?: string }`

**Flow:**
- Server-side call to Google Places API Text Search + Place Details
- For each result, run `scoreGooglePlaceLead()` from existing strategies.ts
- Return sorted leads with opportunity scores and pitch angles
- **Cache** results in new `places_scan_results` table (24h TTL) — avoids duplicate API charges if a rep rescans the same area

**Failure mode:** If `GOOGLE_PLACES_API_KEY` is unset, return a stub/mock response with a clear message rather than 500.

**New table:** `places_scan_cache (query_hash, lat, lng, radius, results_json, expires_at)` — opportunistic caching.

### 2. Claim email flow

**Flow:**
- When rep enrolls a business via `/api/rep/enroll`, provider is created with placeholder owner (already done)
- **New:** also create a `provider_claims` record with a signed token + expiry (30 days)
- **New:** send a claim email via Resend with link `/claim/{token}`
- **New:** `/claim/[token]/page.tsx` — shows "A sales rep has set up your business page. Create an account to claim it."
- On successful signup at claim URL, call existing `claimProvider()` to transfer ownership

**New table:** `provider_claims (token, provider_id, email, expires_at, claimed_at, claimed_by_user_id)`

**New files:**
- `lib/email/send.ts` — add `sendClaimInvitation()` function
- `app/api/rep/enroll/route.ts` — create claim record + send email
- `app/api/claim/validate/route.ts` — validate token
- `app/api/claim/complete/route.ts` — finalize claim after signup
- `app/claim/[token]/page.tsx` — claim landing page

### 3. PWA icons

**Decision:** Generate PNG icons from an inline SVG using a build-time script, OR ship an SVG icon and update manifest to reference SVG.

**Chosen approach:** Ship both:
- A single SVG icon (`public/icons/icon.svg`) — scalable, small
- Update `app/manifest.ts` to use `purpose: "any maskable"` with SVG
- For iOS which doesn't support SVG favicons, include a static PNG fallback

Since we can't easily generate PNGs in this environment, we'll:
- Create an SVG-based icon design
- Create a simple monogram icon as SVG
- Update manifest to reference it
- Add a `scripts/generate-pwa-icons.md` note explaining how to rasterize for production

### 4. Commission payout automation

**Admin UI:** `/admin/commissions`
- List of PENDING commissions grouped by rep
- Bulk approve action (changes status PENDING → APPROVED)
- "Pay out approved" action per rep (creates Stripe Transfer, marks PAID)

**Backend:**
- `POST /api/admin/commissions/approve` — batch approve
- `POST /api/admin/commissions/payout` — execute Stripe Transfer for approved rows per rep
- Payout requires rep `stripe_account_id` + `stripe_onboarding_complete`
- On successful transfer, update `paid_at` + `stripe_transfer_id`

**Rep-side Stripe Connect:** add `/api/rep/connect/onboard` endpoint (mirror of provider Connect onboarding) so reps can complete Stripe setup.

### 5. Territory management

**Data model:** `rep_territories (id, rep_id, postal_code, city, region, created_at)`
- Many-to-one with reps (a rep owns multiple postal codes)
- Unique constraint on `postal_code` — no overlap

**Enforcement:**
- On prospect capture, check if `captured_lat/lng` falls in an assigned postal code
- Warn rep (but don't block) if capturing outside their territory
- Admin UI for assigning territories

**Minimal MVP:** postal code-based only (no polygon geofencing in v1). Admin can CRUD rep territory assignments. Scout mode surfaces a warning when outside territory.

## Execution order

1. **Migration `0004`** — `provider_claims`, `places_scan_cache`, `rep_territories` tables + RLS
2. **PWA icons** — SVG icon + manifest update (lowest risk, quickest)
3. **Claim email flow** — enables the rep-enrollment happy path end-to-end
4. **Google Places integration** — fills the lead sourcing surface
5. **Commission payout** — admin UI + Stripe transfer execution
6. **Territory management** — admin CRUD + enforcement in prospect capture
7. **Commit + push**

## Non-goals (explicitly out of scope)

- Polygon-based geofencing (postal code is fine for v1)
- Commission clawback for cancellations/refunds (tracked as future work)
- Multi-platform rep payouts (ACH direct, Zelle, etc.) — Stripe only
- Rep-to-rep hierarchies (manager override commissions) — data model supports `team_id` but no UI

## Risk notes

- **Google Places API costs** — aggressive caching (24h) and user-initiated scans only (no background crawling)
- **Email deliverability** — Resend requires domain verification for non-test; fall back to logging if unconfigured (existing pattern)
- **Stripe Transfer failures** — handle insufficient balance error gracefully; don't mark PAID until transfer succeeds
