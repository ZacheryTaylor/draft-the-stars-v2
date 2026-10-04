-- Billing placeholder: creating a league costs $3 (300 cents) per member, 3-12 members ($9-$36).
-- A new league starts leagues.status = 'pending_payment' and league_billing.status = 'pending';
-- a succeeded payment (mock only today; Stripe not connected) sets both to active.
-- Enforcement is a single app setting (src/lib/billing/config.ts -> enforcement = 'at_creation').

create table public.league_billing (
  league_id uuid primary key references public.leagues (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'waived', 'refunded')),
  price_per_member_cents int not null default 300 check (price_per_member_cents >= 0),
  billed_member_count int check (billed_member_count >= 0),
  amount_due_cents int check (amount_due_cents >= 0),
  provider text check (provider in ('mock', 'stripe')),
  provider_customer_id text,
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
comment on table public.league_billing is 'Per-league billing status. status=active means paid. Written only by the server (service role).';

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  payer_id uuid references public.profiles (id) on delete set null,
  provider text not null check (provider in ('mock', 'stripe')),
  provider_payment_id text not null,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  member_count int not null check (member_count >= 0),
  price_per_member_cents int not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  kind text not null check (kind in ('league_season_pass', 'cosmetic', 'feature')),
  ref text, -- e.g. cosmetic slug or feature key
  source_payment_id uuid references public.payments (id) on delete set null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or league_id is not null)
);

-- ---------------------------------------------------------------- future (empty in MVP)
create table public.cosmetics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  kind text not null check (kind in ('theme', 'badge_frame', 'avatar_style', 'board_skin')),
  price_cents int check (price_cents is null or price_cents >= 0), -- null = free
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.user_cosmetics (
  user_id uuid not null references public.profiles (id) on delete cascade,
  cosmetic_id uuid not null references public.cosmetics (id) on delete cascade,
  entitlement_id uuid references public.entitlements (id) on delete set null,
  acquired_at timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text
);

create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete set null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.side_contests (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  name text not null,
  rules jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'open', 'closed')),
  created_at timestamptz not null default now()
);
comment on table public.side_contests is 'Future. No real-money payouts; needs legal review before launch.';

create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  placement text,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- league bootstrap
-- New league -> owner becomes commissioner, billing row (pending, team_count x 300c), draft session.
create function public.handle_new_league() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.league_members (league_id, user_id, role) values (new.id, new.owner_id, 'commissioner')
    on conflict (league_id, user_id) do update set role = 'commissioner';
  insert into public.league_billing (league_id, billed_member_count, amount_due_cents)
    values (new.id, (new.settings ->> 'team_count')::int, (new.settings ->> 'team_count')::int * 300)
    on conflict do nothing;
  insert into public.draft_sessions (league_id, pick_clock_seconds)
    values (new.id, coalesce((new.settings ->> 'pick_clock_seconds')::int, 90)) on conflict do nothing;
  return new;
end $$;
create trigger on_league_created after insert on public.leagues
  for each row execute function public.handle_new_league();

-- Only the server (service role, after a confirmed payment) may activate a league or change its
-- billed size. Signed-in users always create leagues as pending_payment.
create function public.protect_league_billing_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.status := 'pending_payment';
    elsif new.status is distinct from old.status
       or (new.settings ->> 'team_count') is distinct from (old.settings ->> 'team_count') then
      raise exception 'League status and team count can only be changed by checkout' using errcode = 'insufficient_privilege';
    end if;
  end if;
  return new;
end $$;
create trigger leagues_protect_billing before insert or update on public.leagues
  for each row execute function public.protect_league_billing_fields();
