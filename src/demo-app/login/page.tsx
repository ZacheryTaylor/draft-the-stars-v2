"use client";
import { useSearchParams } from "next/navigation";
import { LoginView } from "@/views/AccountViews";
import { demoRoutes } from "@/views/routes";
import { useDemoActions } from "@/demo/actions";
import { getFlash, useDemo } from "@/demo/store";

export default function DemoLogin() {
  useDemo();
  const act = useDemoActions("login");
  return <LoginView action={act.logIn} error={getFlash("login").error} next={useSearchParams().get("next") ?? undefined} r={demoRoutes} demo />;
}
