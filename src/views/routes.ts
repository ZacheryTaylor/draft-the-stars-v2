/**
 * Shared views render in both builds: the server app (server actions, cookie session) and the static
 * GitHub Pages demo (browser-side mock adapter in localStorage). Each build passes its own routes and actions.
 */
import type { LegalSlug } from "@/lib/legal/company";

export type FormAction = (form: FormData) => void | Promise<void>;
export type LeagueTab = "standings" | "draft" | "commissioner" | "fees";

export interface Routes {
  home: string;
  login: (next?: string) => string;
  signup: string;
  dashboard: string;
  join: (code?: string) => string;
  newLeague: string;
  settings: string;
  league: (slug: string, tab?: LeagueTab, query?: string) => string;
  /** Legal pages: /terms, /privacy, /refunds, /fees-disclosure, /contact. */
  legal: (slug: LegalSlug) => string;
}

const q = (query?: string) => (query ? `?${query}` : "");

export const serverRoutes: Routes = {
  home: "/",
  login: (next) => `/login${next ? `?next=${encodeURIComponent(next)}` : ""}`,
  signup: "/signup",
  dashboard: "/dashboard",
  join: (code) => `/join${code ? `?code=${code}` : ""}`,
  newLeague: "/leagues/new",
  settings: "/settings",
  league: (slug, tab, query) => `/leagues/${slug}${tab === "draft" ? "/draft" : tab === "commissioner" ? "/commissioner" : tab === "fees" ? "/billing" : ""}${q(query)}`,
  legal: (slug) => `/${slug}`,
};

/** Static export: one page per tab, league picked by ?slug= (new leagues are created in the browser). */
export const demoRoutes: Routes = {
  home: "/",
  login: (next) => `/login/${next ? `?next=${encodeURIComponent(next)}` : ""}`,
  signup: "/signup/",
  dashboard: "/dashboard/",
  join: (code) => `/join/${code ? `?code=${code}` : ""}`,
  newLeague: "/leagues/new/",
  settings: "/settings/",
  league: (slug, tab, query) => `/league/${tab && tab !== "standings" ? `${tab}/` : ""}?slug=${encodeURIComponent(slug)}${query ? `&${query}` : ""}`,
  legal: (slug) => `/${slug}/`,
};
