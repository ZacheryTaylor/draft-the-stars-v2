/** Adapter: the live v1 JSON files (data/season.json, scores.json, league.json, elimination-schedule.json) -> ScoringInput. */
import type { ScoringInput } from "./types";

export interface LegacySeason {
  season: number;
  title: string;
  copiesPerDancer: number;
  rosterSize: { pro: number; amateur: number };
  roundValues: number[];
  couples: { id: string; amateur: { id: string; name: string }; pro: { id: string; name: string } }[];
}
export interface LegacyScores {
  source?: string;
  updatedAt?: string;
  weeks: {
    week: number;
    label?: string;
    name?: string;
    maxScore?: number;
    results: { coupleId: string; score: number; eliminated: boolean }[];
  }[];
}
export interface LegacyLeague {
  name: string;
  teams: { id: string; name: string }[];
  picks: { id: string; overall: number; round: number; teamId: string; dancerId: string; copy: number }[];
  started?: boolean;
  completed?: boolean;
  locked?: boolean;
  lockedAt?: string;
}
export interface LegacySchedule {
  season: number;
  weeks: { week: number; couplesCompeting: number; eliminations?: number; status?: string; note?: string }[];
}

export function fromLegacy(data: {
  season: LegacySeason;
  scores: LegacyScores;
  league: LegacyLeague;
  schedule?: LegacySchedule;
}): ScoringInput {
  return {
    rules: { maxScore: 30, roundValues: data.season.roundValues },
    units: data.season.couples.map((c) => ({
      id: c.id,
      label: `${c.amateur.name} / ${c.pro.name}`,
      members: [
        { id: c.amateur.id, name: c.amateur.name, role: "celebrity" as const },
        { id: c.pro.id, name: c.pro.name, role: "pro" as const },
      ],
    })),
    weeks: (data.scores.weeks || []).map((w) => ({
      week: w.week,
      name: w.name || w.label,
      results: w.results.map((r) => ({ unitId: r.coupleId, score: r.score, eliminated: r.eliminated })),
    })),
    teams: data.league.teams.map((t) => ({ id: t.id, name: t.name })),
    picks: data.league.picks.map((p) => ({
      teamId: p.teamId,
      contestantId: p.dancerId,
      overall: p.overall,
      round: p.round,
      copy: p.copy,
    })),
    schedule: data.schedule?.weeks.map((w) => ({ week: w.week, unitsCompeting: w.couplesCompeting })),
  };
}
