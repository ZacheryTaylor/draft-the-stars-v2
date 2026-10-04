import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_THEME } from "@/lib/themes/presets";
import { fontClassNames, ThemeHead } from "@/views/document";
import { SiteFooter, SiteHeader } from "@/views/SiteHeader";
import { serverRoutes } from "@/views/routes";
import { logOut, saveTheme } from "./actions";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Draft the Stars", template: "%s · Draft the Stars" },
  description: "Fantasy drafts for reality competition shows. Draft the cast, track weekly scores, chase the top spot. Fan-made.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html lang="en" data-theme={user?.themePreset ?? DEFAULT_THEME} data-theme-source={user ? "profile" : "default"} className={fontClassNames} suppressHydrationWarning>
      <head>
        <ThemeHead />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <SiteHeader user={user} r={serverRoutes} logout={logOut} saveTheme={saveTheme} />
        <main id="main">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
