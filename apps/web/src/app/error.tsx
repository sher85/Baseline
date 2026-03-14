"use client";

export default function Error({
  reset
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="page-shell">
      <section className="global-error-shell">
        <article className="error-card">
          <p className="eyebrow">Something Broke</p>
          <h1>The dashboard couldn&apos;t finish rendering.</h1>
          <p className="hero-text">
            This is usually recoverable. Try reloading the route, and if it persists,
            make sure the local API is still running.
          </p>
          <button type="button" className="page-empty-action primary" onClick={() => reset()}>
            Retry render
          </button>
        </article>
      </section>
    </main>
  );
}
