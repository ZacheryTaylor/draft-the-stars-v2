import type { CheckoutRequest, CheckoutResult, PaymentProvider } from "./provider";

let counter = 0;

/** Mock provider: "payment" succeeds instantly with no money moving. The ONLY way a league becomes paid today. */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock" as const;
  readonly label = "Mock payments (no money moves)";
  isConnected() {
    return true;
  }
  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    counter += 1;
    return {
      kind: "paid",
      providerPaymentId: `mock_${Date.now().toString(36)}_${counter}`,
      amountCents: req.memberCount * req.pricePerMemberCents,
    };
  }
  async handleWebhook() {
    return null;
  }
}
