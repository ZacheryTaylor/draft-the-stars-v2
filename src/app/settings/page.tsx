import { getCurrentUser } from "@/lib/auth/session";
import { serviceStatus } from "@/lib/services/env";
import { saveTheme, updateUsername } from "../actions";
import { SettingsView } from "@/views/SettingsView";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  return <SettingsView user={await getCurrentUser()} error={error} saved={saved} saveTheme={saveTheme} updateUsername={updateUsername} services={serviceStatus()} r={serverRoutes} />;
}
