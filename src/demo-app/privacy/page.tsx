import { LegalView, legalMetadata } from "@/views/LegalView";
import { demoRoutes } from "@/views/routes";

export const metadata = legalMetadata("privacy");

export default function Page() {
  return <LegalView slug="privacy" r={demoRoutes} />;
}
