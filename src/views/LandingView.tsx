import Link from "next/link";
import type { Profile } from "@/lib/data/types";
import { billing, formatCents } from "@/lib/billing";
import { LandingPreview } from "@/components/LandingPreview";
import { landingPreviewData } from "@/lib/data/sample-preview";
import type { Routes } from "./routes";

export function LandingView({ user, r }: { user: Profile | null; r: Routes }) {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">Fantasy leagues, built for Dancing with the Stars fans</p>
        <h1>Draft the Stars</h1>
        <p className="lede muted">
          Draft the cast, score every episode, and watch the standings move. Built for ballroom, island, rose and
          cooking-show seasons alike, with a live draft room, commissioner tools and Max Possible math that knows who is
          still in it.
        </p>
        <div className="row">
          {user ? (
            <Link className="btn primary" href={r.dashboard}>Go to my leagues</Link>
          ) : (
            <>
              <Link className="btn primary" href={r.signup}>Create a free account</Link>
              <Link className="btn" href={r.login()}>Log in</Link>
            </>
          )}
          <Link className="btn ghost" href={r.join()}>Join with a code</Link>
        </div>
      </section>

      <section className="card">
        <div className="hero-head">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Draft · Score · Celebrate</h2>
          </div>
        </div>
        <div className="feature-grid">
          <div className="feature"><b>Snake draft, live</b>Everyone drafts in one room. Celebrities and pros are separate picks with fair roster slots.</div>
          <div className="feature"><b>Weekly scoring</b>Scores come in after each episode. Every drafted cast member earns their points.</div>
          <div className="feature"><b>Standings that matter</b>Podium, gold border for #1, Alive meters and a Max Possible that caps for who is left.</div>
          <div className="feature"><b>Commissioner tools</b>Invite codes, a paid/unpaid roster, randomized or manual draft order, and league-only score fixes.</div>
          <div className="feature"><b>Your colours</b>Pick Pink, Blue, Green, Red, White, Purple, Gold or Dark for your own view, from the Theme menu at the top.</div>
          <div className="feature"><b>Simple pricing</b>Free accounts, free to create a league. Each member pays a one-time {formatCents(billing.pricePerMemberCents)} platform fee, or the commissioner covers it. No prizes or payouts.</div>
        </div>
      </section>

      <LandingPreview data={landingPreviewData()} />
    </>
  );
}
