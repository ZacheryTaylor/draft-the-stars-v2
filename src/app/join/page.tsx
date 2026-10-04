import { joinLeague } from "../actions";
import { FormMessage } from "@/components/FormMessage";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";

export const metadata = { title: "Join a league" };

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ error?: string; code?: string }> }) {
  const { error, code } = await searchParams;
  const user = await getCurrentUser();
  return (
    <section className="card">
      <p className="eyebrow">Got an invite?</p>
      <h2>Join by code</h2>
      {!user && <p className="notice">You will need a free account first. <Link href="/signup">Sign up</Link> or <Link href="/login?next=/join">log in</Link>.</p>}
      <form action={joinLeague} className="stack">
        <FormMessage error={error} />
        <label>Invite code<input name="code" required defaultValue={code} placeholder="e.g. BALLROOM" style={{ textTransform: "uppercase", letterSpacing: ".12em" }} /></label>
        <button className="primary" type="submit">Join league</button>
        <p className="hint">Codes work once the league is paid and active. You claim the next open team.</p>
      </form>
    </section>
  );
}
