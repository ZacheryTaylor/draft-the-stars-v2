import Link from "next/link";
import { signUp } from "../actions";
import { FormMessage } from "@/components/FormMessage";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <section className="card">
      <p className="eyebrow">Free account</p>
      <h2>Sign up</h2>
      <p className="notice"><b>Placeholder auth.</b> Accounts live in memory until Supabase Auth is connected. Verification email is logged, not sent (Resend placeholder).</p>
      <form action={signUp} className="stack">
        <FormMessage error={error} />
        <label>Email<input name="email" type="email" required autoComplete="email" /></label>
        <label>Username (3-20 letters, numbers or _ · unique)<input name="username" required pattern="[A-Za-z0-9_]{3,20}" autoComplete="username" /></label>
        <label>Password<input name="password" type="password" minLength={8} autoComplete="new-password" placeholder="Not stored (placeholder)" /></label>
        <label>Birth year (you must be 13 or older)<input name="birthYear" type="number" required min={1900} max={new Date().getFullYear()} /></label>
        <input type="hidden" name="theme" id="signup-theme" />
        <div className="row">
          <button className="primary" type="submit">Create account</button>
          <Link href="/login">I already have one</Link>
        </div>
      </form>
    </section>
  );
}
