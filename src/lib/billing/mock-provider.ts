import type { CheckoutResult, SlotCheckoutRequest, PaymentProvider, RefundResult } from "./provider";

let counter = 0;

/** Mock provider: a checkout (quantity x $5) "payment" succeeds instantly; no money moves. One of only two paths to `paid`. */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock" as const;
  readonly label = "Mock checkout (no money moves)";
  isConnected() {
    return true;
  }
  async createCheckout(req: SlotCheckoutRequest): Promise<CheckoutResult> {
    counter += 1;
    return { kind: "paid", providerPaymentId: `mock_${Date.now().toString(36)}_${counter}`, amountCents: req.amountCents };
  }
  async refund(): Promise<RefundResult> {
    // TODO(refunds): real refunds go through Stripe; the mock only records the request.
    return { kind: "refund_pending", note: "Mock refund recorded; no money moves." };
  }
  async handleWebhook() {
    return null;
  }
}
