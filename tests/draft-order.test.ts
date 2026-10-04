import { beforeEach, describe, expect, it } from "vitest";
import { isValidOrder, manualEntry, moveTeam, positionsFor, randomizeEntry, seededShuffle, verifyEntry } from "@/lib/league/draft-order";
import { MockAdapter, mockDb, resetMockDb } from "@/lib/data/mock-adapter";

const ids = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];

describe("seeded randomize", () => {
  it("is deterministic per seed, a permutation, and independent of input order", () => {
    const a = seededShuffle(ids, "seed-1");
    expect(seededShuffle(ids, "seed-1")).toEqual(a);
    expect(seededShuffle([...ids].reverse(), "seed-1")).toEqual(a);
    expect([...a].sort()).toEqual(ids);
    expect(seededShuffle(ids, "seed-2")).not.toEqual(a);
  });
  it("re-rolls are logged and verifiable; tampering is detected", () => {
    const e = randomizeEntry(ids, "office-1", 2, "user:zach", "2026-10-04T00:00:00Z");
    expect(e).toMatchObject({ roll: 2, method: "random", seed: "office-1" });
    expect(verifyEntry(e)).toBe(true);
    expect(verifyEntry({ ...e, order: [...e.order].reverse() })).toBe(false);
    expect(verifyEntry(manualEntry(ids, 3, "u", "now"))).toBe(true);
  });
  it("roughly uniform first pick across many seeds", () => {
    const first = new Map<string, number>();
    for (let i = 0; i < 4000; i++) {
      const f = seededShuffle(ids, `s${i}`)[0];
      first.set(f, (first.get(f) ?? 0) + 1);
    }
    for (const id of ids) expect(first.get(id)!).toBeGreaterThan(400); // expected 500 each
  });
});

describe("manual reorder", () => {
  it("moves a team (drag or up/down) and validates the result", () => {
    expect(moveTeam(["a", "b", "c", "d"], 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveTeam(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(moveTeam(["a", "b", "c"], 0, 5)).toEqual(["a", "b", "c"]);
    expect(isValidOrder(["c", "a", "b"], ["a", "b", "c"])).toBe(true);
    expect(isValidOrder(["a", "a", "b"], ["a", "b", "c"])).toBe(false);
    expect(isValidOrder(["a", "b"], ["a", "b", "c"])).toBe(false);
    expect(positionsFor(["c", "a", "b"])).toEqual({ c: 1, a: 2, b: 3 });
  });
});

describe("mock adapter: draft order", () => {
  const data = new MockAdapter();
  const L2 = "league:office-party";
  beforeEach(() => resetMockDb());
  const order = () => mockDb().teams.filter((t) => t.leagueId === L2).sort((a, b) => a.draftPosition - b.draftPosition).map((t) => t.id);

  it("randomize applies the seeded order and appends an auditable roll; re-roll increments", async () => {
    await data.randomizeDraftOrder("user:zach", L2, "my-seed");
    const log = mockDb().draftOrderLog.filter((e) => e.leagueId === L2).sort((a, b) => a.roll - b.roll);
    expect(log.at(-1)).toMatchObject({ roll: 2, seed: "my-seed" });
    expect(order()).toEqual(seededShuffle(order(), "my-seed"));
    expect(verifyEntry(log.at(-1)!)).toBe(true);
    await data.randomizeDraftOrder("user:zach", L2);
    expect(mockDb().draftOrderLog.filter((e) => e.leagueId === L2).map((e) => e.roll).sort()).toEqual([1, 2, 3]);
  });
  it("manual order: commissioner only, every team once", async () => {
    const next = [...order()].reverse();
    await data.setDraftOrder("user:zach", L2, next);
    expect(order()).toEqual(next);
    await expect(data.setDraftOrder("user:p3", L2, next)).rejects.toThrow(/commissioner/);
    await expect(data.setDraftOrder("user:zach", L2, next.slice(1))).rejects.toThrow(/every team/);
  });
  it("locks once the draft starts", async () => {
    await expect(data.randomizeDraftOrder("user:zach", "league:demo-ballroom")).rejects.toThrow(/locked/);
    await expect(data.setDraftOrder("user:zach", "league:demo-ballroom", [])).rejects.toThrow(/locked/);
  });
});

describe("mock adapter: per-league score overrides", () => {
  const data = new MockAdapter();
  beforeEach(() => resetMockDb());
  it("changes only this league's view; shared scores untouched", async () => {
    const before = JSON.stringify(mockDb().scores);
    const b = (await data.getLeague("demo-ballroom"))!;
    const s = b.scores[0];
    const ep = b.episodes.find((e) => e.id === s.episodeId)!;
    await data.overrideScore("user:zach", "league:demo-ballroom", ep.number, s.unitId, 1, false, "judge typo");
    expect(JSON.stringify(mockDb().scores)).toBe(before);
    const after = (await data.getLeague("demo-ballroom"))!;
    expect(after.scores.find((x) => x.episodeId === s.episodeId && x.unitId === s.unitId)?.rawScore).toBe(1);
    expect((await data.getLeague("office-party"))!.scores.find((x) => x.episodeId === s.episodeId && x.unitId === s.unitId)?.rawScore).toBe(s.rawScore);
    await expect(data.overrideScore("user:p1", "league:demo-ballroom", ep.number, s.unitId, 1, false)).rejects.toThrow(/commissioner/);
  });
});
