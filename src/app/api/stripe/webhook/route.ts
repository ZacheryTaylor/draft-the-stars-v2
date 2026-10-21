import { env } from "@/lib/services/env";
import { handleStripeWebhook } from "@/lib/billing/stripe-checkout";
import { getStripe, getStripeRepo } from "@/lib/billing/stripe-server";

/** Stripe webhook: verifies the signature, then marks the member paid on checkout.session.completed. */
export async function POST(req: Request) {
  const stripe = getStripe(), repo = getStripeRepo();
  if (!stripe || !repo || !env.stripe.webhookSecret) return Response.json({ error: "Not configured" }, { status: 503 });
  const rawBody = await req.text(); // raw body is required for signature verification
  const out = await handleStripeWebhook({ stripe, repo, rawBody, signature: req.headers.get("stripe-signature"), webhookSecret: env.stripe.webhookSecret });
  return Response.json(out.body, { status: out.status });
}
