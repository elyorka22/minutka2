type R = {
  id: string;
  name: string;
  description: string | null;
  rating: number;
  logoUrl: string | null;
  coverUrl: string | null;
  isSupermarket: boolean;
  isFeatured: boolean;
  featuredSortOrder: number;
  carouselNational: boolean;
  carouselNationalSort: number;
  carouselFastFood: boolean;
  carouselFastFoodSort: number;
  isActive: boolean;
};

const cardSelect = {
  id: true,
  name: true,
  description: true,
  rating: true,
  logoUrl: true,
  coverUrl: true,
  isSupermarket: true,
  isFeatured: true,
  featuredSortOrder: true,
  carouselNational: true,
  carouselNationalSort: true,
  carouselFastFood: true,
  carouselFastFoodSort: true,
  isActive: true,
} as const;

export function buildNationalAndFastCarousels(rows: R[]): { nationalCarousel: R[]; fastFoodCarousel: R[] } {
  const normal = rows.filter((r) => !r.isSupermarket);

  const nationalExplicit = normal
    .filter((r) => r.carouselNational)
    .sort((a, b) => a.carouselNationalSort - b.carouselNationalSort || b.rating - a.rating);

  const fastExplicit = normal
    .filter((r) => r.carouselFastFood)
    .sort((a, b) => a.carouselFastFoodSort - b.carouselFastFoodSort || b.rating - a.rating);

  /** Milliy fallback: agar kamida bitta restoran faqat Fast karuselga belgilangan bo‘lsa, ularni Milliyga avtomatik qo‘shmaymiz. */
  const nationalFallbackPool =
    fastExplicit.length > 0
      ? normal.filter((r) => !(r.carouselFastFood && !r.carouselNational))
      : normal;

  let nationalCarousel: R[];
  if (nationalExplicit.length > 0) {
    nationalCarousel = nationalExplicit;
  } else {
    const poolByRating = [...nationalFallbackPool].sort((a, b) => b.rating - a.rating);
    const featured = nationalFallbackPool
      .filter((r) => r.isFeatured)
      .sort((a, b) => a.featuredSortOrder - b.featuredSortOrder || b.rating - a.rating);
    nationalCarousel = featured.length > 0 ? featured : poolByRating.slice(0, 8);
  }

  /** Fast food fallback: faqat Milliyga belgilanganlar ikkinchi karuselga tushmasin. */
  const fastFallbackPool =
    nationalExplicit.length > 0
      ? normal.filter((r) => !(r.carouselNational && !r.carouselFastFood))
      : normal;

  let fastFoodCarousel: R[];
  if (fastExplicit.length > 0) {
    fastFoodCarousel = fastExplicit;
  } else {
    const poolByRating = [...fastFallbackPool].sort((a, b) => b.rating - a.rating);
    fastFoodCarousel =
      poolByRating.length > 8 ? poolByRating.slice(8, 16) : poolByRating.slice(0, 8);
  }

  return { nationalCarousel, fastFoodCarousel };
}

export { cardSelect };

export type HomepageRestaurantRow = R;
