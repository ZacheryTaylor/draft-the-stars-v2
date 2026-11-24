import { describe, expect, it } from "vitest";
import { checkoutQuery, checkoutReturnQuery, parseCheckoutQuery, selectionFor, TEST_CARD } from "@/lib/billing/checkout-flow";
import { activeSlotPayment, draftReadiness, planCheckout } from "@/lib/billing";
import { createSeedState } from "@/lib/data/mock-seed";
import { MockAdapter, setMockDb } from "@/lib/data/mock-adapter";
import { MockPaymentProvider } from "@/lib/billing/mock-provider";
import { demoRoutes, serverRoutes } from "@/views/routes";

const parse = (qs: string) => { const p = new URLSearchParams(qs); return parseCheckoutQuery((k) => p.get(k)); };

describe("checkout flow helpers", () => {
  it("round-trips the checkout query for each mode", () => {
    expect(parse(checkoutQuery("all_unpaid"))).toEqual({ mode: "all_unpaid", teamIds: [] });
    expect(parse(checkoutQuery("mine", ["ignored"]))).toEqual({ mode: "mine", teamIds: [] });
    expect(parse(checkoutQuery("selected", ["league:x:team:1", "league:x:team:2", "league:x:team:1"]))).toEqual({ mode: "selected", teamIds: ["league:x:team:1", "league:x:team:2"] });
  });
  it("falls back to the safest mode for an unknown mode", () => {
    expect(parse("mode=everything&teams=a")).toEqual({ mode: "mine", teamIds: [] });
  });
  it("builds success / cancel return queries", () => {
    expect(checkoutReturnQuery("success", 3)).toBe("checkout=success&paid=3");
    expect(checkoutReturnQuery("cancelled")).toBe("checkout=cancelled");
  });
  it("routes the checkout step in both builds", () => {
    expect(serverRoutes.checkout("office-party", "mode=all_unpaid")).toBe("/leagues/office-party/checkout?mode=all_unpaid");
    expect(demoRoutes.checkout("office-party", "mode=all_unpaid")).toBe("/league/checkout/?slug=office-party&mode=all_unpaid");
  });
  it("uses Stripe's public test card only", () => {
    expect(TEST_CARD.number.replace(/\s/g, "")).toBe("4242424242424242");
  });
});

describe("create league -> pay for the league -> draft gate (mock mode, no keys)", () => {
  it("covers every slot in one simulated checkout, then the gate waits only on open slots", async () => {
    setMockDb(createSeedState());
    const data = new MockAdapter();
    const seasonId = data.listSeasonsNow()[0].season.id;
    const league = await data.createLeague("user:zach", { name: "Checkout Test", seasonId, teamCount: 3, draftType: "snake", privacy: "private" });
    let b = data.getLeagueNow(league.slug)!;
    expect(b.teams).toHaveLength(3);

    const sel = selectionFor("all_unpaid", [], b.teams, "user:zach");
    const plan = await data.planSlotCheckout("user:zach", league.id, sel);
    expect(plan.quantity).toBe(3);
    expect(plan.amountCents).toBe(3 * b.billing.pricePerMemberCents);

    const res = await new MockPaymentProvider().createCheckout({ leagueId: league.id, leagueName: league.name, payerId: "user:zach", teamIds: plan.teamIds, quantity: plan.quantity, amountCents: plan.amountCents, currency: "usd", successUrl: "", cancelUrl: "" });
    expect(res.kind).toBe("paid");
    if (res.kind !== "paid") return;
    await data.markSlotsPaid({ leagueId: league.id, teamIds: plan.teamIds, payerId: "user:zach", provider: "mock", checkoutId: res.providerPaymentId, providerPaymentId: res.providerPaymentId });

    b = data.getLeagueNow(league.slug)!;
    const ready = draftReadiness({ teamCount: 3, teams: b.teams, payments: b.payments });
    expect(ready.paidSlots).toBe(3);
    expect(ready.reasons).toEqual(["2 of 3 team slots are still open"]);
    // Paying twice is refused (the checkout page shows "Nothing to pay").
    const slots = b.teams.map((t) => ({ teamId: t.id, status: activeSlotPayment(b.payments, t.id)?.status ?? ("unpaid" as const) }));
    expect(planCheckout(slots, "all_unpaid")).toEqual({ ok: false, reason: "Every slot is already paid" });
    await expect(data.planSlotCheckout("user:zach", league.id, "all_unpaid")).rejects.toThrow();
  });

  it("a player can only check out their own slot", async () => {
    setMockDb(createSeedState());
    const data = new MockAdapter();
    const b = data.getLeagueNow("office-party")!;
    const mine = selectionFor("mine", [], b.teams, "user:p6");
    expect(mine).toHaveLength(1);
    await expect(data.planSlotCheckout("user:p6", b.league.id, "all_unpaid")).rejects.toThrow(/own team/);
    await expect(data.planSlotCheckout("user:p6", b.league.id, mine)).resolves.toMatchObject({ quantity: 1 });
  });
});
