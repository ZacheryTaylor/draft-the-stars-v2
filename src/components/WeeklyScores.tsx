"use client";
import { useState } from "react";
import { createScoring, type ScoringInput } from "@/lib/scoring";

export function WeeklyScores({ input, owners }: { input: ScoringInput; owners: Record<string, number> }) {
  const S = createScoring(input);
  const weeks = [...input.weeks].sort((a, b) => a.week - b.week);
  const [sel, setSel] = useState<number | "all">(weeks.at(-1)?.week ?? "all");
  if (!weeks.length) return null;
  const visible = sel === "all" ? [...weeks].reverse() : weeks.filter((w) => w.week === sel);
  const unit = (id: string) => input.units.find((u) => u.id === id);
  const maxScore = input.rules.maxScore;
  return (
    <div className="card">
      <p className="eyebrow">{weeks.length} week{weeks.length === 1 ? "" : "s"} scored</p>
      <h2>Weekly scores</h2>
      <p className="muted">Each drafted celebrity and pro earns (couple score ÷ {maxScore}) × that week&apos;s round value.</p>
      <div className="week-tabs" role="tablist" aria-label="Choose week">
        {weeks.map((w) => <button key={w.week} role="tab" aria-selected={sel === w.week} className={sel === w.week ? "chip active" : "chip"} onClick={() => setSel(w.week)}>Week {w.week}</button>)}
        <button role="tab" aria-selected={sel === "all"} className={sel === "all" ? "chip active" : "chip"} onClick={() => setSel("all")}>All weeks</button>
      </div>
      {visible.map((w) => {
        const value = S.weekValue(w.week);
        const top = Math.max(...w.results.map((r) => r.score));
        return (
          <section key={w.week} className="week-block">
            <div className="week-head"><h3>Week {w.week}{w.name ? `: ${w.name}` : ""}</h3><span className="pill">Round value {value}</span></div>
            <div className="table-scroll">
              <table className="score-table">
                <thead><tr><th>Couple</th><th className="num">Score</th><th className="num">Points</th><th>Result</th></tr></thead>
                <tbody>
                  {w.results.map((r) => {
                    const u = unit(r.unitId);
                    const n = owners[r.unitId] ?? 0;
                    return (
                      <tr key={r.unitId} className={r.eliminated ? "is-out" : ""}>
                        <td><span className="couple-names">{u?.members.map((m) => m.name).join(" / ")}</span><small>{n ? `${n} drafted cop${n === 1 ? "y" : "ies"}` : "Undrafted"}{r.score === top ? " · Top score" : ""}</small></td>
                        <td className="num"><span className="score-bar" style={{ ["--pct" as string]: Math.max(0, Math.min(1, r.score / maxScore)) }}><b>{r.score}/{maxScore}</b></span></td>
                        <td className="num strong">{S.unitScorePoints(r.score, value).toFixed(2)} pts</td>
                        <td>{r.eliminated ? <span className="pill pill-out">Eliminated</span> : <span className="pill">Safe</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
