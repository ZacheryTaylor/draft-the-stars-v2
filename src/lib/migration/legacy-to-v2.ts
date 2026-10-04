/**
 * Girls' league migration: v1 JSON (data/league.json + season/scores/schedule) -> v2 rows,
 * plus a verification step that recomputes standings from the v2 rows and compares them with
 * (a) the v1 scoring of the same files, bit-for-bit, and (b) a rendered backup baseline.
 * Pure functions; the CLI wrapper is scripts/migrate-legacy-league.ts (dry-run only).
 */
import { computeStandings } from "@/lib/scoring";
import { fromLegacy, type LegacyLeague, type LegacySchedule, type LegacyScores, type LegacySeason } from "@/lib/scoring/legacy";
import { seasonBundleFromFile } from "@/lib/data/season-file";
import { toScoringInput } from "@/lib/data/to-scoring";
import type { Invite, League, LeagueBilling, Pick, SeasonBundle, Team } from "@/lib/data/types";
import { billing } from "@/lib/billing/config";
import { leagueSizing } from "@/lib/league/sizing";
import { seasonFileFromLegacy } from "./season-from-legacy";

export interface LegacyData {
  season: LegacySeason;
  scores: LegacyScores;
  league: LegacyLeague;
  schedule?: LegacySchedule;
}

export interface MigrationPlan {
  seasonBundle: SeasonBundle;
  league: League;
  teams: Team[];
  picks: Pick[];
  invites: Invite[];
  billing: LeagueBilling;
  /** v1 team id -> v2 team id, v1 dancer id -> v2 contestant id */
  idMap: { teams: Record<string, string>; contestants: Record<string, string> };
  warnings: string[];
}

export interface MigrationOptions {
  slug?: string;
  commissionerId?: string; // placeholder until Zach's v2 account exists
  /** The girls' league is fee-waived by default (it predates fees). */
  feeWaived?: boolean;
  inviteCode?: (teamIndex: number) => string;
}

export function mapLegacyLeague(data: LegacyData, opts: MigrationOptions = {}): MigrationPlan {
  const warnings: string[] = [];
  const seasonBundle = seasonBundleFromFile(seasonFileFromLegacy(data.season, data.scores, data.schedule));
  const slug = opts.slug ?? "dwts35-league1";
  const leagueId = `league:${slug}`;
  const ownerId = opts.commissionerId ?? "COMMISSIONER_USER_ID";
  const contestantByKey = new Map(seasonBundle.contestants.map((c) => [c.key, c]));

  const teams: Team[] = data.league.teams.map((t, i) => ({
    id: `${leagueId}:team:${i + 1}`,
    leagueId,
    ownerId: null, // members claim their team through an invite link
    name: t.name,
    draftPosition: i + 1,
  }));
  const teamMap = Object.fromEntries(data.league.teams.map((t, i) => [t.id, teams[i].id]));

  const picks: Pick[] = data.league.picks.map((p) => {
    const c = contestantByKey.get(p.dancerId);
    if (!c) warnings.push(`pick ${p.id}: unknown dancer ${p.dancerId}`);
    if (!teamMap[p.teamId]) warnings.push(`pick ${p.id}: unknown team ${p.teamId}`);
    return {
      id: `${leagueId}:pick:${p.overall}`,
      leagueId,
      teamId: teamMap[p.teamId],
      contestantId: c?.id ?? `missing:${p.dancerId}`,
      round: p.round,
      overall: p.overall,
      copy: p.copy,
      pickedAt: data.league.lockedAt ?? new Date(0).toISOString(),
    };
  });
  const sizing = leagueSizing(data.season.couples.length, teams.length);
  if (sizing.copies !== data.season.copiesPerDancer) warnings.push(`copies ${data.season.copiesPerDancer} != sizing rule ${sizing.copies}`);
  if (sizing.perRole !== data.season.rosterSize.pro || sizing.perRole !== data.season.rosterSize.amateur)
    warnings.push(`roster ${data.season.rosterSize.amateur}/${data.season.rosterSize.pro} != sizing rule ${sizing.perRole}/${sizing.perRole}`);
  const overalls = picks.map((p) => p.overall);
  if (new Set(overalls).size !== overalls.length) warnings.push("duplicate overall pick numbers");
  const copies = new Map<string, number>();
  for (const p of picks) copies.set(p.contestantId, (copies.get(p.contestantId) ?? 0) + 1);
  for (const [cid, n] of copies) if (n > data.season.copiesPerDancer) warnings.push(`${cid} drafted ${n} times (> ${data.season.copiesPerDancer})`);

  const code = opts.inviteCode ?? ((i: number) => `CLAIM${String(i + 1).padStart(3, "0")}`);
  const invites: Invite[] = teams.map((t, i) => ({
    id: `${leagueId}:invite:${i + 1}`,
    leagueId,
    code: code(i),
    createdBy: ownerId,
    expiresAt: null,
    maxUses: 1,
    uses: 0,
    claimTeamId: t.id,
    revoked: false,
  }));

  const league: League = {
    id: leagueId,
    slug,
    name: data.league.name,
    seasonId: seasonBundle.season.id,
    scoringTemplateSlug: seasonBundle.season.scoringTemplateSlug,
    ownerId,
    settings: {
      teamCount: teams.length,
      rosterSize: { celebrity: data.season.rosterSize.amateur, pro: data.season.rosterSize.pro },
      copiesPerContestant: data.season.copiesPerDancer,
      draftType: "snake",
      pickClockSeconds: 90,
    },
    privacy: "private",
    status: "active", // existing league: grandfathered as active (see billing below)
    draftStatus: data.league.completed ? "complete" : data.league.started ? "in_progress" : "not_started",
    createdAt: data.league.lockedAt ?? new Date(0).toISOString(),
  };

  return {
    seasonBundle,
    league,
    teams,
    picks,
    invites,
    billing: {
      leagueId,
      pricePerMemberCents: billing.pricePerMemberCents,
      feeWaived: opts.feeWaived ?? true,
      waivedReason: (opts.feeWaived ?? true) ? "Migrated v1 league (predates fees)" : null,
    },
    idMap: { teams: teamMap, contestants: Object.fromEntries(seasonBundle.contestants.map((c) => [c.key, c.id])) },
    warnings,
  };
}

export interface BaselineRow { rank: string; team: string; points: string; alive: string; mpp: string; weekPoints?: string }
export interface VerificationResult {
  compared: number;
  differences: string[];
  table: string[];
}

/** Recompute standings from the v2 rows and compare. 0 differences is the migration gate. */
export function verifyMigration(plan: MigrationPlan, data: LegacyData, baseline?: { rankings: BaselineRow[] }): VerificationResult {
  const differences: string[] = [];
  let compared = 0;
  const v2 = computeStandings(toScoringInput({ ...plan.seasonBundle, teams: plan.teams, picks: plan.picks }));
  const v1 = computeStandings(fromLegacy(data));
  const v2ByTeam = new Map(v2.rows.map((r) => [r.name, r]));

  // (a) bit-for-bit against v1 scoring of the same files, every team
  v1.rows.forEach((o, i) => {
    const n = v2.rows[i];
    compared += 5;
    if (n?.name !== o.name) differences.push(`rank ${i + 1}: v1 ${o.name} vs v2 ${n?.name}`);
    const m = v2ByTeam.get(o.name);
    if (!m) return;
    if (!Object.is(m.points, o.points)) differences.push(`${o.name} points ${o.points} vs ${m.points}`);
    if (!Object.is(m.mpp, o.mpp)) differences.push(`${o.name} max possible ${o.mpp} vs ${m.mpp}`);
    if (m.alive !== o.alive) differences.push(`${o.name} alive ${o.alive} vs ${m.alive}`);
    if (!Object.is(m.weekPoints, o.weekPoints)) differences.push(`${o.name} week points ${o.weekPoints} vs ${m.weekPoints}`);
  });

  // (b) against the rendered backup baseline (what the live site showed)
  if (baseline) {
    baseline.rankings.forEach((b) => {
      const m = v2ByTeam.get(b.team);
      compared += 4;
      if (!m) return void differences.push(`baseline team ${b.team} missing in v2`);
      if (String(m.rank) !== b.rank) differences.push(`${b.team} rank ${b.rank} vs ${m.rank}`);
      if (m.points.toFixed(2) !== b.points) differences.push(`${b.team} points ${b.points} vs ${m.points.toFixed(2)}`);
      if (`${m.alive}/${m.picks.length}` !== b.alive) differences.push(`${b.team} alive ${b.alive} vs ${m.alive}/${m.picks.length}`);
      if (m.mpp.toFixed(2) !== b.mpp) differences.push(`${b.team} max possible ${b.mpp} vs ${m.mpp.toFixed(2)}`);
      if (b.weekPoints !== undefined) {
        compared += 1;
        if (`+${m.weekPoints.toFixed(2)}` !== b.weekPoints) differences.push(`${b.team} wk points ${b.weekPoints} vs +${m.weekPoints.toFixed(2)}`);
      }
    });
    if (baseline.rankings.length !== v2.rows.length) differences.push(`team count ${baseline.rankings.length} vs ${v2.rows.length}`);
  }

  const table = v2.rows.map((r) => `${String(r.rank).padStart(2)}. ${r.name.padEnd(30)} ${r.points.toFixed(2).padStart(7)}  alive ${r.alive}/${r.picks.length}  MPP ${r.mpp.toFixed(2).padStart(8)}`);
  return { compared, differences, table };
}

const q = (s: string | null | undefined) => (s == null ? "null" : `'${String(s).replace(/'/g, "''")}'`);

/** SQL the real import would run (after seed.sql). Not executed anywhere yet. */
export function planToSql(plan: MigrationPlan, data: LegacyData): string {
  const L = plan.league;
  const out = [
    "-- DRY-RUN OUTPUT of scripts/migrate-legacy-league.ts. Review only; nothing has been applied.",
    "-- Requires: migrations + seed.sql applied, and psql variable :commissioner_id set to Zach's v2 profile id.",
    "begin;",
    `insert into public.leagues (slug, name, season_id, scoring_template_id, owner_id, settings, privacy, draft_status, locked_at)
  select ${q(L.slug)}, ${q(L.name)}, se.id, t.id, :'commissioner_id', ${q(JSON.stringify({ team_count: L.settings.teamCount, roster_size: L.settings.rosterSize, copies_per_contestant: L.settings.copiesPerContestant, draft_type: L.settings.draftType, pick_clock_seconds: L.settings.pickClockSeconds }))}::jsonb, 'private', ${q(L.draftStatus)}, ${q(data.league.lockedAt ?? null)}
  from public.seasons se join public.shows sh on sh.id = se.show_id, public.scoring_templates t
  where sh.slug = 'dwts' and se.number = ${data.season.season} and t.slug = ${q(L.scoringTemplateSlug)};`,
    "-- fee settings first, so each new team slot's payment row is created as 'waived' (or 'unpaid'):",
    `update public.league_billing set fee_waived = ${plan.billing.feeWaived}, waived_reason = ${q(plan.billing.waivedReason)} where league_id = (select id from public.leagues where slug = ${q(L.slug)});`,
  ];
  plan.teams.forEach((t) =>
    out.push(`insert into public.teams (league_id, name, draft_position) select id, ${q(t.name)}, ${t.draftPosition} from public.leagues where slug = ${q(L.slug)};`),
  );
  const keyOf = Object.fromEntries(Object.entries(plan.idMap.contestants).map(([k, v]) => [v, k]));
  plan.picks.forEach((p) => {
    const team = plan.teams.find((t) => t.id === p.teamId)!;
    out.push(`insert into public.picks (league_id, team_id, contestant_id, round, overall, copy, picked_at)
  select l.id, tm.id, c.id, ${p.round}, ${p.overall}, ${p.copy}, ${q(p.pickedAt)} from public.leagues l
  join public.teams tm on tm.league_id = l.id and tm.draft_position = ${team.draftPosition}
  join public.contestants c on c.season_id = l.season_id and c.key = ${q(keyOf[p.contestantId])} where l.slug = ${q(L.slug)};`);
  });
  plan.invites.forEach((inv) => {
    const team = plan.teams.find((t) => t.id === inv.claimTeamId)!;
    out.push(`insert into public.invites (league_id, code, created_by, max_uses, claim_team_id) select l.id, ${q(inv.code)}, :'commissioner_id', 1, tm.id from public.leagues l join public.teams tm on tm.league_id = l.id and tm.draft_position = ${team.draftPosition} where l.slug = ${q(L.slug)};`);
  });
  out.push("-- leagues start active (creation is free); slot payments were created by trigger as waived/unpaid.");
  out.push("-- Then: rebuild standings_cache for this league and re-run the verification against the database.", "commit;", "");
  return out.join("\n");
}
