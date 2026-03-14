import Link from "next/link";

type PageEmptyStateProps = {
  description: string;
  eyebrow: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  title: string;
};

export function PageEmptyState({
  description,
  eyebrow,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  title
}: PageEmptyStateProps) {
  return (
    <section className="page-empty">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="hero-text">{description}</p>
      {(primaryHref && primaryLabel) || (secondaryHref && secondaryLabel) ? (
        <div className="page-empty-actions">
          {primaryHref && primaryLabel ? (
            <Link href={primaryHref} className="page-empty-action primary">
              {primaryLabel}
            </Link>
          ) : null}
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="page-empty-action">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
