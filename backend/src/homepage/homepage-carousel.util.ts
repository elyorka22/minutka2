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
  const byRating = [...normal].sort((a, b) => b.rating - a.rating);

  const nationalExplicit = normal
    .filter((r) => r.carouselNational)
    .sort((a, b) => a.carouselNationalSort - b.carouselNationalSort || b.rating - a.rating);

  let nationalCarousel: R[];
  if (nationalExplicit.length > 0) {
    nationalCarousel = nationalExplicit;
  } else {
    const featured = normal
      .filter((r) => r.isFeatured)
      .sort((a, b) => a.featuredSortOrder - b.featuredSortOrder || b.rating - a.rating);
    nationalCarousel = featured.length > 0 ? featured : byRating.slice(0, 8);
  }

  const fastExplicit = normal
    .filter((r) => r.carouselFastFood)
    .sort((a, b) => a.carouselFastFoodSort - b.carouselFastFoodSort || b.rating - a.rating);

  let fastFoodCarousel: R[];
  if (fastExplicit.length > 0) {
    fastFoodCarousel = fastExplicit;
  } else {
    fastFoodCarousel = byRating.length > 8 ? byRating.slice(8, 16) : byRating.slice(0, 8);
  }

  return { nationalCarousel, fastFoodCarousel };
}

export { cardSelect };

export type HomepageRestaurantRow = R;
