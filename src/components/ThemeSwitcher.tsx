"use client";
/** Header theme menu: all 8 presets, one click applies + saves (profile when logged in, else this device). */
import { useRef, useSyncExternalStore } from "react";
import { DEFAULT_THEME, THEME_PRESETS, THEME_STORAGE_KEY, isThemeId, type ThemeId } from "@/lib/themes/presets";

function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

export function ThemeSwitcher({ initial, save }: { initial: ThemeId | null; save: (t: ThemeId) => Promise<unknown> }) {
  const current = useSyncExternalStore(
    subscribe,
    () => {
      const t = document.documentElement.getAttribute("data-theme");
      return isThemeId(t) ? t : DEFAULT_THEME;
    },
    () => initial ?? DEFAULT_THEME,
  );
  const ref = useRef<HTMLDetailsElement>(null);
  const preset = THEME_PRESETS.find((p) => p.id === current)!;
  const pick = (id: ThemeId) => {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
    ref.current?.removeAttribute("open");
    void save(id);
  };
  return (
    <details className="theme-switcher" ref={ref} onKeyDown={(e) => { if (e.key === "Escape") ref.current?.removeAttribute("open"); }}>
      <summary aria-label={`Theme: ${preset.label}. Change colour theme`} data-testid="theme-menu">
        <span className="ts-swatch" aria-hidden="true" style={{ background: `linear-gradient(135deg, ${preset.tokens.accent} 0 50%, ${preset.tokens.bg} 50%)` }} />
        Theme: {preset.label}
      </summary>
      <div className="ts-panel" role="radiogroup" aria-label="Colour theme">
        {THEME_PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={current === p.id} className="ts-option" data-testid={`switch-theme-${p.id}`} onClick={() => pick(p.id)}>
            <span className="ts-swatch" aria-hidden="true" style={{ background: `linear-gradient(135deg, ${p.tokens.accent} 0 50%, ${p.tokens.bg} 50%)` }} />
            {p.label}
          </button>
        ))}
      </div>
    </details>
  );
}
