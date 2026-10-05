"use client";
/** Live payment-deadline countdown driven by season premiereDate. */
import { useEffect, useState } from "react";
import { paymentDeadlineInfo } from "@/lib/billing";

export function DeadlineCountdown({ premiereDate, compact }: { premiereDate: string | null | undefined; compact?: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const info = paymentDeadlineInfo(premiereDate, now);
  if (!info.deadline) return compact ? null : <p className="hint">No premiere date set for this season.</p>;

  const end = info.deadlineEnd!;
  const ms = Math.max(0, end.getTime() - now.getTime());
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const clock = info.passed ? null : `${h}h ${String(m).padStart(2, "0")}m`;

  if (compact) {
    return (
      <span className={`pill ${info.passed ? "pill-gold" : ""}`} title={info.label} data-testid="deadline-countdown">
        {info.passed ? `Deadline passed · ${info.deadline}` : `Due ${info.deadline}${clock ? ` · ${clock}` : ""}`}
      </span>
    );
  }
  return (
    <div className="deadline-block" data-testid="deadline-countdown" aria-live="polite">
      <div className="receipt">
        <div><span>Season premiere</span><b>{info.premiereDate}</b></div>
        <div><span>Payment deadline</span><b>{info.deadline}</b></div>
        <div className="total">
          <span>{info.passed ? "Status" : "Countdown"}</span>
          <span>{info.passed ? "Passed" : clock ?? info.label}</span>
        </div>
      </div>
      <p className="hint" style={{ margin: 0 }}>{info.label}. Deadline is the day before premiere.</p>
    </div>
  );
}
