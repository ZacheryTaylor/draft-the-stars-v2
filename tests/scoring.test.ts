/**
 * Proves the typed v2 scoring engine reproduces the LIVE league exactly, using a copy of the
 * live data/*.json files (tests/fixtures/live-data, fixtures only).
 *  1. Bit-for-bit (Object.is) vs the live js/scoring.js for every week cut-off: points, alive,
 *     Max Possible, legacy Max Possible, per-couple points, and every sort order.
 *  2. Rendered standings match what the live site showed (live-rendered-baseline.json).
 *  3. The rule itself: couple score / 30 x round value, celebrity and pro each earn full points.
 */
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { computeStandings, createScoring, unitScorePoints } from "@/lib/scoring";
import { fromLegacy, type LegacyLeague, type LegacySchedule, type LegacyScores, type LegacySeason } from "@/lib/scoring/legacy";
import { DWTS_TEMPLATE } from "@/lib/scoring/templates";
import seasonJson from "./fixtures/live-data/season.json";
import scoresJson from "./fixtures/live-data/scores.json";
import leagueJson from "./fixtures/live-data/league.json";
import scheduleJson from "./fixtures/live-data/elimination-schedule.json";
import baseline from "./fixtures/live-data/live-rendered-baseline.json";
import current from "./fixtures/live-data/live-rendered-current.json";

const require = createRequire(import.meta.url);
const Live = require("./fixtures/live-data/live-scoring.cjs");

const season = seasonJson as LegacySeason;
const scores = scoresJson as LegacyScores;
const league = leagueJson as LegacyLeague;
const schedule = scheduleJson as LegacySchedule;

const cutoffs = [...new Set(scores.weeks.map((w) => w.week))].sort((a, b) => a - b);
const atCutoff = (c: number): LegacyScores => ({ ...scores, weeks: scores.weeks.filter((w) => w.week <= c) });

describe("scoring parity with the live league (bit-for-bit)", () => {
  for (const cutoff of cutoffs) {
    it(`matches live js/scoring.js through week ${cutoff}`, () => {
      const sc = atCutoff(cutoff);
      const live = Live.create({ season, scores: sc, league, schedule });
      const mine = createScoring(fromLegacy({ season, scores: sc, league, schedule }));
      for (const t of league.teams) {
        expect(Object.is(mine.scoreForTeam(t.id), live.scoreForTeam(t.id))).toBe(true);
        expect(Object.is(mine.maxPossible(t.id), live.maxPossible(t.id))).toBe(true);
        expect(Object.is(mine.maxPossibleLegacy(t.id), live.maxPossibleLegacy(t.id))).toBe(true);
        const aliveMine = mine.teamPicks(t.id).filter((p) => mine.isAlive(p.unitId)).length;
        const aliveLive = live.teamPicks(t.id).filter((p: { coupleId: string }) => live.isAlive(p.coupleId)).length;
        expect(aliveMine).toBe(aliveLive);
      }
      for (const key of ["points", "alive", "mpp"] as const)
        for (const dir of ["desc", "asc"] as const) {
          expect(mine.rankings({ key, dir }).map((t) => t.id)).toEqual(
            live.rankings({ key, dir }).map((t: { id: string }) => t.id),
          );
        }
      for (const w of sc.weeks)
        for (const r of w.results) {
          const a = Live.coupleScorePoints(r.score, live.weekValue(w.week));
          expect(Object.is(unitScorePoints(r.score, mine.weekValue(w.week)), a)).toBe(true);
        }
    });
  }
});

describe("standings match the live site exactly (rendered baseline)", () => {
  const input = fromLegacy({ season, scores, league, schedule });
  const s = createScoring(input);
  const roster = (t: { picks: { name?: string; unitId?: string }[] }) => t.picks.map((p) => `${p.name}${s.isAlive(p.unitId) ? "" : " (out)"}`);

  it("matches the live site as rendered now (current Max Possible, Wk points, #1 leader)", () => {
    const { rows, leaderId } = computeStandings(input);
    const rendered = rows.map((t) => ({
      rank: String(t.rank),
      team: t.name,
      points: t.points.toFixed(2),
      weekPoints: `+${t.weekPoints.toFixed(2)}`,
      alive: `${t.alive}/${t.picks.length}`,
      mpp: t.mpp.toFixed(2),
      roster: roster(t),
    }));
    expect(rendered).toEqual(current.rankings);
    expect(league.teams.find((t) => t.id === leaderId)?.name).toBe(current.leader);
    expect(scores.updatedAt).toBe(current.scoresUpdatedAt);
  });

  it("matches the 2026-10-02 backup baseline (rendered with the legacy Max Possible)", () => {
    const { rows } = computeStandings(input);
    const rendered = rows.map((t) => ({
      rank: String(t.rank),
      team: t.name,
      points: t.points.toFixed(2),
      alive: `${t.alive}/${t.picks.length}`,
      mpp: s.maxPossibleLegacy(t.id).toFixed(2),
      roster: roster(t),
    }));
    expect(rendered).toEqual(baseline.rankings);
  });

  it("weekly couple points match the live Scores tab", () => {
    const s = createScoring(fromLegacy({ season, scores, league, schedule }));
    for (const wk of baseline.weeks) {
      const n = Number(wk.week.replace("Week ", ""));
      const week = scores.weeks.find((w) => w.week === n)!;
      const rows = week.results.map((r) => {
        const c = season.couples.find((x) => x.id === r.coupleId)!;
        return [`${c.amateur.name} / ${c.pro.name}`, `${r.score}/30`, `${s.unitScorePoints(r.score, s.weekValue(n)).toFixed(2)} pts`, r.eliminated ? "Eliminated" : "Safe"];
      });
      expect(rows).toEqual(wk.rows);
    }
  });
});

describe("DWTS scoring template = current rules", () => {
  it("round values and formula", () => {
    expect(DWTS_TEMPLATE.rules.roundValues).toEqual([10, 12, 14, 16, 18, 20, 23, 26, 29, 32, 36]);
    expect(DWTS_TEMPLATE.rules.roundValues).toEqual(season.roundValues);
    expect(DWTS_TEMPLATE.rules.maxScore).toBe(30);
    expect(unitScorePoints(21, 14)).toBeCloseTo(9.8, 12);
    expect(unitScorePoints(30, 36)).toBe(36);
  });

  it("celebrity and pro each earn the full couple points", () => {
    const input = {
      rules: DWTS_TEMPLATE.rules,
      units: [{ id: "u1", members: [{ id: "c1", name: "Celeb", role: "celebrity" as const }, { id: "p1", name: "Pro", role: "pro" as const }] }],
      weeks: [{ week: 1, results: [{ unitId: "u1", score: 24, eliminated: false }] }],
      teams: [{ id: "A", name: "A" }, { id: "B", name: "B" }],
      picks: [{ teamId: "A", contestantId: "c1" }, { teamId: "A", contestantId: "p1" }, { teamId: "B", contestantId: "p1" }],
    };
    const s = createScoring(input);
    expect(s.scoreForTeam("A")).toBeCloseTo(16, 12); // 24/30*10 = 8 each
    expect(s.scoreForTeam("B")).toBeCloseTo(8, 12);
  });

  it("Max Possible is capped by the couples remaining each week", () => {
    const units = ["u1", "u2", "u3"].map((id) => ({ id, members: [{ id: `${id}c`, name: id, role: "celebrity" as const }] }));
    const s = createScoring({
      rules: { maxScore: 30, roundValues: [10, 20, 30] },
      units,
      weeks: [{ week: 1, results: units.map((u) => ({ unitId: u.id, score: 30, eliminated: false })) }],
      teams: [{ id: "A", name: "A" }],
      picks: units.map((u) => ({ teamId: "A", contestantId: `${u.id}c` })),
      schedule: [{ week: 2, unitsCompeting: 2 }, { week: 3, unitsCompeting: 1 }],
    });
    // 30 points now; week 2 best = 2 units x 20; week 3 best = 1 unit x 30
    expect(s.maxPossible("A")).toBe(30 + 40 + 30);
    expect(s.maxPossibleLegacy("A")).toBe(30 + 3 * (20 + 30));
  });
});
