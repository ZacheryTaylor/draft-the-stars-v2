"use client";
import { StandingsView } from "@/views/LeagueViews";
import { DemoLeague } from "@/demo/DemoShell";

export default function DemoLeagueHome() {
  return <DemoLeague>{(b, user) => <StandingsView b={b} user={user} />}</DemoLeague>;
}
