"use client";
import { serviceStatus } from "@/lib/services/env";
import { SettingsView } from "@/views/SettingsView";
import { demoRoutes } from "@/views/routes";
import { useDemoActions } from "@/demo/actions";
import { getFlash, useDemo } from "@/demo/store";

export default function DemoSettings() {
  const { user } = useDemo();
  const act = useDemoActions("settings");
  const f = getFlash("settings");
  return <SettingsView key={user?.id ?? "anon"} user={user} error={f.error} saved={f.saved} saveTheme={act.saveTheme} updateUsername={act.updateUsername} services={serviceStatus()} r={demoRoutes} />;
}
