import Link from "next/link";

/**
 * Instant paint while /homepage streams — same subnav as real page to limit CLS.
 */
export function HomePageSkeleton() {
  return (
    <div className="fd-shell">
      <nav className="fd-home-vv-subnav" aria-label="Tezkor bo‘limlar">
        <Link href="/supermarkets" className="fd-home-vv-subnav-link">
          Do‘konlar
        </Link>
        <Link href="/promocodes" className="fd-home-vv-subnav-link fd-home-vv-subnav-link--accent">
          Aksiyalar
        </Link>
        <Link href="/#barcha-restoranlar" className="fd-home-vv-subnav-link">
          Restoranlar
        </Link>
      </nav>

      <div className="fd-home-vv-promo" aria-busy="true" aria-label="Yuklanmoqda">
        <div className="fd-home-vv-promo-link" style={{ pointerEvents: "none" }}>
          <div className="fd-home-vv-promo-media">
            <div className="fd-home-vv-promo-placeholder" />
          </div>
        </div>
      </div>

      <div className="fd-home-skel-block fd-home-skel-block--carousel" aria-hidden />
      <div className="fd-home-skel-block fd-home-skel-block--section" aria-hidden />
      <div className="fd-home-skel-block fd-home-skel-block--grid" aria-hidden />
    </div>
  );
}
