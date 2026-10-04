import { describe, expect, it } from "vitest";
import { CONTRAST_PAIRS, DEFAULT_THEME, THEME_IDS, THEME_PRESETS, themeCss } from "@/lib/themes/presets";
import { contrastRatio } from "@/lib/themes/contrast";

describe("theme presets", () => {
  it("has the 8 required presets with Pink as default", () => {
    expect([...THEME_IDS].sort()).toEqual(["blue", "dark", "gold", "green", "pink", "purple", "red", "white"]);
    expect(DEFAULT_THEME).toBe("pink");
    expect(themeCss()).toContain(':root, [data-theme="pink"]');
  });

  it("Pink uses the exact live palette colours", () => {
    const t = THEME_PRESETS.find((p) => p.id === "pink")!.tokens;
    expect([t.accent, t.accentStrong, t.accentSoft, t.accentGlow, t.bg, t.surfaceAlt, t.line, t.rowLine, t.gold, t.muted])
      .toEqual(["#ee5d92", "#b72f66", "#ffe5ef", "#ff9fbe", "#fff0f2", "#fff9fc", "#f3bad0", "#f4d3e0", "#bc8618", "#7c5268"]);
  });

  for (const preset of THEME_PRESETS) {
    it(`${preset.label} passes WCAG AA contrast for every text/UI pair`, () => {
      const failures = CONTRAST_PAIRS.map((p) => ({ ...p, ratio: contrastRatio(preset.tokens[p.fg], preset.tokens[p.bg]) }))
        .filter((p) => p.ratio < p.min)
        .map((p) => `${p.fg} on ${p.bg} = ${p.ratio.toFixed(2)} < ${p.min} (${p.use})`);
      expect(failures).toEqual([]);
    });
  }
});
