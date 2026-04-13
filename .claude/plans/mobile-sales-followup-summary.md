# Implementation Summary: Mobile Sales Capability Follow-Up

**Branch:** `claude/mobile-sales-capability-oZSBw`
**Plan:** [mobile-sales-followup-plan.md](./mobile-sales-followup-plan.md)
**Status:** All 5 gaps closed; pushed to remote

## What was delivered

### 1. Migration `0004_claims_places_territories.sql`
Adds three new tables + helper functions + RLS:
- `provider_claims` — signed tokens (32-byte hex), 30-day expiry, claim lifecycle tracking
- `places_scan_cache` — 24h TTL cache keyed on SHA-256 hash of `{query,lat,lng,radius}`
- `rep_territories` — postal-code-based assignments with unique constraint (no overlap)
- `rep_for_postal_code(pc)` — helper function for territory lookup
- `increment_rep_earnings(rep_id, amount)` — RPC called by webhook commission minting

### 2. PWA icons (SVG-based)
- `public/icons/icon.svg` — primary icon (lightning bolt + location pin)
- `public/icons/icon-maskable.svg` — maskable variant with safe-zone padding
- `app/manifest.ts` — updated to reference SVG (`type: image/svg+xml`)
- `app/layout.tsx` — adds `<link rel="icon">` + `apple-touch-icon`
- `public/icons/README.md` — documents how to rasterize for older-platform support

SVG keeps icons scalable and small; a note explains how to generate PNGs via `convert` or `@squoosh/cli` for production.

### 3. Claim email flow (end-to-end)
**Backend:**
- `lib/email/send.ts` — new `sendClaimInvitation()` function with branded HTML
- `app/api/rep/enroll/route.ts` — creates `provider_claims` row on enrollment and sends email (marks `email_sent_at`)
- `app/api/claim/complete/route.ts` — validates token + email match, transfers ownership from placeholder UUID (`00000000-...`) to real user, marks claim complete

**Frontend:**
- `app/claim/[token]/page.tsx` — server-rendered claim landing page with provider details + expiry checks
- `app/claim/[token]/claim-actions.tsx` — client component that handles:
  - Not signed in → signup/login buttons with email prefill
  - Signed in with wrong email → switch-account prompt
  - Signed in with correct email → one-click claim → redirect to `/dashboard`

**Safety:**
- Case-insensitive email match (`user.email.toLowerCase() === claim.email.toLowerCase()`)
- Double-claim prevention (409 if `owner_user_id !== PLACEHOLDER`)
- Expired tokens return 410 with rep-contact hint

### 4. Google Places integration
**Backend:**
- `lib/lead-sourcing/places-client.ts` — thin wrapper around Places API (New) Text Search with field-masking for cost efficiency; returns `{ results, configured }` tuple so absent-key case is explicit, not a 500
- `app/api/rep/lead-sources/places-scan/route.ts` — auth-gated scan endpoint with:
  - SHA-256 query hashing for cache key
  - 24h cache hit path (no API call)
  - `scoreGooglePlaceLead()` applied to each result
  - Vertical-specific `pitch_angle` merged in
  - Sorted by `opportunity_score` DESC
  - Graceful fallback returning `{ mock: true }` when key missing

**Frontend:**
- `app/rep/lead-sources/page.tsx` — rep-facing scan UI with:
  - Quick-pick chips for 10 seeded niche verticals
  - Custom query + radius selector (2/5/10/25 km)
  - Results shown with `hot/warm/cold` tier badges and opportunity score
  - Per-result "+ Prospect" button that captures a prospect with one click
- `app/rep/layout.tsx` — new "Lead Sources" nav entry

### 5. Commission payout system
**Rep Connect onboarding (mirrors provider flow):**
- `app/api/rep/connect/route.ts` — `POST` creates Stripe Express account + account link; `GET` syncs `stripe_onboarding_complete` flag
- `app/rep/earnings/connect-button.tsx` — replaces the stub button; kicks off onboarding and redirects to Stripe

**Admin approval & payout:**
- `app/api/admin/commissions/approve/route.ts` — admin-gated batch approval (`commission_ids[]` or `all_pending_for_rep`)
- `app/api/admin/commissions/payout/route.ts` — creates ONE Stripe Transfer per rep covering all their `APPROVED` commissions, marks rows `PAID` with `stripe_transfer_id`
- `app/admin/commissions/page.tsx` — admin page grouping pending/approved by rep, showing Connect-ready status
- `app/admin/commissions/commission-actions.tsx` — client component with "Approve all pending" + "Pay out approved" buttons (with confirmation for payouts)

**Safety:**
- Payout blocked if rep has not completed Stripe Connect (`stripe_onboarding_complete === false`)
- `PAID` status only set AFTER successful `transfers.create` — if the API call throws, commissions stay `APPROVED` for retry
- Admin check in both endpoints via `admin_users` table lookup

### 6. Territory management
**Backend:**
- `app/api/admin/territories/route.ts` — full CRUD (`GET`/`POST`/`DELETE`). Uses `upsert` with `onConflict: postal_code,country` so reassigning an existing code swaps the owner atomically
- `app/api/rep/territory-check/route.ts` — returns `{ in_territory, assigned, owned_by_rep_name? }` for client-side warnings

**Frontend:**
- `app/admin/territories/page.tsx` — admin page listing all assignments grouped by rep
- `app/admin/territories/territory-manager.tsx` — bulk-assign form (multi-postal-code, comma or space separated), per-code removal
- `components/rep/prospect-capture-form.tsx` — postal code input in the collapsible details section, with 500ms-debounced territory check and yellow warning when capturing outside owned territory. Non-blocking by design (warning only)

## Files changed / created

**Migrations**
- `supabase/migrations/0004_claims_places_territories.sql`

**Email**
- `lib/email/send.ts` (edited)

**PWA**
- `public/icons/icon.svg`
- `public/icons/icon-maskable.svg`
- `public/icons/README.md`
- `app/manifest.ts` (edited)
- `app/layout.tsx` (edited)

**Claim flow**
- `app/api/rep/enroll/route.ts` (edited)
- `app/api/claim/complete/route.ts`
- `app/claim/[token]/page.tsx`
- `app/claim/[token]/claim-actions.tsx`

**Places integration**
- `lib/lead-sourcing/places-client.ts`
- `app/api/rep/lead-sources/places-scan/route.ts`
- `app/rep/lead-sources/page.tsx`
- `app/rep/layout.tsx` (edited — added nav entry)

**Commission payout**
- `app/api/rep/connect/route.ts`
- `app/api/admin/commissions/approve/route.ts`
- `app/api/admin/commissions/payout/route.ts`
- `app/admin/commissions/page.tsx`
- `app/admin/commissions/commission-actions.tsx`
- `app/rep/earnings/page.tsx` (edited)
- `app/rep/earnings/connect-button.tsx`

**Territory**
- `app/api/admin/territories/route.ts`
- `app/api/rep/territory-check/route.ts`
- `app/admin/territories/page.tsx`
- `app/admin/territories/territory-manager.tsx`
- `components/rep/prospect-capture-form.tsx` (edited — territory check)

## Environment variables needed

| Key | Used by | Fallback if missing |
|-----|---------|---------------------|
| `GOOGLE_PLACES_API_KEY` | Places scan endpoint | Returns `{ mock: true, results: [] }` — UI shows a yellow banner |
| `RESEND_API_KEY` | Claim email | Logs and skips (existing pattern) |
| `STRIPE_SECRET_KEY` | Rep Connect + payouts | Already required for provider flow |
| `NEXT_PUBLIC_APP_URL` | Claim URL construction | Falls back to `Origin` header, then `https://flashlocal.com` |

## Verification approach

The codebase is missing `node_modules` (npm install hasn't been run in this environment), so `tsc --noEmit` surfaces thousands of pre-existing TS2307/TS2591/TS7026 errors across every file. Filtering for errors **unique to new files** yielded zero real issues — all errors are the same dependency-not-installed class that already affects the pre-existing code.

Smoke-test path once deployed:
1. Run migration 0004
2. Create a rep via `/rep/join` → run `/rep/enroll` on a test business with a real email → verify claim email arrives → open link → claim and land in `/dashboard`
3. Hit `/rep/lead-sources` → scan "pressure washing" near a seeded lat/lng → verify cached results on second hit
4. Simulate a `payment_intent.succeeded` webhook for a referred provider → see commission row in `/admin/commissions` → approve → payout (will require `stripe_onboarding_complete` on the rep, so complete `/api/rep/connect` first)
5. In `/admin/territories`, assign postal codes → in `/rep/prospects`, type a non-owned postal code → see yellow territory warning

## Trade-offs & follow-ups

**Accepted trade-offs**
- **Postal-code territory, not polygon geofencing** — much simpler for v1; reverse-geocoding lat/lng → postal code is a client-side concern (user types the code rather than auto-resolving)
- **Warning, not block** — territory violations surface as yellow warnings rather than hard blocks; lets managers review edge cases
- **SVG icons instead of generated PNGs** — modern browsers fully support, older Android may need PNGs generated per the `icons/README.md`
- **Flat commission rate from `plan_tier_definitions`** — tier upgrade bonuses ($25 PRO, $50 PREMIUM) are described in ADR-0002 but not yet wired (provider tier is currently immutable — upgrade flow is post-MVP)

**Not addressed (intentionally out of scope per plan)**
- Commission clawback for refunds / cancellations
- Manager-override / multi-tier affiliate commissions
- Reverse geocoding lat/lng → postal code
- PNG icon generation at build time
- Rate-limiting on Places scan endpoint (cache provides most protection)

**Future polish**
- Add a `resend_at` action on `/admin` for claim emails that bounced
- Paginate admin commissions page for scale
- Webhook for `account.updated` to auto-update `stripe_onboarding_complete` on the rep
