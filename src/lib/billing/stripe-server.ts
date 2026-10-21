/** Server-only wiring: Stripe client + Supabase (service role, PostgREST) repository. Never import in client code. */
import Stripe from "stripe";
import { env } from "@/lib/services/env";
import type { MemberSlot, StripeBillingRepo } from "./stripe-checkout";

export function getStripe(): Stripe | null {
  return env.stripe.secretKey ? new Stripe(env.stripe.secretKey) : null;
}

export function getStripeRepo(): StripeBillingRepo | null {
  const { url, serviceRoleKey } = env.supabase;
  if (!url || !serviceRoleKey) return null;
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" };
  const rest = `${url.replace(/\/$/, "")}/rest/v1`;
  return {
    async getMemberSlot(leagueId, userId) {
      const q = new URLSearchParams({ select: "id,payments(status)", league_id: `eq.${leagueId}`, owner_id: `eq.${userId}`, limit: "1" });
      const r = await fetch(`${rest}/teams?${q}`, { headers, cache: "no-store" });
      if (!r.ok) throw new Error(`Supabase teams lookup failed: ${r.status}`);
      const rows = (await r.json()) as { id: string; payments: { status: MemberSlot["status"] }[] }[];
      if (!rows.length) return null;
      const live = rows[0].payments.find((p) => ["unpaid", "paid", "waived"].includes(p.status)) ?? rows[0].payments[0];
      return { teamId: rows[0].id, status: live?.status ?? "unpaid" };
    },
    async markMemberPaid(i) {
      const r = await fetch(`${rest}/rpc/mark_member_paid_stripe`, {
        method: "POST", headers,
        body: JSON.stringify({ p_event_id: i.eventId, p_league: i.leagueId, p_user: i.userId, p_session: i.sessionId, p_payment_intent: i.paymentIntentId, p_amount_cents: i.amountCents }),
      });
      if (!r.ok) throw new Error(`Supabase mark paid failed: ${r.status}`);
      return (await r.json()) as Awaited<ReturnType<StripeBillingRepo["markMemberPaid"]>>;
    },
  };
}
