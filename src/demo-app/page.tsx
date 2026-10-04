"use client";
import { LandingView } from "@/views/LandingView";
import { demoRoutes } from "@/views/routes";
import { useDemo } from "@/demo/store";

export default function DemoLanding() {
  return <LandingView user={useDemo().user} r={demoRoutes} />;
}
