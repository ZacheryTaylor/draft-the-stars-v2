/**
 * Per-user colour theme presets (design tokens). Each preset becomes a set of CSS variables
 * under [data-theme="<id>"]. Pink is the default and is built from the live Draft the Stars
 * palette (ZacheryTaylor/dwts-draft css/styles.css); see `PINK_LIVE_SOURCE` for the mapping.
 * Every preset is checked for WCAG AA contrast in tests/themes.test.ts.
 */
export const THEME_IDS = ["pink", "blue", "green", "red", "white", "purple", "gold", "dark"] as const;
export type ThemeId = (typeof THEME_IDS)[number];
export const DEFAULT_THEME: ThemeId = "pink";
export const THEME_STORAGE_KEY = "dts-theme";

export interface ThemeTokens {
  bg: string; // page background
  bgGlow: string; // soft radial glow on the page background
  surface: string; // cards, inputs, table rows
  surfaceAlt: string; // headings / detail rows
  ink: string; // body text
  display: string; // script headings (large text)
  muted: string; // hints, secondary text
  accent: string; // brand colour: borders, focus rings, progress
  accentSoft: string; // pills, Alive fill, celebrity chips
  accentStrong: string; // strong text on surfaces, links
  accentGlow: string; // decorative gradient highlight
  accent2: string; // pro chips
  onAccent2: string;
  btnTop: string; // primary button gradient
  btnBottom: string;
  onAccent: string; // text on primary buttons
  line: string;
  rowLine: string;
  gold: string; // #1 leader border (non-text UI)
  goldInk: string; // gold text
  outBg: string; // eliminated pro chip
  outInk: string;
  outSoftBg: string; // eliminated celebrity chip
  outSoftInk: string;
  shadowRgb: string;
}

export interface ThemePreset {
  id: ThemeId;
  label: string;
  scheme: "light" | "dark";
  description: string;
  tokens: ThemeTokens;
}

/** Exact hex values from the live css/styles.css :root, and where each one is used in v2. */
export const PINK_LIVE_SOURCE = {
  "--pink #ee5d92": "accent",
  "--pink-dark #b72f66": "ink, display, accentStrong, btnBottom",
  "--pink-light #ffe5ef": "accentSoft",
  "--pink-soft #ff9fbe": "accentGlow",
  "--bg #FFF0F2": "bg",
  "--white #ffffff": "surface, onAccent",
  "--heading-bg #fff9fc": "surfaceAlt",
  "--line #f3bad0": "line",
  "--row-line #f4d3e0": "rowLine",
  "--gold #bc8618": "gold",
  "--avail-ink #7c5268": "muted",
  "--out-pro-bg #555555 / --out-am-bg #dedede / --out-am-ink #222222": "outBg, outSoftBg, outSoftInk",
  "--shadow-rgb 164, 66, 114": "shadowRgb",
  "--discopink #fd7185, --pro-pink #fe637f, --muted #946277": "not used for text: below WCAG AA (2.4-4.5:1); see README",
} as const;

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "pink",
    label: "Pink",
    scheme: "light",
    description: "The original Draft the Stars palette (default).",
    tokens: {
      bg: "#fff0f2", bgGlow: "#ffe5ef", surface: "#ffffff", surfaceAlt: "#fff9fc",
      ink: "#b72f66", display: "#b72f66", muted: "#7c5268",
      accent: "#ee5d92", accentSoft: "#ffe5ef", accentStrong: "#b72f66", accentGlow: "#ff9fbe",
      accent2: "#c2306a", onAccent2: "#ffffff",
      btnTop: "#c63a74", btnBottom: "#b72f66", onAccent: "#ffffff",
      line: "#f3bad0", rowLine: "#f4d3e0", gold: "#bc8618", goldInk: "#8a6212",
      outBg: "#555555", outInk: "#ffffff", outSoftBg: "#dedede", outSoftInk: "#222222",
      shadowRgb: "164, 66, 114",
    },
  },
  {
    id: "blue",
    label: "Blue",
    scheme: "light",
    description: "Cool blues (uses the live staging blues).",
    tokens: {
      bg: "#eef5fc", bgGlow: "#dcebfa", surface: "#ffffff", surfaceAlt: "#f6faff",
      ink: "#1d4f86", display: "#2866a5", muted: "#475d75",
      accent: "#4788cb", accentSoft: "#dcebfa", accentStrong: "#1f5a96", accentGlow: "#8fbbe8",
      accent2: "#1f5a96", onAccent2: "#ffffff",
      btnTop: "#2f6fae", btnBottom: "#245d98", onAccent: "#ffffff",
      line: "#bcd6f0", rowLine: "#d6e6f6", gold: "#b07c12", goldInk: "#7d5a0d",
      outBg: "#555555", outInk: "#ffffff", outSoftBg: "#dedede", outSoftInk: "#222222",
      shadowRgb: "40, 102, 165",
    },
  },
  {
    id: "green",
    label: "Green",
    scheme: "light",
    description: "Fresh greens.",
    tokens: {
      bg: "#eef8f1", bgGlow: "#d9f2e2", surface: "#ffffff", surfaceAlt: "#f6fcf8",
      ink: "#1d6339", display: "#1f6b3e", muted: "#46604f",
      accent: "#2e9e5b", accentSoft: "#d9f2e2", accentStrong: "#1d6339", accentGlow: "#86d3a5",
      accent2: "#1f6b3e", onAccent2: "#ffffff",
      btnTop: "#237a47", btnBottom: "#1d6339", onAccent: "#ffffff",
      line: "#b9e2c8", rowLine: "#d5eedd", gold: "#ad7a10", goldInk: "#7a560b",
      outBg: "#555555", outInk: "#ffffff", outSoftBg: "#dedede", outSoftInk: "#222222",
      shadowRgb: "31, 107, 62",
    },
  },
  {
    id: "red",
    label: "Red",
    scheme: "light",
    description: "Bold reds.",
    tokens: {
      bg: "#fdf0ef", bgGlow: "#fde0dd", surface: "#ffffff", surfaceAlt: "#fff8f7",
      ink: "#a3231c", display: "#a3231c", muted: "#74463f",
      accent: "#e0483e", accentSoft: "#fde0dd", accentStrong: "#a3231c", accentGlow: "#f39a93",
      accent2: "#b3261e", onAccent2: "#ffffff",
      btnTop: "#b82b22", btnBottom: "#a3231c", onAccent: "#ffffff",
      line: "#f4c0bb", rowLine: "#f7d8d5", gold: "#b07c12", goldInk: "#7d5a0d",
      outBg: "#555555", outInk: "#ffffff", outSoftBg: "#dedede", outSoftInk: "#222222",
      shadowRgb: "163, 35, 28",
    },
  },
  {
    id: "white",
    label: "White",
    scheme: "light",
    description: "Clean, neutral light theme.",
    tokens: {
      bg: "#f6f7f8", bgGlow: "#ffffff", surface: "#ffffff", surfaceAlt: "#fafbfc",
      ink: "#1f2328", display: "#1f2328", muted: "#57606a",
      accent: "#6e7781", accentSoft: "#eaeef2", accentStrong: "#24292f", accentGlow: "#afb8c1",
      accent2: "#24292f", onAccent2: "#ffffff",
      btnTop: "#3b434b", btnBottom: "#24292f", onAccent: "#ffffff",
      line: "#d0d7de", rowLine: "#e6e9ec", gold: "#a87508", goldInk: "#7a5506",
      outBg: "#555555", outInk: "#ffffff", outSoftBg: "#dedede", outSoftInk: "#222222",
      shadowRgb: "31, 35, 40",
    },
  },
  {
    id: "purple",
    label: "Purple",
    scheme: "light",
    description: "Regal purples.",
    tokens: {
      bg: "#f5f0fc", bgGlow: "#ece3fd", surface: "#ffffff", surfaceAlt: "#faf7fe",
      ink: "#5b2a9e", display: "#5b2a9e", muted: "#5f5470",
      accent: "#8b5cf6", accentSoft: "#ece3fd", accentStrong: "#5b2a9e", accentGlow: "#c4a8fb",
      accent2: "#6a33b8", onAccent2: "#ffffff",
      btnTop: "#6a37b8", btnBottom: "#5b2a9e", onAccent: "#ffffff",
      line: "#d8c8f7", rowLine: "#e7dcfa", gold: "#ad7a10", goldInk: "#7a560b",
      outBg: "#555555", outInk: "#ffffff", outSoftBg: "#dedede", outSoftInk: "#222222",
      shadowRgb: "91, 42, 158",
    },
  },
  {
    id: "gold",
    label: "Gold",
    scheme: "light",
    description: "Mirrorball gold.",
    tokens: {
      bg: "#fdf8ec", bgGlow: "#f8ecc9", surface: "#ffffff", surfaceAlt: "#fffcf3",
      ink: "#6e4a00", display: "#7a5200", muted: "#665536",
      accent: "#b07e0c", accentSoft: "#f8ecc9", accentStrong: "#6e4a00", accentGlow: "#e9c869",
      accent2: "#7a5200", onAccent2: "#ffffff",
      btnTop: "#86590a", btnBottom: "#6e4a00", onAccent: "#ffffff",
      line: "#ecd9a3", rowLine: "#f2e6c4", gold: "#a87508", goldInk: "#6e4a00",
      outBg: "#555555", outInk: "#ffffff", outSoftBg: "#dedede", outSoftInk: "#222222",
      shadowRgb: "122, 82, 0",
    },
  },
  {
    id: "dark",
    label: "Dark",
    scheme: "dark",
    description: "Low-light, with Draft the Stars pink accents.",
    tokens: {
      bg: "#14111a", bgGlow: "#2a1826", surface: "#1f1a27", surfaceAlt: "#272030",
      ink: "#f3e9f1", display: "#ff9fbe", muted: "#bcadbb",
      accent: "#ee5d92", accentSoft: "#3a2434", accentStrong: "#ff9fbe", accentGlow: "#ff9fbe",
      accent2: "#fe637f", onAccent2: "#1a0b12",
      btnTop: "#ff9fbe", btnBottom: "#f27aa6", onAccent: "#1a0b12",
      line: "#3d3346", rowLine: "#2f2838", gold: "#e0b04a", goldInk: "#e9c25e",
      outBg: "#555555", outInk: "#ffffff", outSoftBg: "#3a3a3a", outSoftInk: "#e6e6e6",
      shadowRgb: "0, 0, 0",
    },
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export function getPreset(id: string | null | undefined): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

/** CSS for every preset: `:root, [data-theme="pink"] { --bg: ... }` etc. Injected once in the root layout. */
export function themeCss(): string {
  return THEME_PRESETS.map((p) => {
    const sel = p.id === DEFAULT_THEME ? `:root, [data-theme="${p.id}"]` : `[data-theme="${p.id}"]`;
    const vars = Object.entries(p.tokens).map(([k, v]) => `--${kebab(k)}: ${v};`).join(" ");
    return `${sel} { color-scheme: ${p.scheme}; ${vars} }`;
  }).join("\n");
}

/** Text/background pairs that must pass WCAG AA. ratio 4.5 = normal text, 3 = large text or UI. */
export const CONTRAST_PAIRS: { fg: keyof ThemeTokens; bg: keyof ThemeTokens; min: number; use: string }[] = [
  { fg: "ink", bg: "bg", min: 4.5, use: "body text on page" },
  { fg: "ink", bg: "surface", min: 4.5, use: "body text on cards" },
  { fg: "ink", bg: "accentSoft", min: 4.5, use: "text on soft fills" },
  { fg: "muted", bg: "surface", min: 4.5, use: "hints on cards" },
  { fg: "muted", bg: "bg", min: 4.5, use: "hints on page" },
  { fg: "accentStrong", bg: "surface", min: 4.5, use: "strong text / links" },
  { fg: "accentStrong", bg: "surfaceAlt", min: 4.5, use: "strong text on detail rows" },
  { fg: "accentStrong", bg: "accentSoft", min: 4.5, use: "pills, rank badges, celebrity chips" },
  { fg: "onAccent", bg: "btnTop", min: 4.5, use: "primary button text (top)" },
  { fg: "onAccent", bg: "btnBottom", min: 4.5, use: "primary button text (bottom)" },
  { fg: "onAccent2", bg: "accent2", min: 4.5, use: "pro chips" },
  { fg: "goldInk", bg: "surface", min: 4.5, use: "gold text" },
  { fg: "outInk", bg: "outBg", min: 4.5, use: "eliminated pro chip" },
  { fg: "outSoftInk", bg: "outSoftBg", min: 4.5, use: "eliminated celebrity chip" },
  { fg: "display", bg: "bg", min: 3, use: "script headings (large text)" },
  { fg: "accent", bg: "surface", min: 3, use: "focus ring / active borders (UI)" },
  { fg: "gold", bg: "surface", min: 3, use: "#1 leader border (UI)" },
];
