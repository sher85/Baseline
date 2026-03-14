import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="global-error-shell">
        <article className="error-card">
          <p className="eyebrow">Not Found</p>
          <h1>This Baseline route does not exist.</h1>
          <p className="hero-text">
            Head back to the overview and continue through the core analytics surfaces.
          </p>
          <Link href="/" className="page-empty-action primary">
            Return to overview
          </Link>
        </article>
      </section>
    </main>
  );
}
