import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { billing, formatCents } from "@/lib/billing";
import { Monogram } from "@/components/Monogram";

export default async function Landing() {
  const user = await getCurrentUser();
  const min = formatCents(billing.minMembers * billing.pricePerMemberCents);
  const max = formatCents(billing.maxMembers * billing.pricePerMemberCents);
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Any reality competition · draft night with friends</p>
        <h1>Draft the Stars</h1>
        <p className="lede muted">
          Draft the cast, score every episode, and watch the standings move. Built for ballroom, island, rose and
          cooking-show seasons alike, with a live draft room, commissioner tools and Max Possible math that knows who is
          still in it.
        </p>
        <div className="row">
          {user ? (
            <Link className="btn primary" href="/dashboard">Go to my leagues</Link>
          ) : (
            <>
              <Link className="btn primary" href="/signup">Create a free account</Link>
              <Link className="btn" href="/login">Log in</Link>
            </>
          )}
          <Link className="btn ghost" href="/join">Join with a code</Link>
        </div>
      </section>

      <section className="card">
        <div className="hero-head">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Draft · Score · Celebrate</h2>
          </div>
          <div className="row" aria-hidden="true">
            <Monogram name="Celebrity Star" size="lg" />
            <Monogram name="Pro Partner" role="pro" size="lg" />
          </div>
        </div>
        <div className="feature-grid">
          <div className="feature"><b>Snake draft, live</b>Everyone drafts in one room. Celebrities and pros are separate picks with fair roster slots.</div>
          <div className="feature"><b>Weekly scoring</b>Scores come in after each episode. Every drafted cast member earns their points.</div>
          <div className="feature"><b>Standings that matter</b>Podium, gold border for #1, Alive meters and a Max Possible that caps for who is left.</div>
          <div className="feature"><b>Commissioner tools</b>Invite codes, roles, score overrides and league settings in one place.</div>
          <div className="feature"><b>Your colours</b>Pick Pink, Blue, Green, Red, White, Purple, Gold or Dark for your own view.</div>
          <div className="feature"><b>Simple pricing</b>Accounts are free. A league is {formatCents(billing.pricePerMemberCents)} per member ({min} to {max} for 3 to 12 teams).</div>
        </div>
      </section>
    </>
  );
}
