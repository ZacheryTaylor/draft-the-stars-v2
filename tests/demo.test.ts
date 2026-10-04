import { describe, expect, it } from "vitest";
import { createDemoState, GIRLS_SLUG } from "@/demo/seed";
import { MockAdapter, setMockDb } from "@/lib/data/mock-adapter";
import { computeStandings } from "@/lib/scoring";
import { toScoringInput } from "@/lib/data/to-scoring";
import current from "./fixtures/live-data/live-rendered-current.json";

describe("static demo seed", () => {
  const state = createDemoState();
  setMockDb(state);
  const data = new MockAdapter();

  it("includes the girls' league sample: 8 fee-waived slots, 64 picks, all pointing at seeded dancers", () => {
    const b = data.getLeagueNow(GIRLS_SLUG)!;
    expect(b.teams).toHaveLength(8);
    expect(b.picks).toHaveLength(64);
    const ids = new Set(b.contestants.map((c) => c.id));
    expect(b.picks.every((p) => ids.has(p.contestantId))).toBe(true);
    expect(b.payments.map((p) => p.status)).toEqual(Array(8).fill("waived"));
    expect(b.members).toEqual([expect.objectContaining({ userId: "user:zach", role: "commissioner" })]);
  });

  it("girls' league sample standings match the live site", () => {
    const b = data.getLeagueNow(GIRLS_SLUG)!;
    const s = computeStandings(toScoringInput(b));
    const live = (current as unknown as { rankings: { team: string; points: string }[] }).rankings;
    expect(live).toHaveLength(8);
    for (const row of live) expect(s.rows.find((r) => r.name === row.team)?.points.toFixed(2)).toBe(row.points);
  });

  it("demo user zach sees all three leagues and the state round-trips through JSON (localStorage)", () => {
    expect(data.listLeaguesForUserNow("user:zach").map((l) => l.league.slug).sort()).toEqual(["demo-ballroom", GIRLS_SLUG, "office-party"].sort());
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });
});
