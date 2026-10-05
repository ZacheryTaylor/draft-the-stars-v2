/** Read-only sample data for the landing-page preview. Built from the demo seed (synthetic players, real public show results). */
import { createSeedState } from "./mock-seed";
import { toScoringInput } from "./to-scoring";
import type { ScoringInput } from "@/lib/scoring";

export interface PreviewBoardSlot { name: string; role: "celebrity" | "pro"; initials?: string }
export interface PreviewRosterRow { team: string; member: string | null; status: "paid" | "covered" | "unpaid" | "open"; payer: string | null }
export interface LandingPreviewData {
  leagueName: string;
  showLine: string;
  input: ScoringInput;
  ownerNames: Record<string, string>;
  owners: Record<string, number>;
  board: { teams: string[]; rows: (PreviewBoardSlot | null)[][] };
  roster: { leagueName: string; showLine: string; rows: PreviewRosterRow[]; priceCents: number };
}

export function landingPreviewData(): LandingPreviewData {
  const db = createSeedState();
  const [l1, l2] = db.leagues;
  const season = db.seasons.find((s) => s.id === l1.seasonId)!;
  const show = db.shows.find((s) => s.id === season.showId)!;
  const epIds = new Set(db.episodes.filter((e) => e.seasonId === season.id).map((e) => e.id));
  const teams = db.teams.filter((t) => t.leagueId === l1.id).sort((a, b) => a.draftPosition - b.draftPosition);
  const picks = db.picks.filter((p) => p.leagueId === l1.id);
  const contestants = db.contestants.filter((c) => c.seasonId === season.id);
  const bundle = {
    show, season,
    units: db.units.filter((u) => u.seasonId === season.id),
    contestants,
    episodes: db.episodes.filter((e) => e.seasonId === season.id),
    scores: db.scores.filter((s) => epIds.has(s.episodeId)),
    teams, picks,
  };
  const input = toScoringInput(bundle, l1.scoringTemplateSlug);
  const userName = (id: string | null) => db.profiles.find((p) => p.id === id)?.username ?? "";
  const ownerNames = Object.fromEntries(teams.map((t) => [t.id, userName(t.ownerId)]));
  const unitOf = new Map(contestants.map((c) => [c.id, c.unitId]));
  const owners: Record<string, number> = {};
  for (const p of picks) { const u = unitOf.get(p.contestantId)!; owners[u] = (owners[u] ?? 0) + 1; }
  const byId = new Map(contestants.map((c) => [c.id, c]));
  const perTeam = Math.max(...teams.map((t) => picks.filter((p) => p.teamId === t.id).length));
  const rows = Array.from({ length: perTeam }, (_, r) =>
    teams.map((t) => {
      const p = picks.filter((x) => x.teamId === t.id).sort((x, y) => x.overall - y.overall)[r];
      const c = p ? byId.get(p.contestantId) : null;
      return c ? { name: c.name, role: c.role as "celebrity" | "pro", initials: c.monogram } : null;
    }),
  );
  const teams2 = db.teams.filter((t) => t.leagueId === l2.id).sort((a, b) => a.draftPosition - b.draftPosition);
  const roster = teams2.map((t): PreviewRosterRow => {
    const pay = db.payments.find((p) => p.teamId === t.id);
    const member = t.ownerId ? userName(t.ownerId) : null;
    const payer = pay?.payerId ?? null;
    const status = payer ? (payer === t.ownerId ? "paid" : "covered") : member ? "unpaid" : "open";
    return { team: t.name, member, status: payer && !member ? "covered" : status, payer: payer && payer !== t.ownerId ? userName(payer) : null };
  });
  return {
    leagueName: l1.name,
    showLine: `${show.name} · ${season.title} · ${teams.length} teams`,
    input, ownerNames, owners,
    board: { teams: teams.map((t) => t.name), rows },
    roster: { leagueName: l2.name, showLine: `${show.name} · ${season.title} · ${teams2.length} teams`, rows: roster, priceCents: db.leagueBilling[0].pricePerMemberCents },
  };
}
