/** Show-agnostic season file format (src/data/seasons/*.json) -> v2 rows. */
import type { ContestantRole, SeasonBundle } from "./types";
import { monogram } from "./monogram";

export interface SeasonFile {
  show: { slug: string; name: string; unitLabel: string };
  season: {
    number: number;
    title: string;
    copiesPerContestant: number;
    rosterSize: Partial<Record<ContestantRole, number>>;
    scoringTemplate: string;
    status: "upcoming" | "airing" | "finished";
    finaleDate: string | null;
  };
  units: { key: string; members: { key: string; name: string; role: ContestantRole }[] }[];
  episodes: {
    number: number;
    name: string | null;
    roundValue: number;
    maxScore: number;
    unitsCompeting: number | null;
    scheduleStatus: "actual" | "projected";
    results: { unit: string; score: number; eliminated: boolean }[];
  }[];
}

export function seasonBundleFromFile(file: SeasonFile): SeasonBundle {
  const showId = `show:${file.show.slug}`;
  const seasonId = `season:${file.show.slug}-${file.season.number}`;
  const unitId = (key: string) => `${seasonId}:unit:${key}`;
  const episodeId = (n: number) => `${seasonId}:ep:${n}`;
  return {
    show: { id: showId, ...file.show },
    season: {
      id: seasonId,
      showId,
      number: file.season.number,
      title: file.season.title,
      copiesPerContestant: file.season.copiesPerContestant,
      rosterSize: file.season.rosterSize,
      scoringTemplateSlug: file.season.scoringTemplate,
      status: file.season.status,
      finaleDate: file.season.finaleDate,
    },
    units: file.units.map((u, i) => ({
      id: unitId(u.key),
      seasonId,
      key: u.key,
      label: u.members.map((m) => m.name).join(" & "),
      sortOrder: i,
    })),
    contestants: file.units.flatMap((u, i) =>
      u.members.map((m, j) => ({
        id: `${seasonId}:c:${m.key}`,
        seasonId,
        unitId: unitId(u.key),
        key: m.key,
        name: m.name,
        role: m.role,
        monogram: monogram(m.name),
        sortOrder: i * 10 + j,
      })),
    ),
    episodes: file.episodes.map((e) => ({
      id: episodeId(e.number),
      seasonId,
      number: e.number,
      name: e.name,
      roundValue: e.roundValue,
      maxScore: e.maxScore,
      unitsCompeting: e.unitsCompeting,
      scheduleStatus: e.scheduleStatus,
    })),
    scores: file.episodes.flatMap((e) =>
      e.results.map((r) => ({
        id: `${episodeId(e.number)}:${r.unit}`,
        episodeId: episodeId(e.number),
        unitId: unitId(r.unit),
        rawScore: r.score,
        eliminated: r.eliminated,
        source: "auto" as const,
        published: true,
      })),
    ),
  };
}
