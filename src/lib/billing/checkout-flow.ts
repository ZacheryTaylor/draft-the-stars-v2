/**
 * Checkout flow helpers shared by the server app and the static demo:
 *   fees page -> /checkout (order summary + simulated test card) -> pay or cancel -> fees page (?checkout=success|cancelled)
 * Pure functions only (no provider, no storage) so the flow is unit-tested without keys.
 */
export type CheckoutMode = "mine" | "selected" | "all_unpaid";
export type CheckoutReturn = "success" | "cancelled";

export const TEST_CARD = { number: "4242 4242 4242 4242", expiry: "12 / 34", cvc: "123", name: "Test Member" } as const;

export function isCheckoutMode(v: unknown): v is CheckoutMode {
  return v === "mine" || v === "selected" || v === "all_unpaid";
}

/** Query string for the checkout page (team ids are only kept for "selected"). */
export function checkoutQuery(mode: CheckoutMode, teamIds: string[] = []): string {
  const p = new URLSearchParams({ mode });
  if (mode === "selected" && teamIds.length) p.set("teams", [...new Set(teamIds)].join(","));
  return p.toString();
}

/** Read the checkout page query. Unknown modes fall back to "mine" (the safest: one slot, your own). */
export function parseCheckoutQuery(get: (key: string) => string | null | undefined): { mode: CheckoutMode; teamIds: string[] } {
  const raw = get("mode");
  const mode = isCheckoutMode(raw) ? raw : "mine";
  const teamIds = mode === "selected" ? (get("teams") ?? "").split(",").map((s) => s.trim()).filter(Boolean) : [];
  return { mode, teamIds };
}

/** Turn a mode into the selection planCheckout()/planSlotCheckout() expect. */
export function selectionFor(mode: CheckoutMode, teamIds: string[], teams: { id: string; ownerId: string | null }[], userId: string): string[] | "all_unpaid" {
  if (mode === "all_unpaid") return "all_unpaid";
  if (mode === "mine") return teams.filter((t) => t.ownerId === userId).map((t) => t.id);
  return teamIds;
}

/** Query string the fees page reads after checkout returns. */
export function checkoutReturnQuery(status: CheckoutReturn, quantity?: number): string {
  return status === "success" ? `checkout=success&paid=${quantity ?? 0}` : "checkout=cancelled";
}
