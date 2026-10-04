import { LegalView, legalMetadata } from "@/views/LegalView";
import { demoRoutes } from "@/views/routes";

export const metadata = legalMetadata("terms");

export default function Page() {
  return <LegalView slug="terms" r={demoRoutes} />;
}
