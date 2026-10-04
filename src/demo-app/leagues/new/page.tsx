"use client";
import { NewLeagueView } from "@/views/AccountViews";
import { demoRoutes } from "@/views/routes";
import { NeedLogin } from "@/demo/DemoShell";
import { useDemoActions } from "@/demo/actions";
import { demoData, getFlash, useDemo } from "@/demo/store";

export default function DemoNewLeague() {
  const { user } = useDemo();
  const act = useDemoActions("new-league");
  if (!user) return <NeedLogin next={demoRoutes.newLeague} />;
  const seasons = demoData.listSeasonsNow().map(({ season, show, castUnits }) => ({ id: season.id, label: `${show.name} · ${season.title}`, castUnits, unitLabel: show.unitLabel }));
  return <NewLeagueView seasons={seasons} action={act.createLeague} error={getFlash("new-league").error} providerConnected={false} />;
}
