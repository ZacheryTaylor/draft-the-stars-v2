"use client";
import { useState } from "react";
import { leagueSizing, sizingTable, MIN_TEAMS, MAX_TEAMS } from "@/lib/league/sizing";
import { FEE_COPY, formatCents, quote } from "@/lib/billing";

interface SeasonOption { id: string; label: string; castUnits: number; unitLabel: string }

export function CreateLeagueForm({ seasons, action, providerConnected }: { seasons: SeasonOption[]; action: (f: FormData) => void; providerConnected: boolean }) {
  const [teams, setTeams] = useState(8);
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? "");
  const season = seasons.find((s) => s.id === seasonId) ?? seasons[0];
  const s = leagueSizing(season.castUnits, teams);
  const q = quote(teams);
  return (
    <form action={action} className="stack" style={{ maxWidth: "none" }}>
      <div className="grid-2">
        <div className="stack">
          <label>League name<input name="name" required maxLength={60} placeholder="e.g. Sunday Night Ballroom" /></label>
          <label>Show season
            <select name="seasonId" value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>
              {seasons.map((o) => <option key={o.id} value={o.id}>{o.label} ({o.castUnits} {o.unitLabel}s)</option>)}
            </select>
          </label>
          <label>Teams / members: <span aria-live="polite">{teams}</span>
            <input type="range" name="teamCount" min={MIN_TEAMS} max={MAX_TEAMS} step={1} value={teams} onChange={(e) => setTeams(Number(e.target.value))} />
          </label>
          <div className="row">
            <label style={{ flex: 1 }}>Draft type
              <select name="draftType" defaultValue="snake"><option value="snake">Snake</option><option value="linear">Linear</option></select>
            </label>
            <label style={{ flex: 1 }}>Privacy
              <select name="privacy" defaultValue="private"><option value="private">Private (invite only)</option><option value="public">Public standings</option></select>
            </label>
          </div>
        </div>
        <div className="stack" aria-live="polite">
          <div className="preview-grid">
            <div className="stat"><b>{s.copies}</b><span>Cop{s.copies === 1 ? "y" : "ies"} each</span></div>
            <div className="stat"><b>{s.perTeam}</b><span>Per team</span></div>
            <div className="stat"><b>{s.perRole}/{s.perRole}</b><span>Celebs / pros</span></div>
            <div className="stat"><b>{s.leftover}</b><span>Undrafted</span></div>
          </div>
          <div className="receipt">
            <div><span>Creating the league</span><b>Free</b></div>
            <div><span>Member slots</span><b>{teams}</b></div>
            <div><span>Platform fee, each member pays</span><b>{formatCents(q.pricePerMemberCents)}</b></div>
            <div className="total"><span>If you cover everyone</span><span>{formatCents(q.totalCents)}</span></div>
          </div>
          <p className="hint">{season.castUnits} {season.unitLabel}s × 2 dancers × {s.copies} = {s.totalDancers} draftable dancers. {s.leftover ? `${s.leftover} stay undrafted (future free-agent pool).` : "Everyone gets drafted."}</p>
        </div>
      </div>
      <p className="hint">{FEE_COPY.long} You pay your own {formatCents(q.pricePerMemberCents)} too, and can cover other members&apos; fees in one checkout. Collecting from members happens off-platform. The draft starts once every slot is filled and paid.</p>
      {!providerConnected && <p className="notice warn"><b>Payment provider not connected.</b> Fees use a mock checkout for now; no money moves.</p>}
      <div className="row"><button className="primary" type="submit">Create league (free)</button></div>

      <h3>Copies, roster size and fees by team count</h3>
      <div className="table-scroll">
        <table className="sizing-table">
          <thead><tr><th>Teams</th><th className="num">Copies</th><th className="num">Dancers</th><th className="num">Per team</th><th className="num">Celebs / pros</th><th className="num">Left over</th><th className="num">Fees if all covered</th></tr></thead>
          <tbody>
            {sizingTable(season.castUnits).map((r) => (
              <tr key={r.teams} className={r.teams === teams ? "selected" : ""} aria-current={r.teams === teams ? "true" : undefined}>
                <td>{r.teams}</td><td className="num">{r.copies}</td><td className="num">{r.totalDancers}</td><td className="num">{r.perTeam}</td>
                <td className="num">{r.perRole} / {r.perRole}</td><td className="num">{r.leftover}</td><td className="num">{formatCents(quote(r.teams).totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </form>
  );
}
