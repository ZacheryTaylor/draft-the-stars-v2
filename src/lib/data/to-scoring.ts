/** v2 rows -> scoring engine input. Used by the app, the migration verifier and standings_cache rebuilds. */
import type { ScoringInput } from "@/lib/scoring";
import { getTemplate } from "@/lib/scoring/templates";
import type { Pick, SeasonBundle, Team } from "./types";

export function toScoringInput(bundle: SeasonBundle & { teams: Team[]; picks: Pick[] }, templateSlug?: string): ScoringInput {
  const template = getTemplate(templateSlug ?? bundle.season.scoringTemplateSlug);
  const episodes = [...bundle.episodes].sort((a, b) => a.number - b.number);
  const roleOrder = { celebrity: 0, pro: 1, solo: 2 } as const;
  return {
    rules: {
      maxScore: episodes[0]?.maxScore ?? template.rules.maxScore,
      roundValues: episodes.length ? episodes.map((e) => e.roundValue) : template.rules.roundValues,
    },
    units: [...bundle.units]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((u) => ({
        id: u.id,
        label: u.label,
        members: bundle.contestants
          .filter((c) => c.unitId === u.id)
          .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.sortOrder - b.sortOrder)
          .map((c) => ({ id: c.id, name: c.name, role: c.role })),
      })),
    // Newest week first, the same order v1's scores.json uses, so sums match the live app bit-for-bit.
    weeks: episodes
      .map((e) => ({
        week: e.number,
        name: e.name ?? undefined,
        results: bundle.scores
          .filter((s) => s.episodeId === e.id && s.published)
          .map((s) => ({ unitId: s.unitId, score: s.rawScore, eliminated: s.eliminated })),
      }))
      .filter((w) => w.results.length > 0)
      .sort((a, b) => b.week - a.week),
    teams: [...bundle.teams].sort((a, b) => a.draftPosition - b.draftPosition).map((t) => ({ id: t.id, name: t.name })),
    picks: [...bundle.picks]
      .sort((a, b) => a.overall - b.overall)
      .map((p) => ({ teamId: p.teamId, contestantId: p.contestantId, overall: p.overall, round: p.round, copy: p.copy })),
    schedule: episodes.filter((e) => e.unitsCompeting != null).map((e) => ({ week: e.number, unitsCompeting: e.unitsCompeting as number })),
  };
}
