import Link from "next/link";
import type { LeagueSummary } from "@/lib/data/adapter";
import type { Profile } from "@/lib/data/types";
import { Monogram } from "@/components/Monogram";
import { FormMessage } from "@/components/FormMessage";
import { CreateLeagueForm } from "@/components/CreateLeagueForm";
import type { FormAction, Routes } from "./routes";

export const DEMO_ACCOUNTS = [
  { username: "zach", note: "commissioner of every demo league" },
  { username: "foxtrot_fran", note: "player, fee covered by Zach" },
  { username: "waltz_wren", note: "player, unpaid" },
  { username: "tango_tess", note: "player" },
];

export function DashboardView({ user, leagues, r }: { user: Profile; leagues: LeagueSummary[]; r: Routes }) {
  return (
    <section className="card">
      <div className="hero-head">
        <div>
          <p className="eyebrow">Signed in as @{user.username}</p>
          <h2>My leagues</h2>
        </div>
        <div className="row">
          <Link className="btn primary" href={r.newLeague}>Create a league</Link>
          <Link className="btn" href={r.join()}>Join with a code</Link>
        </div>
      </div>
      {leagues.length === 0 && <p className="muted">You are not in any leagues yet.</p>}
      <div className="grid-2">
        {leagues.map((l) => (
          <article key={l.league.id} className="feature stack">
            <div className="row">
              <Monogram name={l.league.name} size="lg" />
              <div>
                <Link href={r.league(l.league.slug)} className="strong">{l.league.name}</Link>
                <p className="hint" style={{ margin: 0 }}>{l.showName} · {l.seasonTitle}</p>
              </div>
            </div>
            <div className="row">
              <span className="pill">{l.role === "player" ? "Player" : "Commissioner"}</span>
              <span className="pill">{l.memberCount}/{l.league.settings.teamCount} members</span>
              <span className={`pill ${l.paidSlots === l.league.settings.teamCount ? "" : "pill-gold"}`}>{l.paidSlots}/{l.league.settings.teamCount} paid</span>
              <span className="pill">Draft: {l.league.draftStatus.replace("_", " ")}</span>
            </div>
            {l.teamName && <p className="hint" style={{ margin: 0 }}>Your team: <b>{l.teamName}</b></p>}
            {l.myPaymentStatus === "unpaid" && l.league.draftStatus === "not_started" && (
              <Link className="btn primary" href={r.league(l.league.slug, "fees")}>Pay my $5 fee</Link>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

export function LoginView({ action, error, next, r, demo }: { action: FormAction; error?: string; next?: string; r: Routes; demo?: boolean }) {
  return (
    <section className="card">
      <p className="eyebrow">Welcome back</p>
      <h2>Log in</h2>
      <p className="notice">
        <b>{demo ? "Demo login." : "Placeholder auth."}</b> {demo ? "No passwords in the demo: type a username and press Log in." : "Supabase Auth is not connected, so there is no password check yet."} Demo accounts:{" "}
        {DEMO_ACCOUNTS.map((a, i) => <span key={a.username}>{i ? ", " : ""}<code>{a.username}</code> ({a.note})</span>)}.
      </p>
      <form action={action} className="stack">
        <FormMessage error={error} />
        <input type="hidden" name="next" value={next ?? ""} />
        <label>Email or username<input name="login" required autoComplete="username" defaultValue="zach" /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Not checked (placeholder)" /></label>
        <div className="row">
          <button className="primary" type="submit">Log in</button>
          <Link href={r.signup}>Create an account</Link>
        </div>
        <p className="hint">Forgot password? Email reset arrives with Supabase Auth + Resend (placeholder).</p>
      </form>
    </section>
  );
}

export function SignupView({ action, error, r, demo }: { action: FormAction; error?: string; r: Routes; demo?: boolean }) {
  return (
    <section className="card">
      <p className="eyebrow">Free account</p>
      <h2>Sign up</h2>
      <p className="notice"><b>Placeholder auth.</b> {demo ? "Demo accounts live in this browser only (localStorage)." : "Accounts live in memory until Supabase Auth is connected."} Verification email is logged, not sent (Resend placeholder).</p>
      <form action={action} className="stack">
        <FormMessage error={error} />
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Username (3-20 letters, numbers or _ · unique)<input name="username" required pattern="[A-Za-z0-9_]{3,20}" autoComplete="username" /></label>
        <label>Password<input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Not stored (placeholder)" /></label>
        <label>Birth year (you must be 13 or older)<input name="birthYear" type="number" required min={1900} max={new Date().getFullYear()} /></label>
        <input type="hidden" name="theme" id="signup-theme" />
        <div className="row">
          <button className="primary" type="submit">Create account</button>
          <Link href={r.login()}>I already have one</Link>
        </div>
      </form>
    </section>
  );
}

export function JoinView({ user, action, error, code, r }: { user: Profile | null; action: FormAction; error?: string; code?: string; r: Routes }) {
  return (
    <section className="card">
      <p className="eyebrow">Got an invite?</p>
      <h2>Join by code</h2>
      {!user && <p className="notice">You will need a free account first. <Link href={r.signup}>Sign up</Link> or <Link href={r.login("/join")}>log in</Link>.</p>}
      <form action={action} className="stack">
        <FormMessage error={error} />
        <label>Invite code<input name="code" required defaultValue={code} placeholder="e.g. OFFICE35" style={{ textTransform: "uppercase", letterSpacing: ".12em" }} /></label>
        <button className="primary" type="submit">Join league</button>
        <p className="hint">You claim the next open team (a slot the commissioner already covered stays paid). Joining closes once the draft starts.</p>
      </form>
    </section>
  );
}

export interface SeasonOption { id: string; label: string; castUnits: number; unitLabel: string }

export function NewLeagueView({ seasons, action, error, providerConnected }: { seasons: SeasonOption[]; action: FormAction; error?: string; providerConnected: boolean }) {
  return (
    <section className="card">
      <p className="eyebrow">New league · you will be commissioner</p>
      <h2>Create a league</h2>
      <p className="muted">Pick how many teams (3 to 12). Copies per dancer and roster size follow from the cast size. Creating a league is free; each member pays a $5 platform fee.</p>
      <FormMessage error={error} />
      <CreateLeagueForm seasons={seasons} action={action} providerConnected={providerConnected} />
    </section>
  );
}
