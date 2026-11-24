import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { parseCheckoutQuery } from "@/lib/billing/checkout-flow";
import { confirmCheckout } from "../../../actions";
import { CheckoutView } from "@/views/CheckoutView";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { mode, teamIds } = parseCheckoutQuery((k) => sp[k]);
  return <CheckoutView b={(await getData().getLeague(slug))!} user={await getCurrentUser()} slug={slug} mode={mode} teamIds={teamIds} error={sp.error} act={{ confirmCheckout }} r={serverRoutes} />;
}
