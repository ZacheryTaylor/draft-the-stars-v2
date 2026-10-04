"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const clean = (p: string) => (p.split("?")[0].replace(/\/+$/, "") || "/");

export function NavLinks({ links, exact }: { links: { href: string; label: string }[]; exact?: boolean }) {
  const path = clean(usePathname());
  return (
    <>
      {links.map((l) => {
        const href = clean(l.href);
        const active = path === href || (!exact && href !== "/" && path.startsWith(href + "/"));
        return (
          <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
