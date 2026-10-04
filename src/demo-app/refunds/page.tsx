import { LegalView, legalMetadata } from "@/views/LegalView";
import { demoRoutes } from "@/views/routes";

export const metadata = legalMetadata("refunds");

export default function Page() {
  return <LegalView slug="refunds" r={demoRoutes} />;
}
