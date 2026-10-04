"use client";
import { useSearchParams } from "next/navigation";
import { JoinView } from "@/views/AccountViews";
import { demoRoutes } from "@/views/routes";
import { useDemoActions } from "@/demo/actions";
import { getFlash, useDemo } from "@/demo/store";

export default function DemoJoin() {
  const { user } = useDemo();
  const act = useDemoActions("join");
  return <JoinView user={user} action={act.joinLeague} error={getFlash("join").error} code={useSearchParams().get("code") ?? undefined} r={demoRoutes} />;
}
