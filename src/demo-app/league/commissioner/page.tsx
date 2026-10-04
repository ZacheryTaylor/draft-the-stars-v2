"use client";
import { viewerRole } from "@/lib/data/league-view";
import { CommissionerView } from "@/views/CommissionerView";
import { demoRoutes } from "@/views/routes";
import { DemoLeague } from "@/demo/DemoShell";
import { useDemoActions } from "@/demo/actions";
import { getFlash, useDemo } from "@/demo/store";

export default function DemoCommissioner() {
  useDemo(); // subscribe so flash messages re-render
  const act = useDemoActions("commissioner");
  const f = getFlash("commissioner");
  return (
    <DemoLeague>
      {(b, user, slug) =>
        viewerRole(b, user).isCommissioner ? (
          <CommissionerView b={b} slug={slug} error={f.error} saved={f.saved} act={act} r={demoRoutes} />
        ) : (
          <section className="card"><h2>Commissioner only</h2><p className="muted">Log in as <code>zach</code> to use the commissioner tools.</p></section>
        )
      }
    </DemoLeague>
  );
}
