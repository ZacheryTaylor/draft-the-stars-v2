import { describe, expect, it } from "vitest";
import { mapLegacyLeague, planToSql, verifyMigration, type LegacyData } from "@/lib/migration/legacy-to-v2";
import { computeStandings } from "@/lib/scoring";
import { toScoringInput } from "@/lib/data/to-scoring";
import season from "./fixtures/live-data/season.json";
import scores from "./fixtures/live-data/scores.json";
import league from "./fixtures/live-data/league.json";
import schedule from "./fixtures/live-data/elimination-schedule.json";
import current from "./fixtures/live-data/live-rendered-current.json";

const data = { season, scores, league, schedule } as unknown as LegacyData;

describe("girls' league migration (dry run)", () => {
  const plan = mapLegacyLeague(data);
  it("maps every team, pick and contestant with no warnings", () => {
    expect(plan.warnings).toEqual([]);
    expect(plan.teams).toHaveLength(8);
    expect(plan.picks).toHaveLength(64);
    expect(plan.seasonBundle.contestants).toHaveLength(32);
    expect(plan.league.settings).toMatchObject({ teamCount: 8, copiesPerContestant: 2, rosterSize: { celebrity: 4, pro: 4 } });
    expect(plan.league.status).toBe("active");
  });
  it("recomputed standings = backup with 0 differences", () => {
    const r = verifyMigration(plan, data, current);
    expect(r.differences).toEqual([]);
    expect(r.compared).toBeGreaterThanOrEqual(80);
  });
  it("detects a tampered score (the gate can fail)", () => {
    const tampered = structuredClone(plan);
    tampered.seasonBundle.scores[0].rawScore += 1;
    expect(verifyMigration(tampered, data, current).differences.length).toBeGreaterThan(0);
    expect(computeStandings(toScoringInput({ ...tampered.seasonBundle, teams: tampered.teams, picks: tampered.picks })).rows).toHaveLength(8);
  });
  it("produces reviewable SQL", () => {
    const sql = planToSql(plan, data);
    expect(sql.match(/insert into public\.picks/g)).toHaveLength(64);
    expect(sql).toContain("begin;");
  });
});
