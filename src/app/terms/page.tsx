import { LegalView, legalMetadata } from "@/views/LegalView";
import { serverRoutes } from "@/views/routes";

export const metadata = legalMetadata("terms");

export default function Page() {
  return <LegalView slug="terms" r={serverRoutes} />;
}
