import { LegalView, legalMetadata } from "@/views/LegalView";
import { serverRoutes } from "@/views/routes";

export const metadata = legalMetadata("privacy");

export default function Page() {
  return <LegalView slug="privacy" r={serverRoutes} />;
}
