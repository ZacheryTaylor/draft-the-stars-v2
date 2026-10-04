import Link from "next/link";
export default function NotFound() {
  return (
    <section className="card">
      <h2>Not found</h2>
      <p className="muted">That page or league does not exist.</p>
      <Link className="btn primary" href="/">Home</Link>
    </section>
  );
}
