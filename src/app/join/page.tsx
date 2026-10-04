import { joinLeague } from "../actions";
import { getCurrentUser } from "@/lib/auth/session";
import { JoinView } from "@/views/AccountViews";
import { serverRoutes } from "@/views/routes";

export const metadata = { title: "Join a league" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ error?: string; code?: string }> }) {
  const { error, code } = await searchParams;
  return <JoinView user={await getCurrentUser()} action={joinLeague} error={error} code={code} r={serverRoutes} />;
}
