import { getCurrentUser } from "@/lib/auth/session";
import { getData } from "@/lib/data";
import { getPaymentProvider, realProvider } from "@/lib/billing/get-provider";
import { checkoutSlots, remindAllUnpaid, remindUnpaid, removeMember, requestRefund } from "../../../actions";
import { FeesView, type FeesFlash } from "@/views/FeesView";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "League fees" };

export default async function BillingPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<FeesFlash> }) {
  const { slug } = await params;
  return (
    <FeesView b={(await getData().getLeague(slug))!} user={await getCurrentUser()} slug={slug} sp={await searchParams}
      act={{ checkoutSlots, remindUnpaid, remindAllUnpaid, requestRefund, removeMember }} stripeLabel={realProvider().label} mockLabel={getPaymentProvider().label} r={serverRoutes} />
  );
}
