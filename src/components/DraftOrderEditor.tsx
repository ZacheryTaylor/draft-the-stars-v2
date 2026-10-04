"use client";
/** Manual draft order: drag to reorder, or use the keyboard-accessible up/down buttons. Saves via a server action. */
import { useState } from "react";
import { moveTeam } from "@/lib/league/draft-order";

export function DraftOrderEditor({ slug, teams, locked, save }: { slug: string; teams: { id: string; name: string; owner: string | null }[]; locked: boolean; save: (form: FormData) => Promise<void> }) {
  const initial = teams.map((t) => t.id);
  const [order, setOrder] = useState(initial);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [announce, setAnnounce] = useState("");
  const byId = new Map(teams.map((t) => [t.id, t]));
  const changed = order.join() !== initial.join();
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length) return;
    setOrder((o) => moveTeam(o, from, to));
    setAnnounce(`${byId.get(order[from])?.name} moved to pick ${to + 1}`);
  };

  return (
    <form action={save} className={`stack ${locked ? "order-locked" : ""}`} style={{ maxWidth: "none" }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="order" value={order.join(",")} />
      <ol className="order-list" aria-label="Draft order, first pick first">
        {order.map((id, i) => {
          const t = byId.get(id)!;
          return (
            <li
              key={id}
              className={`order-item ${dragFrom === i ? "dragging" : ""} ${over === i && dragFrom !== i ? "drop-target" : ""}`}
              draggable={!locked}
              onDragStart={(e) => { setDragFrom(i); e.dataTransfer.effectAllowed = "move"; }}
              onDragOver={(e) => { if (dragFrom !== null) { e.preventDefault(); setOver(i); } }}
              onDragLeave={() => setOver((o) => (o === i ? null : o))}
              onDrop={(e) => { e.preventDefault(); if (dragFrom !== null) move(dragFrom, i); setDragFrom(null); setOver(null); }}
              onDragEnd={() => { setDragFrom(null); setOver(null); }}
            >
              <span className="order-pos">{i + 1}</span>
              {!locked && <span aria-hidden="true" className="hint">⋮⋮</span>}
              <span className="grow"><b>{t.name}</b>{t.owner ? <span className="hint"> · {t.owner}</span> : <span className="hint"> · open slot</span>}</span>
              {!locked && (
                <span className="row">
                  <button type="button" className="btn-sm ghost" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${t.name} up`}>↑</button>
                  <button type="button" className="btn-sm ghost" onClick={() => move(i, i + 1)} disabled={i === order.length - 1} aria-label={`Move ${t.name} down`}>↓</button>
                </span>
              )}
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">{announce}</p>
      {!locked && (
        <div className="row">
          <button type="submit" className="primary" disabled={!changed}>Save manual order</button>
          <button type="button" className="ghost" disabled={!changed} onClick={() => setOrder(initial)}>Undo changes</button>
        </div>
      )}
    </form>
  );
}
