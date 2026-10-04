import { env } from "@/lib/services/env";
import type { CheckoutResult, PaymentProvider } from "./provider";

/**
 * Stripe placeholder. NOT connected. To implement later:
 *  1. npm i stripe; create a Checkout Session (mode "payment", quantity = member count, unit_amount = 300).
 *  2. POST /api/webhooks/stripe: verify with STRIPE_WEBHOOK_SECRET, on checkout.session.completed insert
 *     public.payments + entitlements and set league_billing.status = 'active' (service role).
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
  async handleWebhook() {
    return null; // TODO(stripe): verify signature + parse event
  }
}
