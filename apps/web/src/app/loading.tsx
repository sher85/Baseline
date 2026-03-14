export default function Loading() {
  return (
    <main className="page-shell">
      <section className="shell-loading">
        <p className="eyebrow">Loading</p>
        <h1>Preparing the recovery view.</h1>
        <p className="hero-text">
          Pulling the latest analytics and shaping the dashboard surfaces.
        </p>
      </section>

      <section className="loading-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </section>
    </main>
  );
}
