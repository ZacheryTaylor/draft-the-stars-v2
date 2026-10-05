"use client";
import { StandingsView } from "@/views/LeagueViews";
import { demoRoutes } from "@/views/routes";
import { DemoLeague } from "@/demo/DemoShell";

export default function DemoLeagueHome() {
  return <DemoLeague>{(b, user) => <StandingsView b={b} user={user} r={demoRoutes} />}</DemoLeague>;
}
