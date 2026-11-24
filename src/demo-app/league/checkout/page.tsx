"use client";
import { useSearchParams } from "next/navigation";
import { checkoutQuery, parseCheckoutQuery } from "@/lib/billing/checkout-flow";
import { CheckoutView } from "@/views/CheckoutView";
import { demoRoutes } from "@/views/routes";
import { DemoLeague, NeedLogin } from "@/demo/DemoShell";
import { useDemoActions } from "@/demo/actions";
import { getFlash, useDemo } from "@/demo/store";

export default function DemoCheckout() {
  const { user } = useDemo();
  const act = useDemoActions("checkout");
  const sp = useSearchParams();
  const { mode, teamIds } = parseCheckoutQuery((k) => sp.get(k));
  if (!user) return <NeedLogin next={demoRoutes.checkout(sp.get("slug") ?? "", checkoutQuery(mode, teamIds))} />;
  return (
    <DemoLeague>
      {(b, u, slug) => <CheckoutView b={b} user={u} slug={slug} mode={mode} teamIds={teamIds} error={getFlash("checkout").error} act={act} r={demoRoutes} />}
    </DemoLeague>
  );
}
