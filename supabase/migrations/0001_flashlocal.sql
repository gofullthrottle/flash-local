-- FlashLocal v1: multi-tenant core + RLS
-- Assumes Supabase Auth is enabled (auth.users).

begin;

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Admins table (simple + explicit)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

-- Enums
do $$ begin
  create type public.provider_status as enum ('PENDING','ACTIVE','PAUSED','BANNED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_type as enum ('UPFRONT','REV_SHARE');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.booking_status as enum ('DRAFT','REQUESTED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELED','REFUNDED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('CREATED','REQUIRES_PAYMENT_METHOD','PROCESSING','SUCCEEDED','FAILED','REFUNDED','DISPUTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gbp_wizard_state as enum ('NOT_STARTED','SEARCHING','MATCH_FOUND','CREATING','VERIFYING','LIVE','BLOCKED');
exception when duplicate_object then null; end $$;

-- Providers (core identity)
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status public.provider_status not null default 'PENDING',
  plan public.plan_type not null default 'UPFRONT',
  vertical_id text not null,
  slug text not null unique,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger providers_set_updated_at
before update on public.providers
for each row execute function public.set_updated_at();

-- Public profile (safe to expose to anon when published)
create table if not exists public.provider_public_profiles (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  headline text,
  description text,
  hero_image_url text,
  gallery_urls text[] not null default '{}',
  service_area jsonb not null default '{}'::jsonb,
  timezone text not null default 'America/Los_Angeles',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger provider_public_profiles_set_updated_at
before update on public.provider_public_profiles
for each row execute function public.set_updated_at();

-- Private contacts (never public)
create table if not exists public.provider_contacts (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  email citext not null,
  phone text not null,
  support_email citext,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger provider_contacts_set_updated_at
before update on public.provider_contacts
for each row execute function public.set_updated_at();

-- Sites (microsite settings)
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  subdomain text not null unique,
  custom_domain text unique,
  theme_id text not null default 'default',
  theme_json jsonb not null default '{}'::jsonb,
  is_live boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger sites_set_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

-- Packages
create table if not exists public.service_packages (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD',
  duration_minutes integer,
  includes jsonb not null default '[]'::jsonb,
  addons jsonb not null default '[]'::jsonb,
  recommended boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger service_packages_set_updated_at
before update on public.service_packages
for each row execute function public.set_updated_at();

-- Availability
create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  timezone text not null default 'America/Los_Angeles',
  weekly_hours jsonb not null default '{}'::jsonb,
  lead_time_hours integer not null default 12,
  min_notice_hours integer not null default 6,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger availability_rules_set_updated_at
before update on public.availability_rules
for each row execute function public.set_updated_at();

create table if not exists public.blackout_dates (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  start_ts timestamptz not null,
  end_ts timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

-- Leads (customers can submit anonymously)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  source text not null default 'microsite',
  customer_name text,
  customer_email citext,
  customer_phone text,
  address jsonb not null default '{}'::jsonb,
  message text,
  utm jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Bookings (customers can request/checkout anonymously; providers see after)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  package_id uuid references public.service_packages(id) on delete set null,
  status public.booking_status not null default 'REQUESTED',
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  customer_snapshot jsonb not null default '{}'::jsonb,
  notes text,
  total_amount_cents integer not null default 0,
  deposit_amount_cents integer not null default 0,
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

-- Orders (Stripe-backed)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text unique,
  status public.order_status not null default 'CREATED',
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  application_fee_cents integer not null default 0,
  provider_payout_cents integer not null default 0,
  refunded_cents integer not null default 0,
  dispute_status text,
  metadata jsonb not null default '{}'::jsonb,
  raw_last_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- Ads settings
create table if not exists public.ads_settings (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  enabled boolean not null default false,
  daily_cap_cents integer not null default 0,
  geo jsonb not null default '{}'::jsonb,
  objective text not null default 'bookings',
  notes text,
  updated_at timestamptz not null default now()
);

-- GBP wizard status (tracking only)
create table if not exists public.gbp_profiles (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  wizard_state public.gbp_wizard_state not null default 'NOT_STARTED',
  google_account_email citext,
  location_resource_name text,
  verification_notes text,
  last_checked_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Webhook idempotency
create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  payload jsonb not null
);

-- Audit log
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  provider_id uuid references public.providers(id) on delete set null,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- -------------------
-- RLS
-- -------------------
alter table public.admin_users enable row level security;
alter table public.providers enable row level security;
alter table public.provider_public_profiles enable row level security;
alter table public.provider_contacts enable row level security;
alter table public.sites enable row level security;
alter table public.service_packages enable row level security;
alter table public.availability_rules enable row level security;
alter table public.blackout_dates enable row level security;
alter table public.leads enable row level security;
alter table public.bookings enable row level security;
alter table public.orders enable row level security;
alter table public.ads_settings enable row level security;
alter table public.gbp_profiles enable row level security;
alter table public.stripe_events enable row level security;
alter table public.audit_events enable row level security;

-- Admins
create policy "admins_select_self_or_admin" on public.admin_users
for select using (public.is_admin() or user_id = auth.uid());

create policy "admins_manage_admins_admin_only" on public.admin_users
for all using (public.is_admin()) with check (public.is_admin());

-- Providers: owner + admin
create policy "providers_select_owner_or_admin" on public.providers
for select using (owner_user_id = auth.uid() or public.is_admin());

create policy "providers_insert_owner_self" on public.providers
for insert with check (owner_user_id = auth.uid());

create policy "providers_update_owner_or_admin" on public.providers
for update using (owner_user_id = auth.uid() or public.is_admin())
with check (owner_user_id = auth.uid() or public.is_admin());

-- Public profile:
-- anon can select only when published AND provider is ACTIVE
create policy "public_profiles_select_published" on public.provider_public_profiles
for select using (
  published = true
  and exists (
    select 1 from public.providers p
    where p.id = provider_public_profiles.provider_id
      and p.status = 'ACTIVE'
  )
);

-- owners/admin can select regardless (dashboard)
create policy "public_profiles_select_owner_or_admin" on public.provider_public_profiles
for select using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

create policy "public_profiles_upsert_owner_or_admin" on public.provider_public_profiles
for all using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Contacts: never public
create policy "contacts_owner_or_admin_only" on public.provider_contacts
for all using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Sites:
-- anon can select only live sites (no private data here)
create policy "sites_select_live" on public.sites
for select using (
  is_live = true
  and exists (select 1 from public.providers p where p.id = provider_id and p.status = 'ACTIVE')
);

-- owner/admin manage
create policy "sites_owner_or_admin_manage" on public.sites
for all using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Packages:
-- anon can select active packages for live sites/providers
create policy "packages_select_active_public" on public.service_packages
for select using (
  is_active = true
  and exists (
    select 1 from public.sites s
    join public.providers p on p.id = s.provider_id
    where s.provider_id = service_packages.provider_id
      and s.is_live = true
      and p.status = 'ACTIVE'
  )
);

-- owner/admin manage
create policy "packages_owner_or_admin_manage" on public.service_packages
for all using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Availability + blackout: owner/admin only
create policy "availability_owner_or_admin_only" on public.availability_rules
for all using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

create policy "blackouts_owner_or_admin_only" on public.blackout_dates
for all using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Leads: anon insert allowed only for ACTIVE + LIVE providers; no anon select
create policy "leads_insert_anon_for_live" on public.leads
for insert with check (
  exists (
    select 1
    from public.sites s
    join public.providers p on p.id = s.provider_id
    where s.provider_id = leads.provider_id
      and s.is_live = true
      and p.status = 'ACTIVE'
  )
);

create policy "leads_select_owner_or_admin" on public.leads
for select using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

create policy "leads_update_owner_or_admin" on public.leads
for update using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Bookings: anon insert allowed only for ACTIVE + LIVE providers; no anon select
create policy "bookings_insert_anon_for_live" on public.bookings
for insert with check (
  exists (
    select 1
    from public.sites s
    join public.providers p on p.id = s.provider_id
    where s.provider_id = bookings.provider_id
      and s.is_live = true
      and p.status = 'ACTIVE'
  )
);

create policy "bookings_select_owner_or_admin" on public.bookings
for select using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

create policy "bookings_update_owner_or_admin" on public.bookings
for update using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Orders: provider/admin select; updates should primarily be via service role (webhooks)
create policy "orders_select_owner_or_admin" on public.orders
for select using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

create policy "orders_update_owner_or_admin" on public.orders
for update using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Ads settings: owner/admin
create policy "ads_owner_or_admin_only" on public.ads_settings
for all using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- GBP: owner/admin
create policy "gbp_owner_or_admin_only" on public.gbp_profiles
for all using (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
)
with check (
  public.is_admin()
  or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
);

-- Stripe events: admin only (service role bypasses RLS anyway)
create policy "stripe_events_admin_only" on public.stripe_events
for all using (public.is_admin()) with check (public.is_admin());

-- Audit: admin only select, owner can see own provider audit if you want (kept strict here)
create policy "audit_admin_only" on public.audit_events
for all using (public.is_admin()) with check (public.is_admin());

commit;
