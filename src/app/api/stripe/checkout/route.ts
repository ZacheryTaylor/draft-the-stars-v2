import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/services/env";
import { createMemberCheckout } from "@/lib/billing/stripe-checkout";
import { getStripe, getStripeRepo } from "@/lib/billing/stripe-server";

/** POST { league_id } (JSON or form). Creates a Stripe Checkout Session for the signed-in member's $5 fee. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in first" }, { status: 401 });
  const stripe = getStripe(), repo = getStripeRepo();
  if (!stripe || !repo) return Response.json({ error: "Payments are not configured yet" }, { status: 503 });

  const type = req.headers.get("content-type") ?? "";
  const leagueId = type.includes("application/json")
    ? String(((await req.json()) as { league_id?: string }).league_id ?? "")
    : String((await req.formData()).get("league_id") ?? "");

  const out = await createMemberCheckout({ stripe, repo, leagueId, userId: user.id, siteUrl: env.siteUrl, priceId: env.stripe.priceId });
  if (!out.ok) return Response.json({ error: out.error }, { status: out.status });
  if (type.includes("application/json")) return Response.json({ url: out.url });
  return Response.redirect(out.url, 303);
}
