"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links, exact }: { links: { href: string; label: string }[]; exact?: boolean }) {
  const path = usePathname();
  return (
    <>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={path === l.href || (!exact && l.href !== "/" && path.startsWith(l.href)) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </>
  );
}
