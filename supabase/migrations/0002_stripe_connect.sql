-- Add Stripe Connect account tracking to providers
alter table public.providers
  add column if not exists stripe_account_id text unique,
  add column if not exists stripe_onboarding_complete boolean not null default false;

-- Reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  customer_name text not null,
  customer_email text,
  rating smallint not null check (rating between 1 and 5),
  body text,
  source text not null default 'platform',
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

-- Review request tracking
create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  customer_email text not null,
  customer_phone text,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'PENDING' check (status in ('PENDING', 'SENT', 'COMPLETED', 'EXPIRED')),
  sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.reviews enable row level security;
alter table public.review_requests enable row level security;

-- Reviews: anon can see published reviews for active providers
create policy "reviews_anon_select_published" on public.reviews
  for select to anon using (
    is_published = true
    and exists (
      select 1 from public.providers p
      join public.sites s on s.provider_id = p.id
      where p.id = provider_id and p.status = 'ACTIVE' and s.is_live = true
    )
  );

-- Reviews: owner can manage their own reviews
create policy "reviews_owner_all" on public.reviews
  for all using (
    public.is_admin()
    or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
  );

-- Review requests: owner only
create policy "review_requests_owner_all" on public.review_requests
  for all using (
    public.is_admin()
    or exists (select 1 from public.providers p where p.id = provider_id and p.owner_user_id = auth.uid())
  );
