"use client";
import { SignupView } from "@/views/AccountViews";
import { demoRoutes } from "@/views/routes";
import { useDemoActions } from "@/demo/actions";
import { getFlash, useDemo } from "@/demo/store";

export default function DemoSignup() {
  useDemo();
  const act = useDemoActions("signup");
  return <SignupView action={act.signUp} error={getFlash("signup").error} r={demoRoutes} demo />;
}
