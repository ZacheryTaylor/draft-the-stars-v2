import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { realProvider } from "@/lib/billing/get-provider";
import { createLeague } from "../../actions";
import { NewLeagueView } from "@/views/AccountViews";

export const metadata = { title: "Create a league" };

export default async function NewLeaguePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/leagues/new");
  const { error } = await searchParams;
  const seasons = (await getData().listSeasons()).map(({ season, show, castUnits }) => ({ id: season.id, label: `${show.name} · ${season.title}`, castUnits, unitLabel: show.unitLabel }));
  return <NewLeagueView seasons={seasons} action={createLeague} error={error} providerConnected={realProvider().isConnected()} />;
}
