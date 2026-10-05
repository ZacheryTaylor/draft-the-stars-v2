import { billing, FEE_COPY, type DraftGateSetting } from "./config";
import type { MemberPaymentStatus, SlotPayment } from "@/lib/data/types";

export { billing, FEE_COPY };

export function formatCents(cents: number, currency = billing.currency): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
}

/** Display helper: what a league of N members collects in platform fees (each member pays their own). */
export function quote(memberCount: number, pricePerMemberCents = billing.pricePerMemberCents) {
  const totalCents = memberCount * pricePerMemberCents;
  return {
    memberCount,
    pricePerMemberCents,
    totalCents,
    label: `${memberCount} member${memberCount === 1 ? "" : "s"} × ${formatCents(pricePerMemberCents)} each = ${formatCents(totalCents)}`,
  };
}

export function isPaid(status: MemberPaymentStatus | undefined | null): boolean {
  return status === "paid" || status === "waived";
}

export interface ReadinessInput {
  teamCount: number;
  teams: { id: string; ownerId: string | null }[];
  /** Active slot payment per team (void/refunded rows ignored). */
  payments: { teamId: string; status: MemberPaymentStatus }[];
}

export interface DraftReadiness {
  ready: boolean;
  filledSlots: number;
  totalSlots: number;
  paidSlots: number;
  unpaidTeamIds: string[];
  reasons: string[];
}

/**
 * The one place the draft gate is decided in the app (the DB mirrors it in league_draft_ready()).
 * The draft can start only when every slot is filled AND every slot is paid (by its member or covered) or waived.
 */
export function draftReadiness(input: ReadinessInput, gate: DraftGateSetting = billing.draftGate): DraftReadiness {
  const filledSlots = input.teams.filter((t) => t.ownerId).length;
  const totalSlots = input.teamCount;
  const statusOf = (teamId: string) => input.payments.find((p) => p.teamId === teamId && p.status !== "void" && p.status !== "refunded")?.status;
  const unpaidTeamIds = input.teams.filter((t) => !isPaid(statusOf(t.id))).map((t) => t.id);
  const reasons: string[] = [];
  if (input.teams.length !== totalSlots || filledSlots < totalSlots) reasons.push(`${totalSlots - filledSlots} of ${totalSlots} team slots are still open`);
  if (gate === "all_slots_filled_and_paid" && unpaidTeamIds.length) reasons.push(`${unpaidTeamIds.length} slot${unpaidTeamIds.length === 1 ? " is" : "s are"} not paid or covered yet`);
  return { ready: reasons.length === 0, filledSlots, totalSlots, paidSlots: input.teams.length - unpaidTeamIds.length, unpaidTeamIds, reasons };
}

export interface SlotForCheckout {
  teamId: string;
  status: MemberPaymentStatus;
}

export type CheckoutPlan =
  | { ok: true; teamIds: string[]; quantity: number; amountCents: number }
  | { ok: false; reason: string };

/**
 * Plan ONE checkout for one or more slots (quantity x $5). Used for a member paying their own slot and
 * for a commissioner covering selected slots or all unpaid slots (open, unfilled slots included).
 * Refuses any slot that is not 'unpaid', so a slot can never be paid twice.
 */
export function planCheckout(slots: SlotForCheckout[], selection: string[] | "all_unpaid", pricePerMemberCents = billing.pricePerMemberCents): CheckoutPlan {
  const teamIds = selection === "all_unpaid" ? slots.filter((s) => s.status === "unpaid").map((s) => s.teamId) : [...new Set(selection)];
  if (!teamIds.length) return { ok: false, reason: selection === "all_unpaid" ? "Every slot is already paid" : "Select at least one slot" };
  for (const id of teamIds) {
    const slot = slots.find((s) => s.teamId === id);
    if (!slot) return { ok: false, reason: "Unknown team slot" };
    if (slot.status === "paid" || slot.status === "waived") return { ok: false, reason: "One of the selected slots is already paid" };
    if (slot.status !== "unpaid") return { ok: false, reason: `A selected slot is ${slot.status.replace("_", " ")}` };
  }
  return { ok: true, teamIds, quantity: teamIds.length, amountCents: teamIds.length * pricePerMemberCents };
}

/** The one live payment row for a slot (SQL: unique index payments_one_active_per_slot). */
export function activeSlotPayment(payments: SlotPayment[], teamId: string): SlotPayment | undefined {
  return payments.find((p) => p.teamId === teamId && (p.status === "unpaid" || p.status === "paid" || p.status === "waived"));
}

/** Calendar date helpers for payment deadlines (local noon avoids DST edge cases). */
function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Payment deadline = calendar day before the season premiere.
 * Returns null when premiereDate is missing/invalid.
 */
export function paymentDeadlineFromPremiere(premiereDate: string | null | undefined): string | null {
  if (!premiereDate || !/^\d{4}-\d{2}-\d{2}$/.test(premiereDate)) return null;
  const prem = parseYmd(premiereDate);
  if (Number.isNaN(prem.getTime())) return null;
  prem.setDate(prem.getDate() - 1);
  return formatYmd(prem);
}

export interface DeadlineInfo {
  premiereDate: string | null;
  deadline: string | null;
  /** End of the deadline day (local), for countdown math. */
  deadlineEnd: Date | null;
  passed: boolean;
  /** Whole days remaining (0 on deadline day before end-of-day; negative if passed). */
  daysRemaining: number | null;
  label: string;
}

/** Snapshot of payment-deadline state relative to `now` (defaults to Date.now()). Uses calendar days. */
export function paymentDeadlineInfo(premiereDate: string | null | undefined, now: Date = new Date()): DeadlineInfo {
  const deadline = paymentDeadlineFromPremiere(premiereDate);
  if (!deadline) {
    return { premiereDate: premiereDate ?? null, deadline: null, deadlineEnd: null, passed: false, daysRemaining: null, label: "No premiere date set" };
  }
  const end = parseYmd(deadline);
  end.setHours(23, 59, 59, 999);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const daysRemaining = Math.round((deadlineDay.getTime() - today.getTime()) / 86_400_000);
  const passed = now.getTime() > end.getTime();
  const label = passed
    ? `Payment deadline passed (${deadline})`
    : daysRemaining === 0
      ? `Payment deadline is today (${deadline})`
      : daysRemaining === 1
        ? `Payment deadline tomorrow (${deadline})`
        : `Payment deadline in ${daysRemaining} days (${deadline})`;
  return { premiereDate: premiereDate ?? null, deadline, deadlineEnd: end, passed, daysRemaining, label };
}
