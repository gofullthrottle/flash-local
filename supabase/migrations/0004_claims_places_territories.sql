-- Follow-up: claim flow, Places API cache, rep territories
-- Depends on: 0003_sales_reps_and_tiers.sql

begin;

-- ============================================================
-- 1. PROVIDER CLAIMS (magic-link ownership transfer)
-- ============================================================

create table if not exists public.provider_claims (
  id            uuid primary key default gen_random_uuid(),
  provider_id   uuid not null references public.providers(id) on delete cascade,
  token         text not null unique default encode(gen_random_bytes(32), 'hex'),
  email         citext not null,
  enrolled_by_rep_id uuid references public.sales_reps(id) on delete set null,
  expires_at    timestamptz not null default (now() + interval '30 days'),
  claimed_at    timestamptz,
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  email_sent_at timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists idx_provider_claims_provider on public.provider_claims(provider_id);
create index if not exists idx_provider_claims_token on public.provider_claims(token) where claimed_at is null;

-- ============================================================
-- 2. PLACES SCAN CACHE (avoid hammering Google Places API)
-- ============================================================

create table if not exists public.places_scan_cache (
  id            uuid primary key default gen_random_uuid(),
  query_hash    text not null,
  query         text not null,
  center_lat    double precision not null,
  center_lng    double precision not null,
  radius_meters integer not null,
  results_json  jsonb not null default '[]'::jsonb,
  results_count integer not null default 0,
  expires_at    timestamptz not null default (now() + interval '24 hours'),
  created_at    timestamptz not null default now()
);

create unique index if not exists idx_places_cache_query_hash on public.places_scan_cache(query_hash);
create index if not exists idx_places_cache_expires on public.places_scan_cache(expires_at);

-- ============================================================
-- 3. REP TERRITORIES (postal-code-based assignment)
-- ============================================================

create table if not exists public.rep_territories (
  id          uuid primary key default gen_random_uuid(),
  rep_id      uuid not null references public.sales_reps(id) on delete cascade,
  postal_code text not null,
  city        text,
  region      text, -- e.g., 'CA', 'TX'
  country     text not null default 'US',
  created_at  timestamptz not null default now()
);

-- Prevent overlap: one postal code = one rep
create unique index if not exists idx_rep_territories_postal_unique
  on public.rep_territories(postal_code, country);

create index if not exists idx_rep_territories_rep on public.rep_territories(rep_id);

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

alter table public.provider_claims enable row level security;
alter table public.places_scan_cache enable row level security;
alter table public.rep_territories enable row level security;

-- Provider claims: enrolling rep + admin can see; anon can read valid token via service role
create policy "claims_select_rep_or_admin" on public.provider_claims
  for select using (
    public.is_admin()
    or enrolled_by_rep_id = public.current_rep_id()
  );

create policy "claims_manage_admin_only" on public.provider_claims
  for all using (public.is_admin()) with check (public.is_admin());

-- Places cache: any authenticated rep can read recent results, service role writes
create policy "places_cache_select_reps" on public.places_scan_cache
  for select using (public.is_sales_rep() or public.is_admin());

create policy "places_cache_manage_admin" on public.places_scan_cache
  for all using (public.is_admin()) with check (public.is_admin());

-- Rep territories: rep sees own, admin sees all
create policy "territories_select_own_or_admin" on public.rep_territories
  for select using (rep_id = public.current_rep_id() or public.is_admin());

create policy "territories_manage_admin_only" on public.rep_territories
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Given a postal code, return the rep_id that owns that territory (if any)
create or replace function public.rep_for_postal_code(pc text)
returns uuid language sql stable as $$
  select rt.rep_id
  from public.rep_territories rt
  where rt.postal_code = pc
  limit 1;
$$;

-- Increment a rep's lifetime earnings (used by webhook commission minting)
create or replace function public.increment_rep_earnings(
  rep_id_param uuid,
  amount_param integer
)
returns void language plpgsql as $$
begin
  update public.sales_reps
     set lifetime_earnings_cents = lifetime_earnings_cents + amount_param
   where id = rep_id_param;
end $$;

commit;
