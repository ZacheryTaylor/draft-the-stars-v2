import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { viewerRole } from "@/lib/data/league-view";
import { NavLinks } from "@/components/NavLinks";
import { Monogram } from "@/components/Monogram";

export default async function LeagueLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bundle = await getData().getLeague(slug);
  if (!bundle) notFound();
  const user = await getCurrentUser();
  const v = viewerRole(bundle, user);
  if (!v.isMember && bundle.league.privacy !== "public")
    return (
      <section className="card">
        <h2>Private league</h2>
        <p className="muted">You need to be a member to see this league. Ask the commissioner for an invite code.</p>
        <div className="row"><Link className="btn primary" href="/join">Join with a code</Link>{!user && <Link className="btn" href={`/login?next=/leagues/${slug}`}>Log in</Link>}</div>
      </section>
    );
  const base = `/leagues/${slug}`;
  const links = [
    { href: base, label: "Standings" },
    { href: `${base}/draft`, label: "Draft room" },
    ...(v.isCommissioner ? [{ href: `${base}/commissioner`, label: "Commissioner" }] : []),
    { href: `${base}/billing`, label: "Fees" },
  ];
  return (
    <>
      <div className="top-inner" style={{ padding: "16px 0 0" }}>
        <div className="row">
          <Monogram name={bundle.league.name} size="lg" />
          <div>
            <p className="eyebrow">{bundle.show.name} · {bundle.season.title} · {bundle.league.settings.teamCount} teams</p>
            <strong className="strong" style={{ fontSize: 18 }}>{bundle.league.name}</strong>
          </div>
        </div>
        <nav className="main-nav" aria-label="League">
          <LeagueNav links={links} />
        </nav>
      </div>
      {bundle.league.status === "cancelled" && <p className="notice warn" style={{ marginTop: 16 }}><b>Cancelled.</b> Paid fees are refunded to whoever paid them (placeholder).</p>}
      {children}
    </>
  );
}

function LeagueNav({ links }: { links: { href: string; label: string }[] }) {
  return <NavLinks links={links} exact />;
}
