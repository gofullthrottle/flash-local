# ADR-0001: Sales Rep Attribution & Field Sales Model

## Status
Accepted

## Context
FlashLocal needs to support a field sales workforce — reps who go door-to-door with tablets/phones, sign up local service providers on the spot, and earn commissions when those providers upgrade to paid tiers. The existing system only supports self-serve provider signup with no concept of who referred whom.

Key requirements:
- Reps need unique referral codes that persist through the signup flow
- Attribution must survive the auth flow (signup → email verify → onboarding)
- Reps need a "sign up on behalf of" mode where the provider claims the account later
- The system must track: which rep, which prospect, which conversion, which commission

## Decision

### Referral Code Flow
1. Each `sales_rep` gets a unique `referral_code` (e.g., `rep-john-smith`)
2. Reps share links like `flashlocal.com/start?ref=rep-john-smith`
3. Middleware captures `?ref=` param and stores it in a cookie (`fl_ref`, 30-day expiry)
4. On provider creation (`createProvider`), the cookie is read and stored:
   - `providers.referred_by_rep_id` → FK to `sales_reps.id`
   - `providers.referral_code_used` → the code string for audit

### Rep-Assisted Onboarding
For in-person signups, a rep-specific onboarding route (`/rep/enroll`) uses:
1. The wizard in "assisted mode" — rep fills in business details
2. Provider is created with a placeholder `owner_user_id` (nil UUID)
3. A claim token is generated and sent to the business owner's email
4. Business owner clicks claim link, creates their account, and `claimProvider()` transfers ownership
5. Rep gets attributed regardless of when the owner claims

### Attribution Table Design
```
providers.referred_by_rep_id  → sales_reps.id (nullable FK)
providers.referral_code_used  → text (audit trail)
prospects.became_provider_id  → providers.id (conversion tracking)
```

## Consequences

**Easier:**
- Clear attribution for every provider signup (self-serve or rep-assisted)
- Reps can work offline (capture prospects) and sync later
- Commission calculation has a reliable trigger point
- Analytics on rep performance, territory coverage, conversion rates

**Harder:**
- Cookie-based attribution can be lost (cleared browser, different device)
- Claim flow adds complexity to onboarding (owner must verify email)
- Rep-provider relationship creates new RLS policy surface area
- Must handle edge cases: rep signs up same business twice, two reps claim same business
