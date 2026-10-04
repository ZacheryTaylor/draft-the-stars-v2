"use client";
import { DraftRoomView } from "@/views/DraftRoomView";
import { demoRoutes } from "@/views/routes";
import { DemoLeague } from "@/demo/DemoShell";
import { useDemoActions } from "@/demo/actions";
import { getFlash } from "@/demo/store";

export default function DemoDraft() {
  const act = useDemoActions("draft");
  return (
    <DemoLeague>
      {(b, user, slug) => <DraftRoomView b={b} user={user} slug={slug} error={getFlash("draft").error} act={act} r={demoRoutes} realtimeNote="Demo · updates instantly in this browser (Realtime is a placeholder)" />}
    </DemoLeague>
  );
}
