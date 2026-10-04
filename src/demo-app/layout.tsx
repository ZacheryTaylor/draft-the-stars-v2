import type { Metadata } from "next";
import { DEFAULT_THEME } from "@/lib/themes/presets";
import { fontClassNames, ThemeHead } from "@/views/document";
import { DemoShell } from "@/demo/DemoShell";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Draft the Stars · demo", template: "%s · Draft the Stars demo" },
  description: "Clickable demo of Draft the Stars v2. Test data only, no real payments.",
  robots: { index: false, follow: false },
};

/** Static GitHub Pages demo (built by scripts/build-demo.mjs, which swaps this folder in as src/app). */
export default function DemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme={DEFAULT_THEME} data-theme-source="default" className={fontClassNames} suppressHydrationWarning>
      <head>
        <ThemeHead />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <DemoShell>{children}</DemoShell>
      </body>
    </html>
  );
}
