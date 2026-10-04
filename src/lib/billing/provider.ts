/** Payment provider adapter. Stripe is stubbed; the mock is the only working implementation. */
export interface CheckoutRequest {
  leagueId: string;
  leagueName: string;
  payerId: string;
  memberCount: number;
  pricePerMemberCents: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
}

export type CheckoutResult =
  | { kind: "paid"; providerPaymentId: string; amountCents: number } // mock: settles instantly
  | { kind: "redirect"; url: string; providerSessionId: string } // stripe: hosted checkout
  | { kind: "unavailable"; reason: string };

export interface PaymentProvider {
  readonly id: "mock" | "stripe";
  readonly label: string;
  isConnected(): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  /** Verify + parse a provider webhook. The server marks league_billing active only from here (or the mock). */
  handleWebhook(rawBody: string, signature: string | null): Promise<{ leagueId: string; providerPaymentId: string; amountCents: number } | null>;
}
