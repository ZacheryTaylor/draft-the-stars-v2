import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { viewerRole } from "@/lib/data/league-view";
import { leagueGate } from "@/lib/billing";
import { billing } from "@/lib/billing/config";
import { overrideScore, regenerateInvite, setMemberRole } from "../../../actions";
import { FormMessage } from "@/components/FormMessage";
import { Monogram } from "@/components/Monogram";

export const metadata = { title: "Commissioner tools" };

export default async function Commissioner({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { slug } = await params;
  const { error, saved } = await searchParams;
  const b = (await getData().getLeague(slug))!;
  const user = await getCurrentUser();
  if (!viewerRole(b, user).isCommissioner) redirect(`/leagues/${slug}`);
  const invite = b.invites[0];
  const gate = leagueGate(b.league.status);
  const scored = b.episodes.filter((e) => b.scores.some((s) => s.episodeId === e.id)).map((e) => e.number);
  return (
    <>
      <div className="card">
        <p className="eyebrow">Commissioner</p>
        <h2>League tools</h2>
        <FormMessage error={error} success={saved ? `Saved (${saved}).` : undefined} />
        <div className="grid-2">
          <section className="stack">
            <h3>Invite code</h3>
            {gate.allowed ? (
              <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: ".18em", margin: 0 }} className="strong">{invite?.code ?? "—"}</p>
            ) : (
              <p className="notice warn">Invite codes unlock after checkout. ({gate.message})</p>
            )}
            <p className="hint">Share: {`/join?code=${invite?.code ?? ""}`} · used {invite?.uses ?? 0} times · email invites via Resend are a placeholder.</p>
            <form action={regenerateInvite}><input type="hidden" name="slug" value={slug} /><button type="submit">Regenerate code</button></form>
          </section>
          <section className="stack">
            <h3>Settings</h3>
            <div className="receipt">
              <div><span>Teams / billed members</span><b>{b.league.settings.teamCount}</b></div>
              <div><span>Roster</span><b>{b.league.settings.rosterSize.celebrity} celebs + {b.league.settings.rosterSize.pro} pros</b></div>
              <div><span>Copies per dancer</span><b>{b.league.settings.copiesPerContestant}</b></div>
              <div><span>Draft</span><b>{b.league.settings.draftType} · {b.league.draftStatus.replace("_", " ")}</b></div>
              <div><span>Billing enforcement</span><b>{billing.enforcement}</b></div>
            </div>
            <p className="hint">Team count is locked after checkout (it is the billed member count).</p>
          </section>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Members</h3>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Member</th><th>Team</th><th>Role</th><th /></tr></thead>
            <tbody>
              {b.members.map((m) => (
                <tr key={m.userId}>
                  <td><span className="row"><Monogram name={m.profile?.displayName ?? m.profile?.username ?? "?"} size="sm" initials={(m.profile?.username ?? "?").slice(0, 2).toUpperCase()} />@{m.profile?.username}</span></td>
                  <td>{b.teams.find((t) => t.ownerId === m.userId)?.name ?? "—"}</td>
                  <td><span className="pill">{m.role.replace("_", "-")}</span></td>
                  <td>
                    {m.userId !== b.league.ownerId && (
                      <form action={setMemberRole} className="row">
                        <input type="hidden" name="slug" value={slug} />
                        <input type="hidden" name="memberId" value={m.userId} />
                        <select name="role" defaultValue={m.role} aria-label={`Role for ${m.profile?.username}`} style={{ width: "auto" }}>
                          <option value="player">Player</option>
                          <option value="co_commissioner">Co-commissioner</option>
                        </select>
                        <button type="submit" className="chip">Save</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">{b.teams.filter((t) => !t.ownerId).length} unclaimed team(s). Players claim the next open team when they join.</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Score override</h3>
        <p className="muted">Manual entry for a week (fallback when the automatic source is wrong or missing). Every change is audit-logged in Supabase (score_audit_log).</p>
        <form action={overrideScore} className="row" style={{ alignItems: "end" }}>
          <input type="hidden" name="slug" value={slug} />
          <label>Week<select name="week" defaultValue={scored.at(-1) ?? 1}>{b.episodes.map((e) => <option key={e.id} value={e.number}>Week {e.number}{e.name ? ` · ${e.name}` : ""}</option>)}</select></label>
          <label>Couple<select name="unitId">{b.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
          <label>Score (0-30)<input name="score" type="number" min={0} max={30} step={0.5} required style={{ width: 110 }} /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="eliminated" style={{ width: 18, minHeight: 18 }} /> Eliminated</label>
          <button className="primary" type="submit">Save score</button>
        </form>
        <p className="hint">Mock data resets when the server restarts.</p>
      </div>
    </>
  );
}
