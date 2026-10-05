import Link from "next/link";
import type { LeagueBundle, Profile } from "@/lib/data/types";
import { toScoringInput } from "@/lib/data/to-scoring";
import { viewerRole } from "@/lib/data/league-view";
import { draftReadiness } from "@/lib/billing";
import { DWTS_TEMPLATE } from "@/lib/scoring/templates";
import { NavLinks } from "@/components/NavLinks";
import { Monogram } from "@/components/Monogram";
import { Standings } from "@/components/Standings";
import { WeeklyScores } from "@/components/WeeklyScores";
import { PreDraftChecklist } from "@/components/PreDraftChecklist";
import type { Routes } from "./routes";

/** League header + tab nav. Renders the private-league notice instead of children for non-members. */
export function LeagueShell({ b, user, r, children }: { b: LeagueBundle; user: Profile | null; r: Routes; children: React.ReactNode }) {
  const v = viewerRole(b, user);
  const slug = b.league.slug;
  if (!v.isMember && b.league.privacy !== "public")
    return (
      <section className="card">
        <h2>Private league</h2>
        <p className="muted">You need to be a member to see this league. Ask the commissioner for an invite code.</p>
        <div className="row"><Link className="btn primary" href={r.join()}>Join with a code</Link>{!user && <Link className="btn" href={r.login(r.league(slug))}>Log in</Link>}</div>
      </section>
    );
  const links = [
    { href: r.league(slug), label: "Standings" },
    { href: r.league(slug, "draft"), label: "Draft room" },
    ...(v.isCommissioner ? [{ href: r.league(slug, "commissioner"), label: "Commissioner" }] : []),
    { href: r.league(slug, "fees"), label: "Fees" },
  ];
  return (
    <>
      <div className="top-inner" style={{ padding: "16px 0 0" }}>
        <div className="row">
          <Monogram name={b.league.name} size="lg" />
          <div>
            <p className="eyebrow">{b.show.name} · {b.season.title} · {b.league.settings.teamCount} teams</p>
            <strong className="strong" style={{ fontSize: 18 }}>{b.league.name}</strong>
          </div>
        </div>
        <nav className="main-nav" aria-label="League">
          <NavLinks links={links} exact />
        </nav>
      </div>
      {b.league.status === "cancelled" && <p className="notice warn" style={{ marginTop: 16 }}><b>Cancelled.</b> Paid fees are refunded to whoever paid them (placeholder).</p>}
      {children}
    </>
  );
}

export function StandingsView({ b, user, r }: { b: LeagueBundle; user: Profile | null; r: Routes }) {
  const v = viewerRole(b, user);
  if (!v.isMember && b.league.privacy !== "public") return null;
  const drafted = b.league.draftStatus === "complete" || b.picks.length > 0;
  if (!drafted) {
    const ready = draftReadiness({ teamCount: b.league.settings.teamCount, teams: b.teams, payments: b.payments });
    return (
      <PreDraftChecklist
        ready={ready}
        premiereDate={b.season.premiereDate}
        draftOrderSet={b.draftOrderLog.length > 0}
        feesHref={r.league(b.league.slug, "fees")}
        draftHref={r.league(b.league.slug, "draft")}
        commissionerHref={r.league(b.league.slug, "commissioner")}
        isCommissioner={v.isCommissioner}
      />
    );
  }
  const input = toScoringInput(b, b.league.scoringTemplateSlug);
  const ownerNames = Object.fromEntries(b.teams.filter((t) => t.ownerId).map((t) => [t.id, b.members.find((m) => m.userId === t.ownerId)?.profile?.username ?? ""]));
  const unitOf = new Map(b.contestants.map((c) => [c.id, c.unitId]));
  const owners: Record<string, number> = {};
  for (const p of b.picks) { const u = unitOf.get(p.contestantId)!; owners[u] = (owners[u] ?? 0) + 1; }
  return (
    <>
      <Standings input={input} leagueName={b.league.name} ownerNames={ownerNames} myTeamId={v.myTeamId} />
      <WeeklyScores input={input} owners={owners} />
      <div className="card scoring-card">
        <p className="eyebrow">Scoring template</p>
        <h3 style={{ marginTop: 0 }}>{DWTS_TEMPLATE.name}</h3>
        <p className="muted">{DWTS_TEMPLATE.description}</p>
        <div className="row">{input.rules.roundValues.map((val, i) => <span key={i} className="pill">Wk {i + 1}: {val}</span>)}</div>
      </div>
    </>
  );
}
