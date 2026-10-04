import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { viewerRole } from "@/lib/data/league-view";
import { makePick, setDraftStatus } from "../../../actions";
import { LivePoll } from "@/components/LivePoll";
import { DraftRoomView } from "@/views/DraftRoomView";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "Draft room" };

export default async function DraftRoom({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const { slug } = await params;
  const { error } = await searchParams;
  const b = (await getData().getLeague(slug))!;
  const user = await getCurrentUser();
  if (!viewerRole(b, user).isMember && b.league.privacy !== "public") return null;
  return (
    <>
      <LivePoll active={b.league.draftStatus === "in_progress"} />
      <DraftRoomView b={b} user={user} slug={slug} error={error} act={{ setDraftStatus, makePick }} r={serverRoutes} realtimeNote="Realtime placeholder · refreshes every 8s while live" />
    </>
  );
}
