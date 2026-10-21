/**
 * Stripe Checkout for the one-time $5 platform-use fee (one member slot per checkout).
 * Pure logic with injected Stripe client + repository so it can be unit-tested without keys or a database.
 */
import type Stripe from "stripe";
import { billing } from "./config";

export type SlotStatus = "unpaid" | "paid" | "waived" | "refund_pending" | "refunded" | "void";

export interface MemberSlot { teamId: string; status: SlotStatus }

export interface StripeBillingRepo {
  /** The user's slot in the league, or null when they are not a member holding a slot. */
  getMemberSlot(leagueId: string, userId: string): Promise<MemberSlot | null>;
  /** Idempotently apply a completed checkout (service role only). */
  markMemberPaid(input: { eventId: string; leagueId: string; userId: string; sessionId: string; paymentIntentId: string | null; amountCents: number }): Promise<"paid" | "already_paid" | "duplicate_event" | "no_unpaid_slot">;
}

type StripeLike = Pick<Stripe, "checkout" | "webhooks">;

export type CheckoutOutcome =
  | { ok: true; url: string; sessionId: string }
  | { ok: false; status: 400 | 403 | 409; error: string };

export async function createMemberCheckout(args: {
  stripe: StripeLike; repo: StripeBillingRepo; leagueId: string; userId: string; siteUrl: string; priceId?: string;
}): Promise<CheckoutOutcome> {
  const { stripe, repo, leagueId, userId, siteUrl, priceId } = args;
  if (!leagueId) return { ok: false, status: 400, error: "league_id is required" };
  const slot = await repo.getMemberSlot(leagueId, userId);
  if (!slot) return { ok: false, status: 403, error: "You are not a member of this league" };
  if (slot.status === "paid" || slot.status === "waived") return { ok: false, status: 409, error: "Your fee is already paid" };
  if (slot.status !== "unpaid") return { ok: false, status: 409, error: `Your slot is ${slot.status}` };

  const metadata = { league_id: leagueId, user_id: userId, team_id: slot.teamId };
  const base = siteUrl.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: `${leagueId}:${userId}`,
    metadata,
    payment_intent_data: { metadata },
    line_items: [
      priceId
        ? { price: priceId, quantity: 1 }
        : {
            quantity: 1,
            price_data: {
              currency: billing.currency,
              unit_amount: billing.pricePerMemberCents,
              product_data: { name: "Draft the Stars platform-use fee (one league spot)" },
            },
          },
    ],
    success_url: `${base}/api/stripe/return?league_id=${encodeURIComponent(leagueId)}&status=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/api/stripe/return?league_id=${encodeURIComponent(leagueId)}&status=cancelled`,
  });
  if (!session.url) return { ok: false, status: 400, error: "Stripe did not return a checkout URL" };
  return { ok: true, url: session.url, sessionId: session.id };
}

export type WebhookOutcome = { status: 200 | 400; body: { received: boolean; result?: string; error?: string } };

export async function handleStripeWebhook(args: {
  stripe: StripeLike; repo: StripeBillingRepo; rawBody: string; signature: string | null; webhookSecret: string;
}): Promise<WebhookOutcome> {
  const { stripe, repo, rawBody, signature, webhookSecret } = args;
  if (!signature) return { status: 400, body: { received: false, error: "Missing Stripe-Signature" } };
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return { status: 400, body: { received: false, error: "Invalid signature" } };
  }
  if (event.type !== "checkout.session.completed") return { status: 200, body: { received: true, result: "ignored" } };

  const s = event.data.object as Stripe.Checkout.Session;
  if (s.mode !== "payment" || s.payment_status !== "paid") return { status: 200, body: { received: true, result: "not_paid" } };
  const leagueId = s.metadata?.league_id, userId = s.metadata?.user_id;
  if (!leagueId || !userId) return { status: 200, body: { received: true, result: "missing_metadata" } };
  const paymentIntentId = typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null;
  const result = await repo.markMemberPaid({
    eventId: event.id, leagueId, userId, sessionId: s.id, paymentIntentId, amountCents: s.amount_total ?? billing.pricePerMemberCents,
  });
  return { status: 200, body: { received: true, result } };
}
