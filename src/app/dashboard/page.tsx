import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { Monogram } from "@/components/Monogram";

export const metadata = { title: "My leagues" };

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  const leagues = await getData().listLeaguesForUser(user.id);
  return (
    <>
      <section className="card">
        <div className="hero-head">
          <div>
            <p className="eyebrow">Signed in as @{user.username}</p>
            <h2>My leagues</h2>
          </div>
          <div className="row">
            <Link className="btn primary" href="/leagues/new">Create a league</Link>
            <Link className="btn" href="/join">Join with a code</Link>
          </div>
        </div>
        {leagues.length === 0 && <p className="muted">You are not in any leagues yet.</p>}
        <div className="grid-2">
          {leagues.map((l) => (
            <article key={l.league.id} className="feature stack">
              <div className="row">
                <Monogram name={l.league.name} size="lg" />
                <div>
                  <Link href={`/leagues/${l.league.slug}`} className="strong">{l.league.name}</Link>
                  <p className="hint" style={{ margin: 0 }}>{l.showName} · {l.seasonTitle}</p>
                </div>
              </div>
              <div className="row">
                <span className="pill">{l.role === "player" ? "Player" : "Commissioner"}</span>
                <span className="pill">{l.memberCount}/{l.league.settings.teamCount} members</span>
                {l.league.status === "pending_payment" ? <span className="pill pill-gold">Awaiting payment</span> : <span className="pill">Active</span>}
                <span className="pill">Draft: {l.league.draftStatus.replace("_", " ")}</span>
              </div>
              {l.teamName && <p className="hint" style={{ margin: 0 }}>Your team: <b>{l.teamName}</b></p>}
              {l.league.status === "pending_payment" && l.role !== "player" && (
                <Link className="btn primary" href={`/leagues/${l.league.slug}/billing`}>Complete checkout</Link>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
