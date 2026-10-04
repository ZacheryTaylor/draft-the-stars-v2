import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { DashboardView } from "@/views/AccountViews";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "My leagues" };

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  return <DashboardView user={user} leagues={await getData().listLeaguesForUser(user.id)} r={serverRoutes} />;
}
