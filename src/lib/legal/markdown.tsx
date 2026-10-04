import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL_SLUGS, type LegalSlug } from "./company";

/** Minimal Markdown subset for the legal pages (no dependency): headings, paragraphs, lists, tables, bold, links. */
export type Block =
  | { type: "h"; level: 2 | 3; text: string; id?: string }
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] };

const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export function parseBlocks(md: string): Block[] {
  const out: Block[] = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i++; continue; }
    const h = /^(#{2,3})\s+(.*?)(?:\s+\{#([\w-]+)\})?$/.exec(line);
    if (h) { out.push({ type: "h", level: h[1].length as 2 | 3, text: h[2], id: h[3] }); i++; continue; }
    const listKind = /^- /.test(line) ? "ul" : /^\d+\.\s/.test(line) ? "ol" : null;
    if (listKind) {
      const items: string[] = [];
      while (i < lines.length && (listKind === "ul" ? /^- /.test(lines[i].trim()) : /^\d+\.\s/.test(lines[i].trim()))) {
        items.push(lines[i].trim().replace(/^(- |\d+\.\s+)/, ""));
        i++;
      }
      out.push({ type: listKind, items });
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(cells(lines[i])); i++; }
      const [head, , ...body] = rows; // second row is the --- separator
      out.push({ type: "table", head, rows: body });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|- |\d+\.\s|\|)/.test(lines[i].trim())) { para.push(lines[i].trim()); i++; }
    out.push({ type: "p", text: para.join(" ") });
  }
  return out;
}

export type ResolveLegal = (slug: LegalSlug) => string;

function anchor(href: string, label: ReactNode, key: number, resolve: ResolveLegal) {
  const m = /^\/([\w-]+)(#[\w-]+)?$/.exec(href);
  if (m && (LEGAL_SLUGS as readonly string[]).includes(m[1])) return <Link key={key} href={resolve(m[1] as LegalSlug) + (m[2] ?? "")}>{label}</Link>;
  return <a key={key} href={href}>{label}</a>;
}

export function inline(text: string, resolve: ResolveLegal): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, k = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={k++}>{inline(m[1], resolve)}</strong>);
    else out.push(anchor(m[3], inline(m[2], resolve), k++, resolve));
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function LegalMarkdown({ source, resolve }: { source: string; resolve: ResolveLegal }) {
  return (
    <>
      {parseBlocks(source).map((b, i) => {
        switch (b.type) {
          case "h": return b.level === 2 ? <h3 key={i} id={b.id}>{inline(b.text, resolve)}</h3> : <h4 key={i} id={b.id}>{inline(b.text, resolve)}</h4>;
          case "p": return <p key={i}>{inline(b.text, resolve)}</p>;
          case "ul": return <ul key={i}>{b.items.map((t, j) => <li key={j}>{inline(t, resolve)}</li>)}</ul>;
          case "ol": return <ol key={i}>{b.items.map((t, j) => <li key={j}>{inline(t, resolve)}</li>)}</ol>;
          case "table":
            return (
              <div key={i} className="table-scroll">
                <table>
                  <thead><tr>{b.head.map((c, j) => <th key={j}>{inline(c, resolve)}</th>)}</tr></thead>
                  <tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c, resolve)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            );
        }
      })}
    </>
  );
}

/** Markdown for Google Docs: drop {#anchors}, make site links absolute, add the title and effective date. */
export function toDriveMarkdown(title: string, effective: string, body: string, slug: LegalSlug, siteUrl: string): string {
  const md = body
    .replace(/\s+\{#[\w-]+\}$/gm, "")
    .replace(/\]\(#([\w-]+)\)/g, `](${siteUrl}/${slug}#$1)`)
    .replace(/\]\(\/([\w-]+(?:#[\w-]+)?)\)/g, `](${siteUrl}/$1)`);
  return `# ${title}\n\n**Effective date:** ${effective}\n\n**Web version:** [${siteUrl}/${slug}](${siteUrl}/${slug})\n${md}`;
}
