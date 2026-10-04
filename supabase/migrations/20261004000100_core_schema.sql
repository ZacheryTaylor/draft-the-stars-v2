-- Draft the Stars v2: core schema (show-agnostic).
-- Login, email and password live in Supabase Auth (auth.users); public.profiles holds the rest.
-- Generic naming: a "unit" is what scores together (a DWTS couple; a single contestant on most shows).

-- ---------------------------------------------------------------- people
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  display_name text,
  birth_year int not null,
  theme_preset text not null default 'pink',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,20}$'), -- stored lowercase
  constraint profiles_theme_preset check (theme_preset in ('pink', 'blue', 'green', 'red', 'white', 'purple', 'gold', 'dark')),
  constraint profiles_birth_year_range check (birth_year between 1900 and 2100)
);
create unique index profiles_username_key on public.profiles (username);
comment on table public.profiles is 'One row per auth.users row. Email comes from auth.users (never duplicated here).';
comment on column public.profiles.theme_preset is 'Per-user colour theme (see src/lib/themes/presets.ts). localStorage is the fallback before login.';

-- 13+ (COPPA): enforced on insert/update. A trigger, because CHECK constraints cannot use now().
create function public.enforce_min_age() returns trigger
language plpgsql set search_path = '' as $$
begin
  if extract(year from now())::int - new.birth_year < 13 then
    raise exception 'Users must be 13 or older' using errcode = 'check_violation';
  end if;
  new.username := lower(new.username);
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_min_age before insert or update on public.profiles
  for each row execute function public.enforce_min_age();

-- Create the profile when Supabase Auth creates the user (sign-up passes username/birth_year as metadata).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username, display_name, birth_year, theme_preset)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data ->> 'username', 'user_' || substr(replace(new.id::text, '-', ''), 1, 12))),
    new.raw_user_meta_data ->> 'display_name',
    coalesce((new.raw_user_meta_data ->> 'birth_year')::int, 1900),
    coalesce(new.raw_user_meta_data ->> 'theme_preset', 'pink')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- shows
create table public.shows (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  unit_label text not null default 'contestant', -- 'couple' for ballroom shows
  created_at timestamptz not null default now()
);

create table public.scoring_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  formula jsonb not null, -- e.g. {"type":"score_over_max_x_round_value","max_score":30,"round_values":[...],"split":"full_each","max_possible":"capped_by_remaining"}
  created_at timestamptz not null default now()
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  show_id uuid not null references public.shows (id) on delete cascade,
  number int not null,
  title text not null,
  copies_per_contestant int not null default 2 check (copies_per_contestant between 1 and 10),
  roster_size jsonb not null default '{"celebrity": 4, "pro": 4}',
  default_scoring_template_id uuid references public.scoring_templates (id),
  status text not null default 'upcoming' check (status in ('upcoming', 'airing', 'finished')),
  finale_date date,
  created_at timestamptz not null default now(),
  unique (show_id, number)
);

create table public.contestant_units (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  key text not null, -- stable id from the source, e.g. 'ravnik'
  label text not null,
  sort_order int not null default 0,
  unique (season_id, key)
);

create table public.contestants (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  unit_id uuid not null references public.contestant_units (id) on delete cascade,
  key text not null, -- e.g. 'a01' / 'p01'
  name text not null,
  role text not null check (role in ('celebrity', 'pro', 'solo')),
  monogram text not null check (char_length(monogram) between 1 and 3), -- initials only, never photos
  sort_order int not null default 0,
  unique (season_id, key)
);
create index contestants_unit_idx on public.contestants (unit_id);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  number int not null check (number >= 1), -- scoring week
  name text,
  air_date date,
  round_value numeric not null check (round_value >= 0),
  max_score numeric not null default 30 check (max_score > 0),
  units_competing int check (units_competing >= 0), -- caps Max Possible
  schedule_status text not null default 'projected' check (schedule_status in ('actual', 'projected')),
  unique (season_id, number)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes (id) on delete cascade,
  unit_id uuid not null references public.contestant_units (id) on delete cascade,
  raw_score numeric not null check (raw_score >= 0),
  eliminated boolean not null default false,
  source text not null default 'manual' check (source in ('auto', 'manual')),
  published boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (episode_id, unit_id)
);

create table public.score_audit_log (
  id bigint generated always as identity primary key,
  score_id uuid,
  episode_id uuid not null,
  unit_id uuid not null,
  old_score numeric,
  new_score numeric,
  old_eliminated boolean,
  new_eliminated boolean,
  source text,
  changed_by uuid,
  note text,
  changed_at timestamptz not null default now()
);

create function public.log_score_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.score_audit_log (score_id, episode_id, unit_id, old_score, new_score, old_eliminated, new_eliminated, source, changed_by)
  values (new.id, new.episode_id, new.unit_id,
          case when tg_op = 'UPDATE' then old.raw_score end, new.raw_score,
          case when tg_op = 'UPDATE' then old.eliminated end, new.eliminated,
          new.source, coalesce(new.updated_by, auth.uid()));
  return new;
end $$;
create trigger scores_audit after insert or update on public.scores
  for each row execute function public.log_score_change();

-- ---------------------------------------------------------------- leagues
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{4,40}$'), -- short public ID used in URLs
  name text not null check (char_length(name) between 1 and 60),
  season_id uuid not null references public.seasons (id),
  scoring_template_id uuid not null references public.scoring_templates (id),
  owner_id uuid not null references public.profiles (id),
  -- team_count (3-12) = member slots, set by the commissioner; copies and roster come from src/lib/league/sizing.ts
  settings jsonb not null default '{"team_count": 8, "roster_size": {"celebrity": 4, "pro": 4}, "copies_per_contestant": 2, "draft_type": "snake", "pick_clock_seconds": 90}'
    check ((settings ->> 'team_count')::int between 3 and 12),
  -- creating a league is free; cancelled = commissioner cancelled before the draft (refunds pending)
  status text not null default 'active' check (status in ('active', 'cancelled', 'archived')),
  privacy text not null default 'private' check (privacy in ('private', 'public')),
  draft_status text not null default 'not_started' check (draft_status in ('not_started', 'in_progress', 'paused', 'complete')),
  locked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id uuid not null references public.leagues (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'player' check (role in ('commissioner', 'co_commissioner', 'player')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
create index league_members_user_idx on public.league_members (user_id);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  owner_id uuid references public.profiles (id) on delete set null, -- null = unclaimed (claim via invite)
  name text not null check (char_length(name) between 1 and 40),
  draft_position int not null check (draft_position >= 1),
  created_at timestamptz not null default now(),
  -- deferrable so a reorder can swap positions inside one transaction
  constraint teams_league_position_key unique (league_id, draft_position) deferrable initially deferred
);

create table public.picks (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  contestant_id uuid not null references public.contestants (id),
  round int not null check (round >= 1),
  overall int not null check (overall >= 1),
  copy int not null default 1 check (copy >= 1),
  picked_by uuid references public.profiles (id) on delete set null,
  picked_at timestamptz not null default now(),
  unique (league_id, overall),
  unique (league_id, contestant_id, copy)
);
create index picks_team_idx on public.picks (team_id);

-- Auditable draft-order changes: seeded randomize (re-rollable) or manual reorder.
create table public.draft_order_log (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  roll int not null check (roll >= 1),
  method text not null check (method in ('random', 'manual')),
  seed text, -- random only: seed + input fully reproduce the order (src/lib/league/draft-order.ts)
  input jsonb not null, -- canonical (sorted) team ids
  draft_order jsonb not null, -- team ids, first pick first
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (league_id, roll),
  check (method = 'manual' or seed is not null)
);

-- Commissioner score fixes apply to ONE league and never touch shared public.scores.
create table public.league_score_overrides (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  episode_id uuid not null references public.episodes (id) on delete cascade,
  unit_id uuid not null references public.contestant_units (id) on delete cascade,
  raw_score numeric not null check (raw_score >= 0),
  eliminated boolean not null default false,
  reason text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (league_id, episode_id, unit_id)
);

create table public.draft_sessions (
  league_id uuid primary key references public.leagues (id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'paused', 'complete')),
  current_overall int not null default 1,
  pick_clock_seconds int not null default 90,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues (id) on delete cascade,
  code text not null unique check (code ~ '^[A-Z0-9]{6,12}$'),
  created_by uuid references public.profiles (id) on delete set null,
  expires_at timestamptz,
  max_uses int check (max_uses is null or max_uses > 0),
  uses int not null default 0,
  claim_team_id uuid references public.teams (id) on delete set null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

-- Rebuilt whenever scores are published (one cheap job per season, not per page view).
create table public.standings_cache (
  league_id uuid not null references public.leagues (id) on delete cascade,
  week int not null,
  team_id uuid not null references public.teams (id) on delete cascade,
  points numeric not null,
  week_points numeric not null default 0,
  rank int not null,
  alive int not null,
  max_possible numeric not null,
  computed_at timestamptz not null default now(),
  primary key (league_id, week, team_id)
);
