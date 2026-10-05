"use client";
import Link from "next/link";
import type { DraftReadiness } from "@/lib/billing";
import { DeadlineCountdown } from "./DeadlineCountdown";

export function PreDraftChecklist({
  ready,
  premiereDate,
  draftOrderSet,
  feesHref,
  draftHref,
  commissionerHref,
  isCommissioner,
}: {
  ready: DraftReadiness;
  premiereDate: string | null | undefined;
  draftOrderSet: boolean;
  feesHref: string;
  draftHref: string;
  commissionerHref: string;
  isCommissioner: boolean;
}) {
  const items: { ok: boolean; label: string; href?: string }[] = [
    { ok: ready.filledSlots >= ready.totalSlots, label: `Spots filled · ${ready.filledSlots}/${ready.totalSlots}`, href: isCommissioner ? commissionerHref : undefined },
    { ok: ready.paidSlots >= ready.totalSlots, label: `Spots paid · ${ready.paidSlots}/${ready.totalSlots}`, href: feesHref },
    { ok: draftOrderSet, label: draftOrderSet ? "Draft order set" : "Draft order not set yet", href: isCommissioner ? `${commissionerHref}#draft-order` : undefined },
  ];
  return (
    <section className="card" data-testid="pre-draft-checklist">
      <p className="eyebrow">Pre-draft</p>
      <h2>Getting ready</h2>
      <p className="muted">Standings and weekly scores appear after the draft. Here’s what’s left before draft night.</p>
      <ul className="checklist">
        {items.map((it) => (
          <li key={it.label} className={it.ok ? "ok" : "todo"}>
            <span aria-hidden="true">{it.ok ? "✓" : "○"}</span>
            {it.href && !it.ok ? <Link href={it.href}>{it.label}</Link> : <span>{it.label}</span>}
          </li>
        ))}
        <li className="todo">
          <span aria-hidden="true">⏱</span>
          <div className="stack" style={{ gap: 6 }}>
            <span>Payment deadline</span>
            <DeadlineCountdown premiereDate={premiereDate} />
          </div>
        </li>
        <li className={ready.ready ? "ok" : "todo"}>
          <span aria-hidden="true">{ready.ready ? "✓" : "○"}</span>
          {ready.ready ? (
            <span>Ready to draft · <Link href={draftHref}>Open draft room</Link></span>
          ) : (
            <span>Draft start · waiting ({ready.reasons.join("; ") || "not ready"})</span>
          )}
        </li>
      </ul>
    </section>
  );
}
