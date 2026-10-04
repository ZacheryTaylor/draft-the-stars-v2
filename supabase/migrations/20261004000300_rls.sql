-- Row-level security on every table. Writes to shared show data, billing and payments
-- happen only server-side with the service role (which bypasses RLS).

create function public.is_league_member(p_league uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.league_members m where m.league_id = p_league and m.user_id = auth.uid());
$$;

create function public.is_league_commissioner(p_league uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.league_members m
                 where m.league_id = p_league and m.user_id = auth.uid() and m.role in ('commissioner', 'co_commissioner'));
$$;

alter table public.profiles enable row level security;
alter table public.shows enable row level security;
alter table public.scoring_templates enable row level security;
alter table public.seasons enable row level security;
alter table public.contestant_units enable row level security;
alter table public.contestants enable row level security;
alter table public.episodes enable row level security;
alter table public.scores enable row level security;
alter table public.score_audit_log enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.teams enable row level security;
alter table public.picks enable row level security;
alter table public.draft_sessions enable row level security;
alter table public.invites enable row level security;
alter table public.standings_cache enable row level security;
alter table public.league_billing enable row level security;
alter table public.payments enable row level security;
alter table public.entitlements enable row level security;
alter table public.cosmetics enable row level security;
alter table public.user_cosmetics enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.side_contests enable row level security;
alter table public.sponsors enable row level security;

-- profiles: usernames are public (league pages show them); you can only edit yourself.
create policy profiles_select on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- shared show data: readable by everyone, written only by the service role (ingestion/admin).
create policy shows_read on public.shows for select to anon, authenticated using (true);
create policy templates_read on public.scoring_templates for select to anon, authenticated using (true);
create policy seasons_read on public.seasons for select to anon, authenticated using (true);
create policy units_read on public.contestant_units for select to anon, authenticated using (true);
create policy contestants_read on public.contestants for select to anon, authenticated using (true);
create policy episodes_read on public.episodes for select to anon, authenticated using (true);
create policy scores_read on public.scores for select to anon, authenticated using (published);
-- score_audit_log: no policies = service role only.

-- leagues
create policy leagues_select on public.leagues for select to anon, authenticated
  using (privacy = 'public' or owner_id = (select auth.uid()) or public.is_league_member(id));
create policy leagues_insert on public.leagues for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy leagues_update on public.leagues for update to authenticated
  using (public.is_league_commissioner(id)) with check (public.is_league_commissioner(id));
create policy leagues_delete on public.leagues for delete to authenticated
  using (owner_id = (select auth.uid()));

-- league_members: members see each other; joining goes through join_league_by_code().
create policy members_select on public.league_members for select to authenticated
  using (public.is_league_member(league_id));
create policy members_update on public.league_members for update to authenticated
  using (public.is_league_commissioner(league_id)) with check (public.is_league_commissioner(league_id));
create policy members_delete on public.league_members for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_league_commissioner(league_id));

-- teams
create policy teams_select on public.teams for select to anon, authenticated
  using (public.is_league_member(league_id) or exists (select 1 from public.leagues l where l.id = league_id and l.privacy = 'public'));
create policy teams_insert on public.teams for insert to authenticated
  with check (public.is_league_commissioner(league_id));
create policy teams_update on public.teams for update to authenticated
  using (public.is_league_commissioner(league_id) or owner_id = (select auth.uid()))
  with check (public.is_league_commissioner(league_id) or owner_id = (select auth.uid()));
create policy teams_delete on public.teams for delete to authenticated
  using (public.is_league_commissioner(league_id));

-- picks: team owner picks for their own team while the draft is live; commissioner can edit any pick.
create policy picks_select on public.picks for select to anon, authenticated
  using (public.is_league_member(league_id) or exists (select 1 from public.leagues l where l.id = league_id and l.privacy = 'public'));
create policy picks_insert on public.picks for insert to authenticated
  with check (
    public.is_league_commissioner(league_id)
    or (exists (select 1 from public.teams t where t.id = team_id and t.league_id = league_id and t.owner_id = (select auth.uid()))
        and exists (select 1 from public.leagues l where l.id = league_id and l.draft_status = 'in_progress' and l.status = 'active'))
  );
create policy picks_update on public.picks for update to authenticated
  using (public.is_league_commissioner(league_id)) with check (public.is_league_commissioner(league_id));
create policy picks_delete on public.picks for delete to authenticated
  using (public.is_league_commissioner(league_id));

create policy draft_select on public.draft_sessions for select to authenticated using (public.is_league_member(league_id));
create policy draft_update on public.draft_sessions for update to authenticated
  using (public.is_league_commissioner(league_id)) with check (public.is_league_commissioner(league_id));

-- invites: only commissioners see/manage codes; anyone redeems via join_league_by_code().
create policy invites_select on public.invites for select to authenticated using (public.is_league_commissioner(league_id));
create policy invites_insert on public.invites for insert to authenticated with check (public.is_league_commissioner(league_id));
create policy invites_update on public.invites for update to authenticated
  using (public.is_league_commissioner(league_id)) with check (public.is_league_commissioner(league_id));
create policy invites_delete on public.invites for delete to authenticated using (public.is_league_commissioner(league_id));

create policy standings_select on public.standings_cache for select to anon, authenticated
  using (public.is_league_member(league_id) or exists (select 1 from public.leagues l where l.id = league_id and l.privacy = 'public'));

-- billing: members can see status; only the server (service role, after the provider confirms) writes.
create policy billing_select on public.league_billing for select to authenticated using (public.is_league_member(league_id));
create policy payments_select on public.payments for select to authenticated
  using (payer_id = (select auth.uid()) or public.is_league_commissioner(league_id));
create policy entitlements_select on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()) or (league_id is not null and public.is_league_member(league_id)));

-- future tables
create policy cosmetics_read on public.cosmetics for select to anon, authenticated using (active);
create policy user_cosmetics_select on public.user_cosmetics for select to authenticated using (user_id = (select auth.uid()));
create policy badges_read on public.badges for select to anon, authenticated using (true);
create policy user_badges_read on public.user_badges for select to anon, authenticated using (true);
create policy side_contests_select on public.side_contests for select to authenticated using (public.is_league_member(league_id));
create policy sponsors_read on public.sponsors for select to anon, authenticated using (active);

-- ---------------------------------------------------------------- RPC: join by invite code
create function public.join_league_by_code(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invite public.invites;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Sign in to join a league'; end if;
  select * into v_invite from public.invites
   where code = upper(trim(p_code)) and not revoked
     and (expires_at is null or expires_at > now())
     and (max_uses is null or uses < max_uses)
   for update;
  if not found then raise exception 'Invite code is invalid or expired'; end if;
  if not exists (select 1 from public.leagues where id = v_invite.league_id and status = 'active') then
    raise exception 'This league is waiting for payment';
  end if;

  insert into public.league_members (league_id, user_id, role) values (v_invite.league_id, v_uid, 'player')
    on conflict (league_id, user_id) do nothing;
  update public.invites set uses = uses + 1 where id = v_invite.id;
  if v_invite.claim_team_id is not null then
    update public.teams set owner_id = v_uid where id = v_invite.claim_team_id and owner_id is null;
  end if;
  return v_invite.league_id;
end $$;
revoke execute on function public.join_league_by_code(text) from public, anon;
grant execute on function public.join_league_by_code(text) to authenticated;
