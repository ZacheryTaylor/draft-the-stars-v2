import Link from "next/link";
import type { Profile } from "@/lib/data/types";
import type { ServiceStatus } from "@/lib/services/env";
import { DEFAULT_THEME, type ThemeId } from "@/lib/themes/presets";
import { ThemePicker } from "@/components/ThemePicker";
import { FormMessage } from "@/components/FormMessage";
import type { FormAction, Routes } from "./routes";

export function SettingsView({ user, error, saved, saveTheme, updateUsername, services, r }: { user: Profile | null; error?: string; saved?: string; saveTheme: (t: ThemeId) => Promise<{ saved: "profile" | "local" }>; updateUsername: FormAction; services: ServiceStatus[]; r: Routes }) {
  return (
    <>
      <section className="card">
        <p className="eyebrow">Your view only</p>
        <h2>Colour theme</h2>
        <p className="muted">Pick a preset to preview it live across the page, then save. {user ? "Saved to your profile." : "Saved on this device until you log in."} Every preset passes WCAG AA contrast. Tip: the Theme menu in the header switches instantly from any page.</p>
        <ThemePicker initial={user?.themePreset ?? DEFAULT_THEME} loggedIn={Boolean(user)} save={saveTheme} />
      </section>

      <section className="card">
        <h2>Profile</h2>
        {user ? (
          <form action={updateUsername} className="stack">
            <FormMessage error={error} success={saved === "profile" ? "Profile saved." : undefined} />
            <label>Username (unique, lowercase)<input name="username" defaultValue={user.username} required pattern="[A-Za-z0-9_]{3,20}" /></label>
            <label>Display name<input name="displayName" defaultValue={user.displayName ?? ""} maxLength={40} /></label>
            <label>Email (managed by auth)<input value={user.email} disabled readOnly /></label>
            <button className="primary" type="submit">Save profile</button>
          </form>
        ) : (
          <p className="muted"><Link href={r.login(r.settings)}>Log in</Link> to change your username.</p>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Connected services</h3>
        <ul className="stack" style={{ paddingLeft: 18 }}>
          {services.map((s) => (
            <li key={s.name}><b className="strong">{s.name}</b>: {s.connected ? "connected" : "not connected (placeholder)"}. {s.note} <span className="hint">Env: {s.envVars.join(", ")}</span></li>
          ))}
        </ul>
      </section>
    </>
  );
}
