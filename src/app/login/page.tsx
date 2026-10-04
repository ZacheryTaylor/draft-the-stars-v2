import Link from "next/link";
import { logIn } from "../actions";
import { FormMessage } from "@/components/FormMessage";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  return (
    <section className="card">
      <p className="eyebrow">Welcome back</p>
      <h2>Log in</h2>
      <p className="notice"><b>Placeholder auth.</b> Supabase Auth is not connected, so there is no password check yet. Demo accounts: <code>zach</code> (commissioner), <code>tango_tess</code>, <code>waltz_wren</code>.</p>
      <form action={logIn} className="stack">
        <FormMessage error={error} />
        <input type="hidden" name="next" value={next ?? ""} />
        <label>Email or username<input name="login" required autoComplete="username" defaultValue="zach" /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" placeholder="Not checked (placeholder)" /></label>
        <div className="row">
          <button className="primary" type="submit">Log in</button>
          <Link href="/signup">Create an account</Link>
        </div>
        <p className="hint">Forgot password? Email reset arrives with Supabase Auth + Resend (placeholder).</p>
      </form>
    </section>
  );
}
