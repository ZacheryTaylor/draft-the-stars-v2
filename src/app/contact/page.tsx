import { LegalView, legalMetadata } from "@/views/LegalView";
import { serverRoutes } from "@/views/routes";

export const metadata = legalMetadata("contact");

export default function Page() {
  return <LegalView slug="contact" r={serverRoutes} />;
}
