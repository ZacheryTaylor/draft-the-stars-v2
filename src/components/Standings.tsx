"use client";
import { Fragment, useMemo, useState } from "react";
import { computeStandings, type RankKey, type RankSort, type ScoringInput } from "@/lib/scoring";

const fmt = (n: number) => n.toFixed(2);

export function Standings({ input, leagueName, ownerNames, myTeamId }: { input: ScoringInput; leagueName: string; ownerNames: Record<string, string>; myTeamId: string | null }) {
  const [sort, setSort] = useState<RankSort>({ key: "points", dir: "desc" });
  const [open, setOpen] = useState<Set<string>>(new Set());
  const byPoints = useMemo(() => computeStandings(input), [input]);
  const view = useMemo(() => computeStandings(input, sort), [input, sort]);
  const { scoring: S, latest, latestWeek } = byPoints;
  const podium = byPoints.rows.slice(0, 3);
  const lead = podium[0]?.points ?? 0;
  const best = latestWeek ? [...byPoints.rows].sort((a, b) => b.weekPoints - a.weekPoints)[0] : null;
  const weeksAsc = [...input.weeks].sort((a, b) => a.week - b.week);
  const setKey = (key: RankKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));
  const mark = (k: RankKey) => (sort.key !== k ? "" : sort.dir === "desc" ? " ▾" : " ▴");
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <>
      <div className="card hero-card">
        <div className="hero-head">
          <div>
            <p className="eyebrow">{leagueName}</p>
            <h2>Rankings</h2>
            <p className="muted">{latest ? `Through Week ${latest}${latestWeek?.name ? `: ${latestWeek.name}` : ""}.` : "No scores yet."}</p>
          </div>
        </div>
        {podium.length > 0 && input.picks.length > 0 && (
          <ol className="podium">
            {podium.map((t, i) => (
              <li key={t.id} className={`podium-${i + 1} ${t.isLeader ? "is-leader" : ""}`}>
                <span className="medal" aria-hidden="true">{["✦", "✧", "✶"][i]}</span>
                <span className="podium-rank">{i + 1}</span>
                <span className="podium-name">{t.name}</span>
                <span className="podium-pts">{fmt(t.points)} <small>pts</small></span>
                <span className="podium-gap">{i === 0 ? (ownerNames[t.id] ? `@${ownerNames[t.id]}` : "") : `${fmt(lead - t.points)} behind`}</span>
              </li>
            ))}
          </ol>
        )}
        {best && best.weekPoints > 0 && <p className="spotlight">✨ Top team in week {latest}: <b>{best.name}</b> with {fmt(best.weekPoints)} pts</p>}
      </div>

      <div className="card">
        <div className="sort-chips" role="group" aria-label="Sort rankings">
          <span className="hint" style={{ margin: 0 }}>Sort by</span>
          {([["points", "Points"], ["alive", "Alive"], ["mpp", "Max possible"]] as [RankKey, string][]).map(([k, l]) => (
            <button key={k} type="button" className={`chip ${sort.key === k ? "active" : ""}`} aria-pressed={sort.key === k} onClick={() => setKey(k)}>{l}{mark(k)}</button>
          ))}
        </div>
        <div className="table-scroll">
          <table className="rank-table">
            <thead>
              <tr><th>#</th><th>Team</th><th className="num">Points</th>{latestWeek && <th className="num hide-sm">Wk {latest}</th>}<th className="num">Alive</th><th className="num">Max possible</th><th>Roster</th></tr>
            </thead>
            <tbody>
              {view.rows.map((t, i) => (
                <Fragment key={t.id}>
                  <tr className={`team-row ${open.has(t.id) ? "open" : ""} ${t.isLeader ? "is-leader" : ""}`}>
                    <td className="rank-cell">
                      <span className="rank-num">{i + 1}</span>
                      {t.movement !== null && (t.movement > 0 ? <span className="move up" title={`Up ${t.movement}`}>▲{t.movement}</span> : t.movement < 0 ? <span className="move down" title={`Down ${-t.movement}`}>▼{-t.movement}</span> : <span className="move same">–</span>)}
                    </td>
                    <td className="team-cell">
                      <button type="button" className="team-toggle" aria-expanded={open.has(t.id)} onClick={() => toggle(t.id)}>{t.name}<span className="chev" aria-hidden="true">›</span></button>
                      {t.id === myTeamId && <span className="pill" style={{ marginLeft: 6 }}>You</span>}
                      {ownerNames[t.id] && <small className="hint" style={{ display: "block", margin: 0 }}>@{ownerNames[t.id]}</small>}
                    </td>
                    <td className="num strong" data-label="Points">{fmt(t.points)}</td>
                    {latestWeek && <td className="num hide-sm" data-label={`Wk ${latest}`}>+{fmt(t.weekPoints)}</td>}
                    <td className="num" data-label="Alive"><span className="alive-meter" style={{ ["--alive" as string]: t.picks.length ? t.alive / t.picks.length : 0 }}>{t.alive}/{t.picks.length}</span></td>
                    <td className="num" data-label="Max possible">{fmt(t.mpp)}</td>
                    <td className="roster-cell">{t.picks.map((p, j) => <span key={j} className={`roster-chip ${p.role} ${S.isAlive(p.unitId) ? "" : "eliminated"}`}>{p.name}</span>)}{t.picks.length === 0 && "—"}</td>
                  </tr>
                  {open.has(t.id) && (
                    <tr className="detail-row">
                      <td colSpan={latestWeek ? 7 : 6}>
                        <div className="table-scroll">
                          <table className="detail-table">
                            <thead><tr><th>Dancer</th>{weeksAsc.map((w) => <th key={w.week} className="num">Wk {w.week}</th>)}<th className="num">Total</th></tr></thead>
                            <tbody>
                              {t.picks.map((p, j) => {
                                const per = weeksAsc.map((w) => S.pickWeekPoints(p, w));
                                const out = p.unitId ? S.eliminatedWeek(p.unitId) : null;
                                return (
                                  <tr key={j} className={out ? "is-out" : ""}>
                                    <th scope="row"><span className={`roster-chip ${p.role} ${out ? "eliminated" : ""}`}>{p.name}</span><small>{p.role === "pro" ? "Pro" : "Celebrity"} · with {p.partner}{out ? ` · out wk ${out}` : ""}</small></th>
                                    {per.map((x, k) => <td key={k} className="num">{x ? fmt(x) : "—"}</td>)}
                                    <td className="num strong">{fmt(per.reduce((a, b) => a + b, 0))}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="hint">Tap a team for its week-by-week breakdown. Grey chips are eliminated. Gold border = #1. Max possible assumes perfect scores for who is still dancing, capped by how many couples remain each week.</p>
      </div>
    </>
  );
}
