import { getCurrentUser } from "@/lib/auth/session";
import { LandingView } from "@/views/LandingView";
import { serverRoutes } from "@/views/routes";

export default async function Landing() {
  return <LandingView user={await getCurrentUser()} r={serverRoutes} />;
}
