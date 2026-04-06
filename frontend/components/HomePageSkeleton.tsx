import Link from "next/link";

/**
 * Matches home layout dimensions while /homepage streams (reduces CLS vs empty page).
 * Section titles match the live page so only media blocks transition from placeholder.
 */
export function HomePageSkeleton() {
  return (
    <>
      <section
        className="fd-home-banners fd-home-banners--skeleton"
        aria-hidden="true"
      >
        <div className="fd-banner fd-banner--skeleton" />
        <div className="fd-banner fd-banner--skeleton fd-banner--skeleton-narrow" />
      </section>

      <section className="fd-section">
        <h2 className="fd-section-title">
          <Link href="/restaurants" style={{ color: "inherit", textDecoration: "none" }}>
            Milliy taomlar
          </Link>
        </h2>
        <div className="fd-home-stores fd-home-stores--skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fd-skeleton-tile" />
          ))}
        </div>
      </section>

      <section className="fd-section">
        <h2 className="fd-section-title">
          <Link href="/restaurants" style={{ color: "inherit", textDecoration: "none" }}>
            Fast food
          </Link>
        </h2>
        <div className="fd-home-stores fd-home-stores--skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="fd-skeleton-tile" />
          ))}
        </div>
      </section>

      <section className="fd-section">
        <h2 className="fd-section-title">
          <Link href="/supermarkets" style={{ color: "inherit", textDecoration: "none" }}>
            Do‘konlardan mahsulotlar
          </Link>
        </h2>
        <div className="fd-home-stores fd-home-stores--skeleton">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fd-skeleton-tile" />
          ))}
        </div>
      </section>

      <section className="fd-section">
        <h2 className="fd-section-title">
          <Link href="/restaurants" style={{ color: "inherit", textDecoration: "none" }}>
            Barcha restoranlar
          </Link>
        </h2>
        <div className="fd-grid fd-grid--barcha-home fd-grid--skeleton">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="fd-skeleton-barcha-card">
              <div className="fd-skeleton-barcha-thumb" />
              <div className="fd-skeleton-barcha-body">
                <div className="fd-skeleton-line fd-skeleton-line--sm" />
                <div className="fd-skeleton-line fd-skeleton-line--xs" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
