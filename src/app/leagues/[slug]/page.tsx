import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { toScoringInput } from "@/lib/data/to-scoring";
import { viewerRole } from "@/lib/data/league-view";
import { Standings } from "@/components/Standings";
import { WeeklyScores } from "@/components/WeeklyScores";
import { DWTS_TEMPLATE } from "@/lib/scoring/templates";

export default async function LeagueHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bundle = (await getData().getLeague(slug))!;
  const user = await getCurrentUser();
  const v = viewerRole(bundle, user);
  if (!v.isMember && bundle.league.privacy !== "public") return null;
  const input = toScoringInput(bundle, bundle.league.scoringTemplateSlug);
  const ownerNames = Object.fromEntries(bundle.teams.filter((t) => t.ownerId).map((t) => [t.id, bundle.members.find((m) => m.userId === t.ownerId)?.profile?.username ?? ""]));
  const unitOf = new Map(bundle.contestants.map((c) => [c.id, c.unitId]));
  const owners: Record<string, number> = {};
  for (const p of bundle.picks) { const u = unitOf.get(p.contestantId)!; owners[u] = (owners[u] ?? 0) + 1; }
  return (
    <>
      <Standings input={input} leagueName={bundle.league.name} ownerNames={ownerNames} myTeamId={v.myTeamId} />
      <WeeklyScores input={input} owners={owners} />
      <div className="card scoring-card">
        <p className="eyebrow">Scoring template</p>
        <h3 style={{ marginTop: 0 }}>{DWTS_TEMPLATE.name}</h3>
        <p className="muted">{DWTS_TEMPLATE.description}</p>
        <div className="row">{input.rules.roundValues.map((v, i) => <span key={i} className="pill">Wk {i + 1}: {v}</span>)}</div>
      </div>
    </>
  );
}
