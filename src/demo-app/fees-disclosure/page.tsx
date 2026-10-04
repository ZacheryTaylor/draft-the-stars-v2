import { LegalView, legalMetadata } from "@/views/LegalView";
import { demoRoutes } from "@/views/routes";

export const metadata = legalMetadata("fees-disclosure");

export default function Page() {
  return <LegalView slug="fees-disclosure" r={demoRoutes} />;
}
