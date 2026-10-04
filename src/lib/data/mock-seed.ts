/** Demo data for the mock adapter. Synthetic users/leagues; real DWTS S35 show data from src/data/seasons. */
import seasonFile from "@/data/seasons/dwts-s35.json";
import { seasonBundleFromFile, type SeasonFile } from "./season-file";
import type { Contestant, DbState, Pick, Profile, Team } from "./types";
import { billing } from "@/lib/billing/config";
import { leagueSizing } from "@/lib/league/sizing";

const T0 = "2026-09-01T00:00:00.000Z";

/** Deterministic snake draft so the demo league looks like a real one. */
function demoDraft(leagueId: string, teams: Team[], contestants: Contestant[], perRole: { celebrity: number; pro: number }, copies: number): Pick[] {
  let seed = 35;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const prefs = teams.map(() => [...contestants].sort(() => rand() - 0.5));
  const taken = new Map<string, number>();
  const picks: Pick[] = [];
  const rounds = perRole.celebrity + perRole.pro;
  for (let r = 1; r <= rounds; r++) {
    const order = r % 2 ? teams : [...teams].reverse();
    for (const team of order) {
      const mine = picks.filter((p) => p.teamId === team.id);
      const count = (role: string) => mine.filter((p) => contestants.find((c) => c.id === p.contestantId)?.role === role).length;
      const ti = teams.indexOf(team);
      const choice = prefs[ti].find(
        (c) => (taken.get(c.id) ?? 0) < copies && count(c.role) < perRole[c.role as "celebrity" | "pro"] && !mine.some((p) => p.contestantId === c.id),
      )!;
      taken.set(choice.id, (taken.get(choice.id) ?? 0) + 1);
      picks.push({ id: `${leagueId}:pick:${picks.length + 1}`, leagueId, teamId: team.id, contestantId: choice.id, round: r, overall: picks.length + 1, copy: taken.get(choice.id)!, pickedAt: T0 });
    }
  }
  return picks;
}

export function createSeedState(): DbState {
  const sb = seasonBundleFromFile(seasonFile as SeasonFile);
  const profile = (id: string, username: string, displayName: string, theme: Profile["themePreset"] = "pink"): Profile => ({
    id, username, displayName, email: `${username}@example.com`, birthYear: 1990, themePreset: theme, createdAt: T0,
  });
  const profiles: Profile[] = [
    profile("user:zach", "zach", "Zach (demo)"),
    profile("user:p1", "mirrorball_maven", "Maven"),
    profile("user:p2", "tango_tess", "Tess", "purple"),
    profile("user:p3", "quickstep_quinn", "Quinn", "blue"),
    profile("user:p4", "foxtrot_fran", "Fran"),
    profile("user:p5", "samba_sam", "Sam", "green"),
    profile("user:p6", "waltz_wren", "Wren", "dark"),
    profile("user:p7", "jive_jo", "Jo", "gold"),
  ];

  // League 1: fully drafted, mid-season.
  const L1 = "league:demo-ballroom";
  const teamNames = ["Sequins & Strategy", "Paso Doble Trouble", "Cha Cha Champs", "The Judges' Pets", "Rumba Rebels", "Tango Tangle", "Foxtrot Five", "Spin Cycle"];
  const owners = ["user:zach", "user:p1", "user:p2", "user:p3", "user:p4", "user:p5", "user:p6", "user:p7"];
  const teams1: Team[] = teamNames.map((name, i) => ({ id: `${L1}:team:${i + 1}`, leagueId: L1, ownerId: owners[i], name, draftPosition: i + 1 }));
  const picks1 = demoDraft(L1, teams1, sb.contestants, { celebrity: 4, pro: 4 }, 2);

  // League 2: draft not started.
  const L2 = "league:office-party";
  const teams2: Team[] = ["Commish Crew", "Desk Dancers", "Open Team 3", "Open Team 4", "Open Team 5", "Open Team 6"].map((name, i) => ({
    id: `${L2}:team:${i + 1}`, leagueId: L2, ownerId: ["user:zach", "user:p3", null, null, null, null][i], name, draftPosition: i + 1,
  }));

  const settingsFor = (teamCount: number) => {
    const s = leagueSizing(sb.units.length, teamCount);
    return { teamCount, rosterSize: { celebrity: s.perRole, pro: s.perRole }, copiesPerContestant: s.copies, draftType: "snake" as const, pickClockSeconds: 90 };
  };
  const settings = settingsFor(8);
  return {
    profiles,
    shows: [sb.show],
    seasons: [sb.season],
    units: sb.units,
    contestants: sb.contestants,
    episodes: sb.episodes,
    scores: sb.scores,
    leagues: [
      { id: L1, slug: "demo-ballroom", name: "Sunday Night Ballroom", seasonId: sb.season.id, scoringTemplateSlug: sb.season.scoringTemplateSlug, ownerId: "user:zach", settings, privacy: "private", status: "active", draftStatus: "complete", createdAt: T0 },
      { id: L2, slug: "office-party", name: "Office Watch Party", seasonId: sb.season.id, scoringTemplateSlug: sb.season.scoringTemplateSlug, ownerId: "user:zach", settings: settingsFor(6), privacy: "private", status: "pending_payment", draftStatus: "not_started", createdAt: T0 },
    ],
    leagueMembers: [
      ...owners.map((userId, i) => ({ leagueId: L1, userId, role: i === 0 ? ("commissioner" as const) : ("player" as const), joinedAt: T0 })),
      { leagueId: L2, userId: "user:zach", role: "commissioner", joinedAt: T0 },
      { leagueId: L2, userId: "user:p3", role: "player", joinedAt: T0 },
    ],
    teams: [...teams1, ...teams2],
    picks: picks1,
    invites: [
      { id: "invite:1", leagueId: L1, code: "BALLROOM", createdBy: "user:zach", expiresAt: null, maxUses: null, uses: 7, claimTeamId: null, revoked: false },
      { id: "invite:2", leagueId: L2, code: "OFFICE35", createdBy: "user:zach", expiresAt: null, maxUses: null, uses: 1, claimTeamId: null, revoked: false },
    ],
    leagueBilling: [
      { leagueId: L1, status: "active", pricePerMemberCents: billing.pricePerMemberCents, billedMemberCount: 8, amountDueCents: 2400, provider: "mock", paidAt: T0 },
      { leagueId: L2, status: "pending", pricePerMemberCents: billing.pricePerMemberCents, billedMemberCount: 6, amountDueCents: 1800, provider: null, paidAt: null },
    ],
    payments: [
      { id: "payment:seed-1", leagueId: L1, payerId: "user:zach", provider: "mock", providerPaymentId: "mock_seed_1", amountCents: 2400, currency: "usd", memberCount: 8, pricePerMemberCents: 300, status: "succeeded", createdAt: T0 },
    ],
    entitlements: [
      { id: "ent:seed-1", userId: null, leagueId: L1, kind: "league_season_pass", sourcePaymentId: "payment:seed-1", startsAt: T0, endsAt: null },
    ],
  };
}
