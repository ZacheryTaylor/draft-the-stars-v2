import type { Metadata } from "next";
import Link from "next/link";
import { Grand_Hotel, Quicksand } from "next/font/google";
import { getCurrentUser } from "@/lib/auth/session";
import { DEFAULT_THEME, THEME_IDS, THEME_STORAGE_KEY, themeCss } from "@/lib/themes/presets";
import { Monogram } from "@/components/Monogram";
import { NavLinks } from "@/components/NavLinks";
import { logOut } from "./actions";
import "./globals.css";

const quicksand = Quicksand({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-quicksand" });
const grandHotel = Grand_Hotel({ subsets: ["latin"], weight: "400", variable: "--font-grand-hotel" });

export const metadata: Metadata = {
  title: { default: "Draft the Stars", template: "%s · Draft the Stars" },
  description: "Fantasy drafts for reality competition shows. Draft the cast, track weekly scores, chase the top spot. Fan-made.",
};

// Runs before paint: apply the localStorage theme when no profile theme was rendered (logged out).
const themeBootstrap = `(function(){try{var d=document.documentElement;if(d.getAttribute('data-theme-source')==='profile'){localStorage.setItem('${THEME_STORAGE_KEY}',d.getAttribute('data-theme'));return;}var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(${JSON.stringify(THEME_IDS)}.indexOf(t)>-1)d.setAttribute('data-theme',t);}catch(e){}})();`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  return (
    <html
      lang="en"
      data-theme={user?.themePreset ?? DEFAULT_THEME}
      data-theme-source={user ? "profile" : "default"}
      className={`${quicksand.variable} ${grandHotel.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style id="theme-tokens" dangerouslySetInnerHTML={{ __html: themeCss() }} />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="top">
          <div className="top-inner">
            <Link href="/" className="brand" aria-label="Draft the Stars home">
              <span className="kicker">Reality TV fantasy drafts</span>
              <span className="logo">Draft the Stars</span>
            </Link>
            <nav className="main-nav" aria-label="Main">
              <NavLinks
                links={
                  user
                    ? [
                        { href: "/dashboard", label: "My leagues" },
                        { href: "/leagues/new", label: "Create" },
                        { href: "/join", label: "Join" },
                        { href: "/settings", label: "Settings" },
                      ]
                    : [
                        { href: "/", label: "Home" },
                        { href: "/settings", label: "Theme" },
                        { href: "/login", label: "Log in" },
                        { href: "/signup", label: "Sign up" },
                      ]
                }
              />
              {user && (
                <form action={logOut} className="user-chip">
                  <Monogram name={user.displayName ?? user.username} size="sm" initials={user.username.slice(0, 2).toUpperCase()} />
                  <button type="submit" className="chip ghost" aria-label={`Log out ${user.username}`}>Log out</button>
                </form>
              )}
            </nav>
          </div>
        </header>
        <main id="main">{children}</main>
        <footer>
          Fan-made and not affiliated with any show, network or production company. No logos or photos: monograms only.
          <br />
          Accounts are free · leagues are $3 per member · Draft the Stars v2 preview (mock data, placeholder services)
        </footer>
      </body>
    </html>
  );
}
