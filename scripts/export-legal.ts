/** Writes each legal document as Markdown (for Google Docs import) to ./legal-export/<slug>.md. */
import { mkdirSync, writeFileSync } from "node:fs";
import { COMPANY } from "../src/lib/legal/company";
import { driveTitle, LEGAL_DOCS } from "../src/lib/legal/documents";
import { toDriveMarkdown } from "../src/lib/legal/markdown";

const dir = process.argv[2] ?? "legal-export";
mkdirSync(dir, { recursive: true });
for (const d of Object.values(LEGAL_DOCS)) {
  writeFileSync(`${dir}/${d.slug}.md`, toDriveMarkdown(driveTitle(d), COMPANY.effectiveDate, d.body, d.slug, COMPANY.url));
  console.log(`${dir}/${d.slug}.md  ${driveTitle(d)}`);
}
