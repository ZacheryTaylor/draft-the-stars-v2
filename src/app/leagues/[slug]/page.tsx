import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { StandingsView } from "@/views/LeagueViews";
import { serverRoutes } from "@/views/routes";

export default async function LeagueHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StandingsView b={(await getData().getLeague(slug))!} user={await getCurrentUser()} r={serverRoutes} />;
}
