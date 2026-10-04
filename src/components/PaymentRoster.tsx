"use client";
/** Slot payment roster. Commissioners multi-select unpaid slots and cover them in ONE checkout (quantity x $5). */
import { useState } from "react";
import { Monogram } from "./Monogram";

export interface RosterRow {
  teamId: string;
  teamName: string;
  draftPosition: number;
  memberId: string | null;
  memberName: string | null;
  isOwner: boolean;
  isMe: boolean;
  status: "unpaid" | "paid" | "waived";
  payerName: string | null; // set when covered by someone else
  paidByMember: boolean;
  remindedAt: string | null;
}

type Action = (form: FormData) => Promise<void>;

export function PaymentRoster(props: {
  slug: string;
  rows: RosterRow[];
  priceCents: number;
  isCommissioner: boolean;
  locked: boolean;
  checkout: Action;
  remind: Action;
  refund: Action;
  remove: Action;
}) {
  const { rows, isCommissioner, locked } = props;
  const [selected, setSelected] = useState<string[]>([]);
  const unpaid = rows.filter((r) => r.status === "unpaid");
  const money = (c: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const canSelect = isCommissioner && !locked;
  const allChecked = unpaid.length > 0 && unpaid.every((r) => selected.includes(r.teamId));

  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {canSelect && (
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all unpaid slots"
                    checked={allChecked}
                    disabled={!unpaid.length}
                    onChange={() => setSelected(allChecked ? [] : unpaid.map((r) => r.teamId))}
                  />
                </th>
              )}
              <th className="num">#</th>
              <th>Team</th>
              <th>Member</th>
              <th>Fee</th>
              {isCommissioner && !locked && <th className="num">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teamId}>
                {canSelect && (
                  <td>
                    <input
                      type="checkbox"
                      form="cover-form"
                      name="teamId"
                      value={r.teamId}
                      aria-label={`Select ${r.teamName}`}
                      checked={selected.includes(r.teamId)}
                      disabled={r.status !== "unpaid"}
                      onChange={() => toggle(r.teamId)}
                    />
                  </td>
                )}
                <td className="num">{r.draftPosition}</td>
                <td className="strong">{r.teamName}</td>
                <td>
                  {r.memberName ? (
                    <span className="user-chip"><Monogram name={r.memberName} size="sm" />{r.memberName}{r.isMe && <span className="hint"> (you)</span>}</span>
                  ) : (
                    <span className="hint">Open slot</span>
                  )}
                </td>
                <td>
                  {r.status === "waived" && <span className="pill">Waived</span>}
                  {r.status === "paid" && (r.paidByMember || !r.payerName ? <span className="pill pill-ok">Paid</span> : <span className="pill pill-ok">Covered by {r.payerName}</span>)}
                  {r.status === "unpaid" && <span className="pill pill-gold">Unpaid{r.remindedAt ? " · reminded" : ""}</span>}
                </td>
                {isCommissioner && !locked && (
                  <td>
                    <div className="roster-actions">
                      {r.status === "unpaid" && r.memberId && !r.isMe && (
                        <form action={props.remind} className="inline-form">
                          <input type="hidden" name="slug" value={props.slug} />
                          <input type="hidden" name="teamId" value={r.teamId} />
                          <button type="submit" className="btn-sm ghost">Remind</button>
                        </form>
                      )}
                      {r.status === "paid" && (
                        <form action={props.refund} className="inline-form">
                          <input type="hidden" name="slug" value={props.slug} />
                          <input type="hidden" name="teamId" value={r.teamId} />
                          <button type="submit" className="btn-sm ghost" title={`Placeholder: refund goes to ${r.paidByMember ? r.memberName : r.payerName}`}>Refund</button>
                        </form>
                      )}
                      {r.memberId && !r.isOwner && (
                        <form action={props.remove} className="inline-form">
                          <input type="hidden" name="slug" value={props.slug} />
                          <input type="hidden" name="memberId" value={r.memberId} />
                          <button type="submit" className="btn-sm ghost">Remove</button>
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canSelect && (
        <form id="cover-form" action={props.checkout} className="sticky-bar">
          <input type="hidden" name="slug" value={props.slug} />
          <span>
            <b>{selected.length}</b> selected × {money(props.priceCents)} = <b>{money(selected.length * props.priceCents)}</b>
            <span className="hint"> · {unpaid.length} unpaid ({money(unpaid.length * props.priceCents)})</span>
          </span>
          <span className="row">
            <button type="submit" name="mode" value="selected" className="primary" disabled={!selected.length}>
              Pay for selected ({selected.length})
            </button>
            <button type="submit" name="mode" value="all_unpaid" disabled={!unpaid.length}>
              Pay for all unpaid ({unpaid.length})
            </button>
          </span>
        </form>
      )}
    </>
  );
}
