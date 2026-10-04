import { describe, expect, it } from "vitest";
import { COMPANY, LEGAL_SLUGS } from "@/lib/legal/company";
import { driveTitle, LEGAL_DOCS } from "@/lib/legal/documents";
import { parseBlocks, toDriveMarkdown } from "@/lib/legal/markdown";
import { demoRoutes, serverRoutes } from "@/views/routes";

const all = Object.values(LEGAL_DOCS).map((d) => d.body).join("\n");

describe("legal documents", () => {
  it("has a final document for every legal route, with no unfilled placeholders", () => {
    expect(Object.keys(LEGAL_DOCS).sort()).toEqual([...LEGAL_SLUGS].sort());
    for (const d of Object.values(LEGAL_DOCS)) {
      expect(d.body).not.toMatch(/\[(FILL|TBD|TODO|VERIFY|PLACEHOLDER)/i);
      expect(d.body).not.toMatch(/TODO|lorem/i);
      expect(driveTitle(d)).toBe(`Draft the Stars – ${d.docName} (Effective Oct 4, 2026)`);
    }
  });

  it("states the key product facts", () => {
    expect(all).toContain(COMPANY.legalName);
    expect(all).toContain("State of Florida");
    expect(all).toContain(COMPANY.address);
    expect(all).toContain("3 to 12 members");
    expect(all).toMatch(/one-time \$5/);
    expect(all).toContain("No refunds after the draft starts, except where the law requires");
    expect(all).toMatch(/13/);
    expect(all).toMatch(/do not sell personal information/i);
    for (const p of ["Supabase", "Stripe", "Resend", "Sentry", "Vercel"]) expect(LEGAL_DOCS.privacy.body).toContain(p);
    expect(LEGAL_DOCS.terms.body).toContain("DMCA");
    expect(LEGAL_DOCS["fees-disclosure"].body).toMatch(/not gambling/i);
  });

  it("every internal link and #anchor points at a real page section", () => {
    const anchors = new Map(LEGAL_SLUGS.map((s) => [s, new Set(parseBlocks(LEGAL_DOCS[s].body).flatMap((b) => (b.type === "h" && b.id ? [b.id] : [])))]));
    for (const s of LEGAL_SLUGS) {
      for (const [, path, hash] of LEGAL_DOCS[s].body.matchAll(/\]\((\/[\w-]+)?(?:#([\w-]+))?\)/g)) {
        const target = (path ? path.slice(1) : s) as (typeof LEGAL_SLUGS)[number];
        expect(LEGAL_SLUGS, `${s} links to ${path}`).toContain(target);
        if (hash) expect(anchors.get(target)?.has(hash), `${s} links to ${target}#${hash}`).toBe(true);
      }
    }
  });

  it("parses lists and tables, and builds Drive markdown with absolute links", () => {
    const blocks = parseBlocks(LEGAL_DOCS.privacy.body);
    expect(blocks.some((b) => b.type === "table" && b.head[0] === "Provider")).toBe(true);
    const md = toDriveMarkdown("T", COMPANY.effectiveDate, LEGAL_DOCS.terms.body, "terms", COMPANY.url);
    expect(md).toContain("(https://draftthestars.com/privacy)");
    expect(md).not.toMatch(/\{#/);
  });

  it("routes legal pages in both builds", () => {
    expect(serverRoutes.legal("fees-disclosure")).toBe("/fees-disclosure");
    expect(demoRoutes.legal("terms")).toBe("/terms/");
  });
});
