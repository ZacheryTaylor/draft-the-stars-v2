import { billing, type BillingEnforcement } from "./config";
import type { BillingStatus, LeagueStatus } from "@/lib/data/types";

export { billing };

export function formatCents(cents: number, currency = billing.currency): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

export interface BillingQuote {
  memberCount: number;
  pricePerMemberCents: number;
  totalCents: number;
  label: string; // "9 members × $3.00 = $27.00"
}

export function quote(memberCount: number, pricePerMemberCents = billing.pricePerMemberCents): BillingQuote {
  const totalCents = memberCount * pricePerMemberCents;
  return {
    memberCount,
    pricePerMemberCents,
    totalCents,
    label: `${memberCount} member${memberCount === 1 ? "" : "s"} × ${formatCents(pricePerMemberCents)} = ${formatCents(totalCents)}`,
  };
}

export function isPaid(status: BillingStatus): boolean {
  return status === "active" || status === "waived";
}


/** Status a brand-new league starts in, given the enforcement setting. */
export function initialLeagueStatus(enforcement: BillingEnforcement = billing.enforcement): "pending_payment" | "active" {
  return enforcement === "at_creation" ? "pending_payment" : "active";
}

export interface LeagueGate {
  allowed: boolean;
  enforcement: BillingEnforcement;
  message: string;
}

/**
 * The one place billing enforcement is applied: can this league draft, accept joins and make picks?
 * Viewing the league, settings and the checkout page are always allowed.
 */
export function leagueGate(leagueStatus: LeagueStatus, enforcement: BillingEnforcement = billing.enforcement): LeagueGate {
  if (leagueStatus === "active" || leagueStatus === "archived") return { allowed: true, enforcement, message: "League is paid and active." };
  if (enforcement === "off") return { allowed: true, enforcement, message: "Billing enforcement is off; league can be used unpaid." };
  return { allowed: false, enforcement, message: "This league is waiting for payment. Complete checkout to unlock the draft and invites." };
}
