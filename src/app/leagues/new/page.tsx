import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { realProvider } from "@/lib/billing/get-provider";
import { createLeague } from "../../actions";
import { FormMessage } from "@/components/FormMessage";
import { CreateLeagueForm } from "@/components/CreateLeagueForm";

export const metadata = { title: "Create a league" };

export default async function NewLeaguePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/leagues/new");
  const { error } = await searchParams;
  const seasons = await getData().listSeasons();
  const options = seasons.map(({ season, show, castUnits }) => ({
    id: season.id,
    label: `${show.name} · ${season.title}`,
    castUnits,
    unitLabel: show.unitLabel,
  }));
  return (
    <section className="card">
      <p className="eyebrow">New league · you will be commissioner</p>
      <h2>Create a league</h2>
      <p className="muted">Pick how many teams (3 to 12). Copies per dancer and roster size follow from the cast size, Creating a league is free; each member pays a $5 platform fee.</p>
      <FormMessage error={error} />
      <CreateLeagueForm seasons={options} action={createLeague} providerConnected={realProvider().isConnected()} />
    </section>
  );
}
