import Link from "next/link";
import type { Profile } from "@/lib/data/types";
import type { ThemeId } from "@/lib/themes/presets";
import { Monogram } from "@/components/Monogram";
import { NavLinks } from "@/components/NavLinks";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { FormAction, Routes } from "./routes";

export function SiteHeader({ user, r, logout, saveTheme }: { user: Profile | null; r: Routes; logout: FormAction; saveTheme: (t: ThemeId) => Promise<unknown> }) {
  return (
    <header className="top">
      <div className="top-inner">
        <Link href={r.home} className="brand" aria-label="Draft the Stars home">
          <span className="kicker">Reality TV fantasy drafts</span>
          <span className="logo">Draft the Stars</span>
        </Link>
        <nav className="main-nav" aria-label="Main">
          <NavLinks
            links={
              user
                ? [
                    { href: r.dashboard, label: "My leagues" },
                    { href: r.newLeague, label: "Create" },
                    { href: r.join(), label: "Join" },
                    { href: r.settings, label: "Settings" },
                  ]
                : [
                    { href: r.home, label: "Home" },
                    { href: r.login(), label: "Log in" },
                    { href: r.signup, label: "Sign up" },
                  ]
            }
          />
        </nav>
        <div className="top-tools">
          <ThemeSwitcher initial={user?.themePreset ?? null} save={saveTheme} />
          {user && (
            <form action={logout} className="user-chip">
              <Monogram name={user.displayName ?? user.username} size="sm" initials={user.username.slice(0, 2).toUpperCase()} />
              <button type="submit" className="chip ghost" aria-label={`Log out ${user.username}`}>Log out</button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      Fan-made and not affiliated with any show, network or production company. No logos or photos: monograms only.
      <br />
      Free accounts · free to create a league · $5 platform fee per member (no prizes or payouts) · Draft the Stars v2 preview (mock data, placeholder services)
    </footer>
  );
}
