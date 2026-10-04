import { beforeEach, describe, expect, it } from "vitest";
import { billing, draftReadiness, FEE_COPY, formatCents, planCheckout, quote } from "@/lib/billing";
import { MockPaymentProvider } from "@/lib/billing/mock-provider";
import { StripePaymentProvider } from "@/lib/billing/stripe-provider";
import { getPaymentProvider, realProvider } from "@/lib/billing/get-provider";
import { MockAdapter, mockDb, resetMockDb, slotPayment } from "@/lib/data/mock-adapter";
import { DataError } from "@/lib/data/adapter";

describe("billing config", () => {
  it("$5 platform fee per member, 3-12 members, one draft-gate setting", () => {
    expect(billing.pricePerMemberCents).toBe(500);
    expect([billing.minMembers, billing.maxMembers]).toEqual([3, 12]);
    expect(billing.draftGate).toBe("all_slots_filled_and_paid");
    expect(quote(8).label).toBe("8 members × $5.00 each = $40.00");
    expect(formatCents(1500)).toBe("$15.00");
    expect(FEE_COPY.long).toMatch(/no prizes or payouts/);
    expect(FEE_COPY.cover).toMatch(/off-platform/);
  });
});

describe("planCheckout (one checkout, quantity x $5)", () => {
  const slots = [
    { teamId: "t1", status: "unpaid" as const },
    { teamId: "t2", status: "paid" as const },
    { teamId: "t3", status: "unpaid" as const },
    { teamId: "t4", status: "waived" as const },
    { teamId: "t5", status: "unpaid" as const },
  ];
  it("covers selected slots in one checkout", () => {
    expect(planCheckout(slots, ["t1", "t3"])).toEqual({ ok: true, teamIds: ["t1", "t3"], quantity: 2, amountCents: 1000 });
  });
  it("'all unpaid' picks only unpaid slots", () => {
    expect(planCheckout(slots, "all_unpaid")).toEqual({ ok: true, teamIds: ["t1", "t3", "t5"], quantity: 3, amountCents: 1500 });
    expect(planCheckout(slots.map((s) => ({ ...s, status: "paid" as const })), "all_unpaid")).toMatchObject({ ok: false });
  });
  it("refuses an already-paid or waived slot (no double payment)", () => {
    expect(planCheckout(slots, ["t1", "t2"])).toEqual({ ok: false, reason: "One of the selected slots is already paid" });
    expect(planCheckout(slots, ["t4"])).toMatchObject({ ok: false });
  });
  it("dedupes, and rejects empty or unknown selections", () => {
    expect(planCheckout(slots, ["t1", "t1"])).toMatchObject({ ok: true, quantity: 1, amountCents: 500 });
    expect(planCheckout(slots, [])).toMatchObject({ ok: false });
    expect(planCheckout(slots, ["nope"])).toMatchObject({ ok: false });
  });
});

describe("draftReadiness (every slot filled AND paid/covered)", () => {
  const teams = [{ id: "a", ownerId: "u1" }, { id: "b", ownerId: "u2" }, { id: "c", ownerId: null }];
  it("waits on open slots and unpaid slots", () => {
    const r = draftReadiness({ teamCount: 3, teams, payments: [{ teamId: "a", status: "paid" }, { teamId: "b", status: "unpaid" }, { teamId: "c", status: "paid" }] });
    expect(r.ready).toBe(false);
    expect(r.unpaidTeamIds).toEqual(["b"]);
    expect(r.reasons).toEqual(["1 of 3 team slots are still open", "1 slot is not paid or covered yet"]);
  });
  it("a covered open slot counts as paid but still needs a member", () => {
    const r = draftReadiness({ teamCount: 3, teams, payments: ["a", "b", "c"].map((teamId) => ({ teamId, status: "paid" as const })) });
    expect(r).toMatchObject({ ready: false, paidSlots: 3, filledSlots: 2 });
  });
  it("ready when filled and paid/waived; refunded rows don't count", () => {
    const full = teams.map((t) => ({ ...t, ownerId: t.ownerId ?? "u3" }));
    expect(draftReadiness({ teamCount: 3, teams: full, payments: [{ teamId: "a", status: "paid" }, { teamId: "b", status: "waived" }, { teamId: "c", status: "paid" }] }).ready).toBe(true);
    expect(draftReadiness({ teamCount: 3, teams: full, payments: [{ teamId: "a", status: "paid" }, { teamId: "b", status: "waived" }, { teamId: "c", status: "refunded" }] }).ready).toBe(false);
    expect(draftReadiness({ teamCount: 3, teams: full, payments: [] }, "slots_filled_only").ready).toBe(true);
  });
});

describe("providers", () => {
  it("only the mock settles a checkout; Stripe is a stub", async () => {
    const req = { leagueId: "l", leagueName: "L", payerId: "u", teamIds: ["a", "b", "c"], quantity: 3, amountCents: 1500, currency: "usd", successUrl: "/", cancelUrl: "/" };
    expect(getPaymentProvider()).toBeInstanceOf(MockPaymentProvider);
    expect(await getPaymentProvider().createCheckout(req)).toMatchObject({ kind: "paid", amountCents: 1500 });
    expect(await getPaymentProvider().refund("mock_1", 500)).toMatchObject({ kind: "refund_pending" });
    expect(realProvider().isConnected()).toBe(false);
    expect(await new StripePaymentProvider().createCheckout()).toMatchObject({ kind: "unavailable" });
  });
});

describe("mock adapter: member pays / commissioner covers", () => {
  const data = new MockAdapter();
  let leagueId = "";
  let t: string[] = [];
  const status = (i: number) => slotPayment(mockDb().payments, t[i]);
  const pay = async (payer: string, sel: string[] | "all_unpaid") => {
    const plan = await data.planSlotCheckout(payer, leagueId, sel);
    return data.markSlotsPaid({ leagueId, teamIds: plan.teamIds, payerId: payer, provider: "mock", checkoutId: `chk_${Math.random()}`, providerPaymentId: "mock_x" });
  };
  beforeEach(async () => {
    resetMockDb();
    const s = (await data.listSeasons())[0].season;
    const l = await data.createLeague("user:zach", { name: "Cover Test", seasonId: s.id, teamCount: 4, draftType: "snake", privacy: "private" });
    leagueId = l.id;
    t = mockDb().teams.filter((x) => x.leagueId === l.id).map((x) => x.id);
    const code = mockDb().invites.find((i) => i.leagueId === l.id)!.code;
    await data.joinLeagueByCode("user:p1", code); // takes slot 2
    await data.joinLeagueByCode("user:p2", code); // takes slot 3; slot 4 stays open
  });

  it("league creation is free: active, every slot (commissioner's too) unpaid at $5", () => {
    expect(mockDb().leagues.find((l) => l.id === leagueId)!.status).toBe("active");
    expect(t.map((_, i) => status(i)?.status)).toEqual(["unpaid", "unpaid", "unpaid", "unpaid"]);
    expect(status(0)).toMatchObject({ memberId: "user:zach", amountCents: 500 });
  });

  it("a member pays only their own slot", async () => {
    expect(await pay("user:p1", [t[1]])).toBe(1);
    expect(status(1)).toMatchObject({ status: "paid", memberId: "user:p1", payerId: "user:p1" });
    await expect(data.planSlotCheckout("user:p1", leagueId, [t[2]])).rejects.toThrow(/own team/);
    await expect(data.planSlotCheckout("user:p1", leagueId, "all_unpaid")).rejects.toThrow(/own team/);
  });

  it("commissioner covers a partial selection (a member + an open slot) in ONE checkout", async () => {
    const plan = await data.planSlotCheckout("user:zach", leagueId, [t[2], t[3]]);
    expect(plan).toMatchObject({ quantity: 2, amountCents: 1000 });
    await data.markSlotsPaid({ leagueId, teamIds: plan.teamIds, payerId: "user:zach", provider: "mock", checkoutId: "chk_one", providerPaymentId: "mock_one" });
    expect(status(2)).toMatchObject({ status: "paid", memberId: "user:p2", payerId: "user:zach", checkoutId: "chk_one" });
    expect(status(3)).toMatchObject({ status: "paid", memberId: null, payerId: "user:zach", checkoutId: "chk_one" });
    expect(status(0)?.status).toBe("unpaid"); // the commissioner's own slot isn't paid unless selected
    expect(status(1)?.status).toBe("unpaid");
  });

  it("an open slot covered in advance stays paid when someone claims it", async () => {
    await pay("user:zach", [t[3]]);
    await data.joinLeagueByCode("user:p3", mockDb().invites.find((i) => i.leagueId === leagueId)!.code);
    expect(status(3)).toMatchObject({ status: "paid", memberId: "user:p3", payerId: "user:zach" });
  });

  it("stops double payment for an already-paid slot", async () => {
    await pay("user:p1", [t[1]]);
    await expect(data.planSlotCheckout("user:zach", leagueId, [t[0], t[1]])).rejects.toThrow(/already paid/);
    await expect(data.planSlotCheckout("user:p1", leagueId, [t[1]])).rejects.toThrow(/already paid/);
    // even if two checkouts were planned before either settled, the second settle is refused
    const plan = await data.planSlotCheckout("user:zach", leagueId, [t[2]]);
    await data.markSlotsPaid({ leagueId, teamIds: plan.teamIds, payerId: "user:zach", provider: "mock", checkoutId: "c1", providerPaymentId: "m1" });
    await expect(data.markSlotsPaid({ leagueId, teamIds: plan.teamIds, payerId: "user:p2", provider: "mock", checkoutId: "c2", providerPaymentId: "m2" })).rejects.toThrow(DataError);
    expect(status(2)).toMatchObject({ payerId: "user:zach", checkoutId: "c1" });
    expect(mockDb().payments.filter((p) => p.teamId === t[2] && p.status === "paid")).toHaveLength(1);
  });

  it("'pay for all unpaid' covers the rest, then the draft waits only on open slots", async () => {
    await pay("user:p1", [t[1]]);
    expect(await pay("user:zach", "all_unpaid")).toBe(3);
    await expect(data.setDraftStatus("user:zach", leagueId, "in_progress")).rejects.toThrow(/1 of 4 team slots are still open/);
    await data.joinLeagueByCode("user:p3", mockDb().invites.find((i) => i.leagueId === leagueId)!.code);
    await data.setDraftStatus("user:zach", leagueId, "in_progress");
    await expect(data.planSlotCheckout("user:zach", leagueId, "all_unpaid")).rejects.toThrow(/locked/);
  });

  it("the draft can't start while any member is unpaid", async () => {
    await data.joinLeagueByCode("user:p3", mockDb().invites.find((i) => i.leagueId === leagueId)!.code);
    await pay("user:zach", [t[0], t[2], t[3]]);
    await expect(data.setDraftStatus("user:zach", leagueId, "in_progress")).rejects.toThrow(/1 slot is not paid/);
  });

  it("a refund goes back to whoever paid, and the slot is unpaid again", async () => {
    await pay("user:zach", [t[2]]);
    await pay("user:p1", [t[1]]);
    const covered = await data.requestRefund("user:zach", leagueId, t[2]);
    expect(covered).toMatchObject({ status: "refund_pending", memberId: "user:p2", refundToId: "user:zach" });
    const own = await data.requestRefund("user:zach", leagueId, t[1]);
    expect(own).toMatchObject({ status: "refund_pending", refundToId: "user:p1" });
    expect(status(1)).toMatchObject({ status: "unpaid", memberId: "user:p1" });
    expect(status(2)).toMatchObject({ status: "unpaid", memberId: "user:p2" });
    await expect(data.requestRefund("user:p1", leagueId, t[2])).rejects.toThrow(/commissioner/);
  });

  it("removing a member: self-paid -> refund to them; covered -> stays covered for the next member", async () => {
    await pay("user:p1", [t[1]]);
    await pay("user:zach", [t[2]]);
    await data.removeMember("user:zach", leagueId, "user:p1");
    expect(mockDb().payments.find((p) => p.teamId === t[1] && p.status === "refund_pending")).toMatchObject({ refundToId: "user:p1" });
    expect(status(1)).toMatchObject({ status: "unpaid", memberId: null });
    await data.removeMember("user:zach", leagueId, "user:p2");
    expect(status(2)).toMatchObject({ status: "paid", memberId: null, payerId: "user:zach" });
    await expect(data.removeMember("user:zach", leagueId, "user:zach")).rejects.toThrow(/owner/);
  });

  it("reminders are commissioner-only placeholders for unpaid members", async () => {
    expect(await data.remindUnpaid("user:zach", leagueId, t[1])).toEqual({ to: "mirrorball_maven@example.com" });
    await expect(data.remindUnpaid("user:zach", leagueId, t[3])).rejects.toThrow(/open/);
    await expect(data.remindUnpaid("user:p1", leagueId, t[2])).rejects.toThrow(/commissioner/);
  });
});
