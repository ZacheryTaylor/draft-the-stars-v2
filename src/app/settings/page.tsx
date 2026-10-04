import { getCurrentUser } from "@/lib/auth/session";
import { saveTheme, updateUsername } from "../actions";
import { ThemePicker } from "@/components/ThemePicker";
import { FormMessage } from "@/components/FormMessage";
import { DEFAULT_THEME } from "@/lib/themes/presets";
import { serviceStatus } from "@/lib/services/env";
import Link from "next/link";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { error, saved } = await searchParams;
  const user = await getCurrentUser();
  return (
    <>
      <section className="card">
        <p className="eyebrow">Your view only</p>
        <h2>Colour theme</h2>
        <p className="muted">Pick a preset to preview it live across the page, then save. {user ? "Saved to your profile." : "Saved on this device until you log in."} Every preset passes WCAG AA contrast.</p>
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
          <p className="muted"><Link href="/login?next=/settings">Log in</Link> to change your username.</p>
        )}
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Connected services</h3>
        <ul className="stack" style={{ paddingLeft: 18 }}>
          {serviceStatus().map((s) => (
            <li key={s.name}><b className="strong">{s.name}</b>: {s.connected ? "connected" : "not connected (placeholder)"}. {s.note} <span className="hint">Env: {s.envVars.join(", ")}</span></li>
          ))}
        </ul>
      </section>
    </>
  );
}
