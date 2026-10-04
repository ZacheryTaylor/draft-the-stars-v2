"use client";
import { useState, useSyncExternalStore, useTransition } from "react";
import { THEME_PRESETS, THEME_STORAGE_KEY, CONTRAST_PAIRS, isThemeId, type ThemeId } from "@/lib/themes/presets";
import { contrastRatio } from "@/lib/themes/contrast";

function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

function lowestTextContrast(id: ThemeId) {
  const t = THEME_PRESETS.find((p) => p.id === id)!.tokens;
  return Math.min(...CONTRAST_PAIRS.filter((p) => p.min === 4.5).map((p) => contrastRatio(t[p.fg], t[p.bg])));
}

export function ThemePicker({ initial, loggedIn, save }: { initial: ThemeId; loggedIn: boolean; save: (t: ThemeId) => Promise<{ saved: "profile" | "local" }> }) {
  // Before login the saved theme lives in localStorage (server render falls back to the default).
  const stored = useSyncExternalStore(
    subscribeStorage,
    () => {
      const local = loggedIn ? null : localStorage.getItem(THEME_STORAGE_KEY);
      return isThemeId(local) ? local : initial;
    },
    () => initial,
  );
  const [savedOverride, setSaved] = useState<ThemeId | null>(null);
  const [picked, setSelected] = useState<ThemeId | null>(null);
  const saved = savedOverride ?? stored;
  const selected = picked ?? saved;
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  // Live preview: the whole page switches as soon as a preset is chosen.
  const preview = (id: ThemeId) => {
    setSelected(id);
    document.documentElement.setAttribute("data-theme", id);
    setMsg("");
  };
  const commit = () =>
    start(async () => {
      localStorage.setItem(THEME_STORAGE_KEY, selected);
      const r = await save(selected);
      setSaved(selected);
      setMsg(r.saved === "profile" ? "Saved to your profile." : "Saved on this device. Log in to keep it on your profile.");
    });
  const revert = () => preview(saved);

  return (
    <div className="stack">
      <div className="theme-grid" role="radiogroup" aria-label="Colour theme">
        {THEME_PRESETS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={selected === p.id} data-theme={p.id} className="theme-card" onClick={() => preview(p.id)} data-testid={`theme-${p.id}`}>
            <span className="tc-title"><span>{p.label}{p.id === "pink" ? " (default)" : ""}</span><span className="swatches" aria-hidden="true">{[p.tokens.accent, p.tokens.accentStrong, p.tokens.accentSoft, p.tokens.gold].map((c) => <i key={c} style={{ background: c }} />)}</span></span>
            <span className="tc-script">Draft the Stars</span>
            <span className="tc-surface">
              <span className="tc-leader"><span>1. Cha Cha Champs</span><span>171.40</span></span>
              <span className="tc-row"><span className="tc-btn">Draft</span><span className="pill">Safe</span><span className="alive-meter" style={{ ["--alive" as string]: 0.75 }}>6/8</span><span className="roster-chip pro">Pro</span></span>
            </span>
            <span className="contrast-list">{p.description} · lowest text contrast {lowestTextContrast(p.id).toFixed(1)}:1 (AA ✓)</span>
          </button>
        ))}
      </div>
      <div className="row">
        <button type="button" className="primary" onClick={commit} disabled={pending || selected === saved}>{pending ? "Saving…" : `Save ${THEME_PRESETS.find((p) => p.id === selected)!.label}`}</button>
        <button type="button" onClick={revert} disabled={selected === saved}>Revert</button>
        <span className="hint" role="status" style={{ margin: 0 }}>{msg || (selected !== saved ? "Previewing. Save to keep it." : "")}</span>
      </div>
    </div>
  );
}
