"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { LeagueShell } from "@/views/LeagueViews";
import { SiteFooter, SiteHeader } from "@/views/SiteHeader";
import { demoRoutes } from "@/views/routes";
import { LEGAL_SLUGS } from "@/lib/legal/company";
import { useDemoActions } from "./actions";
import { clearFlash, demoData, useDemo } from "./store";
import type { LeagueBundle, Profile } from "@/lib/data/types";

const Loading = () => <p className="demo-loading muted" aria-live="polite">Loading demo…</p>;

export function DemoShell({ children }: { children: React.ReactNode }) {
  const { ready, user } = useDemo();
  const act = useDemoActions("shell");
  const path = usePathname();
  // Legal pages need no demo data, so they render (and prerender) without waiting for the store.
  const isLegal = (LEGAL_SLUGS as readonly string[]).includes(path.replace(/^\/|\/$/g, ""));
  // A page's in-place messages belong to that page visit.
  useEffect(() => clearFlash(), [path]);
  return (
    <>
      <div className="demo-banner" role="note" data-testid="demo-banner">
        <span>Demo – test data, no real payments. Everything you do stays in this browser.</span>
        <button type="button" onClick={act.resetDemo} data-testid="reset-demo">Reset demo</button>
      </div>
      <SiteHeader user={user} r={demoRoutes} logout={act.logOut} saveTheme={act.saveTheme} />
      <main id="main">{ready || isLegal ? <Suspense fallback={<Loading />}>{children}</Suspense> : <Loading />}</main>
      <SiteFooter r={demoRoutes} />
    </>
  );
}

export function NeedLogin({ next }: { next: string }) {
  return (
    <section className="card">
      <h2>Log in to continue</h2>
      <p className="muted">Use a demo account: <code>zach</code> is commissioner of every demo league.</p>
      <Link className="btn primary" href={demoRoutes.login(next)}>Log in</Link>
    </section>
  );
}

/** League pages: ?slug= picks the league (leagues created in the browser have no prebuilt page). */
export function DemoLeague({ children }: { children: (b: LeagueBundle, user: Profile | null, slug: string) => React.ReactNode }) {
  const { user } = useDemo();
  const slug = useSearchParams().get("slug") ?? "";
  const b = demoData.getLeagueNow(slug);
  if (!b)
    return (
      <section className="card">
        <h2>League not found</h2>
        <p className="muted">It may have been created before a demo reset. <Link href={demoRoutes.dashboard}>Back to my leagues</Link></p>
      </section>
    );
  return <LeagueShell b={b} user={user} r={demoRoutes}>{children(b, user, slug)}</LeagueShell>;
}

