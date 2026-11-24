"use client";
import { useSearchParams } from "next/navigation";
import { getPaymentProvider, realProvider } from "@/lib/billing/get-provider";
import { FeesView } from "@/views/FeesView";
import { demoRoutes } from "@/views/routes";
import { DemoLeague } from "@/demo/DemoShell";
import { useDemoActions } from "@/demo/actions";
import { getFlash, useDemo } from "@/demo/store";

export default function DemoFees() {
  useDemo(); // subscribe so flash messages re-render
  const act = useDemoActions("fees");
  const sp = useSearchParams();
  const isNew = sp.get("new") ?? undefined;
  const checkout = sp.get("checkout") ?? undefined;
  const paid = sp.get("paid") ?? undefined;
  const f = getFlash("fees");
  return (
    <DemoLeague>
      {(b, user, slug) => (
        <FeesView b={b} user={user} slug={slug} sp={{ ...f, checkout, paid: f.paid ?? paid, new: f.paid || f.saved || checkout ? undefined : isNew }} act={act} stripeLabel={realProvider().label} mockLabel={getPaymentProvider().label} r={demoRoutes} />
      )}
    </DemoLeague>
  );
}
