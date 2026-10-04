-- Billing placeholder (rev 2): free accounts, free league creation, $5 platform fee per team slot.
-- Each member pays their own slot by default (commissioner included). The commissioner may cover any
-- slots (open ones too) in one checkout of quantity x $5; payer_id is kept separate from member_id.
-- Only the server (mock checkout or provider webhook, service role) can mark a slot paid: see mark_slots_paid().
-- The draft can't start until every slot is filled AND paid/waived: see league_draft_ready() + trigger.
-- No prizes or payouts are paid from fees.

create table public.league_billing (
  league_id uuid primary key references public.leagues (id) on delete cascade,
  price_per_member_cents int not null default 500 check (price_per_member_cents >= 0),
  fee_waived boolean not null default false, -- e.g. the migrated girls' league
  waived_reason text,
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade, -- the slot
  member_id uuid references public.profiles (id) on delete set null, -- who holds the slot (null = open)
  payer_id uuid references public.profiles (id) on delete set null, -- who paid (member, or commissioner covering)
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'waived', 'refund_pending', 'refunded', 'void')),
  provider text check (provider in ('mock', 'stripe')),
  checkout_id text, -- one checkout can cover several slots
  provider_payment_id text,
  paid_at timestamptz,
  reminded_at timestamptz,
  refund_to_id uuid references public.profiles (id) on delete set null, -- refunds go back to the payer
  refund_requested_at timestamptz,
  created_at timestamptz not null default now()
);
-- At most one live payment row per slot: a slot can never be paid twice.
create unique index payments_one_active_per_slot on public.payments (team_id) where status in ('unpaid', 'paid', 'waived');
create index payments_league_idx on public.payments (league_id);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  league_id uuid references public.leagues (id) on delete cascade,
  kind text not null check (kind in ('league_membership', 'cosmetic', 'feature')),
  ref text,
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
  price_cents int check (price_cents is null or price_cents >= 0),
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
create table public.badges (id uuid primary key default gen_random_uuid(), slug text not null unique, name text not null, description text);
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
  name text not null, url text, placement text,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- bootstrap triggers
-- New league -> owner becomes commissioner, fee settings row, draft session.
create function public.handle_new_league() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.league_members (league_id, user_id, role) values (new.id, new.owner_id, 'commissioner')
    on conflict (league_id, user_id) do update set role = 'commissioner';
  insert into public.league_billing (league_id) values (new.id) on conflict do nothing;
  insert into public.draft_sessions (league_id, pick_clock_seconds)
    values (new.id, coalesce((new.settings ->> 'pick_clock_seconds')::int, 90)) on conflict do nothing;
  return new;
end $$;
create trigger on_league_created after insert on public.leagues
  for each row execute function public.handle_new_league();

-- New team slot -> one payment row (unpaid, or waived when the league is fee-waived).
create function public.handle_new_team() returns trigger
language plpgsql security definer set search_path = '' as $$
declare b public.league_billing;
begin
  select * into b from public.league_billing where league_id = new.league_id;
  insert into public.payments (league_id, team_id, member_id, amount_cents, status)
  values (new.league_id, new.id, new.owner_id, coalesce(b.price_per_member_cents, 500),
          case when coalesce(b.fee_waived, false) then 'waived' else 'unpaid' end);
  return new;
end $$;
create trigger on_team_created after insert on public.teams
  for each row execute function public.handle_new_team();

-- Claiming / leaving a slot keeps payments.member_id in sync. A covered slot stays paid for whoever claims it.
create function public.sync_slot_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is distinct from old.owner_id then
    update public.payments set member_id = new.owner_id
     where team_id = new.id and status in ('unpaid', 'paid', 'waived');
  end if;
  return new;
end $$;
create trigger on_team_owner_changed after update of owner_id on public.teams
  for each row execute function public.sync_slot_member();

-- Server-only: mark slots paid after the mock checkout or a verified webhook. Refuses already-paid slots.
create function public.mark_slots_paid(p_league uuid, p_team_ids uuid[], p_payer uuid, p_provider text, p_checkout text, p_provider_payment text)
returns int language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  update public.payments
     set status = 'paid', payer_id = p_payer, provider = p_provider, checkout_id = p_checkout,
         provider_payment_id = p_provider_payment, paid_at = now()
   where league_id = p_league and team_id = any (p_team_ids) and status = 'unpaid';
  get diagnostics n = row_count;
  if n <> coalesce(array_length(p_team_ids, 1), 0) then
    raise exception 'Some slots are already paid or not payable (% of %)', n, coalesce(array_length(p_team_ids, 1), 0);
  end if;
  insert into public.entitlements (user_id, league_id, kind, source_payment_id)
  select member_id, league_id, 'league_membership', id from public.payments
   where league_id = p_league and team_id = any (p_team_ids) and status = 'paid' and checkout_id = p_checkout;
  return n;
end $$;
revoke execute on function public.mark_slots_paid(uuid, uuid[], uuid, text, text, text) from public, anon, authenticated;

-- Draft gate (mirrors draftReadiness() in src/lib/billing/index.ts).
create function public.league_draft_ready(p_league uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.teams t where t.league_id = p_league and t.owner_id is not null)
           = (select (l.settings ->> 'team_count')::int from public.leagues l where l.id = p_league)
     and (select count(*) from public.teams t where t.league_id = p_league)
           = (select (l.settings ->> 'team_count')::int from public.leagues l where l.id = p_league)
     and not exists (
       select 1 from public.teams t
        where t.league_id = p_league
          and not exists (select 1 from public.payments p where p.team_id = t.id and p.status in ('paid', 'waived'))
     );
$$;

create function public.enforce_draft_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.draft_status = 'not_started' and new.draft_status <> 'not_started' then
    if new.status <> 'active' then raise exception 'Draft cannot start: league is %', new.status; end if;
    if not public.league_draft_ready(new.id) then
      raise exception 'Draft cannot start until every slot is filled and paid' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger leagues_enforce_draft before update of draft_status on public.leagues
  for each row execute function public.enforce_draft_rules();

-- Draft order locks once the draft starts (applies to everyone).
create function public.lock_draft_order() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.draft_position is distinct from old.draft_position
     and exists (select 1 from public.leagues l where l.id = new.league_id and l.draft_status <> 'not_started') then
    raise exception 'Draft order is locked once the draft starts';
  end if;
  return new;
end $$;
create trigger teams_lock_draft_order before update of draft_position on public.teams
  for each row execute function public.lock_draft_order();

-- Team owners may rename their team; only commissioners (or the server/join RPC) change slot owner or position.
create function public.protect_team_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' and not public.is_league_commissioner(new.league_id)
     and (new.owner_id is distinct from old.owner_id or new.draft_position is distinct from old.draft_position or new.league_id <> old.league_id) then
    raise exception 'Only the commissioner can change team slots or draft order' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;
create trigger teams_protect_fields before update on public.teams
  for each row execute function public.protect_team_fields();

-- TODO(refunds): request_refund(league, team) -> status 'refund_pending', refund_to_id = payer_id, then the
--   webhook marks 'refunded'. Triggered when a member leaves before the draft (their own payment only;
--   a covered slot stays covered for the next member) or when the commissioner cancels the league (all slots).
-- TODO(cleanup): scheduled job to archive leagues that never filled/paid their slots N days after creation.
