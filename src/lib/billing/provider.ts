/** Payment provider adapter. Stripe is stubbed; the mock is the only working implementation. */
export interface SlotCheckoutRequest {
  leagueId: string;
  leagueName: string;
  payerId: string;
  teamIds: string[]; // slots being paid for (own slot, or slots the commissioner covers)
  quantity: number;
  amountCents: number; // quantity x platform fee
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export type CheckoutResult =
  | { kind: "paid"; providerPaymentId: string; amountCents: number } // mock: settles instantly
  | { kind: "redirect"; url: string; providerSessionId: string } // stripe: hosted checkout
  | { kind: "unavailable"; reason: string };

export type RefundResult = { kind: "refund_pending"; note: string } | { kind: "unavailable"; reason: string };

export interface PaymentProvider {
  readonly id: "mock" | "stripe";
  readonly label: string;
  isConnected(): boolean;
  createCheckout(req: SlotCheckoutRequest): Promise<CheckoutResult>;
  /** Placeholder: refund a slot's fee to whoever paid it (member left before the draft, or the league was cancelled). */
  refund(providerPaymentId: string, amountCents: number): Promise<RefundResult>;
  /** Verify + parse a webhook. The server marks a member paid only from here (or the mock). */
  handleWebhook(rawBody: string, signature: string | null): Promise<{ leagueId: string; payerId: string; teamIds: string[]; providerPaymentId: string; amountCents: number } | null>;
}
