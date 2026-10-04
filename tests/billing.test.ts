import { describe, expect, it } from "vitest";
import { billing, formatCents, initialLeagueStatus, leagueGate, quote } from "@/lib/billing";
import { MockPaymentProvider } from "@/lib/billing/mock-provider";
import { StripePaymentProvider } from "@/lib/billing/stripe-provider";
import { getPaymentProvider, realProvider } from "@/lib/billing/get-provider";

describe("billing placeholder", () => {
  it("charges $3 per member, 3-12 members", () => {
    expect(billing.pricePerMemberCents).toBe(300);
    expect([billing.minMembers, billing.maxMembers]).toEqual([3, 12]);
    expect(quote(8).label).toBe("8 members × $3.00 = $24.00");
    expect(formatCents(900)).toBe("$9.00");
  });

  it("new leagues start pending_payment and are locked until paid (single setting)", () => {
    expect(billing.enforcement).toBe("at_creation");
    expect(initialLeagueStatus()).toBe("pending_payment");
    expect(leagueGate("pending_payment").allowed).toBe(false);
    expect(leagueGate("active").allowed).toBe(true);
    expect(initialLeagueStatus("off")).toBe("active");
    expect(leagueGate("pending_payment", "off").allowed).toBe(true);
  });

  it("only the mock provider can settle a payment; Stripe is a stub", async () => {
    const req = { leagueId: "l", leagueName: "L", payerId: "u", memberCount: 5, pricePerMemberCents: 300, currency: "usd", successUrl: "/", cancelUrl: "/" };
    expect(getPaymentProvider()).toBeInstanceOf(MockPaymentProvider);
    expect(await getPaymentProvider().createCheckout(req)).toMatchObject({ kind: "paid", amountCents: 1500 });
    expect(realProvider().isConnected()).toBe(false);
    expect(await new StripePaymentProvider().createCheckout()).toMatchObject({ kind: "unavailable" });
  });
});
