import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { viewerRole } from "@/lib/data/league-view";
import { billing, formatCents, leagueGate, quote } from "@/lib/billing";
import { getPaymentProvider, realProvider } from "@/lib/billing/get-provider";
import { mockDb } from "@/lib/data/mock-adapter";
import { checkoutLeague, resetMockBilling } from "../../../actions";
import { FormMessage } from "@/components/FormMessage";

export const metadata = { title: "League billing" };

export default async function BillingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; paid?: string; new?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const b = (await getData().getLeague(slug))!;
  const user = await getCurrentUser();
  const v = viewerRole(b, user);
  if (!v.isMember) return null;
  const members = b.league.settings.teamCount;
  const q = quote(members, b.billing.pricePerMemberCents);
  const paid = b.league.status === "active";
  const stripe = realProvider();
  const mock = getPaymentProvider();
  const gate = leagueGate(b.league.status);
  // Payments are read straight from the mock store (Supabase: select from payments where league_id = ...).
  const payments = mockDb().payments.filter((p) => p.leagueId === b.league.id);
  return (
    <>
      <div className="card">
        <div className="hero-head">
          <div>
            <p className="eyebrow">League checkout</p>
            <h2>{paid ? "Paid & active" : "Checkout"}</h2>
            <p className="muted">Accounts are free. Each league costs {formatCents(billing.pricePerMemberCents)} per member, paid once by the commissioner when the league is created.</p>
          </div>
          <span className={`pill ${paid ? "" : "pill-gold"}`} style={{ fontSize: 13 }}>{paid ? "Active" : "Pending payment"}</span>
        </div>
        {sp.new && !paid && <p className="notice">League created. It stays <b>pending payment</b> until checkout succeeds.</p>}
        {sp.paid && paid && <p className="notice" role="status">Mock payment succeeded. <b>{b.league.name}</b> is now active.</p>}
        <FormMessage error={sp.error} />

        <div className="grid-2">
          <div className="receipt" aria-label="Order summary">
            <div><span>League</span><b>{b.league.name}</b></div>
            <div><span>Members (teams)</span><b>{members}</b></div>
            <div><span>Price per member</span><b>{formatCents(q.pricePerMemberCents)}</b></div>
            <div><span>{members} × {formatCents(q.pricePerMemberCents)}</span><b>{formatCents(q.totalCents)}</b></div>
            <div className="total"><span>Total</span><span>{formatCents(q.totalCents)}</span></div>
            <p className="hint" style={{ margin: 0 }}>Billing status: <b>{b.billing.status}</b>{b.billing.paidAt ? ` · paid ${new Date(b.billing.paidAt).toLocaleDateString("en-US")}` : ""}{b.billing.provider ? ` via ${b.billing.provider}` : ""}</p>
          </div>
          <div className="stack">
            <p className="notice warn">
              <b>Payment provider not connected.</b> {stripe.label} is a placeholder (no keys, no account), so no real card can be charged.
              Checkout below uses the <b>{mock.label}</b>; it succeeds instantly and is the only way a league becomes active right now.
            </p>
            {v.isCommissioner ? (
              paid ? (
                <form action={resetMockBilling}>
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className="ghost">Reset to pending (mock demo only)</button>
                </form>
              ) : (
                <form action={checkoutLeague}>
                  <input type="hidden" name="slug" value={slug} />
                  <button type="submit" className="primary">Pay {formatCents(q.totalCents)} with mock checkout</button>
                </form>
              )
            ) : (
              <p className="hint">Only the commissioner can pay for the league.</p>
            )}
            <p className="hint">{gate.message}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Payments</h3>
        {payments.length === 0 ? <p className="muted">No payments yet.</p> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>When</th><th>Provider</th><th className="num">Members</th><th className="num">Amount</th><th>Status</th><th>Reference</th></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}><td>{new Date(p.createdAt).toLocaleString("en-US")}</td><td>{p.provider}</td><td className="num">{p.memberCount}</td><td className="num">{formatCents(p.amountCents)}</td><td><span className="pill">{p.status}</span></td><td><code>{p.providerPaymentId}</code></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">TODO(stripe): Stripe Checkout + webhook (STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET). Entitlement granted on success: league_season_pass.</p>
      </div>
    </>
  );
}
