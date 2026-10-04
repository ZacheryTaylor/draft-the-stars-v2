"use client";
import { useSearchParams } from "next/navigation";
import { getPaymentProvider, realProvider } from "@/lib/billing/get-provider";
import { FeesView } from "@/views/FeesView";
import { DemoLeague } from "@/demo/DemoShell";
import { useDemoActions } from "@/demo/actions";
import { getFlash, useDemo } from "@/demo/store";

export default function DemoFees() {
  useDemo(); // subscribe so flash messages re-render
  const act = useDemoActions("fees");
  const isNew = useSearchParams().get("new") ?? undefined;
  const f = getFlash("fees");
  return (
    <DemoLeague>
      {(b, user, slug) => (
        <FeesView b={b} user={user} slug={slug} sp={{ ...f, new: f.paid || f.saved ? undefined : isNew }} act={act} stripeLabel={realProvider().label} mockLabel={getPaymentProvider().label} />
      )}
    </DemoLeague>
  );
}
