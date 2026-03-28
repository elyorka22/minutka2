/**
 * Server-only fetch helpers with ISR (next.revalidate).
 * Do not import from client components.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

export type HomepageRestaurant = {
  id: string;
  name: string;
  description?: string | null;
  rating?: number | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  isSupermarket?: boolean | null;
  isFeatured?: boolean | null;
  featuredSortOrder?: number | null;
  carouselNational?: boolean | null;
  carouselNationalSort?: number | null;
  carouselFastFood?: boolean | null;
  carouselFastFoodSort?: number | null;
  isActive?: boolean | null;
};

export type HomepageBanner = {
  id: string;
  title: string;
  text?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  sortOrder?: number | null;
};

export type HomepageTopCategory = {
  id: string;
  name: string;
  imageUrl?: string | null;
  sortOrder?: number | null;
};

export type HomepagePayload = {
  restaurants: HomepageRestaurant[];
  featured: HomepageRestaurant[];
  nationalCarousel?: HomepageRestaurant[];
  fastFoodCarousel?: HomepageRestaurant[];
  banners: HomepageBanner[];
  topCategories: HomepageTopCategory[];
};

function buildCarouselsFromList(restaurants: HomepageRestaurant[]): {
  nationalCarousel: HomepageRestaurant[];
  fastFoodCarousel: HomepageRestaurant[];
} {
  const normal = restaurants.filter((r) => !r.isSupermarket);
  const byRating = [...normal].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const nationalExplicit = normal
    .filter((r) => r.carouselNational)
    .sort(
      (a, b) =>
        (a.carouselNationalSort ?? 0) - (b.carouselNationalSort ?? 0) ||
        (b.rating ?? 0) - (a.rating ?? 0),
    );
  let nationalCarousel: HomepageRestaurant[];
  if (nationalExplicit.length > 0) {
    nationalCarousel = nationalExplicit;
  } else {
    const featured = normal
      .filter((r) => r.isFeatured)
      .sort(
        (a, b) =>
          (a.featuredSortOrder ?? 0) - (b.featuredSortOrder ?? 0) ||
          (b.rating ?? 0) - (a.rating ?? 0),
      );
    nationalCarousel = featured.length > 0 ? featured : byRating.slice(0, 8);
  }
  const fastExplicit = normal
    .filter((r) => r.carouselFastFood)
    .sort(
      (a, b) =>
        (a.carouselFastFoodSort ?? 0) - (b.carouselFastFoodSort ?? 0) ||
        (b.rating ?? 0) - (a.rating ?? 0),
    );
  const fastFoodCarousel =
    fastExplicit.length > 0
      ? fastExplicit
      : byRating.length > 8
        ? byRating.slice(8, 16)
        : byRating.slice(0, 8);
  return { nationalCarousel, fastFoodCarousel };
}

async function fetchJson<T>(path: string, revalidate: number): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchHomepage(): Promise<HomepagePayload> {
  return fetchJson<HomepagePayload>("/homepage", 30);
}

/** Single /homepage fetch with safe fallback to legacy parallel endpoints. */
export async function fetchHomepageStable(): Promise<HomepagePayload> {
  try {
    return await fetchHomepage();
  } catch {
    const [restaurants, banners, featured] = await Promise.all([
      fetchJson<HomepageRestaurant[]>("/restaurants", 30).catch(() => []),
      fetchJson<HomepageBanner[]>("/banners", 30).catch(() => []),
      fetchJson<HomepageRestaurant[]>("/restaurants/featured", 30).catch(() => []),
    ]);
    let topCategories: HomepageTopCategory[] = [];
    try {
      const raw = await fetchJson<HomepageTopCategory[]>("/product-categories", 60);
      if (Array.isArray(raw)) {
        topCategories = raw.slice(0, 30).map((c) => ({
          id: String((c as any).id),
          name: String((c as any).name),
          imageUrl: (c as any).imageUrl ?? null,
          sortOrder: typeof (c as any).sortOrder === "number" ? (c as any).sortOrder : 0,
        }));
      }
    } catch {
      topCategories = [];
    }
    const list = Array.isArray(restaurants) ? restaurants : [];
    const feat = Array.isArray(featured) ? featured : [];
    const { nationalCarousel, fastFoodCarousel } = buildCarouselsFromList(list);
    return {
      restaurants: list,
      banners: Array.isArray(banners) ? banners : [],
      featured: feat,
      nationalCarousel,
      fastFoodCarousel,
      topCategories,
    };
  }
}

export async function fetchRestaurantsList(): Promise<HomepageRestaurant[]> {
  try {
    const data = await fetchJson<HomepageRestaurant[]>("/restaurants", 60);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchRestaurant(id: string): Promise<Record<string, unknown>> {
  try {
    return await fetchJson<Record<string, unknown>>(`/restaurants/${id}`, 30);
  } catch {
    return { id, name: "Restoran mavjud emas", dishes: [] };
  }
}
