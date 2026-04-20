-- Sales rep system: roles, attribution, commissions, prospects, plan tiers, scouting
-- Depends on: 0001_flashlocal.sql, 0002_stripe_connect.sql

begin;

-- ============================================================
-- 1. NEW ENUMS
-- ============================================================

-- Plan tier: replaces the binary plan_type with a proper feature ladder
do $$ begin
  create type public.plan_tier as enum ('STARTER','PRO','PREMIUM');
exception when duplicate_object then null; end $$;

-- Prospect status: field-sales pipeline stages
do $$ begin
  create type public.prospect_status as enum (
    'NEW','CONTACTED','INTERESTED','FOLLOW_UP','CONVERTED','LOST'
  );
exception when duplicate_object then null; end $$;

-- Commission status: lifecycle of a commission payout
do $$ begin
  create type public.commission_status as enum (
    'PENDING','APPROVED','PAID','VOIDED'
  );
exception when duplicate_object then null; end $$;

-- Scout session status
do $$ begin
  create type public.scout_session_status as enum ('ACTIVE','PAUSED','COMPLETED');
exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. PLAN TIERS TABLE (feature gating definitions)
-- ============================================================
-- This separates "how you pay" (plan_type: UPFRONT vs REV_SHARE)
-- from "what you get" (plan_tier: STARTER vs PRO vs PREMIUM).

create table if not exists public.plan_tier_definitions (
  tier          public.plan_tier primary key,
  label         text not null,
  monthly_price_cents integer not null default 0,
  features      jsonb not null default '[]'::jsonb,
  max_packages  integer not null default 3,
  custom_domain boolean not null default false,
  priority_support boolean not null default false,
  ads_enabled   boolean not null default false,
  gbp_assisted  boolean not null default false,
  commission_pct numeric(5,2) not null default 10.00,
  created_at    timestamptz not null default now()
);

-- Seed default tier definitions
insert into public.plan_tier_definitions (tier, label, monthly_price_cents, features, max_packages, custom_domain, priority_support, ads_enabled, gbp_assisted, commission_pct)
values
  ('STARTER', 'Starter', 0, '["Microsite", "Booking form", "3 service packages", "Review collection"]'::jsonb, 3, false, false, false, false, 15.00),
  ('PRO', 'Pro', 2900, '["Everything in Starter", "Unlimited packages", "Custom domain", "Google Business Profile setup", "Priority support"]'::jsonb, -1, true, true, false, true, 12.00),
  ('PREMIUM', 'Premium', 7900, '["Everything in Pro", "Automated ad management", "Advanced analytics", "Dedicated onboarding", "API access"]'::jsonb, -1, true, true, true, true, 10.00)
on conflict (tier) do nothing;

-- Add tier column to providers (defaults to STARTER = free baseline)
alter table public.providers
  add column if not exists tier public.plan_tier not null default 'STARTER';

-- ============================================================
-- 3. SALES REPS TABLE
-- ============================================================

create table if not exists public.sales_reps (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references auth.users(id) on delete cascade,
  display_name    text not null,
  phone           text,
  email           citext not null,
  referral_code   text not null unique,
  -- Stripe Connect for rep payouts (same pattern as providers)
  stripe_account_id text unique,
  stripe_onboarding_complete boolean not null default false,
  -- Org/team structure (nullable = independent rep)
  team_id         uuid,
  is_team_lead    boolean not null default false,
  -- Performance
  total_signups   integer not null default 0,
  total_conversions integer not null default 0,
  lifetime_earnings_cents integer not null default 0,
  -- Status
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger sales_reps_set_updated_at
before update on public.sales_reps
for each row execute function public.set_updated_at();

-- Helper function: is the current user a sales rep?
create or replace function public.is_sales_rep()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.sales_reps sr
    where sr.user_id = auth.uid() and sr.is_active = true
  );
$$;

-- Helper: get the current user's sales_rep id
create or replace function public.current_rep_id()
returns uuid language sql stable as $$
  select sr.id from public.sales_reps sr
  where sr.user_id = auth.uid() and sr.is_active = true
  limit 1;
$$;

-- ============================================================
-- 4. PROVIDER ATTRIBUTION (link providers to referring reps)
-- ============================================================

alter table public.providers
  add column if not exists referred_by_rep_id uuid references public.sales_reps(id) on delete set null,
  add column if not exists referral_code_used text;

-- ============================================================
-- 5. PROSPECTS TABLE (pre-signup pipeline / field CRM)
-- ============================================================

create table if not exists public.prospects (
  id              uuid primary key default gen_random_uuid(),
  rep_id          uuid not null references public.sales_reps(id) on delete cascade,
  -- Business info captured in the field
  business_name   text not null,
  contact_name    text,
  phone           text,
  email           citext,
  address         jsonb not null default '{}'::jsonb,
  -- Classification
  vertical_id     text,
  niche_tags      text[] not null default '{}',
  estimated_value_cents integer,
  -- Pipeline state
  status          public.prospect_status not null default 'NEW',
  follow_up_date  date,
  notes           text,
  -- Geolocation of where the prospect was captured
  captured_lat    double precision,
  captured_lng    double precision,
  captured_at     timestamptz not null default now(),
  -- Conversion tracking
  became_provider_id uuid references public.providers(id) on delete set null,
  converted_at    timestamptz,
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger prospects_set_updated_at
before update on public.prospects
for each row execute function public.set_updated_at();

-- Index for rep dashboard queries
create index if not exists idx_prospects_rep_status on public.prospects(rep_id, status);
create index if not exists idx_prospects_follow_up on public.prospects(rep_id, follow_up_date) where follow_up_date is not null;

-- ============================================================
-- 6. COMMISSIONS TABLE (earnings ledger)
-- ============================================================

create table if not exists public.rep_commissions (
  id              uuid primary key default gen_random_uuid(),
  rep_id          uuid not null references public.sales_reps(id) on delete cascade,
  provider_id     uuid not null references public.providers(id) on delete cascade,
  -- What triggered this commission
  trigger_event   text not null, -- 'SIGNUP', 'TIER_UPGRADE', 'BOOKING_REVENUE'
  -- For booking-based commissions: link to the order
  order_id        uuid references public.orders(id) on delete set null,
  -- Amounts
  gross_amount_cents integer not null default 0,
  commission_pct  numeric(5,2) not null,
  commission_cents integer not null default 0,
  -- Status + payout tracking
  status          public.commission_status not null default 'PENDING',
  paid_at         timestamptz,
  stripe_transfer_id text,
  -- Idempotency: prevent duplicate commissions for same event
  idempotency_key text unique,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger rep_commissions_set_updated_at
before update on public.rep_commissions
for each row execute function public.set_updated_at();

create index if not exists idx_commissions_rep_status on public.rep_commissions(rep_id, status);
create index if not exists idx_commissions_provider on public.rep_commissions(provider_id);

-- ============================================================
-- 7. SCOUT SESSIONS (geolocation tracking for field work)
-- ============================================================

create table if not exists public.scout_sessions (
  id          uuid primary key default gen_random_uuid(),
  rep_id      uuid not null references public.sales_reps(id) on delete cascade,
  status      public.scout_session_status not null default 'ACTIVE',
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  -- Summary stats (updated on end)
  total_prospects integer not null default 0,
  total_conversions integer not null default 0,
  distance_meters double precision,
  created_at  timestamptz not null default now()
);

create table if not exists public.scout_breadcrumbs (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.scout_sessions(id) on delete cascade,
  lat         double precision not null,
  lng         double precision not null,
  accuracy    double precision,
  event_type  text not null default 'POSITION', -- 'POSITION', 'PROSPECT_CAPTURED', 'PHOTO'
  metadata    jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_breadcrumbs_session on public.scout_breadcrumbs(session_id, recorded_at);

-- ============================================================
-- 8. NICHE VERTICALS (expanded beyond seasonal-only)
-- ============================================================

create table if not exists public.niche_verticals (
  id          text primary key,
  label       text not null,
  category    text not null, -- 'seasonal', 'home', 'specialty', 'outdoor', 'event'
  icon        text not null default 'wrench',
  avg_job_value_cents integer, -- market data for rep prioritization
  gbp_competition text, -- 'low', 'medium', 'high' — how saturated the local GBP landscape is
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Seed with expanded verticals including high-value niches
insert into public.niche_verticals (id, label, category, icon, avg_job_value_cents, gbp_competition, description)
values
  -- Existing seasonal verticals
  ('holiday-lights',  'Holiday Light Installation', 'seasonal', 'sparkles', 50000, 'medium', 'Residential and commercial holiday lighting'),
  ('exterior-decor',  'Exterior Holiday Decorating', 'seasonal', 'home', 30000, 'low', 'Full exterior holiday decor setup'),
  ('tree-delivery',   'Tree Pickup & Delivery', 'seasonal', 'trees', 15000, 'medium', 'Christmas tree delivery and setup'),
  ('tree-removal',    'Tree Removal & Disposal', 'seasonal', 'trash', 10000, 'medium', 'Post-holiday tree and decor removal'),
  ('gift-wrapping',   'Gift Wrapping', 'seasonal', 'gift', 5000, 'low', 'Professional gift wrapping service'),
  ('nye-cleanup',     'New Year''s Eve Cleanup', 'seasonal', 'party', 20000, 'low', 'Post-event cleanup service'),
  ('party-setup',     'Party Setup & Teardown', 'event', 'tent', 25000, 'low', 'Event setup and breakdown'),
  ('snow-shoveling',  'Snow Shoveling & De-ice', 'seasonal', 'snow', 15000, 'high', 'Snow removal and de-icing'),
  ('junk-haul',       'Junk Haul / Donation Runs', 'home', 'truck', 30000, 'medium', 'Junk removal and donation delivery'),
  ('handyman',        'Holiday Handyman', 'seasonal', 'wrench', 20000, 'high', 'General seasonal handyman services'),
  -- HIGH-VALUE NICHE verticals (the "hidden goldmines")
  ('garage-declutter', 'Garage Decluttering & Organization', 'home', 'archive', 800000, 'low', 'Full garage cleanout, organization systems, donation coordination. $5-15K jobs.'),
  ('estate-cleanout', 'Estate Cleanout', 'home', 'building', 1000000, 'low', 'Full estate/home cleanout for moves, inheritance, downsizing. $5-20K jobs.'),
  ('pressure-wash',   'Pressure Washing', 'outdoor', 'droplets', 40000, 'medium', 'Driveways, siding, decks, fences, patios'),
  ('gutter-clean',    'Gutter Cleaning', 'outdoor', 'filter', 25000, 'medium', 'Residential gutter cleaning and minor repair'),
  ('fence-stain',     'Fence Staining & Repair', 'outdoor', 'fence', 300000, 'low', 'Wood fence staining, sealing, and minor repairs. $1-5K jobs.'),
  ('closet-org',      'Closet & Home Organization', 'home', 'layout', 500000, 'low', 'Professional home organization (closets, pantries, offices). $2-8K jobs.'),
  ('pool-open-close', 'Pool Opening & Closing', 'seasonal', 'waves', 50000, 'medium', 'Seasonal pool opening, closing, and winterization'),
  ('dog-waste',       'Dog Waste Removal', 'home', 'paw-print', 15000, 'low', 'Recurring yard cleanup service. Sticky subscription revenue.'),
  ('window-clean',    'Window Cleaning', 'outdoor', 'sparkle', 35000, 'medium', 'Interior/exterior residential window cleaning'),
  ('dryer-vent',      'Dryer Vent Cleaning', 'home', 'wind', 20000, 'low', 'Dryer vent inspection and cleaning — fire safety angle.'),
  ('mosquito-treat',  'Mosquito & Pest Treatment', 'outdoor', 'bug', 40000, 'medium', 'Yard mosquito/tick barrier treatments. Recurring seasonal.'),
  ('mobile-detail',   'Mobile Auto Detailing', 'specialty', 'car', 25000, 'medium', 'On-location vehicle detailing, ceramic coating'),
  ('pet-portrait',    'Pet Photography', 'specialty', 'camera', 30000, 'low', 'On-location pet and family photography sessions'),
  ('meal-prep',       'Meal Prep & Delivery', 'specialty', 'utensils', 40000, 'low', 'Weekly meal prep service for individuals/families'),
  ('errand-concierge','Errand & Concierge Service', 'specialty', 'clipboard', 20000, 'low', 'Personal assistant / errand running for busy households')
on conflict (id) do nothing;

-- ============================================================
-- 9. RLS POLICIES
-- ============================================================

alter table public.sales_reps enable row level security;
alter table public.prospects enable row level security;
alter table public.rep_commissions enable row level security;
alter table public.scout_sessions enable row level security;
alter table public.scout_breadcrumbs enable row level security;
alter table public.niche_verticals enable row level security;
alter table public.plan_tier_definitions enable row level security;

-- Sales reps: own record + admin
create policy "sales_reps_select_self_or_admin" on public.sales_reps
  for select using (user_id = auth.uid() or public.is_admin());

create policy "sales_reps_insert_self" on public.sales_reps
  for insert with check (user_id = auth.uid());

create policy "sales_reps_update_self_or_admin" on public.sales_reps
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Prospects: own rep's prospects + admin
create policy "prospects_select_own_or_admin" on public.prospects
  for select using (rep_id = public.current_rep_id() or public.is_admin());

create policy "prospects_insert_own" on public.prospects
  for insert with check (rep_id = public.current_rep_id());

create policy "prospects_update_own_or_admin" on public.prospects
  for update using (rep_id = public.current_rep_id() or public.is_admin())
  with check (rep_id = public.current_rep_id() or public.is_admin());

create policy "prospects_delete_own_or_admin" on public.prospects
  for delete using (rep_id = public.current_rep_id() or public.is_admin());

-- Commissions: own rep's commissions + admin
create policy "commissions_select_own_or_admin" on public.rep_commissions
  for select using (rep_id = public.current_rep_id() or public.is_admin());

-- Commissions insert/update: admin or service role only (webhook inserts these)
create policy "commissions_manage_admin_only" on public.rep_commissions
  for all using (public.is_admin()) with check (public.is_admin());

-- Scout sessions: own rep only + admin
create policy "scout_sessions_select_own_or_admin" on public.scout_sessions
  for select using (rep_id = public.current_rep_id() or public.is_admin());

create policy "scout_sessions_insert_own" on public.scout_sessions
  for insert with check (rep_id = public.current_rep_id());

create policy "scout_sessions_update_own" on public.scout_sessions
  for update using (rep_id = public.current_rep_id())
  with check (rep_id = public.current_rep_id());

-- Breadcrumbs: accessible via session ownership
create policy "breadcrumbs_select_via_session" on public.scout_breadcrumbs
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.scout_sessions ss
      where ss.id = scout_breadcrumbs.session_id
        and ss.rep_id = public.current_rep_id()
    )
  );

create policy "breadcrumbs_insert_via_session" on public.scout_breadcrumbs
  for insert with check (
    exists (
      select 1 from public.scout_sessions ss
      where ss.id = scout_breadcrumbs.session_id
        and ss.rep_id = public.current_rep_id()
    )
  );

-- Niche verticals: public read, admin write
create policy "niche_verticals_select_all" on public.niche_verticals
  for select using (true);

create policy "niche_verticals_manage_admin" on public.niche_verticals
  for all using (public.is_admin()) with check (public.is_admin());

-- Plan tier definitions: public read, admin write
create policy "plan_tiers_select_all" on public.plan_tier_definitions
  for select using (true);

create policy "plan_tiers_manage_admin" on public.plan_tier_definitions
  for all using (public.is_admin()) with check (public.is_admin());

-- Update providers RLS: allow sales reps to SELECT providers they referred
create policy "providers_select_referred_by_rep" on public.providers
  for select using (referred_by_rep_id = public.current_rep_id());

commit;
