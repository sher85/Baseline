const metrics = [
  { label: "Recovery", value: "84", detail: "Stable vs. baseline" },
  { label: "HRV", value: "52 ms", detail: "+4 ms vs. 21-day baseline" },
  { label: "Resting HR", value: "51 bpm", detail: "-2 bpm vs. baseline" },
  { label: "Sleep", value: "7h 31m", detail: "91% efficiency" }
];

const notes = [
  "Sleep duration recovered after two shorter nights.",
  "Temperature is within expected variance.",
  "No high-severity anomalies detected today."
];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Wearable Analytics MVP</p>
          <h1>Luxury calm, scientific backbone.</h1>
          <p className="hero-text">
            A local-first dashboard for recovery intelligence, built to feel
            premium while staying explicit, interpretable, and engineer-grade.
          </p>
        </div>
        <div className="hero-orb" aria-hidden="true" />
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => (
          <article key={metric.label} className="metric-card">
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
            <span className="metric-detail">{metric.detail}</span>
          </article>
        ))}
      </section>

      <section className="insight-panel">
        <div>
          <p className="eyebrow">Latest Interpretation</p>
          <h2>Today looks resilient.</h2>
        </div>
        <div className="insight-list">
          {notes.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </section>
    </main>
  );
}
