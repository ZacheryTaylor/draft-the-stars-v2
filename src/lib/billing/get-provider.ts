import { MockPaymentProvider } from "./mock-provider";
import { StripePaymentProvider } from "./stripe-provider";
import type { PaymentProvider } from "./provider";

const stripe = new StripePaymentProvider();
const mock = new MockPaymentProvider();

/** Real provider status for the UI ("Payment provider not connected"). */
export function realProvider(): PaymentProvider {
  return stripe;
}

/** Provider used for checkout. Stripe is never live yet, so this is always the mock. */
export function getPaymentProvider(): PaymentProvider {
  // TODO(stripe): return stripe once StripePaymentProvider.createCheckout is implemented and connected.
  return mock;
}
