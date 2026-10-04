import { LegalView, legalMetadata } from "@/views/LegalView";
import { demoRoutes } from "@/views/routes";

export const metadata = legalMetadata("contact");

export default function Page() {
  return <LegalView slug="contact" r={demoRoutes} />;
}
