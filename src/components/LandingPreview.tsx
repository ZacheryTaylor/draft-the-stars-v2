"use client";
/** "Take a look inside": a tabbed, read-only tour of real app screens rendered with sample data. */
import { useState } from "react";
import type { LandingPreviewData } from "@/lib/data/sample-preview";
import { THEME_PRESETS, THEME_STORAGE_KEY, type ThemeId } from "@/lib/themes/presets";
import { Standings } from "./Standings";
import { WeeklyScores } from "./WeeklyScores";
import { Monogram } from "./Monogram";

const TABS = [
  { id: "standings", label: "Standings", path: "standings", blurb: "The podium, the full rankings table, Alive meters and Max Possible. Tap a team to see its picks." },
  { id: "scores", label: "Weekly scores", path: "scores", blurb: "Every episode's scores turn into points automatically. Flip between weeks to see who earned what." },
  { id: "draft", label: "Draft board", path: "draft", blurb: "The live snake draft fills this board pick by pick, with celebrities and pros as separate slots." },
  { id: "roster", label: "League & fees", path: "fees", blurb: "Commissioners see who has joined and paid, cover anyone's fee in one checkout, and start the draft once every spot is ready." },
  { id: "themes", label: "Themes", path: "settings", blurb: "Everyone picks their own colours. Tap one to try it on this page." },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Paid", cls: "pill" },
  covered: { label: "Covered", cls: "pill pill-gold" },
  unpaid: { label: "Unpaid", cls: "pill pill-out" },
  open: { label: "Open spot", cls: "pill pill-out" },
};

export function LandingPreview({ data }: { data: LandingPreviewData }) {
  const [tab, setTab] = useState<TabId>("standings");
  const t = TABS.find((x) => x.id === tab)!;
  const tryTheme = (id: ThemeId) => {
    document.documentElement.setAttribute("data-theme", id);
    try { localStorage.setItem(THEME_STORAGE_KEY, id); } catch {}
  };
  const fee = `$${(data.roster.priceCents / 100).toFixed(2)}`;
  return (
    <section className="card preview-tour" aria-labelledby="tour-title">
      <p className="eyebrow">Take a look inside</p>
      <h2 id="tour-title">See it before you sign up</h2>
      <p className="muted">These are the real screens, filled with a sample league. Nothing here is saved.</p>
      <div className="week-tabs" role="tablist" aria-label="Preview screens">
        {TABS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tab === x.id} className={tab === x.id ? "chip active" : "chip"} onClick={() => setTab(x.id)} data-testid={`tour-${x.id}`}>{x.label}</button>
        ))}
      </div>
      <p className="hint">{t.blurb}</p>
      <div className="preview-frame">
        <div className="preview-bar" aria-hidden="true"><span /><span /><span /><code>draftthestars.com/leagues/sample/{t.path}</code></div>
        <div className="preview-body">
          <div className="row" style={{ marginBottom: 8 }}>
            <Monogram name={tab === "roster" ? data.roster.leagueName : data.leagueName} size="lg" />
            <div>
              <p className="eyebrow">{tab === "roster" ? data.roster.showLine : data.showLine}</p>
              <strong className="strong">{tab === "roster" ? data.roster.leagueName : data.leagueName}</strong> <span className="pill">Sample</span>
            </div>
          </div>
          {tab === "standings" && <Standings input={data.input} leagueName={data.leagueName} ownerNames={data.ownerNames} myTeamId={null} />}
          {tab === "scores" && <WeeklyScores input={data.input} owners={data.owners} />}
          {tab === "draft" && (
            <div className="card table-scroll">
              <h3 style={{ marginTop: 0 }}>Board</h3>
              <div className="board" style={{ ["--teams" as string]: data.board.teams.length }}>
                {data.board.teams.map((n) => <div key={n} className="board-head" title={n}>{n}</div>)}
                {data.board.rows.map((row, r) => row.map((c, i) => c ? (
                  <div key={`${r}-${i}`} className={`slot ${c.role}`}><Monogram name={c.name} role={c.role} size="sm" initials={c.initials} /><span>{c.name}</span></div>
                ) : <div key={`${r}-${i}`} className="slot empty">Round {r + 1}</div>))}
              </div>
            </div>
          )}
          {tab === "roster" && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Payment roster</h3>
              <p className="muted">Each spot is a one-time {fee}. The commissioner can cover open or unpaid spots in one checkout.</p>
              <div className="table-scroll">
                <table className="score-table">
                  <thead><tr><th>Team</th><th>Member</th><th>Status</th></tr></thead>
                  <tbody>
                    {data.roster.rows.map((r) => (
                      <tr key={r.team}>
                        <td><strong>{r.team}</strong></td>
                        <td>{r.member ? `@${r.member}` : <span className="muted">Waiting for invite</span>}</td>
                        <td><span className={STATUS[r.status].cls}>{STATUS[r.status].label}</span>{r.payer ? <small className="muted"> by @{r.payer}</small> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="notice warn"><b>Draft waiting:</b> the draft starts once every spot is filled and paid.</p>
            </div>
          )}
          {tab === "themes" && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Colour themes</h3>
              <div className="theme-tiles">
                {THEME_PRESETS.map((p) => (
                  <button key={p.id} type="button" className="theme-tile" onClick={() => tryTheme(p.id)} data-testid={`tour-theme-${p.id}`}
                    style={{ background: p.tokens.bg, color: p.tokens.ink, borderColor: p.tokens.accent }}>
                    <span className="theme-tile-bar" style={{ background: p.tokens.accent }} />
                    <b>{p.label}</b>
                    <small>{p.description}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
