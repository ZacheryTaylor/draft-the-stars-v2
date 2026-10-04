import { COMPANY, type LegalSlug } from "@/lib/legal/company";
import { LEGAL_DOCS } from "@/lib/legal/documents";
import { LegalMarkdown } from "@/lib/legal/markdown";
import type { Routes } from "./routes";

export function LegalView({ slug, r }: { slug: LegalSlug; r: Routes }) {
  const doc = LEGAL_DOCS[slug];
  return (
    <article className="card legal" data-testid={`legal-${slug}`}>
      <p className="eyebrow">{COMPANY.product} · {COMPANY.legalName}</p>
      <h2>{doc.docName}</h2>
      <p className="hint">Effective date: {COMPANY.effectiveDate} · Last updated: {COMPANY.effectiveDate}</p>
      <LegalMarkdown source={doc.body} resolve={r.legal} />
    </article>
  );
}

export const legalMetadata = (slug: LegalSlug) => ({ title: LEGAL_DOCS[slug].docName, description: LEGAL_DOCS[slug].summary });
