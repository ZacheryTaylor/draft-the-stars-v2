import { LegalView, legalMetadata } from "@/views/LegalView";
import { serverRoutes } from "@/views/routes";

export const metadata = legalMetadata("refunds");

export default function Page() {
  return <LegalView slug="refunds" r={serverRoutes} />;
}
