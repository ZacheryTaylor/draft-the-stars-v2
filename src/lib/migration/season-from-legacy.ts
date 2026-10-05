import type { SeasonFile } from "@/lib/data/season-file";
import type { LegacySchedule, LegacyScores, LegacySeason } from "@/lib/scoring/legacy";
import { DWTS_TEMPLATE } from "@/lib/scoring/templates";

/** v1 season.json + scores.json + elimination-schedule.json -> show-agnostic season file. */
export function seasonFileFromLegacy(season: LegacySeason, scores: LegacyScores, schedule?: LegacySchedule): SeasonFile {
  return {
    show: { slug: "dwts", name: "Dancing with the Stars", unitLabel: "couple" },
    season: {
      number: season.season,
      title: `Season ${season.season}`,
      copiesPerContestant: season.copiesPerDancer,
      rosterSize: { celebrity: season.rosterSize.amateur, pro: season.rosterSize.pro },
      scoringTemplate: DWTS_TEMPLATE.slug,
      status: "airing",
      // PLACEHOLDER: demo premiere date for payment-deadline countdown (not an official schedule claim).
      premiereDate: "2026-10-20",
      finaleDate: "2026-11-24",
    },
    units: season.couples.map((c) => ({
      key: c.id,
      members: [
        { key: c.amateur.id, name: c.amateur.name, role: "celebrity" as const },
        { key: c.pro.id, name: c.pro.name, role: "pro" as const },
      ],
    })),
    episodes: season.roundValues.map((value, i) => {
      const n = i + 1;
      const wk = scores.weeks.find((w) => w.week === n);
      const sched = schedule?.weeks.find((w) => w.week === n);
      return {
        number: n,
        name: wk ? wk.name || wk.label || null : null,
        roundValue: value,
        maxScore: wk?.maxScore ?? 30,
        unitsCompeting: sched?.couplesCompeting ?? null,
        scheduleStatus: (sched?.status === "actual" ? "actual" : "projected") as "actual" | "projected",
        results: (wk?.results ?? []).map((r) => ({ unit: r.coupleId, score: r.score, eliminated: r.eliminated })),
      };
    }),
  };
}
