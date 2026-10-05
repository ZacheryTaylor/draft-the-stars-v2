import Link from "next/link";
import type { LeagueBundle, Profile } from "@/lib/data/types";
import { viewerRole } from "@/lib/data/league-view";
import { draftReadiness, paymentDeadlineInfo } from "@/lib/billing";
import { checkPick, teamForPick, totalPicks } from "@/lib/league/draft";
import { leagueSizing } from "@/lib/league/sizing";
import { Monogram } from "@/components/Monogram";
import { FormMessage } from "@/components/FormMessage";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { ShareDraftBoard } from "@/components/ShareDraftBoard";
import type { FormAction, Routes } from "./routes";

export function DraftRoomView({ b, user, slug, error, act, r, realtimeNote }: { b: LeagueBundle; user: Profile | null; slug: string; error?: string; act: { setDraftStatus: FormAction; makePick: FormAction }; r: Routes; realtimeNote: string }) {
  const v = viewerRole(b, user);
  const { league } = b;
  const rules = { draftType: league.settings.draftType, copiesPerContestant: league.settings.copiesPerContestant, rosterSize: league.settings.rosterSize };
  const teams = [...b.teams].sort((a, c) => a.draftPosition - c.draftPosition);
  const total = totalPicks(teams.length, rules);
  const made = b.picks.length;
  const live = league.draftStatus === "in_progress";
  const onClock = made < total ? teamForPick(made + 1, teams, rules.draftType) : null;
  const canPickNow = live && onClock && (v.isCommissioner || onClock.ownerId === user?.id);
  const ready = draftReadiness({ teamCount: league.settings.teamCount, teams: b.teams, payments: b.payments });
  const deadline = paymentDeadlineInfo(b.season.premiereDate);
  const blocked = league.draftStatus === "not_started" && !ready.ready;
  const sizing = leagueSizing(b.units.length, teams.length);
  const perTeam = Object.values(rules.rosterSize).reduce<number>((a, c) => a + (c ?? 0), 0);
  const byId = new Map(b.contestants.map((c) => [c.id, c]));
  const shareSummary = `${league.name}: draft complete · ${teams.length} teams · ${made} picks`;
  return (
    <>
      <div className="card">
        <div className="hero-head">
          <div>
            <p className="eyebrow"><span className="live-dot" aria-hidden="true" />{realtimeNote}</p>
            <h2>Draft room</h2>
            <p className="muted">
              {league.settings.draftType === "snake" ? "Snake" : "Linear"} draft · {perTeam} per team ({rules.rosterSize.celebrity} celebrities + {rules.rosterSize.pro} pros) · {rules.copiesPerContestant} cop{rules.copiesPerContestant === 1 ? "y" : "ies"} of each dancer · {sizing.leftover} left undrafted
            </p>
            <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={made} aria-label="Draft progress"><span style={{ width: `${total ? (made / total) * 100 : 0}%` }} /></div>
            <p className="hint">{made} of {total} picks · status: <b>{league.draftStatus.replace("_", " ")}</b>{onClock && live ? <> · on the clock: <b>{onClock.name}</b></> : null}</p>
          </div>
          {v.isCommissioner && league.draftStatus !== "complete" && (
            <form action={act.setDraftStatus} className="row">
              <input type="hidden" name="slug" value={slug} />
              {live ? <button name="status" value="paused">Pause draft</button> : <button className="primary" name="status" value="in_progress" disabled={blocked}>{league.draftStatus === "paused" ? "Resume draft" : "Start draft"}</button>}
            </form>
          )}
        </div>
        <FormMessage error={error} />
        {league.draftStatus === "not_started" && (
          <div className="row" style={{ marginBottom: 8 }}>
            <DeadlineCountdown premiereDate={b.season.premiereDate} compact />
            {deadline.passed && <span className="hint">Deadline passed — still waiting on spots/payments before the draft can start.</span>}
          </div>
        )}
        {blocked && <p className="notice warn"><b>Draft waiting:</b> {ready.reasons.join("; ")}. The draft starts once every slot is filled and paid. <Link href={r.league(slug, "fees")}>See the payment roster</Link></p>}
        {league.draftStatus === "complete" && (
          <ShareDraftBoard leagueName={league.name} leaguePath={r.league(slug, "draft")} summary={shareSummary} />
        )}
        <p className="hint">Live updates use page refresh for now. Supabase Realtime (websockets, draft room only) is a placeholder.</p>
      </div>

      <div className="card table-scroll">
        <h3 style={{ marginTop: 0 }}>Board</h3>
        <div className="board" data-draft-board style={{ ["--teams" as string]: teams.length }}>
          {teams.map((t) => <div key={t.id} className={`board-head ${onClock?.id === t.id && live ? "on-clock" : ""}`} title={t.name}>{t.name}</div>)}
          {Array.from({ length: perTeam }, (_, round) =>
            teams.map((t) => {
              const p = b.picks.filter((x) => x.teamId === t.id).sort((x, y) => x.overall - y.overall)[round];
              const c = p ? byId.get(p.contestantId) : null;
              return c ? (
                <div key={`${t.id}-${round}`} className={`slot ${c.role}`}><Monogram name={c.name} role={c.role} size="sm" initials={c.monogram} /><span>{c.name}</span></div>
              ) : (
                <div key={`${t.id}-${round}`} className="slot empty">Round {round + 1}</div>
              );
            }),
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Available dancers</h3>
        <div className="pool">
          {b.units.map((u) => (
            <article key={u.id} className="unit-card">
              <header>{u.label}</header>
              <div className="unit-halves">
                {b.contestants.filter((c) => c.unitId === u.id).sort((x, y) => x.sortOrder - y.sortOrder).map((c) => {
                  const used = b.picks.filter((p) => p.contestantId === c.id).length;
                  const check = onClock ? checkPick(onClock.id, c, b.picks, b.contestants, rules) : { ok: false as const, reason: "Draft complete" };
                  return (
                    <div key={c.id} className={`half ${c.role}`}>
                      <Monogram name={c.name} role={c.role} initials={c.monogram} />
                      <small>{c.role === "pro" ? "Pro" : "Celebrity"}</small>
                      <strong>{c.name}</strong>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{rules.copiesPerContestant - used} of {rules.copiesPerContestant} left</span>
                      {canPickNow && (
                        <form action={act.makePick}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="contestantId" value={c.id} />
                          <button type="submit" disabled={!check.ok} title={check.ok ? `Draft for ${onClock!.name}` : check.reason}>Draft</button>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
        <p className="hint">Leftover dancers stay undrafted. TODO(free-agents): keep them as a future free-agent pool.</p>
      </div>
    </>
  );
}
