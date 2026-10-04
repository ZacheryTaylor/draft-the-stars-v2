/**
 * Billing model (placeholder, Zach 2026-10-04):
 *  - Creating an account is free.
 *  - Creating a league triggers payment: the creator picks 3-12 teams/members and pays
 *    $3 per member ($9-$36) through checkout. The league is created as `pending_payment`
 *    and becomes `active` when the payment succeeds.
 *  - Only the mock provider exists today; no real money moves.
 */
export type BillingEnforcement = "at_creation" | "off";

export const billing = {
  pricePerMemberCents: 300,
  currency: "usd",
  /** Billable members = the team/member count the creator picks (3-12). */
  countBasis: "teams_chosen_at_creation" as const,
  minMembers: 3,
  maxMembers: 12,
  /**
   * THE single enforcement setting (read only by leagueGate() in src/lib/billing/index.ts).
   * "at_creation" -> new leagues start pending_payment; draft room, joining and picks stay locked
   *                  until checkout succeeds (current).
   * "off"         -> new leagues are active immediately (escape hatch, e.g. a free promo season).
   * TODO(billing-enforcement): when Stripe is connected, keep "at_creation" and switch the provider
   * in get-provider.ts; disable the mock provider in production.
   */
  enforcement: "at_creation" as BillingEnforcement,
};
