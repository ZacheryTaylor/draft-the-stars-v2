import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { createMemberCheckout, handleStripeWebhook, type StripeBillingRepo } from "@/lib/billing/stripe-checkout";
import { LEGAL_DOCS } from "@/lib/legal/documents";

const SECRET = "whsec_test_fake";
const realStripe = new Stripe("sk_test_fake_not_used_for_network");

function repo(status: "unpaid" | "paid" | null = "unpaid") {
  const seen = new Set<string>(); const sessions = new Set<string>();
  const r: StripeBillingRepo = {
    getMemberSlot: vi.fn(async () => (status ? { teamId: "team-1", status } : null)),
    markMemberPaid: vi.fn(async (i) => {
      if (seen.has(i.eventId)) return "duplicate_event";
      seen.add(i.eventId);
      if (sessions.has(i.sessionId)) return "already_paid";
      sessions.add(i.sessionId); return "paid";
    }),
  };
  return r;
}

function fakeStripe() {
  const create = vi.fn(async () => ({ id: "cs_test_1", url: "https://checkout.stripe.com/c/pay/cs_test_1" }));
  return { create, stripe: { checkout: { sessions: { create } }, webhooks: realStripe.webhooks } as unknown as Stripe };
}

describe("createMemberCheckout", () => {
  it("creates a $5 one-time payment session tied to league + user", async () => {
    const { stripe, create } = fakeStripe();
    const out = await createMemberCheckout({ stripe, repo: repo(), leagueId: "L1", userId: "U1", siteUrl: "https://staging.example/" });
    expect(out).toEqual({ ok: true, url: expect.stringContaining("checkout.stripe.com"), sessionId: "cs_test_1" });
    const arg = (create.mock.calls[0] as unknown[])[0] as Stripe.Checkout.SessionCreateParams;
    expect(arg.mode).toBe("payment");
    expect(arg.client_reference_id).toBe("L1:U1");
    expect(arg.metadata).toMatchObject({ league_id: "L1", user_id: "U1" });
    expect(arg.line_items?.[0].price_data?.unit_amount).toBe(500);
    expect(arg.success_url).toContain("https://staging.example/api/stripe/return");
  });
  it("uses STRIPE_PRICE_ID when given", async () => {
    const { stripe, create } = fakeStripe();
    await createMemberCheckout({ stripe, repo: repo(), leagueId: "L1", userId: "U1", siteUrl: "http://x", priceId: "price_123" });
    const arg = (create.mock.calls[0] as unknown[])[0] as Stripe.Checkout.SessionCreateParams;
    expect(arg.line_items?.[0]).toEqual({ price: "price_123", quantity: 1 });
  });
  it("refuses non-members and already-paid members", async () => {
    const { stripe, create } = fakeStripe();
    expect(await createMemberCheckout({ stripe, repo: repo(null), leagueId: "L1", userId: "U1", siteUrl: "http://x" })).toMatchObject({ ok: false, status: 403 });
    expect(await createMemberCheckout({ stripe, repo: repo("paid"), leagueId: "L1", userId: "U1", siteUrl: "http://x" })).toMatchObject({ ok: false, status: 409 });
    expect(create).not.toHaveBeenCalled();
  });
});

function signed(event: object) {
  const payload = JSON.stringify(event);
  return { rawBody: payload, signature: realStripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
}
const completed = (id = "evt_1") => ({
  id, object: "event", type: "checkout.session.completed",
  data: { object: { id: "cs_test_1", object: "checkout.session", mode: "payment", payment_status: "paid", payment_intent: "pi_1", amount_total: 500, metadata: { league_id: "L1", user_id: "U1" } } },
});

describe("handleStripeWebhook", () => {
  it("rejects missing or bad signatures", async () => {
    const { stripe } = fakeStripe(); const r = repo();
    const { rawBody } = signed(completed());
    expect((await handleStripeWebhook({ stripe, repo: r, rawBody, signature: null, webhookSecret: SECRET })).status).toBe(400);
    expect((await handleStripeWebhook({ stripe, repo: r, rawBody, signature: "t=1,v1=bad", webhookSecret: SECRET })).status).toBe(400);
    expect(r.markMemberPaid).not.toHaveBeenCalled();
  });
  it("marks paid once, idempotent on retries and duplicate events", async () => {
    const { stripe } = fakeStripe(); const r = repo();
    const first = await handleStripeWebhook({ stripe, repo: r, ...signed(completed("evt_1")), webhookSecret: SECRET });
    expect(first).toEqual({ status: 200, body: { received: true, result: "paid" } });
    expect(r.markMemberPaid).toHaveBeenCalledWith(expect.objectContaining({ leagueId: "L1", userId: "U1", sessionId: "cs_test_1", paymentIntentId: "pi_1", amountCents: 500 }));
    expect((await handleStripeWebhook({ stripe, repo: r, ...signed(completed("evt_1")), webhookSecret: SECRET })).body.result).toBe("duplicate_event");
    expect((await handleStripeWebhook({ stripe, repo: r, ...signed(completed("evt_2")), webhookSecret: SECRET })).body.result).toBe("already_paid");
  });
  it("ignores other events and unpaid sessions", async () => {
    const { stripe } = fakeStripe(); const r = repo();
    const other = { ...completed(), type: "payment_intent.created" };
    expect((await handleStripeWebhook({ stripe, repo: r, ...signed(other), webhookSecret: SECRET })).body.result).toBe("ignored");
    const unpaid = completed(); (unpaid.data.object as { payment_status: string }).payment_status = "unpaid";
    expect((await handleStripeWebhook({ stripe, repo: r, ...signed(unpaid), webhookSecret: SECRET })).body.result).toBe("not_paid");
    expect(r.markMemberPaid).not.toHaveBeenCalled();
  });
});

describe("terms wording", () => {
  it("states the platform-use fee is not a wager and prizes are never fee-funded", () => {
    const t = LEGAL_DOCS.terms.body;
    expect(t).toMatch(/platform-use fee/);
    expect(t).toMatch(/not a wager, bet, or prize entry/);
    expect(t).toMatch(/never funded from platform fees/);
    expect(t).toContain("Stripe");
  });
});
