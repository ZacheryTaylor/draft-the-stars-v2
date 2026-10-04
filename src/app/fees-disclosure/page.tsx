import { LegalView, legalMetadata } from "@/views/LegalView";
import { serverRoutes } from "@/views/routes";

export const metadata = legalMetadata("fees-disclosure");

export default function Page() {
  return <LegalView slug="fees-disclosure" r={serverRoutes} />;
}
