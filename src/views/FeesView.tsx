import Link from "next/link";
import type { LeagueBundle, Profile } from "@/lib/data/types";
import type { Routes } from "./routes";
import { viewerRole } from "@/lib/data/league-view";
import { activeSlotPayment as slotPayment, billing, draftReadiness, FEE_COPY, formatCents, paymentDeadlineInfo } from "@/lib/billing";
import { FormMessage } from "@/components/FormMessage";
import { PaymentRoster, type RosterRow } from "@/components/PaymentRoster";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";

export interface FeesActions {
  checkoutSlots: (form: FormData) => Promise<void>;
  remindUnpaid: (form: FormData) => Promise<void>;
  remindAllUnpaid: (form: FormData) => Promise<void>;
  requestRefund: (form: FormData) => Promise<void>;
  removeMember: (form: FormData) => Promise<void>;
}
export interface FeesFlash { error?: string; paid?: string; new?: string; saved?: string; checkout?: string }

const SAVED: Record<string, string> = {
  reminder: "Reminder queued (email is a placeholder; nothing was sent).",
  refund: "Refund requested (placeholder). It goes back to whoever paid, and the slot is unpaid again.",
  removed: "Member removed. Their slot is open again; share the invite code to replace them.",
};

/** Banner after a (test) checkout returns: what was paid, and whether the league is now unlocked for the draft. */
function CheckoutSuccess({ paid, price, ready, isCommissioner, slug, r }: { paid: number; price: number; ready: ReturnType<typeof draftReadiness>; isCommissioner: boolean; slug: string; r: Routes }) {
  const open = ready.totalSlots - ready.filledSlots;
  const allPaid = ready.paidSlots >= ready.totalSlots;
  return (
    <div className={`checkout-result notice ${ready.ready ? "ok" : ""}`} role="status" data-testid="checkout-success">
      <p style={{ margin: 0 }}>
        <span aria-hidden="true" className="checkout-check">✓</span> <b>Payment complete (test).</b> {paid} slot{paid === 1 ? "" : "s"} paid · {formatCents(paid * price)}. No money moved.
      </p>
      {ready.ready ? (
        <div className="row" style={{ marginTop: 8 }}>
          <span><b>League unlocked.</b> Every slot is filled and paid, so the draft can start.</span>
          <Link className="btn primary btn-sm" href={r.league(slug, "draft")} data-testid="go-draft">{isCommissioner ? "Start the draft" : "Go to the draft room"}</Link>
        </div>
      ) : allPaid ? (
        <p style={{ margin: "8px 0 0" }}><b>Fees: all paid.</b> The draft unlocks once {open === 1 ? "the last open slot has" : `the ${open} open slots have`} a member. {isCommissioner && <Link href={r.league(slug, "commissioner")}>Share the invite code</Link>}</p>
      ) : (
        <p style={{ margin: "8px 0 0" }}>Draft waiting: {ready.reasons.join("; ")}.</p>
      )}
    </div>
  );
}

function RefundNote({ r }: { r: Routes }) {
  return (
    <p className="hint" data-testid="refund-note">
      {FEE_COPY.refund} <Link href={r.legal("refunds")}>Refund policy</Link> · <Link href={r.legal("fees-disclosure")}>Fee &amp; no-prize disclosure</Link>
    </p>
  );
}

export function FeesView({ b, user, slug, sp, act, stripeLabel, mockLabel, r }: { b: LeagueBundle; user: Profile | null; slug: string; sp: FeesFlash; act: FeesActions; stripeLabel: string; mockLabel: string; r: Routes }) {
  const v = viewerRole(b, user);
  if (!v.isMember) return null;
  const price = b.billing.pricePerMemberCents;
  const name = (id: string | null) => {
    const p = id ? b.members.find((m) => m.userId === id)?.profile : null;
    return p ? p.displayName || p.username : null;
  };
  const teams = [...b.teams].sort((x, y) => x.draftPosition - y.draftPosition);
  const rows: RosterRow[] = teams.map((t) => {
    const p = slotPayment(b.payments, t.id);
    const status = p?.status === "paid" || p?.status === "waived" ? p.status : "unpaid";
    return {
      teamId: t.id,
      teamName: t.name,
      draftPosition: t.draftPosition,
      memberId: t.ownerId,
      memberName: name(t.ownerId),
      isOwner: t.ownerId === b.league.ownerId,
      isMe: t.ownerId === user?.id,
      status,
      payerName: p?.payerId ? (p.payerId === user?.id ? "you" : name(p.payerId)) : null,
      paidByMember: Boolean(p?.payerId && p.payerId === t.ownerId),
      remindedAt: p?.remindedAt ?? null,
    };
  });
  const ready = draftReadiness({ teamCount: b.league.settings.teamCount, teams: b.teams, payments: b.payments });
  const deadline = paymentDeadlineInfo(b.season.premiereDate);
  const mine = rows.find((r) => r.isMe);
  const locked = b.league.draftStatus !== "not_started";
  const history = b.payments.filter((p) => p.status !== "unpaid" && p.status !== "waived").sort((x, y) => (y.paidAt ?? y.createdAt).localeCompare(x.paidAt ?? x.createdAt));
  const teamName = (id: string) => b.teams.find((t) => t.id === id)?.name ?? "Team";
  const unpaidMembers = rows.filter((r) => r.status === "unpaid" && r.memberId).length;
  const unpaidSlots = rows.filter((r) => r.status === "unpaid").length;

  return (
    <>
      <div className="card">
        <div className="hero-head">
          <div>
            <p className="eyebrow">League fees</p>
            <h2>{ready.paidSlots} of {ready.totalSlots} slots paid</h2>
            <p className="muted">Accounts and league creation are free. {FEE_COPY.long}</p>
          </div>
          <span className={`pill ${ready.ready ? "pill-ok" : "pill-gold"}`} style={{ fontSize: 13 }}>{ready.ready ? "Ready to draft" : "Draft waiting"}</span>
        </div>
        {sp.checkout === "success" || sp.paid ? (
          <CheckoutSuccess paid={Number(sp.paid) || 0} price={price} ready={ready} isCommissioner={v.isCommissioner} slug={slug} r={r} />
        ) : sp.checkout === "cancelled" ? (
          <p className="notice checkout-result" role="status" data-testid="checkout-cancelled"><b>Checkout cancelled.</b> Nothing was charged and your slots are still unpaid. You can check out again any time before the draft.</p>
        ) : null}
        {(sp.new || (v.isCommissioner && ready.paidSlots === 0)) && !sp.checkout && !locked && (
          <div className="fee-summary" data-testid="fee-summary">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>{sp.new ? "League created · free" : "Pay for the league"}</p>
              <h3 style={{ margin: "2px 0 4px" }}>Fee summary</h3>
              <div className="receipt">
                <div><span>Team slots</span><b>{ready.totalSlots}</b></div>
                <div><span>Platform fee per member (one-time)</span><b>{formatCents(price)}</b></div>
                <div className="total"><span>League total if you cover everyone</span><span>{formatCents(price * ready.totalSlots)}</span></div>
              </div>
              <p className="hint">Each member can pay their own {formatCents(price)} when they join, or you can pay for the whole league now. Open slots you pay for stay paid for whoever claims them.</p>
            </div>
            {v.isCommissioner && !locked && (
              <div className="fee-summary-actions">
                <form action={act.checkoutSlots}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="mode" value="all_unpaid" />
                  <button type="submit" className="primary" data-testid="cover-league">Pay for the league · {formatCents(price * unpaidSlots)}</button>
                </form>
                {mine?.status === "unpaid" && (
                  <form action={act.checkoutSlots}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="mode" value="mine" />
                    <button type="submit">Just my slot · {formatCents(price)}</button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
        <FormMessage error={sp.error} success={sp.saved ? SAVED[sp.saved] : undefined} />

        <div className="grid-2">
          <div className="stack">
            <h3 style={{ margin: 0 }}>Your fee</h3>
            {!mine ? (
              <p className="muted">You don&apos;t hold a team slot in this league.</p>
            ) : mine.status === "unpaid" ? (
              <form action={act.checkoutSlots} className="stack">
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="mode" value="mine" />
                <div className="receipt" aria-label="Your order">
                  <div><span>{mine.teamName}</span><b>1 slot</b></div>
                  <div className="total"><span>Total</span><span>{formatCents(price)}</span></div>
                </div>
                <button type="submit" className="primary" disabled={locked}>Continue to checkout · {formatCents(price)}</button>
                <RefundNote r={r} />
              </form>
            ) : (
              <p className="notice">
                {mine.status === "waived" ? "Your fee is waived for this league." : mine.paidByMember ? "You're paid. Thanks!" : <>Your slot is <b>covered by {mine.payerName}</b>. Any paying back happens off-platform.</>}
              </p>
            )}
          </div>
          <div className="stack">
            <p className="notice warn">
              <b>Payment provider not connected.</b> {stripeLabel} is a placeholder (no keys, no account), so no real card can be charged.
              Checkout opens a <b>simulated test checkout</b> ({mockLabel}); paying there is the only way a slot becomes paid right now.
            </p>
            <div>
              <b>Draft gate</b>
              {ready.ready ? <p className="hint" style={{ margin: 0 }}>Every slot is filled and paid. The commissioner can start the draft.</p> : (
                <ul className="hint" style={{ margin: "4px 0 0", paddingLeft: 18 }}>{ready.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
              )}
              {deadline.passed && !locked && <p className="hint" style={{ marginTop: 6 }}><b>Deadline passed.</b> {deadline.label}</p>}
            </div>
            <div>
              <b>Payment deadline</b>
              <DeadlineCountdown premiereDate={b.season.premiereDate} />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="hero-head">
          <h3 style={{ marginTop: 0 }}>Payment roster</h3>
          {v.isCommissioner && !locked && unpaidMembers > 0 && (
            <form action={act.remindAllUnpaid}>
              <input type="hidden" name="slug" value={slug} />
              <button type="submit" data-testid="nudge-unpaid">Nudge unpaid ({unpaidMembers})</button>
            </form>
          )}
        </div>
        {v.isCommissioner && !locked && (
          <p className="muted" style={{ marginTop: 0 }}>
            Cover other members (or open slots, which stay paid for whoever claims them) in one checkout: select slots, then <b>Pay for selected</b>, or <b>Pay for all unpaid</b>. {FEE_COPY.cover}
          </p>
        )}
        <PaymentRoster key={rows.map((x) => `${x.teamId}:${x.status}:${x.memberId}`).join()} slug={slug} rows={rows} priceCents={price} isCommissioner={v.isCommissioner} locked={locked} checkout={act.checkoutSlots} remind={act.remindUnpaid} refund={act.requestRefund} remove={act.removeMember} />
        {v.isCommissioner && !locked && <RefundNote r={r} />}
        {v.isCommissioner && <p className="hint">Placeholders: Remind (email stub), Refund (goes back to whoever paid; TODO(refunds)), Remove (replace an unpaid member before the draft).</p>}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Payment history</h3>
        {history.length === 0 ? <p className="muted">No payments yet.</p> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>When</th><th>Slot</th><th>Member</th><th>Paid by</th><th className="num">Amount</th><th>Status</th><th>Checkout</th></tr></thead>
              <tbody>
                {history.map((p) => (
                  <tr key={p.id}>
                    <td>{p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-US") : "-"}</td>
                    <td>{teamName(p.teamId)}</td>
                    <td>{name(p.memberId) ?? <span className="hint">Open slot</span>}</td>
                    <td>{name(p.payerId) ?? "-"}</td>
                    <td className="num">{formatCents(p.amountCents)}</td>
                    <td><span className="pill">{p.status === "refund_pending" ? `refund to ${name(p.refundToId) ?? "payer"} pending` : p.status}</span></td>
                    <td><code>{p.checkoutId}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">TODO(stripe): Stripe Checkout (quantity = slots) + webhook calling mark_slots_paid (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET). Each paid slot grants a league_membership entitlement. Price: {formatCents(billing.pricePerMemberCents)} per member.</p>
      </div>
    </>
  );
}
