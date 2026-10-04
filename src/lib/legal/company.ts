/**
 * Operator details used by every legal page. Change the contact email here (one place) if needed.
 * Source: Florida Articles of Organization (Sunbiz doc L26000385451, filed July 20, 2026).
 */
export const COMPANY = {
  legalName: "ZT, LLC",
  entity: "a Florida limited liability company",
  state: "Florida",
  venue: "Escambia County, Florida",
  address: "3525 Beagles St, Pensacola, FL 32514",
  supportEmail: "support@draftthestars.com",
  product: "Draft the Stars",
  domain: "draftthestars.com",
  url: "https://draftthestars.com",
  effectiveDate: "October 4, 2026",
  effectiveShort: "Oct 4, 2026",
} as const;

export const LEGAL_SLUGS = ["terms", "privacy", "refunds", "fees-disclosure", "contact"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];
