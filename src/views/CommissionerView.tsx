import Link from "next/link";
import type { LeagueBundle } from "@/lib/data/types";
import { draftReadiness, paymentDeadlineInfo } from "@/lib/billing";
import { billing } from "@/lib/billing/config";
import { verifyEntry } from "@/lib/league/draft-order";
import { DraftOrderEditor } from "@/components/DraftOrderEditor";
import { FormMessage } from "@/components/FormMessage";
import { Monogram } from "@/components/Monogram";
import { InviteShare } from "@/components/InviteShare";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import type { FormAction, Routes } from "./routes";

export interface CommissionerActions {
  regenerateInvite: FormAction;
  setMemberRole: FormAction;
  randomizeDraftOrder: FormAction;
  saveDraftOrder: (form: FormData) => Promise<void>;
  overrideScore: FormAction;
  clearScoreOverride: FormAction;
  remindAllUnpaid?: FormAction;
}

export function CommissionerView({ b, slug, error, saved, act, r }: { b: LeagueBundle; slug: string; error?: string; saved?: string; act: CommissionerActions; r: Routes }) {
  const invite = b.invites[0];
  const ready = draftReadiness({ teamCount: b.league.settings.teamCount, teams: b.teams, payments: b.payments });
  const locked = b.league.draftStatus !== "not_started";
  const name = (id: string | null) => {
    const p = id ? b.members.find((m) => m.userId === id)?.profile : null;
    return p ? p.displayName || p.username : null;
  };
  const ordered = [...b.teams].sort((x, y) => x.draftPosition - y.draftPosition);
  const teamName = (id: string) => b.teams.find((t) => t.id === id)?.name ?? id;
  const unitLabel = (id: string) => b.units.find((u) => u.id === id)?.label ?? id;
  const epNum = (id: string) => b.episodes.find((e) => e.id === id)?.number ?? "?";
  const lastRoll = b.draftOrderLog[0];
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
            <p style={{ fontSize: 28, fontWeight: 700, letterSpacing: ".18em", margin: 0 }} className="strong">{invite?.code ?? "—"}</p>
            <p className="hint">Used {invite?.uses ?? 0} times · email invites via Resend are a placeholder.</p>
            {invite?.code && <InviteShare code={invite.code} joinPath={r.join(invite.code)} />}
            <form action={act.regenerateInvite}><input type="hidden" name="slug" value={slug} /><button type="submit">Regenerate code</button></form>
          </section>
          <section className="stack">
            <h3>Settings</h3>
            <div className="receipt">
              <div><span>Member slots</span><b>{b.league.settings.teamCount} ({ready.filledSlots} filled · {ready.paidSlots} paid)</b></div>
              <div><span>Roster</span><b>{b.league.settings.rosterSize.celebrity} celebs + {b.league.settings.rosterSize.pro} pros</b></div>
              <div><span>Copies per dancer</span><b>{b.league.settings.copiesPerContestant}</b></div>
              <div><span>Draft</span><b>{b.league.settings.draftType} · {b.league.draftStatus.replace("_", " ")}</b></div>
              <div><span>Draft gate</span><b>{billing.draftGate === "all_slots_filled_and_paid" ? "all slots filled + paid" : "slots filled"}</b></div>
              <div><span>Payment deadline</span><b>{paymentDeadlineInfo(b.season.premiereDate).deadline ?? "—"}</b></div>
            </div>
            <DeadlineCountdown premiereDate={b.season.premiereDate} compact />
            {ready.ready ? <p className="notice">Ready: every slot is filled and paid.</p> : <p className="notice warn">Draft waiting: {ready.reasons.join("; ")}. <Link href={r.league(slug, "fees")}>Payment roster</Link></p>}
            {act.remindAllUnpaid && !locked && ready.unpaidTeamIds.length > 0 && (
              <form action={act.remindAllUnpaid} className="row">
                <input type="hidden" name="slug" value={slug} />
                <button type="submit" data-testid="nudge-unpaid-commish">Nudge unpaid</button>
                <Link className="btn" href={r.league(slug, "fees")}>Open fees</Link>
              </form>
            )}
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
                      <form action={act.setMemberRole} className="row">
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

      <div className="card" id="draft-order">
        <div className="hero-head">
          <div>
            <h3 style={{ marginTop: 0 }}>Draft order</h3>
            <p className="muted" style={{ marginTop: 0 }}>
              {locked ? "Locked: the draft has started." : "Randomize (re-roll as often as you like; every roll is logged with its seed so anyone can verify it), or drag teams into a manual order. Locks when the draft starts."}
            </p>
          </div>
          {!locked && (
            <form action={act.randomizeDraftOrder} className="row" style={{ alignItems: "end" }}>
              <input type="hidden" name="slug" value={slug} />
              <label>Seed (optional)<input name="seed" placeholder="auto" style={{ width: 150 }} /></label>
              <button type="submit" className="primary">{b.draftOrderLog.some((e) => e.method === "random") ? "Re-roll" : "Randomize"}</button>
            </form>
          )}
        </div>
        <div className="grid-2">
          <DraftOrderEditor key={ordered.map((t) => t.id).join()} slug={slug} locked={locked} save={act.saveDraftOrder} teams={ordered.map((t) => ({ id: t.id, name: t.name, owner: name(t.ownerId) }))} />
          <div className="stack">
            <b>Order log{lastRoll ? ` · current: roll ${lastRoll.roll} (${lastRoll.method})` : ""}</b>
            {b.draftOrderLog.length === 0 ? <p className="hint">No order set yet: teams pick in slot order.</p> : (
              <div className="table-scroll">
                <table>
                  <thead><tr><th className="num">Roll</th><th>Method</th><th>Seed</th><th>First picks</th><th>Audit</th></tr></thead>
                  <tbody>
                    {b.draftOrderLog.map((e) => (
                      <tr key={e.id}>
                        <td className="num">{e.roll}</td>
                        <td>{e.method}</td>
                        <td>{e.seed ? <code>{e.seed}</code> : "-"}</td>
                        <td className="hint">{e.order.slice(0, 3).map(teamName).join(", ")}{e.order.length > 3 ? "…" : ""}</td>
                        <td>{e.method === "random" ? (verifyEntry(e) ? <span className="pill pill-ok">verified</span> : <span className="pill pill-out">mismatch</span>) : <span className="pill">by {name(e.createdBy) ?? "?"}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="hint">Verify a roll: seededShuffle(sorted team ids, seed) in src/lib/league/draft-order.ts reproduces the logged order.</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Score fix (this league only)</h3>
        <p className="muted">Override a couple&apos;s score for this league when the shared score is wrong or missing. Saved to a per-league override table; the shared show scores are never changed.</p>
        <form action={act.overrideScore} className="row" style={{ alignItems: "end" }}>
          <input type="hidden" name="slug" value={slug} />
          <label>Week<select name="week" defaultValue={scored.at(-1) ?? 1}>{b.episodes.map((e) => <option key={e.id} value={e.number}>Week {e.number}{e.name ? ` · ${e.name}` : ""}</option>)}</select></label>
          <label>Couple<select name="unitId">{b.units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}</select></label>
          <label>Score (0-30)<input name="score" type="number" min={0} max={30} step={0.5} required style={{ width: 110 }} /></label>
          <label>Reason<input name="reason" placeholder="optional" style={{ width: 160 }} /></label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}><input type="checkbox" name="eliminated" /> Eliminated</label>
          <button className="primary" type="submit">Save override</button>
        </form>
        {b.scoreOverrides.length > 0 && (
          <div className="table-scroll" style={{ marginTop: 12 }}>
            <table>
              <thead><tr><th>Week</th><th>Couple</th><th className="num">Score</th><th>Eliminated</th><th>Reason</th><th /></tr></thead>
              <tbody>
                {b.scoreOverrides.map((o) => (
                  <tr key={o.id}>
                    <td>Week {epNum(o.episodeId)}</td><td>{unitLabel(o.unitId)}</td><td className="num">{o.rawScore}</td><td>{o.eliminated ? "yes" : "no"}</td><td className="hint">{o.reason ?? "-"}</td>
                    <td><form action={act.clearScoreOverride}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="overrideId" value={o.id} /><button type="submit" className="btn-sm ghost">Remove</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hint">Mock data resets when the server restarts.</p>
      </div>
    </>
  );
}
