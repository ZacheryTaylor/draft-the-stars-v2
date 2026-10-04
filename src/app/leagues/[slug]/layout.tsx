import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { LeagueShell } from "@/views/LeagueViews";
import { serverRoutes } from "@/views/routes";

export default async function LeagueLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const bundle = await getData().getLeague(slug);
  if (!bundle) notFound();
  return <LeagueShell b={bundle} user={await getCurrentUser()} r={serverRoutes}>{children}</LeagueShell>;
}
