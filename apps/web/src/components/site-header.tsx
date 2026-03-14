import Link from "next/link";

type SiteHeaderProps = {
  currentPath: "/" | "/sleep" | "/recovery" | "/trends" | "/anomalies";
};

const links: Array<{ href: SiteHeaderProps["currentPath"]; label: string }> = [
  { href: "/", label: "Overview" },
  { href: "/sleep", label: "Sleep" },
  { href: "/recovery", label: "Recovery" },
  { href: "/trends", label: "Trends" },
  { href: "/anomalies", label: "Anomalies" }
];

export function SiteHeader({ currentPath }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <span className="brand-kicker">Baseline</span>
        <strong>Wearable analytics</strong>
      </Link>
      <nav className="site-nav" aria-label="Primary">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={link.href === currentPath ? "nav-link active" : "nav-link"}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
