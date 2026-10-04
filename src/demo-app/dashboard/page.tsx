"use client";
import { DashboardView } from "@/views/AccountViews";
import { demoRoutes } from "@/views/routes";
import { NeedLogin } from "@/demo/DemoShell";
import { demoData, useDemo } from "@/demo/store";

export default function DemoDashboard() {
  const { user } = useDemo();
  if (!user) return <NeedLogin next={demoRoutes.dashboard} />;
  return <DashboardView user={user} leagues={demoData.listLeaguesForUserNow(user.id)} r={demoRoutes} />;
}
