import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { viewerRole } from "@/lib/data/league-view";
import { clearScoreOverride, overrideScore, randomizeDraftOrder, regenerateInvite, saveDraftOrder, setMemberRole } from "../../../actions";
import { CommissionerView } from "@/views/CommissionerView";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "Commissioner tools" };

export default async function Commissioner({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { slug } = await params;
  const { error, saved } = await searchParams;
  const b = (await getData().getLeague(slug))!;
  if (!viewerRole(b, await getCurrentUser()).isCommissioner) redirect(`/leagues/${slug}`);
  return <CommissionerView b={b} slug={slug} error={error} saved={saved} r={serverRoutes} act={{ regenerateInvite, setMemberRole, randomizeDraftOrder, saveDraftOrder, overrideScore, clearScoreOverride }} />;
}
