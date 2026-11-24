import Link from "next/link";
import type { LeagueBundle, Profile } from "@/lib/data/types";
import type { FormAction, Routes } from "./routes";
import { viewerRole } from "@/lib/data/league-view";
import { activeSlotPayment, FEE_COPY, formatCents, planCheckout } from "@/lib/billing";
import { checkoutReturnQuery, selectionFor, TEST_CARD, type CheckoutMode } from "@/lib/billing/checkout-flow";
import { FormMessage } from "@/components/FormMessage";
import { PayButton } from "@/components/PayButton";

/**
 * Checkout step for league fees. With no payment keys configured (free/mock mode) this is a clearly labelled
 * simulated test checkout: the card fields are read-only test values and "Pay" settles through the mock provider.
 * TODO(stripe): when Stripe test keys + a hosted DB are configured, this step hands off to Stripe-hosted Checkout.
 */
export function CheckoutView({ b, user, slug, mode, teamIds, error, act, r }: {
  b: LeagueBundle; user: Profile | null; slug: string; mode: CheckoutMode; teamIds: string[]; error?: string;
  act: { confirmCheckout: FormAction }; r: Routes;
}) {
  const v = viewerRole(b, user);
  if (!v.isMember || !user) return null;
  const price = b.billing.pricePerMemberCents;
  const feesHref = r.league(slug, "fees");
  const cancelHref = r.league(slug, "fees", checkoutReturnQuery("cancelled"));
  const locked = b.league.draftStatus !== "not_started";
  const effectiveMode: CheckoutMode = v.isCommissioner ? mode : "mine";
  const slots = b.teams.map((t) => ({ teamId: t.id, status: activeSlotPayment(b.payments, t.id)?.status ?? ("unpaid" as const) }));
  const plan = locked ? ({ ok: false, reason: "The draft has started, so fees are closed for this league." } as const) : planCheckout(slots, selectionFor(effectiveMode, teamIds, b.teams, user.id), price);

  if (!plan.ok)
    return (
      <section className="card checkout-card" aria-labelledby="co-title">
        <p className="eyebrow">Checkout</p>
        <h2 id="co-title">Nothing to pay</h2>
        <p className="muted">{plan.reason}.</p>
        <Link className="btn primary" href={feesHref}>Back to league fees</Link>
      </section>
    );

  const name = (id: string | null) => {
    const p = id ? b.members.find((m) => m.userId === id)?.profile : null;
    return p ? (id === user.id ? "You" : p.displayName || p.username) : null;
  };
  const lines = plan.teamIds.map((id) => b.teams.find((t) => t.id === id)!).sort((x, y) => x.draftPosition - y.draftPosition);
  const total = formatCents(plan.amountCents);
  const covering = lines.some((t) => t.ownerId !== user.id);

  return (
    <section className="card checkout-card" aria-labelledby="co-title" data-testid="checkout">
      <div className="checkout-top">
        <div>
          <p className="eyebrow">Checkout · {b.league.name}</p>
          <h2 id="co-title">Pay league fees</h2>
          <p className="muted" style={{ margin: 0 }}>One-time platform fee for this league. Not a subscription.</p>
        </div>
        <span className="pill pill-gold checkout-badge">Test mode</span>
      </div>
      <FormMessage error={error} />

      <div className="checkout-grid">
        <div className="checkout-summary" aria-labelledby="co-summary">
          <h3 id="co-summary">Order summary</h3>
          <ul className="checkout-lines">
            {lines.map((t) => (
              <li key={t.id}>
                <span className="checkout-line-name"><b>{t.name}</b><small>{name(t.ownerId) ?? "Open slot (stays paid for whoever claims it)"}</small></span>
                <span className="num">{formatCents(price)}</span>
              </li>
            ))}
          </ul>
          <div className="receipt checkout-receipt">
            <div><span>{plan.quantity} slot{plan.quantity === 1 ? "" : "s"} × {formatCents(price)}</span><b>{total}</b></div>
            <div><span>Monthly charges</span><b>None</b></div>
            <div className="total"><span>Total due today</span><span data-testid="checkout-total">{total}</span></div>
          </div>
          <p className="hint">{FEE_COPY.long}{covering ? ` ${FEE_COPY.cover}` : ""}</p>
          <p className="hint">{FEE_COPY.refund} <Link href={r.legal("refunds")}>Refund policy</Link></p>
        </div>

        <form action={act.confirmCheckout} className="checkout-pay" aria-labelledby="co-pay">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="mode" value={effectiveMode} />
          {effectiveMode === "selected" && plan.teamIds.map((id) => <input key={id} type="hidden" name="teamId" value={id} />)}
          <h3 id="co-pay">Payment</h3>
          <p className="notice warn checkout-sim" role="note">
            <b>Simulated test checkout.</b> No payment keys are connected, so no card is charged and no money moves. The test card below is filled in for you.
          </p>
          <fieldset className="checkout-card-fields">
            <legend className="sr-only">Test card (read-only)</legend>
            <label>Card number<input value={TEST_CARD.number} readOnly inputMode="numeric" autoComplete="off" aria-describedby="co-card-hint" /></label>
            <div className="checkout-card-row">
              <label>Expiry<input value={TEST_CARD.expiry} readOnly autoComplete="off" /></label>
              <label>CVC<input value={TEST_CARD.cvc} readOnly autoComplete="off" /></label>
            </div>
            <label>Name on card<input value={TEST_CARD.name} readOnly autoComplete="off" /></label>
            <p className="hint" id="co-card-hint" style={{ margin: 0 }}>Stripe&apos;s standard test card. Read-only in this preview.</p>
          </fieldset>
          <PayButton label={`Pay ${total} (test)`} />
          <Link className="btn checkout-cancel" href={cancelHref} data-testid="checkout-cancel">Cancel and go back</Link>
          <p className="hint" style={{ margin: 0, textAlign: "center" }}>By paying you agree to the <Link href={r.legal("terms")}>Terms</Link> and <Link href={r.legal("fees-disclosure")}>fee disclosure</Link>.</p>
        </form>
      </div>
    </section>
  );
}
