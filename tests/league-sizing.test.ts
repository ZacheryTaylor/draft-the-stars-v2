import { describe, expect, it } from "vitest";
import { copiesForTeams, leagueSizing, sizingTable } from "@/lib/league/sizing";
import { quote } from "@/lib/billing";
import seasonJson from "./fixtures/live-data/season.json";
import leagueJson from "./fixtures/live-data/league.json";

// [teams, copies, perTeam, perRole, leftover] for a 16-couple cast (Zach's expected values)
const EXPECTED: [number, number, number, number, number][] = [
  [3, 1, 10, 5, 2],
  [4, 1, 8, 4, 0],
  [5, 2, 12, 6, 4],
  [6, 2, 10, 5, 4],
  [7, 2, 8, 4, 8],
  [8, 2, 8, 4, 0],
  [9, 3, 10, 5, 6],
  [10, 3, 8, 4, 16],
  [11, 3, 8, 4, 8],
  [12, 3, 8, 4, 0],
];

describe("league sizing (16 couples)", () => {
  for (const [teams, copies, perTeam, perRole, leftover] of EXPECTED) {
    it(`${teams} teams -> ${copies} cop${copies === 1 ? "y" : "ies"}, ${perTeam} per team (${perRole}/${perRole}), ${leftover} left over, $${teams * 5} in member fees`, () => {
      const s = leagueSizing(16, teams);
      expect(s).toEqual({ teams, castUnits: 16, copies, totalDancers: 32 * copies, perTeam, perRole, leftover });
      expect(s.perTeam % 2).toBe(0);
      expect(s.perTeam * teams + s.leftover).toBe(s.totalDancers);
      // enough of each role in the pool for every team's slots
      expect(s.perRole * teams).toBeLessThanOrEqual(16 * copies);
      expect(quote(teams).totalCents).toBe(teams * 500); // each member pays their own $5
    });
  }

  it("covers exactly 3..12 and rejects anything else", () => {
    expect(sizingTable(16).map((r) => r.teams)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const bad of [0, 2, 13, 7.5]) expect(() => leagueSizing(16, bad)).toThrow(RangeError);
    expect([3, 4, 5, 8, 9, 12].map(copiesForTeams)).toEqual([1, 1, 2, 2, 3, 3]);
    expect(quote(3).totalCents).toBe(1500);
    expect(quote(12).totalCents).toBe(6000);
  });

  it("matches the girls' league exactly (8 teams, 2 copies, 8 per team, 4 pros + 4 celebrities)", () => {
    const s = leagueSizing(seasonJson.couples.length, leagueJson.teams.length);
    expect(seasonJson.couples.length).toBe(16);
    expect(s.copies).toBe(seasonJson.copiesPerDancer);
    expect(s.perRole).toBe(seasonJson.rosterSize.pro);
    expect(s.perRole).toBe(seasonJson.rosterSize.amateur);
    expect(s.perTeam).toBe(leagueJson.picks.length / leagueJson.teams.length);
    // every team actually drafted 4 pros + 4 celebrities
    const pros = new Set(seasonJson.couples.map((c) => c.pro.id));
    for (const t of leagueJson.teams) {
      const mine = leagueJson.picks.filter((p) => p.teamId === t.id);
      expect(mine.filter((p) => pros.has(p.dancerId))).toHaveLength(4);
      expect(mine.filter((p) => !pros.has(p.dancerId))).toHaveLength(4);
    }
  });
});

import { checkPick, teamForPick, totalPicks } from "@/lib/league/draft";

describe("draft rules", () => {
  const teams = [1, 2, 3, 4].map((n) => ({ id: `t${n}`, draftPosition: n }));
  it("snake order matches the live league (1-8, 8-1, ...)", () => {
    const order = Array.from({ length: 12 }, (_, i) => teamForPick(i + 1, teams, "snake").id);
    expect(order).toEqual(["t1", "t2", "t3", "t4", "t4", "t3", "t2", "t1", "t1", "t2", "t3", "t4"]);
    const live = leagueJson.picks.map((p) => leagueJson.teams.findIndex((t) => t.id === p.teamId) + 1);
    const eight = leagueJson.teams.map((t, i) => ({ id: t.id, draftPosition: i + 1 }));
    expect(leagueJson.picks.map((p) => teamForPick(p.overall, eight, "snake").id)).toEqual(leagueJson.picks.map((p) => p.teamId));
    expect(live.length).toBe(totalPicks(8, { draftType: "snake", copiesPerContestant: 2, rosterSize: { celebrity: 4, pro: 4 } }));
  });
  it("enforces roster slots, copies and no duplicates", () => {
    const all = [{ id: "c1", role: "celebrity" }, { id: "c2", role: "celebrity" }, { id: "p1", role: "pro" }];
    const rules = { draftType: "snake" as const, copiesPerContestant: 1, rosterSize: { celebrity: 1, pro: 1 } };
    expect(checkPick("t1", all[0], [], all, rules)).toEqual({ ok: true, copy: 1 });
    expect(checkPick("t2", all[0], [{ teamId: "t1", contestantId: "c1", copy: 1 }], all, rules).ok).toBe(false);
    expect(checkPick("t1", all[1], [{ teamId: "t1", contestantId: "c1", copy: 1 }], all, rules)).toMatchObject({ ok: false, reason: expect.stringMatching(/celebrity slots/) });
  });
});
