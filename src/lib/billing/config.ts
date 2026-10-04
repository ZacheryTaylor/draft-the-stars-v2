/**
 * Billing model (placeholder, Zach 2026-10-04 rev 2):
 *  - Free accounts. Creating a league is free.
 *  - The commissioner sets the member count (3-12) and invites people.
 *  - Each member pays their own $5 platform fee (commissioner included) when they join or claim a team.
 *  - The commissioner may instead cover any slots (selected, or all unpaid, open slots included) in ONE
 *    checkout of quantity x $5. Covered slots count as paid; payer_id is recorded separately from member_id.
 *    Collecting money back from members happens off-platform.
 *  - No prizes or payouts are paid from fees.
 *  - Only the mock provider (or, later, the Stripe webhook) can mark a member paid. Server-only.
 */
export type DraftGateSetting = "all_slots_filled_and_paid" | "slots_filled_only";

export const billing = {
  pricePerMemberCents: 500,
  currency: "usd",
  minMembers: 3,
  maxMembers: 12,
  /**
   * THE single draft-gate setting (read by draftReadiness() in src/lib/billing/index.ts).
   * "all_slots_filled_and_paid" (current): the draft can't start until every team slot has a member
   *   AND every member has paid (or is fee-waived). Mirrored in the database by public.league_draft_ready().
   * "slots_filled_only": escape hatch for a free promo season. TODO(billing-enforcement): if this is
   *   ever used, also relax public.league_draft_ready() in supabase/migrations.
   */
  draftGate: "all_slots_filled_and_paid" as DraftGateSetting,
};

export const FEE_COPY = {
  short: "$5 platform fee per member",
  long: "Each member pays a one-time $5 platform fee for the league. It is a platform fee only: no prizes or payouts are paid from fees.",
  cover: "The commissioner can cover other members' fees in one checkout. Any collecting from members happens off-platform; Draft the Stars doesn't handle it.",
} as const;
