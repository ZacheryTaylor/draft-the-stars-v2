import { env } from "@/lib/services/env";
import type { CheckoutResult, PaymentProvider, RefundResult } from "./provider";

/**
 * Stripe placeholder. NOT connected. To implement later:
 *  1. npm i stripe; create a Checkout Session (mode "payment", quantity = slots, unit_amount 500,
 *     metadata { league_id, payer_id, team_ids }).
 *  2. POST /api/webhooks/stripe: verify with STRIPE_WEBHOOK_SECRET; on checkout.session.completed call
 *     public.mark_slots_paid(...) with the service role (refuses already-paid slots) and add entitlements.
 *  3. Refunds: stripe.refunds.create({ payment_intent }) when a member leaves before the draft or the league is cancelled.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly id = "stripe" as const;
  readonly label = "Stripe";
  isConnected() {
    return Boolean(env.stripe.secretKey && env.stripe.publishableKey && env.stripe.webhookSecret);
  }
  async createCheckout(): Promise<CheckoutResult> {
    return { kind: "unavailable", reason: "Payment provider not connected (Stripe placeholder)." };
  }
  async refund(): Promise<RefundResult> {
    return { kind: "unavailable", reason: "Stripe refunds not connected (placeholder)." };
  }
  async handleWebhook() {
    return null; // TODO(stripe): verify signature + parse event
  }
}
